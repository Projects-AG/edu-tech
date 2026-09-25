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

    class Config:
        from_attributes = True
