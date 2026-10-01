from datetime import datetime

from pydantic import BaseModel, Field


class CommitteeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    chairperson_id: int | None = None
    status: str = Field(default="ACTIVE", max_length=50)


class CommitteeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=1000)
    chairperson_id: int | None = None
    status: str | None = Field(default=None, max_length=50)


class CommitteeResponse(BaseModel):
    id: int
    institution_id: int
    name: str
    description: str | None
    chairperson_id: int | None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CommitteeMemberCreate(BaseModel):
    user_id: int
    committee_role: str = Field(
        default="MEMBER",
        min_length=1,
        max_length=100
    )


class CommitteeMemberResponse(BaseModel):
    id: int
    committee_id: int
    user_id: int
    committee_role: str
    joined_at: datetime

    model_config = {"from_attributes": True}

class CommitteeAssignmentCreate(BaseModel):
    committee_member_id: int
    criterion_id: int
    responsibility: str | None = Field(
        default=None,
        max_length=200
    )


class CommitteeAssignmentResponse(BaseModel):
    id: int
    committee_id: int
    committee_member_id: int
    criterion_id: int
    responsibility: str | None
    assigned_at: datetime

    model_config = {"from_attributes": True}
