"""Official QlM/QnM response containers for verified Autonomous QIF metrics.

The imported QIF JSON supports metric_kind (QlM/QnM), official_code, title,
weightage, and criterion. It does not include word limits, DVV option lists,
formulas, SSS, bibliometrics, or document checklists. Those rules stay
unconfigured. Working-catalogue submissions keep the existing notes payload.
"""

from __future__ import annotations

import json

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.metric import CATALOG_KIND_OFFICIAL, Metric
from app.models.naac_framework import FrameworkMetric


FORM_KIND_OFFICIAL = "OFFICIAL"
METRIC_KIND_QLM = "QlM"
METRIC_KIND_QNM = "QnM"

QIF_SUPPORTED_FIELDS = frozenset(
    {
        "official_code",
        "criterion_number",
        "title",
        "metric_kind",
        "weightage",
        "required_default",
        "verification_status",
        "required_status",
    }
)

OFFICIAL_SOURCE_GAPS = (
    "word_limit",
    "dvv_option_list",
    "formula_template",
    "year_wise_data_template",
    "sss_workflow",
    "bibliometrics_workflow",
    "metric_specific_evidence_checklist",
    "required_optional_na",
)

_STRIP_UNVERIFIED_KEYS = (
    "word_limit",
    "option_list",
    "dvv_options",
    "formula",
    "formula_template",
    "sss",
    "bibliometrics",
    "required_optional_na",
)


def official_metric_kind(db: Session, metric: Metric) -> str | None:
    identity = (
        db.query(FrameworkMetric)
        .filter(FrameworkMetric.operational_metric_id == metric.id)
        .first()
    )
    if identity is None:
        return None
    if identity.metric_kind in {METRIC_KIND_QLM, METRIC_KIND_QNM}:
        return identity.metric_kind
    return None


def official_form_descriptor(metric: Metric, metric_kind: str) -> dict:
    if metric_kind == METRIC_KIND_QLM:
        response_field = "qualitative_response"
    elif metric_kind == METRIC_KIND_QNM:
        response_field = "quantitative_response"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Official form is unconfigured. Verified QlM/QnM "
                "metric_kind is missing for this operational metric."
            ),
        )
    return {
        "form_kind": FORM_KIND_OFFICIAL,
        "metric_id": metric.id,
        "metric_code": metric.code,
        "metric_title": metric.title,
        "metric_kind": metric_kind,
        "metric_type": metric.metric_type,
        "weightage": (
            float(metric.weightage) if metric.weightage is not None else None
        ),
        "response_field": response_field,
        "word_limit": None,
        "option_list": None,
        "formula": None,
        "source_gaps": list(OFFICIAL_SOURCE_GAPS),
        "evidence_mode": "generic_existing_upload",
    }


def build_official_data_json(
    metric: Metric,
    metric_kind: str,
    *,
    qualitative_response: str | None = None,
    quantitative_response: str | None = None,
    notes: str | None = None,
) -> str:
    payload = official_form_descriptor(metric, metric_kind)
    payload["qualitative_response"] = (
        _clean_text(qualitative_response)
        if metric_kind == METRIC_KIND_QLM
        else None
    )
    payload["quantitative_response"] = (
        _clean_text(quantitative_response)
        if metric_kind == METRIC_KIND_QNM
        else None
    )
    payload["notes"] = _clean_text(notes)
    return json.dumps(payload)


def apply_official_form_payload(
    db: Session,
    metric_id: int | None,
    data_json: str | None,
) -> str | None:
    if metric_id is None:
        return data_json
    metric = db.query(Metric).filter(Metric.id == metric_id).first()
    if metric is None or metric.catalog_kind != CATALOG_KIND_OFFICIAL:
        return data_json
    return normalize_official_data_json(db, metric, data_json)


def normalize_official_data_json(
    db: Session,
    metric: Metric,
    raw_data_json,
) -> str:
    metric_kind = official_metric_kind(db, metric)
    if metric_kind is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Official form is unconfigured. Verified QlM/QnM "
                "metric_kind is missing for this operational metric."
            ),
        )

    parsed = _parse_payload(raw_data_json)
    client_metric_id = parsed.get("metric_id")
    if client_metric_id is not None and int(client_metric_id) != int(metric.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Official form metric_id must match the selected cycle's "
                "official operational metric. Display codes are not used."
            ),
        )
    client_kind = parsed.get("metric_kind")
    if client_kind and client_kind != metric_kind:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Official form metric_kind must match the catalogue "
                "QlM/QnM value for this operational metric."
            ),
        )

    qualitative = parsed.get("qualitative_response")
    quantitative = parsed.get("quantitative_response")
    notes = parsed.get("notes")
    if metric_kind == METRIC_KIND_QLM and not qualitative:
        qualitative = notes if parsed.get("form_kind") != FORM_KIND_OFFICIAL else qualitative
    if metric_kind == METRIC_KIND_QNM and not quantitative:
        quantitative = notes if parsed.get("form_kind") != FORM_KIND_OFFICIAL else quantitative

    return build_official_data_json(
        metric,
        metric_kind,
        qualitative_response=qualitative,
        quantitative_response=quantitative,
        notes=notes,
    )


def parse_official_data_json(raw_data_json) -> dict | None:
    parsed = _parse_payload(raw_data_json)
    if parsed.get("form_kind") != FORM_KIND_OFFICIAL:
        return None
    return parsed


def _parse_payload(raw_data_json) -> dict:
    if raw_data_json in (None, ""):
        return {}
    if isinstance(raw_data_json, dict):
        payload = dict(raw_data_json)
    else:
        try:
            loaded = json.loads(raw_data_json)
        except (TypeError, json.JSONDecodeError):
            return {"notes": str(raw_data_json)}
        payload = loaded if isinstance(loaded, dict) else {"notes": str(loaded)}
    for key in _STRIP_UNVERIFIED_KEYS:
        payload.pop(key, None)
    return payload


def _clean_text(value) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None
