from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class EvidenceRequirementBase(BaseModel):
    metric_id: int
    title: str
    description: Optional[str] = None
    required: bool = True
    allowed_file_types: Optional[str] = None
    max_files: int = 5


class EvidenceRequirementCreate(EvidenceRequirementBase):
    pass


class EvidenceRequirementUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    required: Optional[bool] = None
    allowed_file_types: Optional[str] = None
    max_files: Optional[int] = None


class EvidenceRequirementResponse(EvidenceRequirementBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True