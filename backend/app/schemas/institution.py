from datetime import datetime

from pydantic import BaseModel, ConfigDict


class InstitutionBase(BaseModel):
    name: str
    code: str
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    institution_type: str | None = None
    established_year: int | None = None
    website: str | None = None


class InstitutionCreate(InstitutionBase):
    pass


class InstitutionUpdate(BaseModel):
    name: str | None = None
    code: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    institution_type: str | None = None
    established_year: int | None = None
    website: str | None = None


class InstitutionResponse(InstitutionBase):
    id: int
    created_by: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )