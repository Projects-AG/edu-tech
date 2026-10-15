from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.naac_framework import NaacFrameworkResponse
from app.services.naac_framework_catalog import normalize_official_category


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

    official_category: str = Field(max_length=80)
    affiliation_status: str | None = Field(default=None, max_length=80)
    affiliated_university: str | None = Field(default=None, max_length=200)
    autonomous_status: str | None = Field(default=None, max_length=40)
    is_constituent_unit: bool | None = None
    parent_institution_name: str | None = Field(default=None, max_length=200)
    programme_level: str | None = Field(default=None, max_length=30)
    existing_naac_status: str | None = Field(default=None, max_length=80)
    previous_cycle_number: str | None = Field(default=None, max_length=40)
    application_pathway: str | None = Field(default=None, max_length=80)

    website: str | None = Field(
        default=None,
        max_length=255,
    )

    @field_validator("official_category", mode="before")
    @classmethod
    def validate_official_category(cls, value):
        return normalize_official_category(value, required=True)


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
    official_category: str | None = None
    affiliation_status: str | None = None
    affiliated_university: str | None = None
    autonomous_status: str | None = None
    is_constituent_unit: bool | None = None
    parent_institution_name: str | None = None
    programme_level: str | None = None
    existing_naac_status: str | None = None
    previous_cycle_number: str | None = None
    application_pathway: str | None = None
    recommended_framework_id: int | None = None
    recommendation_status: str | None = None
    recommendation_reason: str | None = None
    confirmed_framework_id: int | None = None
    framework_override_reason: str | None = None
    recommended_framework: NaacFrameworkResponse | None = None
    confirmed_framework: NaacFrameworkResponse | None = None
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


class InstitutionRequestApprove(BaseModel):
    confirmed_framework_id: int | None = None
    override_reason: str | None = Field(default=None, max_length=500)