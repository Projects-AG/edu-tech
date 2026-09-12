"""UI label helpers for NAAC coordinator API responses."""

from __future__ import annotations

from app.models.models import (
    CycleStatus,
    EvidenceStatus,
    ReviewStage,
    ReviewStepState,
    SubmissionStatus,
)

EVIDENCE_UI = {
    EvidenceStatus.PENDING_REVIEW: "Pending Review",
    EvidenceStatus.VERIFIED: "Verified",
    EvidenceStatus.NEEDS_CORRECTION: "Needs Correction",
}

SUBMISSION_UI = {
    SubmissionStatus.DRAFT: "Draft",
    SubmissionStatus.SUBMITTED: "Submitted",
    SubmissionStatus.UNDER_REVIEW: "Under Review",
    SubmissionStatus.NEEDS_CORRECTION: "Needs Correction",
    SubmissionStatus.APPROVED: "Approved",
}

CYCLE_UI = {
    CycleStatus.PLANNING: "Planning",
    CycleStatus.SSR_IN_PROGRESS: "SSR In Progress",
    CycleStatus.SUBMITTED: "Submitted",
    CycleStatus.COMPLETED: "Completed",
}

REVIEW_STAGE_UI = {
    ReviewStage.DRAFT: "Draft Created & Finalized",
    ReviewStage.REVIEWER: "Reviewer Verification",
    ReviewStage.COMMITTEE: "Committee Assessment",
    ReviewStage.DATA_APPROVAL: "Data Approval Gate",
    ReviewStage.SSR_LOCK: "Final SSR Lock",
}

REVIEW_STAGE_SHORT = {
    ReviewStage.DRAFT: "Draft",
    ReviewStage.REVIEWER: "Reviewer Check",
    ReviewStage.COMMITTEE: "Committee Review",
    ReviewStage.DATA_APPROVAL: "Data Approval",
    ReviewStage.SSR_LOCK: "Final Sign-off",
}

STEP_STATE_UI = {
    ReviewStepState.DONE: "done",
    ReviewStepState.CURRENT: "current",
    ReviewStepState.PENDING: "pending",
}

DEFAULT_WORKFLOW = [
    ReviewStage.DRAFT,
    ReviewStage.REVIEWER,
    ReviewStage.COMMITTEE,
    ReviewStage.DATA_APPROVAL,
    ReviewStage.SSR_LOCK,
]


def evidence_label(status: EvidenceStatus) -> str:
    return EVIDENCE_UI.get(status, status.value)


def submission_label(status: SubmissionStatus) -> str:
    return SUBMISSION_UI.get(status, status.value)


def cycle_label(status: CycleStatus) -> str:
    return CYCLE_UI.get(status, status.value)


def file_type_from_mime(mime: str | None, file_name: str | None = None) -> str:
    name = (file_name or "").lower()
    mime = (mime or "").lower()
    if "pdf" in mime or name.endswith(".pdf"):
        return "PDF"
    if "sheet" in mime or "excel" in mime or name.endswith((".xlsx", ".xls")):
        return "XLSX"
    if "word" in mime or name.endswith((".docx", ".doc")):
        return "DOCX"
    if "presentation" in mime or name.endswith(".pptx"):
        return "PPTX"
    return "FILE"


def format_bytes(size: int) -> str:
    if size < 1024:
        return f"{size} B"
    if size < 1024 * 1024:
        return f"{size / 1024:.1f} KB"
    return f"{size / (1024 * 1024):.1f} MB"


def format_date(dt) -> str | None:
    if dt is None:
        return None
    return dt.strftime("%d %b %Y")


def format_datetime(dt) -> str | None:
    if dt is None:
        return None
    return dt.strftime("%d %b %Y, %I:%M %p")


def criterion_status(percent: int, pending: int) -> str:
    if percent >= 85 and pending == 0:
        return "Completed"
    if percent < 60 or pending >= 10:
        return "Needs Attention"
    return "In Progress"


def department_status(progress: int, target: int, pending: int) -> str:
    if progress >= 100 and pending == 0:
        return "Completed"
    if progress < target or pending >= 8:
        return "Needs Attention"
    return "On Track"
