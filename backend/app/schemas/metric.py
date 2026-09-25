from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MetricBase(BaseModel):
    section_id: int
    code: str
    title: str
    description: Optional[str] = None
    metric_type: str = "Quantitative"
    weightage: float = 0.0
    max_score: float = 100.0
    requires_evidence: bool = True
    display_order: int = 1


class MetricCreate(MetricBase):
    pass


class MetricUpdate(BaseModel):
    code: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    metric_type: Optional[str] = None
    weightage: Optional[float] = None
    max_score: Optional[float] = None
    requires_evidence: Optional[bool] = None
    display_order: Optional[int] = None


class MetricResponse(MetricBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True