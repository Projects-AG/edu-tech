"""Submissions + review workflow services."""

from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.models import (
    AccreditationCycle,
    AuditLog,
    Criterion,
    Department,
    Evidence,
    ReviewAction,
    ReviewStage,
    ReviewStepState,
    Submission,
    SubmissionEvidence,
    SubmissionStatus,
    User,
)
from app.schemas.naac import (
    CorrectionRequest,
    ReviewListResponse,
    ReviewQueueItemOut,
    StatOut,
    SubmissionCreate,
    SubmissionListResponse,
    SubmissionOut,
    WorkflowStepOut,
)
from app.services.criteria_service import resolve_cycle
from app.services.naac_labels import (
    DEFAULT_WORKFLOW,
    REVIEW_STAGE_SHORT,
    REVIEW_STAGE_UI,
    STEP_STATE_UI,
    format_bytes,
    format_date,
    format_datetime,
    submission_label,
)


def _init_workflow(db: Session, submission: Submission) -> None:
    is_draft = submission.status == SubmissionStatus.DRAFT
    for i, stage in enumerate(DEFAULT_WORKFLOW):
        if is_draft:
            state = ReviewStepState.CURRENT if i == 0 else ReviewStepState.PENDING
            acted_at = None
        else:
            if i == 0:
                state = ReviewStepState.DONE
                acted_at = datetime.utcnow()
            elif i == 1:
                state = ReviewStepState.CURRENT
                acted_at = None
            else:
                state = ReviewStepState.PENDING
                acted_at = None
        db.add(
            ReviewAction(
                submission_id=submission.id,
                stage=stage,
                state=state,
                sort_order=i,
                assigned_to_id=submission.assigned_to_id if i == 1 else None,
                acted_at=acted_at,
            )
        )


def _sync_workflow(db: Session, submission: Submission) -> None:
    actions = (
        db.query(ReviewAction)
        .filter(ReviewAction.submission_id == submission.id)
        .order_by(ReviewAction.sort_order)
        .all()
    )
    if not actions:
        _init_workflow(db, submission)
        actions = (
            db.query(ReviewAction)
            .filter(ReviewAction.submission_id == submission.id)
            .order_by(ReviewAction.sort_order)
            .all()
        )

    current_idx = {
        SubmissionStatus.DRAFT: 0,
        SubmissionStatus.SUBMITTED: 1,
        SubmissionStatus.UNDER_REVIEW: 2,
        SubmissionStatus.NEEDS_CORRECTION: 3,
        SubmissionStatus.APPROVED: 4,
    }.get(submission.status, 1)

    for i, action in enumerate(actions):
        if submission.status == SubmissionStatus.APPROVED:
            action.state = ReviewStepState.DONE
            if not action.acted_at:
                action.acted_at = datetime.utcnow()
            continue
        if i < current_idx:
            action.state = ReviewStepState.DONE
            if not action.acted_at:
                action.acted_at = datetime.utcnow()
        elif i == current_idx:
            action.state = ReviewStepState.CURRENT
            if submission.status == SubmissionStatus.NEEDS_CORRECTION:
                action.note = submission.correction_note
        else:
            action.state = ReviewStepState.PENDING
            action.acted_at = None


def _workflow_out(submission: Submission) -> list[WorkflowStepOut]:
    return [
        WorkflowStepOut(
            step=REVIEW_STAGE_UI[a.stage],
            state=STEP_STATE_UI[a.state],
            note=a.note,
        )
        for a in sorted(submission.review_actions, key=lambda x: x.sort_order)
    ]


def _submission_size(db: Session, submission: Submission) -> tuple[int, int]:
    links = submission.evidence_links or []
    total = 0
    for link in links:
        ev = link.evidence
        if not ev:
            continue
        fu = ev.file_upload
        if fu is None and ev.file_upload_id:
            from app.models.models import FileUpload

            fu = db.get(FileUpload, ev.file_upload_id)
        if fu:
            total += fu.size_bytes or 0
    return len(links), total


def _load_submission(db: Session, submission_id: str) -> Submission | None:
    return (
        db.query(Submission)
        .options(
            joinedload(Submission.criterion),
            joinedload(Submission.department),
            joinedload(Submission.submitted_by),
            joinedload(Submission.correction_by),
            joinedload(Submission.assigned_to),
            joinedload(Submission.review_actions),
            joinedload(Submission.evidence_links)
            .joinedload(SubmissionEvidence.evidence)
            .joinedload(Evidence.file_upload),
            joinedload(Submission.evidence_links)
            .joinedload(SubmissionEvidence.evidence)
            .joinedload(Evidence.metric),
        )
        .filter(Submission.id == submission_id)
        .first()
    )


def serialize_submission(db: Session, row: Submission) -> SubmissionOut:
    files, size = _submission_size(db, row)
    return SubmissionOut(
        id=row.id,
        title=row.title,
        criterion=f"{row.criterion.code} — {row.criterion.title}" if row.criterion else "—",
        department=row.department.name if row.department else "—",
        submitted_by=row.submitted_by.name if row.submitted_by else "—",
        submitted_at=format_date(row.submitted_at),
        updated_at=format_date(row.updated_at) or "",
        status=submission_label(row.status),
        files=files,
        size=format_bytes(size),
        correction_note=row.correction_note,
        correction_by=row.correction_by.name if row.correction_by else None,
        correction_at=format_datetime(row.correction_at),
        ref_code=row.ref_code,
        workflow=_workflow_out(row),
        cycle_id=row.cycle_id,
        criterion_id=row.criterion_id,
        department_id=row.department_id,
    )


def list_submissions(
    db: Session,
    institution_id: str,
    *,
    cycle_id: str | None = None,
    status_filter: str | None = None,
    q: str | None = None,
) -> SubmissionListResponse:
    cycle = resolve_cycle(db, institution_id, cycle_id)
    if not cycle:
        return SubmissionListResponse(stats=[], submissions=[])

    rows = (
        db.query(Submission)
        .options(
            joinedload(Submission.criterion),
            joinedload(Submission.department),
            joinedload(Submission.submitted_by),
            joinedload(Submission.correction_by),
            joinedload(Submission.review_actions),
            joinedload(Submission.evidence_links)
            .joinedload(SubmissionEvidence.evidence)
            .joinedload(Evidence.file_upload),
        )
        .filter(Submission.institution_id == institution_id, Submission.cycle_id == cycle.id)
        .order_by(Submission.updated_at.desc())
        .all()
    )
    if status_filter and status_filter != "all":
        rows = [r for r in rows if submission_label(r.status) == status_filter]
    if q:
        ql = q.lower()
        rows = [
            r
            for r in rows
            if ql in r.title.lower()
            or (r.department and ql in r.department.name.lower())
            or (r.criterion and ql in r.criterion.code.lower())
        ]

    all_rows = (
        db.query(Submission)
        .filter(Submission.institution_id == institution_id, Submission.cycle_id == cycle.id)
        .all()
    )
    total = len(all_rows)
    submitted = sum(1 for r in all_rows if r.status == SubmissionStatus.SUBMITTED)
    under = sum(1 for r in all_rows if r.status == SubmissionStatus.UNDER_REVIEW)
    correction = sum(1 for r in all_rows if r.status == SubmissionStatus.NEEDS_CORRECTION)
    stats = [
        StatOut(
            id="total",
            label="Total Submissions",
            value=str(total),
            hint="Across departments",
            tone="primary",
        ),
        StatOut(
            id="submitted",
            label="Submitted",
            value=str(submitted),
            hint=f"{(100 * submitted / total):.1f}% of total" if total else "0%",
            tone="info",
        ),
        StatOut(
            id="review",
            label="Under Review",
            value=str(under),
            hint="In IQAC pipeline",
            tone="info",
        ),
        StatOut(
            id="correction",
            label="Needs Correction",
            value=str(correction),
            hint="High Priority",
            tone="warning",
            badge="High Priority" if correction else None,
        ),
    ]
    return SubmissionListResponse(
        stats=stats, submissions=[serialize_submission(db, r) for r in rows]
    )


def create_submission(db: Session, actor: User, payload: SubmissionCreate) -> SubmissionOut:
    cycle = db.get(AccreditationCycle, payload.cycle_id)
    if not cycle or cycle.institution_id != actor.institution_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cycle not found")
    criterion = db.get(Criterion, payload.criterion_id)
    if not criterion or criterion.cycle_id != cycle.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Criterion not found")
    department = db.get(Department, payload.department_id)
    if not department or department.institution_id != actor.institution_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Department not found")

    count = db.query(Submission).filter(Submission.cycle_id == cycle.id).count() + 1
    year = datetime.utcnow().year
    ref = f"S-{count:02d}-{year}-{criterion.code}-R01"

    row = Submission(
        institution_id=actor.institution_id,
        cycle_id=payload.cycle_id,
        criterion_id=payload.criterion_id,
        department_id=payload.department_id,
        submitted_by_id=actor.id,
        title=payload.title,
        ref_code=ref,
        status=SubmissionStatus.DRAFT,
        assigned_to_id=payload.assigned_to_id,
    )
    db.add(row)
    db.flush()
    for eid in payload.evidence_ids:
        ev = db.get(Evidence, eid)
        if not ev or ev.institution_id != actor.institution_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=f"Evidence not found: {eid}"
            )
        db.add(SubmissionEvidence(submission_id=row.id, evidence_id=eid))
    _init_workflow(db, row)
    db.add(
        AuditLog(
            institution_id=actor.institution_id,
            actor_id=actor.id,
            action="SUBMISSION_CREATED",
            entity_type="Submission",
            entity_id=row.id,
            log_metadata={"title": payload.title},
        )
    )
    db.commit()
    loaded = _load_submission(db, row.id)
    assert loaded is not None
    return serialize_submission(db, loaded)


def get_submission(db: Session, actor: User, submission_id: str) -> SubmissionOut:
    row = _load_submission(db, submission_id)
    if not row or row.institution_id != actor.institution_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    return serialize_submission(db, row)


def submit_submission(db: Session, actor: User, submission_id: str) -> SubmissionOut:
    row = _load_submission(db, submission_id)
    if not row or row.institution_id != actor.institution_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    if row.status not in (SubmissionStatus.DRAFT, SubmissionStatus.NEEDS_CORRECTION):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft/correction submissions can be submitted",
        )
    row.status = SubmissionStatus.SUBMITTED
    row.submitted_at = datetime.utcnow()
    row.updated_at = datetime.utcnow()
    row.correction_note = None
    _sync_workflow(db, row)
    db.add(
        AuditLog(
            institution_id=actor.institution_id,
            actor_id=actor.id,
            action="SUBMISSION_SUBMITTED",
            entity_type="Submission",
            entity_id=row.id,
        )
    )
    db.commit()
    loaded = _load_submission(db, submission_id)
    assert loaded is not None
    return serialize_submission(db, loaded)


def request_correction(
    db: Session, actor: User, submission_id: str, payload: CorrectionRequest
) -> SubmissionOut:
    row = _load_submission(db, submission_id)
    if not row or row.institution_id != actor.institution_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    row.status = SubmissionStatus.NEEDS_CORRECTION
    row.correction_note = payload.note
    row.correction_by_id = actor.id
    row.correction_at = datetime.utcnow()
    row.updated_at = datetime.utcnow()
    _sync_workflow(db, row)
    db.add(
        AuditLog(
            institution_id=actor.institution_id,
            actor_id=actor.id,
            action="SUBMISSION_CORRECTION_REQUESTED",
            entity_type="Submission",
            entity_id=row.id,
            log_metadata={"note": payload.note},
        )
    )
    db.commit()
    loaded = _load_submission(db, submission_id)
    assert loaded is not None
    return serialize_submission(db, loaded)


def approve_submission(db: Session, actor: User, submission_id: str) -> SubmissionOut:
    row = _load_submission(db, submission_id)
    if not row or row.institution_id != actor.institution_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    row.status = SubmissionStatus.APPROVED
    row.updated_at = datetime.utcnow()
    row.correction_note = None
    _sync_workflow(db, row)
    db.add(
        AuditLog(
            institution_id=actor.institution_id,
            actor_id=actor.id,
            action="SUBMISSION_APPROVED",
            entity_type="Submission",
            entity_id=row.id,
        )
    )
    db.commit()
    loaded = _load_submission(db, submission_id)
    assert loaded is not None
    return serialize_submission(db, loaded)


def start_review(db: Session, actor: User, submission_id: str) -> SubmissionOut:
    row = _load_submission(db, submission_id)
    if not row or row.institution_id != actor.institution_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    row.status = SubmissionStatus.UNDER_REVIEW
    if not row.assigned_to_id:
        row.assigned_to_id = actor.id
    row.updated_at = datetime.utcnow()
    _sync_workflow(db, row)
    db.commit()
    loaded = _load_submission(db, submission_id)
    assert loaded is not None
    return serialize_submission(db, loaded)


def list_review_queue(
    db: Session,
    institution_id: str,
    *,
    cycle_id: str | None = None,
    status_filter: str | None = None,
    q: str | None = None,
) -> ReviewListResponse:
    cycle = resolve_cycle(db, institution_id, cycle_id)
    if not cycle:
        return ReviewListResponse(stats=[], queue=[])

    rows = (
        db.query(Submission)
        .options(
            joinedload(Submission.criterion),
            joinedload(Submission.department),
            joinedload(Submission.submitted_by),
            joinedload(Submission.assigned_to),
            joinedload(Submission.review_actions),
            joinedload(Submission.evidence_links)
            .joinedload(SubmissionEvidence.evidence)
            .joinedload(Evidence.metric),
        )
        .filter(
            Submission.institution_id == institution_id,
            Submission.cycle_id == cycle.id,
            Submission.status != SubmissionStatus.DRAFT,
        )
        .order_by(Submission.updated_at.desc())
        .all()
    )

    if status_filter and status_filter != "all":
        filtered = []
        for r in rows:
            label = submission_label(r.status)
            if status_filter == "Pending" and r.status == SubmissionStatus.SUBMITTED:
                filtered.append(r)
            elif status_filter == "Needs Attention" and r.status == SubmissionStatus.NEEDS_CORRECTION:
                filtered.append(r)
            elif label == status_filter:
                filtered.append(r)
        rows = filtered

    if q:
        ql = q.lower()
        rows = [
            r
            for r in rows
            if ql in r.title.lower()
            or (r.department and ql in r.department.name.lower())
            or (r.ref_code and ql in r.ref_code.lower())
        ]

    queue: list[ReviewQueueItemOut] = []
    for r in rows:
        current = next(
            (a for a in r.review_actions if a.state == ReviewStepState.CURRENT), None
        )
        stage = REVIEW_STAGE_SHORT[current.stage] if current else submission_label(r.status)
        metric_code = "—"
        if r.evidence_links:
            ev = r.evidence_links[0].evidence
            if ev and ev.metric:
                metric_code = f"Metric {ev.metric.code} — {ev.metric.name}"
        ui_status = submission_label(r.status)
        if r.status == SubmissionStatus.SUBMITTED:
            ui_status = "Pending"
        queue.append(
            ReviewQueueItemOut(
                id=r.id,
                ref=r.ref_code or r.id[:8],
                title=r.title,
                metric=metric_code,
                department=r.department.name if r.department else "—",
                stage=stage,
                assigned_to=r.assigned_to.name if r.assigned_to else None,
                status=ui_status,
                criterion=f"{r.criterion.code}: {r.criterion.title}" if r.criterion else "—",
                description=r.title,
                submitted_by=r.submitted_by.name if r.submitted_by else "—",
                submitted_at=format_date(r.submitted_at),
                updated_at=format_date(r.updated_at) or "",
                alert=r.correction_note if r.status == SubmissionStatus.NEEDS_CORRECTION else None,
                alert_at=(
                    format_datetime(r.correction_at)
                    if r.status == SubmissionStatus.NEEDS_CORRECTION
                    else None
                ),
                workflow=_workflow_out(r),
            )
        )

    all_rows = (
        db.query(Submission)
        .filter(
            Submission.institution_id == institution_id,
            Submission.cycle_id == cycle.id,
            Submission.status != SubmissionStatus.DRAFT,
        )
        .all()
    )
    pending = sum(1 for r in all_rows if r.status == SubmissionStatus.SUBMITTED)
    under = sum(1 for r in all_rows if r.status == SubmissionStatus.UNDER_REVIEW)
    correction = sum(1 for r in all_rows if r.status == SubmissionStatus.NEEDS_CORRECTION)
    approved = sum(1 for r in all_rows if r.status == SubmissionStatus.APPROVED)
    stats = [
        StatOut(
            id="pending",
            label="Pending Review",
            value=str(pending),
            hint="Awaiting initial evaluation",
            tone="primary",
        ),
        StatOut(
            id="active",
            label="Under Review",
            value=str(under),
            hint="In reviewer / committee track",
            tone="info",
        ),
        StatOut(
            id="correction",
            label="Needs Correction",
            value=str(correction),
            hint="Returned with remarks",
            tone="warning",
            badge="High Priority" if correction else None,
        ),
        StatOut(
            id="approved",
            label="Approved",
            value=str(approved),
            hint="Ready for SSR compilation",
            tone="success",
        ),
    ]
    return ReviewListResponse(stats=stats, queue=queue)
