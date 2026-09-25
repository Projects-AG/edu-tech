from pydantic import BaseModel
from typing import Optional


class FacultyResponse(BaseModel):
    id: int
    institution_id: int
    name: str
    code: Optional[str] = None
    dean_name: Optional[str] = None

    class Config:
        from_attributes = True