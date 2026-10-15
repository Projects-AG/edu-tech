from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

from app.services.naac_framework_catalog import normalize_official_category


class InstitutionBase(BaseModel):
    name: str
    code: str
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
    confirmed_framework_id: int | None = None
    established_year: int | None = None
    website: str | None = None


class InstitutionCreate(InstitutionBase):
    @field_validator("official_category", mode="before")
    @classmethod
    def validate_official_category(cls, value):
        return normalize_official_category(value)


class InstitutionUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
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
    confirmed_framework_id: int | None = None
    established_year: int | None = None
    website: str | None = None

    @field_validator("official_category", mode="before")
    @classmethod
    def validate_official_category(cls, value):
        return normalize_official_category(value)


class InstitutionResponse(InstitutionBase):
    id: int
    created_by: int | None = None
    framework_confirmed_by: int | None = None
    framework_confirmed_at: datetime | None = None
    framework_confirmation_note: str | None = None
    confirmed_framework_name: str | None = None
    confirmed_framework_code: str | None = None
    confirmed_framework_version: str | None = None
    criterion_structure_verified: bool | None = None
    metric_catalogue_complete: bool | None = None
    metric_rules_verified: bool | None = None
    catalogue_status: str | None = None
    eligible_cycle_framework_id: int | None = None
    eligible_cycle_framework_reason: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )