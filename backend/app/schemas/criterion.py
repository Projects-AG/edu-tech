from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CriterionBase(BaseModel):
    number: str
    title: str
    description: Optional[str] = None
    weightage: int = 100
    completion_percentage: float = 0.0
    cycle_id: Optional[int] = None


class CriterionCreate(CriterionBase):
    pass


class CriterionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    weightage: Optional[int] = None
    completion_percentage: Optional[float] = None


class CriterionResponse(CriterionBase):
    id: int
    created_at: datetime
    updated_at: datetime
    status: Optional[str] = None
    total_submissions: Optional[int] = None
    approved_submissions: Optional[int] = None
    total_metrics: Optional[int] = None
    total_evidence: Optional[int] = None
    progress_cycle_id: Optional[int] = None
    applicability_configured: Optional[bool] = None
    uses_catalog_fallback: Optional[bool] = None
    required_metric_count: Optional[int] = None
    optional_metric_count: Optional[int] = None
    finalized_count: Optional[int] = None
    pending_count: Optional[int] = None
    under_review_count: Optional[int] = None
    changes_requested_count: Optional[int] = None
    rejected_count: Optional[int] = None
    missing_required_count: Optional[int] = None
    eligibility_status: Optional[str] = None
    naac_required_optional_verified: Optional[bool] = None

    class Config:
        from_attributes = True
