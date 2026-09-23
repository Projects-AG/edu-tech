from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ReviewCreate(BaseModel):
    submission_id: int

    status: str

    comments: Optional[str] = None

    # Actual score awarded by reviewer
    score: Optional[float] = Field(
        default=None,
        ge=0
    )

    # Maximum score for the metric
    max_score: Optional[float] = Field(
        default=None,
        gt=0
    )


class ReviewResponse(BaseModel):
    id: int
    submission_id: int
    reviewer_id: int
    status: str
    comments: Optional[str] = None

    score: Optional[float] = None
    max_score: Optional[float] = None

    created_at: datetime

    class Config:
        from_attributes = True