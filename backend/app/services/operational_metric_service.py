
"""Materialize official QIF rows as first-class operational metrics.

Phase 1 supports only the verified Autonomous College catalogue.
It does not map onto the working catalogue or bind cycles.
"""

import re
from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.criterion import Criterion
from app.models.evidence_requirement import EvidenceRequirement
from app.models.metric import (
    CATALOG_KIND_OFFICIAL,
    CATALOG_KIND_WORKING,
    Metric,
)
from app.models.naac_framework import FrameworkMetric, NaacFramework
from app.models.section import Section
from app.models.submission import Submission
from app.services.framework_service import (
    OFFICIAL_QIF_FILES,
    get_framework_or_404,
    load_official_qif_rows,
)
from app.services.naac_framework_catalog import CODE_RAF_AUTONOMOUS


AUTONOMOUS_QIF_VERSION = "2023-07-11"
AUTONOMOUS_QIF_METRIC_COUNT = 85

GENERIC_EVIDENCE_TITLE = "Supporting documents"
GENERIC_EVIDENCE_DESCRIPTION = (
    "Generic file upload slot for this official metric. "
    "Official NAAC DVV document lists are not imported."
)
GENERIC_EVIDENCE_FILE_TYPES = "pdf,doc,docx,xls,xlsx,jpg,jpeg,png"


def _metric_code_sort_key(code: str) -> tuple[tuple[int, int | str], ...]:
    """Sort metric codes naturally, including mixed numeric and text segments."""
    return tuple(
        (0, int(part)) if part.isdigit() else (1, part.lower())
        for part in re.findall(r"\d+|\D+", code)
    )


def _qif_source_path(framework_code: str) -> Path | None:
    filename = OFFICIAL_QIF_FILES.get(framework_code)
    if not filename:
        return None
    return Path(__file__).resolve().parent / filename


def official_metric_type(metric_kind: str | None) -> str:
    if metric_kind == "QlM":
        return "Qualitative"
    if metric_kind == "QnM":
        return "Quantitative"

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=(
            "Official QIF metric_kind must be QlM or QnM before "
            "operational metrics can be materialized."
        ),
    )


def verify_autonomous_qif_source(framework: NaacFramework) -> list[dict]:
    if framework.code != CODE_RAF_AUTONOMOUS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Operational metrics are only materialized for the verified "
                "Autonomous College QIF. University, Affiliated/Constituent, "
                "Open University, Binary, and MBGL catalogues stay empty."
            ),
        )

    if framework.version != AUTONOMOUS_QIF_VERSION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Autonomous operational metrics require framework version "
                f"{AUTONOMOUS_QIF_VERSION}."
            ),
        )

    source_path = _qif_source_path(framework.code)
    if source_path is None or not source_path.exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Autonomous College QIF source JSON was not found.",
        )

    rows = load_official_qif_rows(framework.code)
    codes = [item["official_code"].strip() for item in rows]

    if (
        len(rows) != AUTONOMOUS_QIF_METRIC_COUNT
        or len(set(codes)) != AUTONOMOUS_QIF_METRIC_COUNT
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Autonomous College QIF source must contain "
                f"{AUTONOMOUS_QIF_METRIC_COUNT} unique official metric IDs."
            ),
        )

    return rows


def _global_criterion(db: Session, number: str) -> Criterion:
    criterion = (
        db.query(Criterion)
        .filter(
            Criterion.number == number,
            Criterion.cycle_id.is_(None),
        )
        .order_by(Criterion.id.asc())
        .first()
    )

    if not criterion:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Global criterion {number} is required to host official metrics."
            ),
        )

    return criterion


def _host_section(db: Session, criterion: Criterion) -> Section:
    section = (
        db.query(Section)
        .filter(Section.criterion_id == criterion.id)
        .order_by(Section.display_order.asc(), Section.id.asc())
        .first()
    )

    if not section:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Criterion {criterion.number} has no section to host "
                "official operational metrics."
            ),
        )

    return section


def _metric_used_by_submissions(db: Session, metric_id: int) -> bool:
    return (
        db.query(Submission.id)
        .filter(Submission.metric_id == metric_id)
        .first()
        is not None
    )


def _existing_official_metric(
    db: Session,
    framework_id: int,
    official_code: str,
) -> Metric | None:
    return (
        db.query(Metric)
        .filter(
            Metric.framework_id == framework_id,
            Metric.code == official_code,
            Metric.catalog_kind == CATALOG_KIND_OFFICIAL,
        )
        .first()
    )


def _ensure_generic_evidence(db: Session, metric: Metric) -> bool:
    existing = (
        db.query(EvidenceRequirement)
        .filter(EvidenceRequirement.metric_id == metric.id)
        .first()
    )

    if existing:
        return False

    db.add(
        EvidenceRequirement(
            metric_id=metric.id,
            title=GENERIC_EVIDENCE_TITLE,
            description=GENERIC_EVIDENCE_DESCRIPTION,
            required=True,
            allowed_file_types=GENERIC_EVIDENCE_FILE_TYPES,
            max_files=5,
        )
    )

    return True


def resolve_legacy_metric_by_code(
    db: Session,
    metric_code: str | None,
) -> Metric | None:
    """Legacy submissions match the working catalogue, never official clones."""
    if not metric_code:
        return None

    return (
        db.query(Metric)
        .filter(
            Metric.code == metric_code,
            Metric.catalog_kind == CATALOG_KIND_WORKING,
        )
        .first()
    )


def resolve_metric_for_submission(db: Session, submission) -> Metric | None:
    """Official rows use operational metric_id. Codes alone never select official clones."""
    if getattr(submission, "metric_id", None):
        return (
            db.query(Metric)
            .filter(Metric.id == submission.metric_id)
            .first()
        )

    return resolve_legacy_metric_by_code(
        db,
        getattr(submission, "metric_code", None),
    )


def materialize_autonomous_operational_metrics(
    db: Session,
    framework: NaacFramework,
) -> dict:
    source_rows = verify_autonomous_qif_source(framework)

    source_by_code = {
        item["official_code"].strip(): item for item in source_rows
    }

    identity_rows = (
        db.query(FrameworkMetric)
        .filter(FrameworkMetric.framework_id == framework.id)
        .all()
    )

    # Numeric-aware ordering avoids placing 7.1.10 before 7.1.2.
    identity_rows = sorted(
        identity_rows,
        key=lambda row: _metric_code_sort_key(row.official_code),
    )

    identity_codes = {row.official_code for row in identity_rows}

    if (
        len(identity_rows) != AUTONOMOUS_QIF_METRIC_COUNT
        or identity_codes != set(source_by_code)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Autonomous framework_metrics identity catalogue must match "
                f"the {AUTONOMOUS_QIF_METRIC_COUNT}-row QIF source before "
                "operational metrics are created."
            ),
        )

    created = 0
    linked = 0
    refreshed = 0
    skipped_in_use = 0
    evidence_created = 0
    display_order_by_criterion: dict[str, int] = {}

    for identity in identity_rows:
        source = source_by_code[identity.official_code]
        criterion_number = source.get("criterion_number")
        criterion = _global_criterion(db, criterion_number)
        section = _host_section(db, criterion)

        display_order_by_criterion[criterion_number] = (
            display_order_by_criterion.get(criterion_number, 0) + 1
        )

        metric_type = official_metric_type(source.get("metric_kind"))
        title = (source.get("title") or identity.title).strip()
        weightage = float(source.get("weightage") or identity.weightage or 0)

        metric = None

        if identity.operational_metric_id:
            metric = (
                db.query(Metric)
                .filter(Metric.id == identity.operational_metric_id)
                .first()
            )

            if metric and (
                metric.catalog_kind != CATALOG_KIND_OFFICIAL
                or metric.framework_id != framework.id
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "operational_metric_id "
                        f"{identity.operational_metric_id} is not an official "
                        "Autonomous operational metric."
                    ),
                )

        if metric is None:
            metric = _existing_official_metric(
                db,
                framework.id,
                identity.official_code,
            )

        if metric is None:
            metric = Metric(
                section_id=section.id,
                code=identity.official_code,
                title=title,
                description=None,
                metric_type=metric_type,
                weightage=weightage,
                max_score=100.0,
                requires_evidence=True,
                display_order=display_order_by_criterion[criterion_number],
                catalog_kind=CATALOG_KIND_OFFICIAL,
                framework_id=framework.id,
            )
            db.add(metric)
            db.flush()
            created += 1

        elif _metric_used_by_submissions(db, metric.id):
            skipped_in_use += 1

        else:
            metric.title = title
            metric.metric_type = metric_type
            metric.weightage = weightage
            metric.catalog_kind = CATALOG_KIND_OFFICIAL
            metric.framework_id = framework.id
            refreshed += 1

        identity.operational_metric_id = metric.id
        identity.maps_to_metric_id = None
        linked += 1

        if _ensure_generic_evidence(db, metric):
            evidence_created += 1

    db.flush()

    return {
        "framework_id": framework.id,
        "framework_code": framework.code,
        "framework_version": framework.version,
        "source_verified": True,
        "official_identity_rows": len(identity_rows),
        "operational_metrics_created": created,
        "operational_metrics_linked": linked,
        "operational_metrics_refreshed": refreshed,
        "skipped_in_use": skipped_in_use,
        "evidence_created": evidence_created,
        "maps_to_metric_id_set": 0,
        "allows_production_cycles": bool(framework.allows_production_cycles),
    }


def materialize_framework_operational_metrics(
    db: Session,
    framework_id: int,
) -> dict:
    framework = get_framework_or_404(db, framework_id)
    return materialize_autonomous_operational_metrics(db, framework)
