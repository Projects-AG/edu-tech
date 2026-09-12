"""Evidence registry for Documents & Evidence page."""

from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.models import (
    AccreditationCycle,
    AuditLog,
    Department,
    Evidence,
    EvidenceStatus,
    FileUpload,
    KeyIndicator,
    Metric,
    RoleAssignment,
    User,
)
from app.schemas.naac import (
    EvidenceCreate,
    EvidenceListResponse,
    EvidenceOut,
    EvidenceStatusUpdate,
    StatOut,
)
from app.services.criteria_service import resolve_cycle
from app.services.naac_labels import (
    evidence_label,
    file_type_from_mime,
    format_bytes,
    format_date,
)


def _role_label(db: Session, user_id: str) -> str | None:
    assignment = db.query(RoleAssignment).filter(RoleAssignment.user_id == user_id).first()
    if not assignment:
        return None
    return assignment.role.value.replace("_", " ").title()


def _load_evidence(db: Session, evidence_id: str) -> Evidence | None:
    return (
        db.query(Evidence)
        .options(
            joinedload(Evidence.metric)
            .joinedload(Metric.key_indicator)
            .joinedload(KeyIndicator.criterion),
            joinedload(Evidence.department),
            joinedload(Evidence.file_upload),
            joinedload(Evidence.uploaded_by),
        )
        .filter(Evidence.id == evidence_id)
        .first()
    )


def serialize_evidence(db: Session, row: Evidence) -> EvidenceOut:
    metric = row.metric
    ki = metric.key_indicator if metric else None
    criterion = ki.criterion if ki else None
    fu = row.file_upload
    mime = fu.mime_type if fu else None
    fname = fu.file_name if fu else None
    size = fu.size_bytes if fu else 0
    ftype = file_type_from_mime(mime, fname)
    crit = (
        f"Criterion {criterion.code.replace('C', '')}: {criterion.title}" if criterion else "—"
    )
    meta = f"Metric {metric.code} · {format_bytes(size)} {ftype}" if metric else format_bytes(size)
    return EvidenceOut(
        id=row.id,
        name=row.title,
        meta=meta,
        type=ftype,
        criterion=crit,
        department=row.department.name if row.department else "—",
        unit=row.unit,
        uploaded_by=row.uploaded_by.name if row.uploaded_by else "—",
        role=_role_label(db, row.uploaded_by_id),
        uploaded_at=format_date(row.created_at) or "",
        status=evidence_label(row.status),
        metric_code=metric.code if metric else None,
        file_upload_id=row.file_upload_id,
        cycle_id=row.cycle_id,
    )


def list_evidence(
    db: Session,
    institution_id: str,
    *,
    cycle_id: str | None = None,
    status_filter: str | None = None,
    criterion_id: str | None = None,
    department_id: str | None = None,
    q: str | None = None,
) -> EvidenceListResponse:
    cycle = resolve_cycle(db, institution_id, cycle_id)
    if not cycle:
        return EvidenceListResponse(stats=[], documents=[])

    query = (
        db.query(Evidence)
        .options(
            joinedload(Evidence.metric)
            .joinedload(Metric.key_indicator)
            .joinedload(KeyIndicator.criterion),
            joinedload(Evidence.department),
            joinedload(Evidence.file_upload),
            joinedload(Evidence.uploaded_by),
        )
        .filter(Evidence.institution_id == institution_id, Evidence.cycle_id == cycle.id)
    )
    if department_id:
        query = query.filter(Evidence.department_id == department_id)
    if criterion_id:
        query = (
            query.join(Metric, Evidence.metric_id == Metric.id)
            .join(KeyIndicator, Metric.key_indicator_id == KeyIndicator.id)
            .filter(KeyIndicator.criterion_id == criterion_id)
        )

    rows = query.order_by(Evidence.created_at.desc()).all()
    if status_filter and status_filter != "all":
        rows = [r for r in rows if evidence_label(r.status) == status_filter]
    if q:
        ql = q.lower()
        rows = [
            r
            for r in rows
            if ql in r.title.lower()
            or (r.department and ql in r.department.name.lower())
            or (r.metric and ql in r.metric.code.lower())
        ]

    all_rows = (
        db.query(Evidence)
        .filter(Evidence.institution_id == institution_id, Evidence.cycle_id == cycle.id)
        .all()
    )
    total = len(all_rows)
    verified = sum(1 for r in all_rows if r.status == EvidenceStatus.VERIFIED)
    pending = sum(1 for r in all_rows if r.status == EvidenceStatus.PENDING_REVIEW)
    correction = sum(1 for r in all_rows if r.status == EvidenceStatus.NEEDS_CORRECTION)
    pct = f"{(100 * verified / total):.1f}% compliance ready" if total else "No documents yet"

    stats = [
        StatOut(
            id="total",
            label="Total Documents",
            value=str(total),
            hint="Across 7 NAAC criteria",
            tone="primary",
        ),
        StatOut(id="verified", label="Verified", value=str(verified), hint=pct, tone="success"),
        StatOut(
            id="pending",
            label="Pending Verification",
            value=str(pending),
            hint="Requires IQAC audit",
            tone="warning",
        ),
        StatOut(
            id="correction",
            label="Needs Correction",
            value=str(correction),
            hint="Returned to departments",
            tone="error",
        ),
    ]
    return EvidenceListResponse(
        stats=stats, documents=[serialize_evidence(db, r) for r in rows]
    )


def create_evidence(db: Session, actor: User, payload: EvidenceCreate) -> EvidenceOut:
    cycle = db.get(AccreditationCycle, payload.cycle_id)
    if not cycle or cycle.institution_id != actor.institution_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cycle not found")
    if not db.get(Metric, payload.metric_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Metric not found")
    department = db.get(Department, payload.department_id)
    if not department or department.institution_id != actor.institution_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Department not found")
    file_upload = db.get(FileUpload, payload.file_upload_id)
    if not file_upload or file_upload.institution_id != actor.institution_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File upload not found")

    row = Evidence(
        institution_id=actor.institution_id,
        cycle_id=payload.cycle_id,
        metric_id=payload.metric_id,
        department_id=payload.department_id,
        file_upload_id=payload.file_upload_id,
        uploaded_by_id=actor.id,
        title=payload.title,
        unit=payload.unit,
        notes=payload.notes,
        status=EvidenceStatus.PENDING_REVIEW,
    )
    db.add(row)
    db.flush()
    db.add(
        AuditLog(
            institution_id=actor.institution_id,
            actor_id=actor.id,
            action="EVIDENCE_CREATED",
            entity_type="Evidence",
            entity_id=row.id,
            log_metadata={"title": payload.title},
        )
    )
    db.commit()
    loaded = _load_evidence(db, row.id)
    assert loaded is not None
    return serialize_evidence(db, loaded)


def update_evidence_status(
    db: Session, actor: User, evidence_id: str, payload: EvidenceStatusUpdate
) -> EvidenceOut:
    row = _load_evidence(db, evidence_id)
    if not row or row.institution_id != actor.institution_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found")
    row.status = payload.status
    if payload.notes is not None:
        row.notes = payload.notes
    row.updated_at = datetime.utcnow()
    db.add(
        AuditLog(
            institution_id=actor.institution_id,
            actor_id=actor.id,
            action="EVIDENCE_STATUS_UPDATED",
            entity_type="Evidence",
            entity_id=row.id,
            log_metadata={"status": payload.status.value},
        )
    )
    db.commit()
    loaded = _load_evidence(db, evidence_id)
    assert loaded is not None
    return serialize_evidence(db, loaded)
