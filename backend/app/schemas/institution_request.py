from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class InstitutionRequestCreate(BaseModel):
    requester_name: str = Field(
        min_length=2,
        max_length=150,
    )

    requester_email: EmailStr

    institution_name: str = Field(
        min_length=2,
        max_length=200,
    )

    institution_code: str | None = Field(
        default=None,
        max_length=50,
    )

    official_email: EmailStr | None = None

    address: str | None = Field(
        default=None,
        max_length=500,
    )

    city: str | None = Field(
        default=None,
        max_length=100,
    )

    state: str | None = Field(
        default=None,
        max_length=100,
    )

    pincode: str | None = Field(
        default=None,
        max_length=10,
    )

    institution_type: str | None = Field(
        default=None,
        max_length=100,
    )

    website: str | None = Field(
        default=None,
        max_length=255,
    )


class InstitutionRequestResponse(BaseModel):
    id: int

    requester_name: str
    requester_email: str

    institution_name: str
    institution_code: str | None = None

    official_email: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    institution_type: str | None = None
    website: str | None = None

    status: str

    reviewed_by: int | None = None
    reviewed_at: datetime | None = None

    rejection_reason: str | None = None

    created_institution_id: int | None = None

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InstitutionRequestReject(BaseModel):
    reason: str = Field(
        min_length=3,
        max_length=500,
    )