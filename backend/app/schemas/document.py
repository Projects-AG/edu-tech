from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DocumentBase(BaseModel):
    title: str
    file_path: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    submission_id: Optional[int] = None


class DocumentCreate(DocumentBase):
    pass


class DocumentResponse(DocumentBase):
    id: int
    institution_id: int
    uploaded_by: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class DocumentVersionResponse(BaseModel):
    id: int
    document_id: int
    version_number: int
    file_path: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    uploaded_by: int
    is_current: bool
    created_at: datetime

    class Config:
        from_attributes = True