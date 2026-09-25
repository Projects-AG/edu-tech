from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SectionBase(BaseModel):
    criterion_id: int
    code: str
    title: str
    description: Optional[str] = None
    weightage: float = 0.0
    display_order: int = 1


class SectionCreate(SectionBase):
    pass


class SectionUpdate(BaseModel):
    code: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    weightage: Optional[float] = None
    display_order: Optional[int] = None


class SectionResponse(SectionBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True