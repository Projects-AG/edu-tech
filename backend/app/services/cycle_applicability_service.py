from datetime import datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from fastapi import HTTPException, status

from app.models.cycle_applicable_metric import CycleApplicableMetric
from app.models.criterion import Criterion
from app.models.metric import CATALOG_KIND_OFFICIAL, Metric
from app.models.naac_framework import NaacFramework
from app.models.section import Section
from app.services.audit_service import record_audit
from app.services.framework_service import (
    cycle_metric_catalog,
    official_operational_metric_rows,
    uses_working_catalog_fallback,
    validate_applicability_exceptions,
)
from app.services.naac_framework_catalog import CODE_INTERNAL


APPLICABILITY_UNCONFIGURED = "UNCONFIGURED"
APPLICABILITY_CONFIGURED = "CONFIGURED"
APPLICABILITY_OFFICIAL_CATALOGUE_INCOMPLETE = "OFFICIAL_CATALOGUE_INCOMPLETE"


def _applicability_audit_snapshot(db: Session, cycle_id: int) -> list[dict]:
    rows = (
        db.query(CycleApplicableMetric)
        .filter(CycleApplicableMetric.cycle_id == cycle_id)
        .order_by(CycleApplicableMetric.metric_id.asc())
        .all()
    )
    return [
        {
            "metric_id": row.metric_id,
            "required": row.required,
            "exception_type": row.exception_type,
        }
        for row in rows
    ]


def cycle_has_applicability_rows(
    db: Session,
    cycle_id: int,
) -> bool:
    return (
        db.query(CycleApplicableMetric.id)
        .filter(CycleApplicableMetric.cycle_id == cycle_id)
        .first()
        is not None
    )


def uses_catalog_fallback(
    db: Session,
    cycle_id: int,
) -> bool:
    """Empty junction means progress/eligibility keep current catalog behavior."""
    return not cycle_has_applicability_rows(db, cycle_id)


def load_applicable_metric_catalog(
    db: Session,
    cycle_id: int,
) -> list[dict]:
    rows = (
        db.query(
            CycleApplicableMetric,
            Metric,
            Section,
            Criterion,
        )
        .join(
            Metric,
            Metric.id == CycleApplicableMetric.metric_id,
        )
        .join(
            Section,
            Section.id == Metric.section_id,
        )
        .join(
            Criterion,
            Criterion.id == Section.criterion_id,
        )
        .filter(CycleApplicableMetric.cycle_id == cycle_id)
        .order_by(Criterion.id.asc(), Metric.id.asc())
        .all()
    )

    catalog = []
    for mapping, metric, _section, criterion in rows:
        catalog.append({
            "mapping_id": mapping.id,
            "cycle_id": mapping.cycle_id,
            "required": mapping.required,
            "metric": metric,
            "metric_id": metric.id,
            "metric_code": metric.code,
            "metric_title": metric.title,
            "catalog_kind": metric.catalog_kind,
            "criterion": criterion,
            "criterion_id": criterion.id,
            "criterion_number": criterion.number,
            "criterion_title": criterion.title,
        })
    return catalog


def _serialize_official_operational_metric(db: Session, identity, metric: Metric) -> dict:
    criterion = None
    section = (
        db.query(Section)
        .filter(Section.id == metric.section_id)
        .first()
    )
    if section:
        criterion = (
            db.query(Criterion)
            .filter(Criterion.id == section.criterion_id)
            .first()
        )
    return {
        "metric_id": metric.id,
        "metric_code": metric.code,
        "metric_title": metric.title,
        "catalog_kind": metric.catalog_kind,
        "framework_metric_id": identity.id,
        "required": False,
        "metric_kind": identity.metric_kind,
        "criterion_id": criterion.id if criterion else None,
        "criterion_number": criterion.number if criterion else None,
        "criterion_title": criterion.title if criterion else None,
        "weightage": metric.weightage,
        "metric_type": metric.metric_type,
    }


def _metric_or_404(db: Session, metric_id: int) -> Metric:
    metric = db.query(Metric).filter(Metric.id == metric_id).first()
    if not metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Metric {metric_id} not found",
        )
    return metric


def _official_operational_ids(db: Session, framework: NaacFramework) -> set[int]:
    return {
        metric.id
        for _identity, metric in official_operational_metric_rows(db, framework)
    }


def _assert_metric_allowed_for_cycle(db: Session, cycle, metric: Metric) -> None:
    if not getattr(cycle, "framework_id", None):
        if metric.catalog_kind == CATALOG_KIND_OFFICIAL:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Official operational metrics cannot be assigned to a "
                    "framework-unbound cycle."
                ),
            )
        return

    framework = (
        db.query(NaacFramework)
        .filter(NaacFramework.id == cycle.framework_id)
        .first()
    )
    if not framework or framework.code == CODE_INTERNAL:
        if metric.catalog_kind == CATALOG_KIND_OFFICIAL:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Official operational metrics cannot be assigned to the "
                    "internal working catalogue."
                ),
            )
        return

    if metric.catalog_kind != CATALOG_KIND_OFFICIAL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Working-catalogue metrics cannot be assigned to an official "
                "framework cycle, even when display codes match."
            ),
        )
    if metric.framework_id != cycle.framework_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Official metrics from another NAAC framework cannot be "
                "assigned to this cycle."
            ),
        )
    if metric.id not in _official_operational_ids(db, framework):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Only this framework's operational metric IDs can be saved "
                "as cycle applicability."
            ),
        )


def _official_metric_kind(db: Session, metric: Metric | None) -> str | None:
    if metric is None:
        return None
    from app.services.official_form_service import official_metric_kind

    return official_metric_kind(db, metric)


def _duplicate_metric_ids(metric_ids: list[int]) -> list[int]:
    seen = set()
    duplicates = []
    for metric_id in metric_ids:
        if metric_id in seen and metric_id not in duplicates:
            duplicates.append(metric_id)
        seen.add(metric_id)
    return duplicates


def _serialize_row(
    db: Session,
    row: CycleApplicableMetric,
) -> dict:
    metric = db.query(Metric).filter(Metric.id == row.metric_id).first()
    criterion = None
    if metric:
        section = (
            db.query(Section)
            .filter(Section.id == metric.section_id)
            .first()
        )
        if section:
            criterion = (
                db.query(Criterion)
                .filter(Criterion.id == section.criterion_id)
                .first()
            )

    return {
        "id": row.id,
        "cycle_id": row.cycle_id,
        "metric_id": row.metric_id,
        "required": row.required,
        "exception_type": row.exception_type,
        "justification": row.justification,
        "approved_by": row.approved_by,
        "created_at": row.created_at,
        "metric_code": metric.code if metric else None,
        "metric_title": metric.title if metric else None,
        "catalog_kind": metric.catalog_kind if metric else None,
        "metric_type": metric.metric_type if metric else None,
        "metric_kind": _official_metric_kind(db, metric),
        "weightage": (
            float(metric.weightage)
            if metric is not None and metric.weightage is not None
            else None
        ),
        "criterion_id": criterion.id if criterion else None,
        "criterion_number": criterion.number if criterion else None,
        "criterion_title": criterion.title if criterion else None,
    }


def list_cycle_applicability(
    db: Session,
    cycle,
) -> dict:
    rows = (
        db.query(CycleApplicableMetric)
        .filter(CycleApplicableMetric.cycle_id == cycle.id)
        .order_by(CycleApplicableMetric.id)
        .all()
    )
    serialized = [_serialize_row(db, row) for row in rows]

    criteria_by_id = {}
    for item in serialized:
        if item["criterion_id"] is None:
            continue
        criteria_by_id[item["criterion_id"]] = {
            "id": item["criterion_id"],
            "number": item["criterion_number"],
            "title": item["criterion_title"],
        }

    configured = len(rows) > 0
    catalog_fallback = uses_working_catalog_fallback(db, cycle)
    catalog_kind, _catalog_metrics = cycle_metric_catalog(db, cycle)
    framework = None
    official_criteria = []
    official_operational_metrics = []
    readiness = {}
    if getattr(cycle, "framework_id", None):
        framework = (
            db.query(NaacFramework)
            .filter(NaacFramework.id == cycle.framework_id)
            .first()
        )
        if framework:
            from app.services.framework_service import (
                framework_criteria_payload,
                framework_readiness,
            )
            readiness = framework_readiness(db, framework)
            official_criteria = [
                {
                    "id": item["id"],
                    "number": item["number"],
                    "title": item["title"],
                }
                for item in framework_criteria_payload(db, framework)
            ]
            for identity, metric in official_operational_metric_rows(db, framework):
                official_operational_metrics.append(
                    _serialize_official_operational_metric(db, identity, metric)
                )

    official_catalog_count = len(official_operational_metrics)
    if official_catalog_count == 0 and framework and framework.code != CODE_INTERNAL:
        applicability_status = APPLICABILITY_OFFICIAL_CATALOGUE_INCOMPLETE
    elif configured:
        applicability_status = APPLICABILITY_CONFIGURED
    else:
        applicability_status = APPLICABILITY_UNCONFIGURED

    return {
        "cycle_id": cycle.id,
        "institution_id": cycle.institution_id,
        "configured": configured,
        "uses_catalog_fallback": catalog_fallback,
        "catalog_kind": catalog_kind,
        "applicability_status": applicability_status,
        "official_catalog_metric_count": official_catalog_count,
        "applicable_metric_count": len(serialized),
        "naac_required_optional_verified": False,
        "has_official_operational_metrics": official_catalog_count > 0,
        "framework_id": cycle.framework_id,
        "framework_name": framework.name if framework else None,
        "framework_version": framework.version if framework else None,
        "framework_code": framework.code if framework else None,
        "uses_seven_criteria": (
            framework.uses_seven_criteria if framework else None
        ),
        "criterion_structure_verified": readiness.get(
            "criterion_structure_verified"
        ),
        "metric_catalogue_complete": readiness.get("metric_catalogue_complete"),
        "catalogue_status": readiness.get("catalogue_status"),
        "framework_criteria": official_criteria,
        "applicable_metrics": serialized,
        "applicable_criteria": list(criteria_by_id.values()),
        "official_operational_metrics": official_operational_metrics,
    }


def add_cycle_applicable_metric(
    db: Session,
    cycle,
    metric_id: int,
    required: bool = True,
    actor_user=None,
) -> dict:
    _assert_can_configure_applicability(db, cycle)
    metric = _metric_or_404(db, metric_id)
    _assert_metric_allowed_for_cycle(db, cycle, metric)

    existing = (
        db.query(CycleApplicableMetric)
        .filter(
            CycleApplicableMetric.cycle_id == cycle.id,
            CycleApplicableMetric.metric_id == metric_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Metric is already applicable to this cycle",
        )

    previous = _applicability_audit_snapshot(db, cycle.id)
    row = CycleApplicableMetric(
        cycle_id=cycle.id,
        metric_id=metric_id,
        required=(
            False
            if metric.catalog_kind == CATALOG_KIND_OFFICIAL
            else required
        ),
    )
    db.add(row)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Metric is already applicable to this cycle",
        )
    record_audit(
        db,
        user=actor_user,
        action="CYCLE_APPLICABILITY_ADD",
        entity_type="AccreditationCycle",
        entity_id=cycle.id,
        old_values={"metrics": previous},
        new_values={
            "metrics": _applicability_audit_snapshot(db, cycle.id),
        },
        institution_id=cycle.institution_id,
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Metric is already applicable to this cycle",
        )
    db.refresh(row)
    return _serialize_row(db, row)


def remove_cycle_applicable_metric(
    db: Session,
    cycle,
    metric_id: int,
    actor_user=None,
) -> None:
    _assert_can_configure_applicability(db, cycle)
    row = (
        db.query(CycleApplicableMetric)
        .filter(
            CycleApplicableMetric.cycle_id == cycle.id,
            CycleApplicableMetric.metric_id == metric_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Applicable metric mapping not found for this cycle",
        )
    previous = _applicability_audit_snapshot(db, cycle.id)
    db.delete(row)
    db.flush()
    record_audit(
        db,
        user=actor_user,
        action="CYCLE_APPLICABILITY_REMOVE",
        entity_type="AccreditationCycle",
        entity_id=cycle.id,
        old_values={"metrics": previous},
        new_values={
            "metrics": _applicability_audit_snapshot(db, cycle.id),
        },
        institution_id=cycle.institution_id,
    )
    db.commit()


def _assert_can_configure_applicability(db: Session, cycle) -> None:
    if not getattr(cycle, "framework_id", None):
        return

    framework = (
        db.query(NaacFramework)
        .filter(NaacFramework.id == cycle.framework_id)
        .first()
    )
    if not framework or framework.code == CODE_INTERNAL:
        return
    if not _official_operational_ids(db, framework):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "This framework has no official operational metrics. "
                "Applicability cannot be configured, and the working "
                "catalogue is not used as a substitute. Required, optional, "
                "and not-applicable rules are not inferred."
            ),
        )


def replace_cycle_applicable_metrics(
    db: Session,
    cycle,
    items: list[dict],
    actor_user=None,
) -> dict:
    _assert_can_configure_applicability(db, cycle)
    metric_ids = [item["metric_id"] for item in items]
    duplicates = _duplicate_metric_ids(metric_ids)
    if duplicates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate metric_id values are not allowed",
        )

    metrics_by_id = {}
    for metric_id in metric_ids:
        metric = _metric_or_404(db, metric_id)
        _assert_metric_allowed_for_cycle(db, cycle, metric)
        metrics_by_id[metric_id] = metric

    official_bound = False
    if getattr(cycle, "framework_id", None):
        framework = (
            db.query(NaacFramework)
            .filter(NaacFramework.id == cycle.framework_id)
            .first()
        )
        official_bound = bool(
            framework
            and framework.code != CODE_INTERNAL
            and _official_operational_ids(db, framework)
        )

    previous_snapshot = _applicability_audit_snapshot(db, cycle.id)
    previous_required = set()
    if getattr(cycle, "framework_id", None) and not official_bound:
        previous_required = {
            row.metric_id
            for row in db.query(CycleApplicableMetric)
            .filter(
                CycleApplicableMetric.cycle_id == cycle.id,
                CycleApplicableMetric.required.is_(True),
            )
            .all()
            if not row.exception_type
        }
        if previous_required:
            validate_applicability_exceptions(items, previous_required)

    (
        db.query(CycleApplicableMetric)
        .filter(CycleApplicableMetric.cycle_id == cycle.id)
        .delete(synchronize_session=False)
    )

    now = datetime.utcnow()
    for item in items:
        metric = metrics_by_id[item["metric_id"]]
        exception_type = item.get("exception_type")
        justification = item.get("justification")
        required = item.get("required", True)
        if metric.catalog_kind == CATALOG_KIND_OFFICIAL:
            required = False
        db.add(
            CycleApplicableMetric(
                cycle_id=cycle.id,
                metric_id=item["metric_id"],
                required=required,
                exception_type=exception_type,
                justification=justification,
                approved_by=(
                    actor_user.id
                    if actor_user and exception_type
                    else None
                ),
                approved_at=now if exception_type else None,
            )
        )

    record_audit(
        db,
        user=actor_user,
        action="CYCLE_APPLICABILITY_REPLACE",
        entity_type="AccreditationCycle",
        entity_id=cycle.id,
        old_values={"metrics": previous_snapshot},
        new_values={
            "metrics": [
                {
                    "metric_id": item["metric_id"],
                    "required": (
                        False
                        if metrics_by_id[item["metric_id"]].catalog_kind
                        == CATALOG_KIND_OFFICIAL
                        else item.get("required", True)
                    ),
                    "exception_type": item.get("exception_type"),
                }
                for item in items
            ],
        },
        institution_id=cycle.institution_id,
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate cycle and metric mapping is not allowed",
        )

    return list_cycle_applicability(db, cycle)


def delete_cycle_applicability_rows(
    db: Session,
    cycle_id: int,
) -> None:
    (
        db.query(CycleApplicableMetric)
        .filter(CycleApplicableMetric.cycle_id == cycle_id)
        .delete(synchronize_session=False)
    )
