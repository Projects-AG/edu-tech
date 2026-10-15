from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CommitteeCreate(BaseModel):
    name: str
    description: str | None = None
    chairperson: str | None = None
    status: str | None = "Active"


class CommitteeUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    chairperson: str | None = None
    status: str | None = None


class CommitteeResponse(BaseModel):
    id: int
    institution_id: int | None = None
    name: str
    description: str | None = None
    chairperson: str | None = None
    status: str
    member_count: int = 0
    criteria_count: int = 0
    created_by: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CommitteeMemberCreate(BaseModel):
    user_id: int
    committee_role: str | None = "Member"


class CommitteeMemberUpdate(BaseModel):
    committee_role: str


class CommitteeMemberResponse(BaseModel):
    id: int
    committee_id: int
    user_id: int
    committee_role: str
    name: str | None = None
    email: str | None = None
    system_role: str | None = None
    department: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CommitteeAvailableUserResponse(BaseModel):
    id: int
    name: str
    email: str
    system_role: str | None = None
    department: str | None = None
