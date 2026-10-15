"""Internal preparation cycle mode.

An internal preparation cycle lets an institution rehearse the full
EduVerse workflow on the working catalogue. It is never an official NAAC
accreditation cycle: it uses its own statuses, cannot take an official
status, and is excluded from official report eligibility.
"""

from fastapi import HTTPException, status

CYCLE_MODE_INTERNAL_PREPARATION = "INTERNAL_PREPARATION"
CYCLE_MODES = frozenset({CYCLE_MODE_INTERNAL_PREPARATION})

INTERNAL_PREPARATION_LABEL = (
    "Internal Preparation — Not an Official NAAC Accreditation Cycle"
)
INTERNAL_PREPARATION_SHORT_LABEL = "Internal Preparation"

PREP_DRAFT = "Preparation Draft"
PREP_OPEN = "Preparation Open"
PREP_FINALIZED = "Preparation Finalized"
PREP_ARCHIVED = "Preparation Archived"

PREPARATION_STATUSES = (PREP_DRAFT, PREP_OPEN, PREP_FINALIZED, PREP_ARCHIVED)

# Preparation Open -> Preparation Finalized happens only through the
# internal finalize endpoint, so it is not a generic status update.
PREPARATION_TRANSITIONS = {
    PREP_DRAFT: frozenset({PREP_OPEN, PREP_ARCHIVED}),
    PREP_OPEN: frozenset({PREP_ARCHIVED}),
    PREP_FINALIZED: frozenset({PREP_ARCHIVED}),
    PREP_ARCHIVED: frozenset(),
}

PREPARATION_SUBMISSION_STATUS = PREP_OPEN


def _bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def normalize_cycle_mode(value) -> str | None:
    """Return None (official / existing behaviour) or a supported mode."""
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("cycle_mode must be a string.")
    code = value.strip().upper()
    if not code:
        return None
    if code not in CYCLE_MODES:
        raise ValueError(
            "Unsupported cycle_mode. Use INTERNAL_PREPARATION or omit it."
        )
    return code


def is_internal_preparation(cycle) -> bool:
    return (
        getattr(cycle, "cycle_mode", None) == CYCLE_MODE_INTERNAL_PREPARATION
    )


def mode_payload(cycle) -> dict:
    internal = is_internal_preparation(cycle)
    return {
        "cycle_mode": CYCLE_MODE_INTERNAL_PREPARATION if internal else None,
        "mode_label": INTERNAL_PREPARATION_LABEL if internal else None,
        "is_official_cycle": not internal,
    }


def assert_create_status_for_mode(cycle_mode: str | None, new_status: str | None) -> str:
    """Return the status a new cycle may start in, or raise."""
    if cycle_mode == CYCLE_MODE_INTERNAL_PREPARATION:
        if new_status not in (None, "", PREP_DRAFT):
            raise _bad_request(
                "Internal preparation cycles start in Preparation Draft."
            )
        return PREP_DRAFT
    if new_status in PREPARATION_STATUSES:
        raise _bad_request(
            "Preparation statuses are only valid for internal preparation cycles."
        )
    return new_status


def assert_status_change_allowed(cycle, new_status: str | None) -> None:
    """Guard generic status updates for both official and preparation cycles."""
    if not new_status or new_status == getattr(cycle, "status", None):
        return
    if not is_internal_preparation(cycle):
        if new_status in PREPARATION_STATUSES:
            raise _bad_request(
                "An official cycle cannot take an internal preparation status."
            )
        return
    if new_status not in PREPARATION_STATUSES:
        raise _bad_request(
            "An internal preparation cycle can never become an official NAAC "
            "cycle. Allowed statuses: " + ", ".join(PREPARATION_STATUSES) + "."
        )
    if new_status == PREP_FINALIZED:
        raise _bad_request(
            "Use the internal preparation finalize action to finalize this cycle."
        )
    allowed = PREPARATION_TRANSITIONS.get(cycle.status, frozenset())
    if new_status not in allowed:
        raise _bad_request(
            f"Cannot move an internal preparation cycle from {cycle.status} "
            f"to {new_status}."
        )


def assert_cycle_accepts_changes(cycle) -> None:
    """Preparation cycles accept submission and evidence changes only while open.

    Official and legacy cycles are not affected by this guard.
    """
    if cycle is None or not is_internal_preparation(cycle):
        return
    if cycle.status != PREPARATION_SUBMISSION_STATUS:
        raise _bad_request(
            f"This internal preparation cycle is {cycle.status}. Its submissions "
            "and evidence are read-only."
        )


def label_title(cycle, title: str) -> str:
    if is_internal_preparation(cycle):
        return f"[{INTERNAL_PREPARATION_SHORT_LABEL}] {title}"
    return title
