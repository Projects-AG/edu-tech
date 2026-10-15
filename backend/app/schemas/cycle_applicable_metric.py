from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class CycleApplicableMetricItem(BaseModel):
    metric_id: int
    required: bool = True
    exception_type: Optional[str] = None
    justification: Optional[str] = None


class CycleApplicableMetricReplaceRequest(BaseModel):
    metrics: list[CycleApplicableMetricItem] = Field(default_factory=list)


class CycleApplicableMetricResponse(BaseModel):
    id: int
    cycle_id: int
    metric_id: int
    required: bool
    exception_type: Optional[str] = None
    justification: Optional[str] = None
    approved_by: Optional[int] = None
    created_at: datetime
    metric_code: Optional[str] = None
    metric_title: Optional[str] = None
    catalog_kind: Optional[str] = None
    metric_type: Optional[str] = None
    metric_kind: Optional[str] = None
    weightage: Optional[float] = None
    criterion_id: Optional[int] = None
    criterion_number: Optional[str] = None
    criterion_title: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ApplicableCriterionResponse(BaseModel):
    id: int
    number: str
    title: str


class CycleOfficialMetricResponse(BaseModel):
    metric_id: int
    metric_code: str
    metric_title: str
    catalog_kind: str
    framework_metric_id: Optional[int] = None
    required: bool = False
    metric_kind: Optional[str] = None
    criterion_id: Optional[int] = None
    criterion_number: Optional[str] = None
    criterion_title: Optional[str] = None
    weightage: Optional[float] = None
    metric_type: Optional[str] = None


class CycleApplicabilityResponse(BaseModel):
    cycle_id: int
    institution_id: int
    configured: bool
    uses_catalog_fallback: bool
    catalog_kind: Optional[str] = None
    applicability_status: Optional[str] = None
    official_catalog_metric_count: int = 0
    applicable_metric_count: int = 0
    naac_required_optional_verified: bool = False
    has_official_operational_metrics: bool = False
    framework_id: Optional[int] = None
    framework_name: Optional[str] = None
    framework_version: Optional[str] = None
    framework_code: Optional[str] = None
    uses_seven_criteria: Optional[bool] = None
    criterion_structure_verified: Optional[bool] = None
    metric_catalogue_complete: Optional[bool] = None
    catalogue_status: Optional[str] = None
    framework_criteria: list[ApplicableCriterionResponse] = []
    applicable_metrics: list[CycleApplicableMetricResponse]
    applicable_criteria: list[ApplicableCriterionResponse]
    official_operational_metrics: list[CycleOfficialMetricResponse] = []
