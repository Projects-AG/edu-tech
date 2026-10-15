
import json
from datetime import datetime
from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.accreditation_cycle import AccreditationCycle
from app.models.criterion import Criterion
from app.models.institution import Institution
from app.models.metric import CATALOG_KIND_OFFICIAL, CATALOG_KIND_WORKING, Metric
from app.models.naac_framework import (
    FrameworkCriterion,
    FrameworkMetric,
    NaacFramework,
)
from app.models.section import Section
from app.services.naac_framework_catalog import (
    ANNOUNCED_NOT_OPERATIVE,
    CATALOGUE_INCOMPLETE,
    CATEGORY_AFFILIATED_COLLEGE,
    CATEGORY_AUTONOMOUS_COLLEGE,
    CATEGORY_CONSTITUENT_COLLEGE,
    CATEGORY_OPEN_UNIVERSITY,
    CATEGORY_OTHER,
    CATEGORY_UNIVERSITY,
    CODE_INTERNAL,
    CODE_RAF_AFFILIATED,
    CODE_RAF_AUTONOMOUS,
    CODE_RAF_OPEN_UNIVERSITY,
    CODE_RAF_UNIVERSITY,
    FRAMEWORK_DEFINITIONS,
    INTERNAL_WORKING_CATALOG,
    PENDING_FRAMEWORK_VERIFICATION,
    PERMITTED_EXCEPTION_TYPES,
    PRODUCTION_CYCLE_STATUSES,
    PRODUCTION_READY,
    RECOMMENDATION_VERIFIED,
    SEVEN_CRITERIA,
    SEVEN_CRITERIA_NUMBERS,
    VERIFIED,
    serialize_framework,
)


OFFICIAL_QIF_FILES = {
    CODE_RAF_AUTONOMOUS: "raf_autonomous_college_qif_2023_07.json",
}


PROFILE_FIELDS = (
    "official_category",
    "affiliation_status",
    "affiliated_university",
    "autonomous_status",
    "is_constituent_unit",
    "parent_institution_name",
    "programme_level",
    "existing_naac_status",
    "previous_cycle_number",
    "application_pathway",
)


def catalogue_version(code: str | None) -> str | None:
    """The single framework version the catalogue currently pins for a code."""
    versions = [
        definition["version"]
        for definition in FRAMEWORK_DEFINITIONS
        if definition["code"] == code
    ]
    if len(versions) != 1:
        return None
    return versions[0]


def select_catalogue_framework(rows, code: str | None):
    """Pick the row matching the pinned catalogue version, never another one.

    Older or unlisted versions stay in the database for historical cycles
    but are not selected for new confirmations or cycles.
    """
    version = catalogue_version(code)
    if version is None:
        return None
    for row in rows:
        if row.code == code and row.version == version:
            return row
    return None


def get_framework_by_code(db: Session, code: str) -> NaacFramework | None:
    if catalogue_version(code) is None:
        return None
    rows = (
        db.query(NaacFramework)
        .filter(NaacFramework.code == code)
        .order_by(NaacFramework.id.asc())
        .all()
    )
    return select_catalogue_framework(rows, code)


def get_framework_or_404(db: Session, framework_id: int) -> NaacFramework:
    framework = (
        db.query(NaacFramework)
        .filter(NaacFramework.id == framework_id)
        .first()
    )
    if not framework:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="NAAC framework not found",
        )
    return framework


def framework_criteria_payload(db: Session, framework: NaacFramework) -> list[dict]:
    rows = (
        db.query(FrameworkCriterion)
        .filter(FrameworkCriterion.framework_id == framework.id)
        .order_by(FrameworkCriterion.display_order.asc())
        .all()
    )
    return [
        {
            "id": row.id,
            "number": row.number,
            "title": row.title,
            "description": row.description,
            "display_order": row.display_order,
        }
        for row in rows
    ]


def metric_row_count(db: Session, framework: NaacFramework) -> int:
    return (
        db.query(FrameworkMetric.id)
        .filter(FrameworkMetric.framework_id == framework.id)
        .count()
    )



def framework_readiness(db: Session, framework: NaacFramework) -> dict:
    rows = metric_row_count(db, framework)
    announced = framework.verification_status == ANNOUNCED_NOT_OPERATIVE

    if framework.code == CODE_INTERNAL:
        return {
            "criterion_structure_verified": False,
            "metric_catalogue_complete": False,
            "metric_row_count": rows,
            "metric_rules_verified": False,
            "confirmable": False,
            "allows_production_cycles": False,
            "catalogue_status": INTERNAL_WORKING_CATALOG,
        }

    criterion_verified = (
        not announced
        and bool(framework.uses_seven_criteria)
        and framework.verification_status == VERIFIED
    )

    expected_rows = getattr(framework, "official_metric_count", None)
    complete = (
        expected_rows is not None
        and rows >= expected_rows
        and criterion_verified
    )

    confirmable = criterion_verified

    # Keep production disabled until the catalogue and rules are verified.
    production = (
        bool(framework.allows_production_cycles)
        and complete
        and framework.verification_status == VERIFIED
        and not announced
    )

    if announced:
        catalogue_status = ANNOUNCED_NOT_OPERATIVE
    elif complete and production:
        catalogue_status = PRODUCTION_READY
    else:
        catalogue_status = CATALOGUE_INCOMPLETE

    return {
        "criterion_structure_verified": criterion_verified,
        "metric_catalogue_complete": complete,
        "metric_row_count": rows,
        "metric_rules_verified": False,
        "confirmable": confirmable,
        "allows_production_cycles": production,
        "catalogue_status": catalogue_status,
    }



def serialize_framework_with_criteria(db: Session, framework: NaacFramework) -> dict:
    return serialize_framework(
        framework,
        framework_criteria_payload(db, framework),
        framework_readiness(db, framework),
    )


def ensure_naac_frameworks(db: Session) -> list[NaacFramework]:
    created = []
    for definition in FRAMEWORK_DEFINITIONS:
        existing = get_framework_by_code(db, definition["code"])
        if existing:
            _sync_framework_row(existing, definition)
            framework = existing
        else:
            payload = {
                key: value
                for key, value in definition.items()
                if key != "seed_seven_criteria"
            }
            framework = NaacFramework(**payload)
            db.add(framework)
            db.flush()
            created.append(framework)

        if definition.get("seed_seven_criteria"):
            _ensure_seven_criteria(db, framework)
            db.flush()

        _ensure_official_metrics(db, framework)

    db.flush()
    return created


def _sync_framework_row(framework: NaacFramework, definition: dict) -> None:
    skip = {"code", "seed_seven_criteria"}
    for key, value in definition.items():
        if key in skip:
            continue
        setattr(framework, key, value)


def validate_official_qif_row(
    item: dict,
    filename: str = "catalogue",
    require_verified: bool = True,
) -> dict:
    if not isinstance(item, dict):
        raise ValueError(f"Invalid metric row structure in {filename}: expected dict")

    code = (item.get("official_code") or "").strip()
    if not code:
        raise ValueError(f"Missing official metric code in {filename}")

    title = (item.get("title") or "").strip()
    if not title:
        raise ValueError(
            f"Missing title for official metric '{code}' in {filename}"
        )

    criterion_number = (item.get("criterion_number") or "").strip()
    if not criterion_number:
        raise ValueError(
            f"Official metric '{code}' is missing criterion mapping in {filename}"
        )
    if criterion_number not in SEVEN_CRITERIA_NUMBERS:
        raise ValueError(
            f"Official metric '{code}' has invalid criterion mapping '{criterion_number}' in {filename}"
        )

    verification_status = (item.get("verification_status") or "").strip()
    if not verification_status:
        raise ValueError(
            f"Official metric '{code}' is missing verification metadata in {filename}"
        )
    if require_verified and verification_status != VERIFIED:
        raise ValueError(
            f"Official metric '{code}' is not verified ({verification_status}) in {filename}"
        )

    return item


def load_official_qif_rows(framework_code: str) -> list[dict]:
    filename = OFFICIAL_QIF_FILES.get(framework_code)
    if not filename:
        return []

    path = Path(__file__).with_name(filename)
    if not path.exists():
        return []

    payload = json.loads(path.read_text(encoding="utf-8"))
    rows = []
    seen = set()

    for item in payload:
        validate_official_qif_row(item, filename=filename, require_verified=True)
        code = item["official_code"].strip()

        if code in seen:
            raise ValueError(
                f"Duplicate official metric code {code} in {filename}"
            )

        seen.add(code)
        rows.append(item)

    return rows


def _ensure_official_metrics(db: Session, framework: NaacFramework) -> None:
    source_rows = load_official_qif_rows(framework.code)
    if not source_rows:
        return

    criteria = {
        row.number: row
        for row in db.query(FrameworkCriterion)
        .filter(FrameworkCriterion.framework_id == framework.id)
        .all()
    }

    existing = {
        row.official_code: row
        for row in db.query(FrameworkMetric)
        .filter(FrameworkMetric.framework_id == framework.id)
        .all()
    }

    for item in source_rows:
        validate_official_qif_row(item, filename=framework.code, require_verified=True)
        code = item["official_code"].strip()
        criterion = criteria.get(item.get("criterion_number"))
        if not criterion:
            raise ValueError(
                f"Missing criterion mapping for metric {code} in {framework.code}"
            )

        verification = item["verification_status"].strip()

        payload = {
            "title": item["title"].strip(),
            "metric_kind": item.get("metric_kind"),
            "weightage": item.get("weightage"),
            "required_default": False,
            "verification_status": verification,
            "framework_criterion_id": criterion.id,
            "maps_to_metric_id": None,
        }

        row = existing.get(code)
        if row:
            for key, value in payload.items():
                setattr(row, key, value)
            continue

        db.add(
            FrameworkMetric(
                framework_id=framework.id,
                official_code=code,
                **payload,
            )
        )


def _ensure_seven_criteria(db: Session, framework: NaacFramework) -> None:
    existing = {
        row.number
        for row in db.query(FrameworkCriterion)
        .filter(FrameworkCriterion.framework_id == framework.id)
        .all()
    }

    for number, title, order in SEVEN_CRITERIA:
        if number in existing:
            continue

        db.add(
            FrameworkCriterion(
                framework_id=framework.id,
                number=number,
                title=title,
                display_order=order,
            )
        )


def _is_autonomous(value) -> bool:
    if value is True:
        return True

    if isinstance(value, str) and value.strip().lower() in {
        "true",
        "yes",
        "autonomous",
        "granted",
    }:
        return True

    return False


CATEGORY_SPECIFIC_FIELDS = {
    "affiliated_university": {CATEGORY_AFFILIATED_COLLEGE},
    "autonomous_status": {CATEGORY_AFFILIATED_COLLEGE},
    "parent_institution_name": {CATEGORY_CONSTITUENT_COLLEGE},
    "is_constituent_unit": {CATEGORY_CONSTITUENT_COLLEGE},
    "programme_level": {
        CATEGORY_AFFILIATED_COLLEGE,
        CATEGORY_CONSTITUENT_COLLEGE,
    },
}


def sanitize_profile_for_category(profile: dict) -> dict:
    """Drop fields that do not belong to the selected official category."""
    cleaned = dict(profile)
    category = (cleaned.get("official_category") or "").strip().upper()
    cleaned["official_category"] = category or None

    for field, categories in CATEGORY_SPECIFIC_FIELDS.items():
        if field in cleaned and category not in categories:
            cleaned[field] = None

    return cleaned


def resolve_recommendation(profile: dict) -> dict:
    """Map a profile to a framework code without database access."""
    profile = sanitize_profile_for_category(profile)
    category = profile.get("official_category") or ""
    programme_level = (
        (profile.get("programme_level") or "").strip().upper() or None
    )
    affiliated_university = (
        profile.get("affiliated_university") or ""
    ).strip()
    parent_name = (profile.get("parent_institution_name") or "").strip()
    autonomous = _is_autonomous(profile.get("autonomous_status"))

    if not category or category == CATEGORY_OTHER:
        return {
            "status": PENDING_FRAMEWORK_VERIFICATION,
            "code": None,
            "reason": (
                "Official NAAC HEI category is not identified. "
                "A production framework will not be guessed."
            ),
            "programme_level": programme_level,
        }

    if category == CATEGORY_CONSTITUENT_COLLEGE:
        if not parent_name:
            return {
                "status": PENDING_FRAMEWORK_VERIFICATION,
                "code": None,
                "reason": (
                    "Constituent units require parent-institution details before "
                    "a framework can be confirmed. Parent-only versus own "
                    "accreditation remains REQUIRES_OFFICIAL_VERIFICATION if the "
                    "parent university is the assessed unit."
                ),
                "programme_level": programme_level,
            }

        return {
            "status": RECOMMENDATION_VERIFIED,
            "code": CODE_RAF_AFFILIATED,
            "reason": (
                "Constituent / affiliated-college RAF manuals apply the same "
                "seven-criteria family. UG/PG metric variants are captured on "
                "the profile and are not invented as metric rows."
            ),
            "programme_level": programme_level,
        }

    if category == CATEGORY_AUTONOMOUS_COLLEGE or (
        category == CATEGORY_AFFILIATED_COLLEGE and autonomous
    ):
        return {
            "status": RECOMMENDATION_VERIFIED,
            "code": CODE_RAF_AUTONOMOUS,
            "reason": (
                "Autonomous colleges have a distinct RAF manual using the "
                "established seven criteria."
            ),
            "programme_level": programme_level,
        }

    if category == CATEGORY_UNIVERSITY:
        return {
            "status": RECOMMENDATION_VERIFIED,
            "code": CODE_RAF_UNIVERSITY,
            "reason": (
                "Universities are assessed under the RAF University manual "
                "(seven criteria)."
            ),
            "programme_level": programme_level,
        }

    if category == CATEGORY_AFFILIATED_COLLEGE:
        if not affiliated_university:
            return {
                "status": PENDING_FRAMEWORK_VERIFICATION,
                "code": None,
                "reason": (
                    "Affiliated colleges must name the affiliating university "
                    "before the affiliated-college RAF can be confirmed."
                ),
                "programme_level": programme_level,
            }

        extra = ""
        if programme_level in {"UG", "PG"}:
            extra = (
                f" Programme level {programme_level} is recorded. Official "
                "UG versus PG metric lists are REQUIRES_OFFICIAL_VERIFICATION "
                "and are not seeded as separate catalogues."
            )

        return {
            "status": RECOMMENDATION_VERIFIED,
            "code": CODE_RAF_AFFILIATED,
            "reason": (
                "Affiliated colleges use the affiliated/constituent RAF seven-"
                "criteria manual." + extra
            ),
            "programme_level": programme_level,
        }

    if category == CATEGORY_OPEN_UNIVERSITY:
        return {
            "status": RECOMMENDATION_VERIFIED,
            "code": CODE_RAF_OPEN_UNIVERSITY,
            "reason": (
                "Open universities use the NAAC ODL / Open University RAF, which "
                "adopts the established seven criteria with ODL key indicators. "
                "Metric IDs are not imported."
            ),
            "programme_level": programme_level,
        }

    return {
        "status": PENDING_FRAMEWORK_VERIFICATION,
        "code": None,
        "reason": (
            "This institution category is not mapped to a verified production "
            "framework."
        ),
        "programme_level": programme_level,
    }


def recommend_framework(db: Session, profile: dict) -> dict:
    """Return a recommendation without guessing unverified pathways.

    Read-only: framework rows are never seeded or synced from here, because
    unauthenticated registration requests reach this function.
    """
    resolved = resolve_recommendation(profile)
    if resolved["status"] != RECOMMENDATION_VERIFIED or not resolved["code"]:
        return _pending(resolved["reason"])

    framework = get_framework_by_code(db, resolved["code"])
    return _verified(
        db,
        framework,
        resolved["reason"],
        programme_level=resolved.get("programme_level"),
    )


def _pending(reason: str) -> dict:
    return {
        "recommendation_status": PENDING_FRAMEWORK_VERIFICATION,
        "recommended_framework_id": None,
        "recommended_framework": None,
        "recommendation_reason": reason,
        "allows_production_cycles": False,
        "criterion_structure_verified": False,
        "metric_catalogue_complete": False,
        "metric_rules_verified": False,
        "catalogue_status": PENDING_FRAMEWORK_VERIFICATION,
    }


def _verified(
    db: Session,
    framework: NaacFramework | None,
    reason: str,
    programme_level: str | None = None,
) -> dict:
    if not framework:
        return _pending(
            "The expected official framework is not seeded in this database."
        )

    payload = serialize_framework_with_criteria(db, framework)
    if programme_level:
        payload = {**payload, "recorded_programme_level": programme_level}

    return {
        "recommendation_status": RECOMMENDATION_VERIFIED,
        "recommended_framework_id": framework.id,
        "recommended_framework": payload,
        "recommendation_reason": reason,
        "allows_production_cycles": payload["allows_production_cycles"],
        "criterion_structure_verified": payload["criterion_structure_verified"],
        "metric_catalogue_complete": payload["metric_catalogue_complete"],
        "metric_rules_verified": payload["metric_rules_verified"],
        "catalogue_status": payload["catalogue_status"],
    }


def institution_profile(institution) -> dict:
    return {
        field: getattr(institution, field, None)
        for field in PROFILE_FIELDS
    }


def expected_framework_code(profile: dict) -> str | None:
    """Framework code the official category maps to, or None if pending."""
    resolved = resolve_recommendation(profile)
    if resolved["status"] != RECOMMENDATION_VERIFIED:
        return None
    return resolved["code"]


OBSOLETE_FRAMEWORK_VERSION_MESSAGE = (
    "Framework version {version} is not the current verified catalogue "
    "version ({current}) for this category. Obsolete or unlisted versions "
    "are not selected for new cycles or confirmations."
)


def assert_framework_matches_category(
    profile: dict,
    framework: NaacFramework,
) -> None:
    expected = expected_framework_code(profile)

    if expected is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "The official NAAC category does not map to a verified "
                "framework yet. No framework can be confirmed until the "
                "category details are complete."
            ),
        )

    if framework.code != expected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "The selected framework does not match the institution's "
                "official NAAC category. Category mapping cannot be "
                "overridden."
            ),
        )

    if framework.version != catalogue_version(expected):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=OBSOLETE_FRAMEWORK_VERSION_MESSAGE.format(
                version=framework.version,
                current=catalogue_version(expected),
            ),
        )


def assert_framework_matches_institution(
    institution,
    framework: NaacFramework,
) -> None:
    confirmed_id = getattr(institution, "confirmed_framework_id", None)
    has_category = bool(getattr(institution, "official_category", None))

    if confirmed_id:
        if framework.id != confirmed_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Cycle framework must match the institution's confirmed "
                    "NAAC framework."
                ),
            )

        if has_category:
            assert_framework_matches_category(
                institution_profile(institution),
                framework,
            )
        return

    if not has_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Set the institution's official NAAC category before "
                "creating an official accreditation cycle. A framework is "
                "not selected without it."
            ),
        )

    assert_framework_matches_category(
        institution_profile(institution),
        framework,
    )


NO_OFFICIAL_CATEGORY_MESSAGE = (
    "No official NAAC category is set for this institution, so no verified "
    "framework can be loaded. A platform Admin must set the official "
    "category; the free-text institution type is not used."
)
CONFIRMED_FRAMEWORK_MISSING_MESSAGE = (
    "The institution's confirmed framework is not available in this database."
)
CATEGORY_FRAMEWORK_NOT_SEEDED_MESSAGE = (
    "The verified framework for this category ({code}) is not seeded in this "
    "database."
)


def cycle_framework_eligibility(db: Session, institution) -> dict:
    """The only framework a new cycle may use, with a reason when none fits."""
    confirmed_id = getattr(institution, "confirmed_framework_id", None)

    if confirmed_id:
        candidate = (
            db.query(NaacFramework)
            .filter(NaacFramework.id == confirmed_id)
            .first()
        )
        if candidate is None:
            return {
                "framework_id": None,
                "reason": CONFIRMED_FRAMEWORK_MISSING_MESSAGE,
            }
    else:
        if not getattr(institution, "official_category", None):
            return {
                "framework_id": None,
                "reason": NO_OFFICIAL_CATEGORY_MESSAGE,
            }

        resolved = resolve_recommendation(institution_profile(institution))
        if resolved["status"] != RECOMMENDATION_VERIFIED or not resolved["code"]:
            return {"framework_id": None, "reason": resolved["reason"]}

        candidate = get_framework_by_code(db, resolved["code"])
        if candidate is None:
            return {
                "framework_id": None,
                "reason": CATEGORY_FRAMEWORK_NOT_SEEDED_MESSAGE.format(
                    code=resolved["code"]
                ),
            }

    try:
        assert_confirmable_framework(candidate)
        assert_framework_matches_institution(institution, candidate)
    except HTTPException as exc:
        return {"framework_id": None, "reason": str(exc.detail)}

    return {"framework_id": candidate.id, "reason": None}


def eligible_cycle_framework_id(db: Session, institution) -> int | None:
    """The only framework a new cycle may use for this institution, if any."""
    return cycle_framework_eligibility(db, institution)["framework_id"]


def category_framework_to_confirm(
    db: Session,
    profile: dict,
) -> NaacFramework | None:
    """Verified framework the official category maps to, or None.

    Never falls back to INTERNAL or another category's framework, and
    does not change readiness flags: a confirmed framework that is preparation
    only stays preparation only.
    """
    code = expected_framework_code(profile)
    if not code:
        return None

    framework = get_framework_by_code(db, code)
    if framework is None:
        return None

    try:
        assert_confirmable_framework(framework)
    except HTTPException:
        return None

    return framework


def assert_confirmable_framework(framework: NaacFramework) -> None:
    if framework.code == CODE_INTERNAL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "The internal working catalogue is not an official NAAC "
                "framework and cannot be confirmed as a production pathway."
            ),
        )

    if framework.verification_status == ANNOUNCED_NOT_OPERATIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Announced reforms cannot be confirmed as an institution pathway.",
        )

    if not framework.uses_seven_criteria:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "This framework has no verified criterion structure and cannot "
                "be confirmed."
            ),
        )

    if framework.verification_status != VERIFIED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Only a verified official criterion family can be confirmed. "
                "Seven criterion records are not a complete metric catalogue."
            ),
        )


def assert_production_framework(
    db: Session,
    framework: NaacFramework,
) -> None:
    readiness = framework_readiness(db, framework)

    if framework.verification_status == ANNOUNCED_NOT_OPERATIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Announced reforms cannot be used as a production framework.",
        )

    if not readiness["metric_catalogue_complete"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "This framework's metric catalogue is incomplete. Seven "
                "verified criteria are not a complete metric catalogue, and "
                "metrics are not marked required until official metric rows "
                "are imported."
            ),
        )

    if not readiness["allows_production_cycles"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "This framework is not available for production accreditation "
                f"cycles ({readiness['catalogue_status']})."
            ),
        )


LIVE_CYCLE_STATUSES = {"Active", "In Progress"}

OFFICIAL_METRIC_WORKING_CYCLE_MESSAGE = (
    "Official operational metrics cannot be submitted against a "
    "working-catalogue cycle. Use the official cycle's operational "
    "metric id; display codes are not used as a fallback."
)
OFFICIAL_METRIC_REQUIRES_CYCLE_MESSAGE = (
    "Official operational metrics cannot be submitted without an "
    "official cycle. Display codes are not used as a fallback."
)
SECOND_LIVE_CYCLE_MESSAGE = (
    "Institution already has a live accreditation cycle ({code}, {status}). "
    "Complete or archive that cycle before activating another. Existing "
    "cycles are not changed."
)


def assert_cycle_status_allowed(
    db: Session,
    framework: NaacFramework | None,
    new_status: str | None,
) -> None:
    if not new_status or new_status not in PRODUCTION_CYCLE_STATUSES:
        return

    if framework is None:
        return

    if framework.code == CODE_INTERNAL:
        return

    assert_production_framework(db, framework)


def assert_single_live_cycle_per_institution(
    db: Session,
    institution_id: int,
    new_status: str | None,
    exclude_cycle_id: int | None = None,
) -> None:
    """Reject a second Active/In Progress cycle for the same institution.

    Existing live cycles are not completed, deactivated, or rewritten.
    The institution row is locked so concurrent activations serialize.
    """
    if not new_status or new_status not in LIVE_CYCLE_STATUSES:
        return

    institution = (
        db.query(Institution)
        .filter(Institution.id == institution_id)
        .with_for_update()
        .first()
    )

    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found",
        )

    query = db.query(AccreditationCycle).filter(
        AccreditationCycle.institution_id == institution_id,
        AccreditationCycle.status.in_(LIVE_CYCLE_STATUSES),
    )

    if exclude_cycle_id is not None:
        query = query.filter(AccreditationCycle.id != exclude_cycle_id)

    existing = query.order_by(AccreditationCycle.id.asc()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=SECOND_LIVE_CYCLE_MESSAGE.format(
                code=existing.code,
                status=existing.status,
            ),
        )


def resolve_cycle_framework(
    db: Session,
    institution,
    requested_framework_id: int | None = None,
) -> NaacFramework:
    if not requested_framework_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Select a NAAC framework. No framework is assigned "
                "automatically, including the internal working catalogue."
            ),
        )

    ensure_naac_frameworks(db)
    framework = get_framework_or_404(db, requested_framework_id)
    assert_confirmable_framework(framework)
    assert_framework_matches_institution(institution, framework)
    return framework


INSTITUTION_FRAMEWORK_MISMATCH_MESSAGE = (
    "The institution's confirmed framework does not match the updated "
    "official NAAC category. Update the category and confirmed framework "
    "together; frameworks are not switched automatically."
)


def assert_cycle_institution_reassignment(
    db: Session,
    cycle,
    destination,
) -> None:
    """A cycle may only move to an institution its framework is valid for."""
    if destination.id == cycle.institution_id:
        return

    if not getattr(cycle, "framework_id", None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "This cycle has no stored framework, so it cannot be "
                "validated for another institution and cannot be reassigned."
            ),
        )

    framework = get_framework_or_404(db, cycle.framework_id)
    assert_confirmable_framework(framework)
    assert_framework_matches_institution(destination, framework)


def assert_institution_update_consistent(
    db: Session,
    institution,
    update_data: dict,
) -> None:
    """Validate category and confirmed framework together before saving.

    Only fields whose values actually change trigger the check, so
    unrelated edits to institutions without a category stay possible.
    Existing cycles are never modified here.
    """
    watched = (*PROFILE_FIELDS, "confirmed_framework_id")
    changed = {
        field
        for field in watched
        if field in update_data
        and update_data[field] != getattr(institution, field, None)
    }

    if not changed:
        return

    merged = institution_profile(institution)
    merged.update({
        key: value for key, value in update_data.items() if key in merged
    })

    framework_id = update_data.get(
        "confirmed_framework_id",
        getattr(institution, "confirmed_framework_id", None),
    )

    if not framework_id:
        return

    framework = get_framework_or_404(db, framework_id)
    assert_confirmable_framework(framework)
    expected = expected_framework_code(merged)

    if framework.code != expected or framework.version != catalogue_version(
        expected
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=INSTITUTION_FRAMEWORK_MISMATCH_MESSAGE,
        )


def assert_cycle_framework_not_rewritten(
    cycle,
    incoming_framework_id,
) -> None:
    if incoming_framework_id == getattr(cycle, "framework_id", None):
        return

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=(
            "An accreditation cycle keeps the framework version assigned at "
            "creation. Historical cycles are not backfilled."
        ),
    )


def uses_working_catalog_fallback(db: Session, cycle) -> bool:
    """Official incomplete catalogues must not inherit working-catalog metrics."""
    from app.models.cycle_applicable_metric import CycleApplicableMetric

    has_rows = (
        db.query(CycleApplicableMetric.id)
        .filter(CycleApplicableMetric.cycle_id == cycle.id)
        .first()
        is not None
    )

    if has_rows:
        return False

    if not getattr(cycle, "framework_id", None):
        return True

    framework = (
        db.query(NaacFramework)
        .filter(NaacFramework.id == cycle.framework_id)
        .first()
    )

    if not framework or framework.code == CODE_INTERNAL:
        return True

    return False


def official_operational_metric_rows(
    db: Session,
    framework: NaacFramework,
):
    """Official operational metrics linked by id, never by display code."""
    return (
        db.query(FrameworkMetric, Metric)
        .join(Metric, Metric.id == FrameworkMetric.operational_metric_id)
        .filter(
            FrameworkMetric.framework_id == framework.id,
            FrameworkMetric.operational_metric_id.isnot(None),
            Metric.catalog_kind == CATALOG_KIND_OFFICIAL,
            Metric.framework_id == framework.id,
        )
        .order_by(FrameworkMetric.official_code.asc())
        .all()
    )


def cycle_metric_catalog(db: Session, cycle) -> tuple[str, list[Metric]]:
    """Return the metric catalogue that belongs to this cycle.

    Official cycles use framework_metrics.operational_metric_id only.
    Legacy / INTERNAL cycles keep the working catalogue. Applicability
    rows are not seeded here.
    """
    from app.models.cycle_applicable_metric import CycleApplicableMetric

    configured = (
        db.query(CycleApplicableMetric, Metric)
        .join(Metric, Metric.id == CycleApplicableMetric.metric_id)
        .filter(CycleApplicableMetric.cycle_id == cycle.id)
        .order_by(Metric.id.asc())
        .all()
    )

    if configured:
        metrics = [metric for _row, metric in configured]
        kinds = {item.catalog_kind for item in metrics}
        catalog_kind = (
            CATALOG_KIND_OFFICIAL
            if kinds == {CATALOG_KIND_OFFICIAL}
            else CATALOG_KIND_WORKING
        )
        return catalog_kind, metrics

    if uses_working_catalog_fallback(db, cycle):
        metrics = (
            db.query(Metric)
            .filter(Metric.catalog_kind == CATALOG_KIND_WORKING)
            .order_by(Metric.id.asc())
            .all()
        )
        return CATALOG_KIND_WORKING, metrics

    framework = None
    if getattr(cycle, "framework_id", None):
        framework = (
            db.query(NaacFramework)
            .filter(NaacFramework.id == cycle.framework_id)
            .first()
        )

    if not framework or framework.code == CODE_INTERNAL:
        metrics = (
            db.query(Metric)
            .filter(Metric.catalog_kind == CATALOG_KIND_WORKING)
            .order_by(Metric.id.asc())
            .all()
        )
        return CATALOG_KIND_WORKING, metrics

    rows = official_operational_metric_rows(db, framework)
    if not rows:
        return "OFFICIAL_INCOMPLETE", []

    # Official catalogue exists, but unconfigured cycles have no applicable set.
    return CATALOG_KIND_OFFICIAL, []


def resolve_submission_metric_for_cycle(
    db: Session,
    cycle,
    metric_id: int | None,
    metric_code: str | None,
) -> tuple[int | None, str | None]:
    """Bind a new submission metric to the cycle catalogue.

    Official cycles accept only framework_metrics.operational_metric_id
    rows. A working-catalogue id is rejected even when the display code
    matches. Legacy unbound cycles keep metric_id unset.
    """
    if cycle is None:
        if metric_id is not None:
            selected = (
                db.query(Metric)
                .filter(Metric.id == metric_id)
                .first()
            )
            if selected and selected.catalog_kind == CATALOG_KIND_OFFICIAL:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=OFFICIAL_METRIC_REQUIRES_CYCLE_MESSAGE,
                )

        return None, metric_code

    catalog_kind, catalog_metrics = cycle_metric_catalog(db, cycle)

    if catalog_kind == CATALOG_KIND_OFFICIAL:
        from app.models.cycle_applicable_metric import CycleApplicableMetric

        configured = (
            db.query(CycleApplicableMetric.id)
            .filter(CycleApplicableMetric.cycle_id == cycle.id)
            .first()
            is not None
        )

        if not configured:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Applicability is not configured for this official cycle. "
                    "Official metrics are not treated as applicable until "
                    "they are selected from this framework's operational "
                    "catalogue."
                ),
            )

        official_by_id = {item.id: item for item in catalog_metrics}

        if metric_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "This cycle uses official NAAC metrics. Select an "
                    "official operational metric by id; display codes "
                    "alone are not used."
                ),
            )

        selected = official_by_id.get(metric_id)
        if selected is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "This cycle uses official NAAC metrics. The selected "
                    "metric is not in this framework's operational "
                    "catalogue. Working-catalogue metrics are not used."
                ),
            )

        return selected.id, selected.code

    if catalog_kind == "OFFICIAL_INCOMPLETE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "This cycle's official metric catalogue has no "
                "operational metrics. Submissions cannot use the "
                "working catalogue as a substitute."
            ),
        )

    if metric_id is not None:
        selected = (
            db.query(Metric)
            .filter(Metric.id == metric_id)
            .first()
        )
        if selected and selected.catalog_kind == CATALOG_KIND_OFFICIAL:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=OFFICIAL_METRIC_WORKING_CYCLE_MESSAGE,
            )

    return None, metric_code


def working_catalog_metrics(
    db: Session,
    framework: NaacFramework,
) -> list[Metric]:
    query = (
        db.query(Metric)
        .join(Section, Section.id == Metric.section_id)
        .join(Criterion, Criterion.id == Section.criterion_id)
        .filter(Metric.catalog_kind == CATALOG_KIND_WORKING)
    )

    if framework.uses_seven_criteria:
        query = query.filter(Criterion.number.in_(SEVEN_CRITERIA_NUMBERS))

    return query.order_by(Criterion.id.asc(), Metric.id.asc()).all()


def official_mapped_metric_rows(db: Session, framework: NaacFramework):
    return (
        db.query(FrameworkMetric)
        .filter(
            FrameworkMetric.framework_id == framework.id,
            FrameworkMetric.maps_to_metric_id.isnot(None),
        )
        .all()
    )


def apply_framework_to_cycle(
    db: Session,
    cycle,
    framework: NaacFramework,
    actor_user_id: int | None,
) -> None:
    from app.models.cycle_applicable_metric import CycleApplicableMetric

    cycle.framework_id = framework.id

    existing = (
        db.query(CycleApplicableMetric.id)
        .filter(CycleApplicableMetric.cycle_id == cycle.id)
        .first()
    )

    if existing:
        return

    # Do not seed cycle_applicable_metrics from official operational
    # metrics or from working-catalogue code matches. Retrieval uses
    # operational_metric_id. maps_to_metric_id stays unused.
    now = datetime.utcnow()

    for row in official_mapped_metric_rows(db, framework):
        db.add(
            CycleApplicableMetric(
                cycle_id=cycle.id,
                metric_id=row.maps_to_metric_id,
                required=bool(row.required_default),
                created_at=now,
            )
        )


def copy_profile_fields(source, target) -> None:
    for field in PROFILE_FIELDS:
        setattr(target, field, getattr(source, field, None))


def validate_applicability_exceptions(
    items: list[dict],
    previous_required_metric_ids: set[int],
) -> None:
    selected_ids = {item["metric_id"] for item in items}
    missing = sorted(previous_required_metric_ids - selected_ids)

    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Required metrics cannot be dropped from the cycle. Submit "
                "them as EXCLUDED or NOT_APPLICABLE with justification. "
                f"Missing metric_id values: {missing}"
            ),
        )

    for item in items:
        required = item.get("required", True)
        exception_type = item.get("exception_type")
        justification = (item.get("justification") or "").strip()

        if required and not exception_type:
            continue

        if exception_type not in PERMITTED_EXCEPTION_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Optional or excluded metrics require a permitted "
                    "exception type: NOT_APPLICABLE, OPTIONAL_OVERRIDE, "
                    "or EXCLUDED."
                ),
            )

        if len(justification) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "A justification of at least 10 characters is required "
                    "for metric exceptions."
                ),
            )
