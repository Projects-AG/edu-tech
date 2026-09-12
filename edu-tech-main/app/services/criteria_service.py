"""Criteria catalog + progress cards."""

from __future__ import annotations

from sqlalchemy.orm import Session, joinedload

from app.models.models import (
    AccreditationCycle,
    Criterion,
    Department,
    Evidence,
    EvidenceStatus,
    KeyIndicator,
    Submission,
    SubmissionStatus,
)
from app.schemas.naac import (
    CriteriaListResponse,
    CriterionCardOut,
    CriterionOut,
    KeyIndicatorOut,
    MetricOut,
    StatOut,
)
from app.services.naac_labels import criterion_status


def resolve_cycle(
    db: Session, institution_id: str, cycle_id: str | None = None
) -> AccreditationCycle | None:
    q = db.query(AccreditationCycle).filter(AccreditationCycle.institution_id == institution_id)
    if cycle_id:
        return q.filter(AccreditationCycle.id == cycle_id).first()
    return (
        q.filter(AccreditationCycle.is_active.is_(True))
        .order_by(AccreditationCycle.created_at.desc())
        .first()
    )


def metric_ids_for_criterion(criterion: Criterion) -> list[str]:
    ids: list[str] = []
    for ki in criterion.key_indicators:
        ids.extend(m.id for m in ki.metrics)
    return ids


def build_criterion_card(
    db: Session, criterion: Criterion, cycle_id: str, institution_id: str
) -> CriterionCardOut:
    metric_ids = metric_ids_for_criterion(criterion)
    rows: list[Evidence] = []
    if metric_ids:
        rows = (
            db.query(Evidence)
            .filter(
                Evidence.cycle_id == cycle_id,
                Evidence.institution_id == institution_id,
                Evidence.metric_id.in_(metric_ids),
            )
            .all()
        )

    verified = sum(1 for e in rows if e.status == EvidenceStatus.VERIFIED)
    pending = sum(
        1
        for e in rows
        if e.status in (EvidenceStatus.PENDING_REVIEW, EvidenceStatus.NEEDS_CORRECTION)
    )
    if rows:
        percent = int(round(100 * verified / len(rows)))
        evidence_txt = f"{verified}/{len(rows)}"
    else:
        percent = 0
        evidence_txt = f"0/{max(len(metric_ids), 1)}"

    dept_count = 0
    if metric_ids:
        dept_count = (
            db.query(Evidence.department_id)
            .filter(
                Evidence.cycle_id == cycle_id,
                Evidence.institution_id == institution_id,
                Evidence.metric_id.in_(metric_ids),
            )
            .distinct()
            .count()
        )
    if not dept_count:
        dept_count = db.query(Department).filter(Department.institution_id == institution_id).count()

    approved = (
        db.query(Submission)
        .filter(
            Submission.cycle_id == cycle_id,
            Submission.criterion_id == criterion.id,
            Submission.status == SubmissionStatus.APPROVED,
        )
        .count()
    )
    if approved and percent < 100:
        percent = min(100, percent + 5 * approved)

    return CriterionCardOut(
        id=criterion.id,
        code=criterion.code,
        title=criterion.title,
        description=criterion.description,
        status=criterion_status(percent, pending),
        percent=percent,
        evidence=evidence_txt,
        pending=pending,
        departments=dept_count,
        lead_label=criterion.lead_label,
    )


def list_criteria_cards(
    db: Session, institution_id: str, cycle_id: str | None = None
) -> CriteriaListResponse:
    cycle = resolve_cycle(db, institution_id, cycle_id)
    if not cycle:
        return CriteriaListResponse(stats=[], items=[])

    criteria = (
        db.query(Criterion)
        .options(joinedload(Criterion.key_indicators).joinedload(KeyIndicator.metrics))
        .filter(Criterion.cycle_id == cycle.id)
        .order_by(Criterion.sort_order)
        .all()
    )
    items = [build_criterion_card(db, c, cycle.id, institution_id) for c in criteria]
    n = len(items) or 1
    completed = sum(1 for c in items if c.status == "Completed")
    in_progress = sum(1 for c in items if c.status == "In Progress")
    attention = sum(1 for c in items if c.status == "Needs Attention")

    stats = [
        StatOut(
            id="total",
            label="Total Criteria",
            value=str(len(items)),
            hint="NAAC Manual v4.0",
            tone="primary",
        ),
        StatOut(
            id="completed",
            label="Completed",
            value=str(completed),
            hint=f"{100 * completed / n:.1f}% verified",
            tone="success",
        ),
        StatOut(
            id="progress",
            label="In Progress",
            value=str(in_progress),
            hint=f"{100 * in_progress / n:.1f}% active",
            tone="info",
        ),
        StatOut(
            id="attention",
            label="Needs Attention",
            value=str(attention),
            hint="Coordinator follow-up",
            tone="warning",
        ),
    ]
    return CriteriaListResponse(stats=stats, items=items)


def get_criterion_detail(
    db: Session, institution_id: str, criterion_id: str
) -> CriterionOut | None:
    criterion = (
        db.query(Criterion)
        .options(joinedload(Criterion.key_indicators).joinedload(KeyIndicator.metrics))
        .filter(Criterion.id == criterion_id)
        .first()
    )
    if not criterion:
        return None
    cycle = db.get(AccreditationCycle, criterion.cycle_id)
    if not cycle or cycle.institution_id != institution_id:
        return None

    kis: list[KeyIndicatorOut] = []
    for ki in sorted(criterion.key_indicators, key=lambda x: x.sort_order):
        metrics = [
            MetricOut.model_validate(m) for m in sorted(ki.metrics, key=lambda x: x.sort_order)
        ]
        # MetricOut expects weightage / sort_order — map from ORM if needed
        kis.append(
            KeyIndicatorOut(
                id=ki.id,
                code=ki.code,
                name=ki.name,
                sort_order=ki.sort_order,
                metrics=metrics,
            )
        )
    return CriterionOut(
        id=criterion.id,
        cycle_id=criterion.cycle_id,
        code=criterion.code,
        title=criterion.title,
        description=criterion.description,
        sort_order=criterion.sort_order,
        in_charge_user_id=criterion.in_charge_user_id,
        lead_label=criterion.lead_label,
        key_indicators=kis,
    )
