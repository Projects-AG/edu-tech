"""Coordinator aggregate endpoints: dashboard + department progress."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.models import (
    Criterion,
    Department,
    Evidence,
    EvidenceStatus,
    KeyIndicator,
    RoleAssignment,
    RoleName,
    Submission,
    SubmissionStatus,
    User,
)
from app.schemas.naac import (
    AttentionItemOut,
    CoordinatorDashboardOut,
    CoordinatorDepartmentsResponse,
    CriteriaProgressOut,
    DashboardInstitutionOut,
    DashboardStatOut,
    DepartmentProgressOut,
    DeptCriteriaBreakdownOut,
    RecentSubmissionOut,
    StatOut,
)
from app.services.criteria_service import (
    list_criteria_cards,
    metric_ids_for_criterion,
    resolve_cycle,
)
from app.services.naac_labels import cycle_label, department_status, submission_label


def coordinator_dashboard(
    db: Session, actor: User, cycle_id: str | None = None
) -> CoordinatorDashboardOut:
    cycle = resolve_cycle(db, actor.institution_id, cycle_id)
    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No active accreditation cycle"
        )

    institution = actor.institution
    ay = cycle.academic_year
    criteria_resp = list_criteria_cards(db, actor.institution_id, cycle.id)
    items = criteria_resp.items
    completed = sum(1 for c in items if c.status == "Completed")
    overall = int(round(sum(c.percent for c in items) / len(items))) if items else 0

    evidence = (
        db.query(Evidence)
        .filter(Evidence.institution_id == actor.institution_id, Evidence.cycle_id == cycle.id)
        .all()
    )
    verified = sum(1 for e in evidence if e.status == EvidenceStatus.VERIFIED)
    pending_reviews = (
        db.query(Submission)
        .filter(
            Submission.institution_id == actor.institution_id,
            Submission.cycle_id == cycle.id,
            Submission.status.in_(
                [SubmissionStatus.SUBMITTED, SubmissionStatus.UNDER_REVIEW]
            ),
        )
        .count()
    )
    attention = sum(1 for c in items if c.status == "Needs Attention")

    stats = [
        DashboardStatOut(
            id="overall",
            label="Overall Progress",
            value=f"{overall}%",
            delta=None,
            delta_up=True,
            hint=f"SSR target {cycle.ssr_target_percent}%",
            tone="primary",
        ),
        DashboardStatOut(
            id="criteria",
            label="Criteria Completed",
            value=f"{completed} / {len(items)}",
            badge=f"{completed} Ready" if completed else None,
            hint=f"{len(items) - completed} in active progress",
            tone="success",
        ),
        DashboardStatOut(
            id="evidence",
            label="Evidence Collected",
            value=f"{verified} / {len(evidence) or 1}",
            badge=f"{(100 * verified / len(evidence)):.1f}%" if evidence else "0%",
            hint="Compliance ready files",
            tone="info",
        ),
        DashboardStatOut(
            id="reviews",
            label="Pending Reviews",
            value=str(pending_reviews),
            badge="Action Req" if pending_reviews else None,
            hint="Awaiting coordinator sign-off",
            tone="warning",
        ),
        DashboardStatOut(
            id="attention",
            label="Needs Attention",
            value=str(attention),
            badge="Critical" if attention else None,
            hint="Action required immediately",
            tone="error",
        ),
    ]

    progress = []
    for c in items:
        parts = c.evidence.split("/")
        collected = int(parts[0]) if len(parts) == 2 else 0
        total = int(parts[1]) if len(parts) == 2 else 0
        progress.append(
            CriteriaProgressOut(
                id=c.id,
                code=c.code,
                name=c.title if c.title.startswith("Criterion") else f"{c.code}: {c.title}",
                lead=c.lead_label,
                evidence_collected=collected,
                evidence_total=total,
                percent=c.percent,
                status=c.status,
            )
        )

    attention_items: list[AttentionItemOut] = []
    for c in items:
        if c.status == "Needs Attention":
            attention_items.append(
                AttentionItemOut(
                    id=c.id,
                    title=f"{c.code}: {c.title} needs attention",
                    status="Needs Attention",
                    action_label="Review",
                    action_path="/app/reviews",
                )
            )
    corr_subs = (
        db.query(Submission)
        .filter(
            Submission.institution_id == actor.institution_id,
            Submission.cycle_id == cycle.id,
            Submission.status == SubmissionStatus.NEEDS_CORRECTION,
        )
        .limit(5)
        .all()
    )
    for s in corr_subs:
        attention_items.append(
            AttentionItemOut(
                id=s.id,
                title=s.title,
                status="Needs Correction",
                action_label="Resolve",
                action_path="/app/submissions",
            )
        )

    recent = (
        db.query(Submission)
        .options(joinedload(Submission.criterion), joinedload(Submission.department))
        .filter(
            Submission.institution_id == actor.institution_id, Submission.cycle_id == cycle.id
        )
        .order_by(Submission.updated_at.desc())
        .limit(5)
        .all()
    )
    recent_out = [
        RecentSubmissionOut(
            id=s.id,
            title=s.title,
            criterion=s.criterion.code if s.criterion else "—",
            department=s.department.name if s.department else "—",
            status=submission_label(s.status),
            path="/app/reviews" if s.status != SubmissionStatus.DRAFT else "/app/submissions",
        )
        for s in recent
    ]

    return CoordinatorDashboardOut(
        institution=DashboardInstitutionOut(
            name=institution.name if institution else "Institution",
            aishe=institution.naac_id if institution else None,
            track=institution.type if institution else None,
            cycle=f"{cycle.title} ({cycle.label})",
            academic_year=ay.label if ay else cycle.label,
            expected_submission=cycle.expected_submission,
            ssr_target_percent=cycle.ssr_target_percent,
            ssr_current_percent=overall,
            preparation_status=cycle_label(cycle.status),
        ),
        stats=stats,
        criteria_progress=progress,
        attention_items=attention_items[:8],
        recent_submissions=recent_out,
        cycle_id=cycle.id,
    )


def coordinator_departments(
    db: Session, actor: User, cycle_id: str | None = None
) -> CoordinatorDepartmentsResponse:
    cycle = resolve_cycle(db, actor.institution_id, cycle_id)
    if not cycle:
        return CoordinatorDepartmentsResponse(stats=[], departments=[])

    departments = (
        db.query(Department)
        .filter(Department.institution_id == actor.institution_id)
        .order_by(Department.code)
        .all()
    )
    criteria = (
        db.query(Criterion)
        .options(joinedload(Criterion.key_indicators).joinedload(KeyIndicator.metrics))
        .filter(Criterion.cycle_id == cycle.id)
        .all()
    )
    criteria_total = len(criteria) or 7
    target = 80
    out: list[DepartmentProgressOut] = []

    for dept in departments:
        evidence_rows = (
            db.query(Evidence)
            .filter(
                Evidence.institution_id == actor.institution_id,
                Evidence.cycle_id == cycle.id,
                Evidence.department_id == dept.id,
            )
            .all()
        )
        uploaded = len(evidence_rows)
        metric_total = sum(len(list(ki.metrics)) for c in criteria for ki in c.key_indicators) or 1
        evidence_total = max(metric_total // max(len(departments), 1), uploaded, 1)
        verified = sum(1 for e in evidence_rows if e.status == EvidenceStatus.VERIFIED)
        pending_ev = sum(
            1
            for e in evidence_rows
            if e.status in (EvidenceStatus.PENDING_REVIEW, EvidenceStatus.NEEDS_CORRECTION)
        )

        subs = (
            db.query(Submission)
            .filter(
                Submission.institution_id == actor.institution_id,
                Submission.cycle_id == cycle.id,
                Submission.department_id == dept.id,
            )
            .all()
        )
        subs_done = sum(1 for s in subs if s.status == SubmissionStatus.APPROVED)
        criteria_done = len({s.criterion_id for s in subs if s.status == SubmissionStatus.APPROVED})
        progress = int(round(100 * verified / evidence_total)) if evidence_total else 0
        if criteria_done and criteria_total:
            progress = max(progress, int(round(100 * criteria_done / criteria_total)))

        lead = (
            db.query(User)
            .join(RoleAssignment, RoleAssignment.user_id == User.id)
            .filter(
                User.department_id == dept.id,
                RoleAssignment.role.in_(
                    [
                        RoleName.DEPARTMENT_CONTRIBUTOR,
                        RoleName.FACULTY,
                        RoleName.CRITERION_INCHARGE,
                    ]
                ),
            )
            .first()
        )
        pending_tasks = pending_ev + sum(
            1
            for s in subs
            if s.status in (SubmissionStatus.NEEDS_CORRECTION, SubmissionStatus.SUBMITTED)
        )
        out.append(
            DepartmentProgressOut(
                id=dept.id,
                code=dept.code,
                name=dept.name,
                coordinator=lead.name if lead else None,
                email=lead.email if lead else None,
                progress=min(progress, 100),
                target=target,
                status=department_status(progress, target, pending_tasks),
                evidence_uploaded=uploaded,
                evidence_total=evidence_total,
                criteria_done=criteria_done,
                criteria_total=criteria_total,
                submissions_done=subs_done,
                submissions_total=max(len(subs), criteria_total),
                pending_tasks=pending_tasks,
            )
        )

    total = len(out) or 1
    on_track = sum(1 for d in out if d.status == "On Track")
    attention = sum(1 for d in out if d.status == "Needs Attention")
    done = sum(1 for d in out if d.status == "Completed")
    stats = [
        StatOut(
            id="total",
            label="Total Departments",
            value=str(len(out)),
            hint="All academic units",
            tone="primary",
        ),
        StatOut(
            id="track",
            label="On Track",
            value=str(on_track),
            hint=f"{100 * on_track / total:.1f}% meeting milestones",
            tone="success",
        ),
        StatOut(
            id="attention",
            label="Needs Attention",
            value=str(attention),
            hint="Coordinator follow-up",
            tone="warning",
        ),
        StatOut(
            id="done",
            label="Completed",
            value=str(done),
            hint="100% submissions verified",
            tone="info",
        ),
    ]
    return CoordinatorDepartmentsResponse(stats=stats, departments=out)


def department_criteria_breakdown(
    db: Session, actor: User, department_id: str, cycle_id: str | None = None
) -> list[DeptCriteriaBreakdownOut]:
    cycle = resolve_cycle(db, actor.institution_id, cycle_id)
    if not cycle:
        return []
    department = db.get(Department, department_id)
    if not department or department.institution_id != actor.institution_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    criteria = (
        db.query(Criterion)
        .options(joinedload(Criterion.key_indicators).joinedload(KeyIndicator.metrics))
        .filter(Criterion.cycle_id == cycle.id)
        .order_by(Criterion.sort_order)
        .all()
    )
    result: list[DeptCriteriaBreakdownOut] = []
    for c in criteria:
        metric_ids = metric_ids_for_criterion(c)
        rows: list[Evidence] = []
        if metric_ids:
            rows = (
                db.query(Evidence)
                .filter(
                    Evidence.cycle_id == cycle.id,
                    Evidence.department_id == department_id,
                    Evidence.metric_id.in_(metric_ids),
                )
                .all()
            )
        verified = sum(1 for e in rows if e.status == EvidenceStatus.VERIFIED)
        percent = int(round(100 * verified / len(rows))) if rows else 0
        pending = sum(1 for e in rows if e.status != EvidenceStatus.VERIFIED)
        result.append(
            DeptCriteriaBreakdownOut(
                code=c.code,
                name=c.title,
                percent=percent,
                status=department_status(percent, 80, pending),
            )
        )
    return result
