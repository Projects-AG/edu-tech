"""Phase 2 NAAC / coordinator Pydantic schemas (aligned to ORM field names)."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.models import CycleStatus, EvidenceStatus


class CycleCreate(BaseModel):
    academic_year_id: str | None = None
    title: str
    label: str
    status: CycleStatus = CycleStatus.SSR_IN_PROGRESS
    ssr_target_percent: int = 85
    expected_submission: str | None = None
    is_active: bool = True


class CycleOut(BaseModel):
    id: str
    institution_id: str
    academic_year_id: str | None
    title: str
    label: str
    status: CycleStatus
    ssr_target_percent: int
    expected_submission: str | None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class MetricOut(BaseModel):
    id: str
    code: str
    name: str
    weightage: int
    description: str | None
    sort_order: int

    class Config:
        from_attributes = True


class KeyIndicatorOut(BaseModel):
    id: str
    code: str
    name: str
    sort_order: int
    metrics: list[MetricOut] = []

    class Config:
        from_attributes = True


class CriterionOut(BaseModel):
    id: str
    cycle_id: str
    code: str
    title: str
    description: str | None
    sort_order: int
    in_charge_user_id: str | None
    lead_label: str | None
    key_indicators: list[KeyIndicatorOut] = []

    class Config:
        from_attributes = True


class CriterionCardOut(BaseModel):
    id: str
    code: str
    title: str
    description: str | None = None
    status: str
    percent: int
    evidence: str
    pending: int
    departments: int
    lead_label: str | None = None


class StatOut(BaseModel):
    id: str
    label: str
    value: str
    hint: str
    tone: str
    badge: str | None = None


class CriteriaListResponse(BaseModel):
    stats: list[StatOut]
    items: list[CriterionCardOut]


class EvidenceCreate(BaseModel):
    cycle_id: str
    metric_id: str
    department_id: str
    file_upload_id: str
    title: str
    unit: str | None = None
    notes: str | None = None


class EvidenceStatusUpdate(BaseModel):
    status: EvidenceStatus
    notes: str | None = None


class EvidenceOut(BaseModel):
    id: str
    name: str
    meta: str
    type: str
    criterion: str
    department: str
    unit: str | None
    uploaded_by: str
    role: str | None = None
    uploaded_at: str
    status: str
    metric_code: str | None = None
    file_upload_id: str
    cycle_id: str


class EvidenceListResponse(BaseModel):
    stats: list[StatOut]
    documents: list[EvidenceOut]


class SubmissionCreate(BaseModel):
    cycle_id: str
    criterion_id: str
    department_id: str
    title: str
    evidence_ids: list[str] = Field(default_factory=list)
    assigned_to_id: str | None = None


class CorrectionRequest(BaseModel):
    note: str = Field(min_length=3)


class WorkflowStepOut(BaseModel):
    step: str
    state: str
    note: str | None = None


class SubmissionOut(BaseModel):
    id: str
    title: str
    criterion: str
    department: str
    submitted_by: str
    submitted_at: str | None
    updated_at: str
    status: str
    files: int
    size: str
    correction_note: str | None = None
    correction_by: str | None = None
    correction_at: str | None = None
    ref_code: str | None = None
    workflow: list[WorkflowStepOut] = []
    cycle_id: str
    criterion_id: str
    department_id: str


class SubmissionListResponse(BaseModel):
    stats: list[StatOut]
    submissions: list[SubmissionOut]


class ReviewQueueItemOut(BaseModel):
    id: str
    ref: str
    title: str
    metric: str
    department: str
    stage: str
    assigned_to: str | None
    status: str
    criterion: str
    description: str | None = None
    submitted_by: str
    submitted_at: str | None
    updated_at: str
    alert: str | None = None
    alert_at: str | None = None
    workflow: list[WorkflowStepOut] = []


class ReviewListResponse(BaseModel):
    stats: list[StatOut]
    queue: list[ReviewQueueItemOut]


class DashboardInstitutionOut(BaseModel):
    name: str
    aishe: str | None = None
    track: str | None = None
    cycle: str
    academic_year: str | None = None
    expected_submission: str | None = None
    ssr_target_percent: int
    ssr_current_percent: int
    preparation_status: str


class DashboardStatOut(BaseModel):
    id: str
    label: str
    value: str
    delta: str | None = None
    delta_up: bool | None = None
    badge: str | None = None
    hint: str
    tone: str


class CriteriaProgressOut(BaseModel):
    id: str
    code: str
    name: str
    lead: str | None
    evidence_collected: int
    evidence_total: int
    percent: int
    status: str


class AttentionItemOut(BaseModel):
    id: str
    title: str
    status: str
    action_label: str
    action_path: str


class RecentSubmissionOut(BaseModel):
    id: str
    title: str
    criterion: str
    department: str
    status: str
    path: str


class CoordinatorDashboardOut(BaseModel):
    institution: DashboardInstitutionOut
    stats: list[DashboardStatOut]
    criteria_progress: list[CriteriaProgressOut]
    attention_items: list[AttentionItemOut]
    recent_submissions: list[RecentSubmissionOut]
    cycle_id: str


class DepartmentProgressOut(BaseModel):
    id: str
    code: str
    name: str
    coordinator: str | None
    email: str | None = None
    progress: int
    target: int
    status: str
    evidence_uploaded: int
    evidence_total: int
    criteria_done: int
    criteria_total: int
    submissions_done: int
    submissions_total: int
    pending_tasks: int


class DeptCriteriaBreakdownOut(BaseModel):
    code: str
    name: str
    percent: int
    status: str


class CoordinatorDepartmentsResponse(BaseModel):
    stats: list[StatOut]
    departments: list[DepartmentProgressOut]
