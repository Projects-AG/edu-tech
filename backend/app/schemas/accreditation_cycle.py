from datetime import datetime

from pydantic import BaseModel, ConfigDict


# ============================================================
# ACCREDITATION CYCLE BASE
# ============================================================

class AccreditationCycleBase(BaseModel):
    institution_id: int
    name: str
    code: str
    academic_period: str | None = None
    status: str = "Draft"
    description: str | None = None
    framework_id: int | None = None


# ============================================================
# CREATE ACCREDITATION CYCLE
# ============================================================

class AccreditationCycleCreate(AccreditationCycleBase):
    pass


# ============================================================
# UPDATE ACCREDITATION CYCLE
# ============================================================

class AccreditationCycleUpdate(BaseModel):
    institution_id: int | None = None
    name: str | None = None
    code: str | None = None
    academic_period: str | None = None
    status: str | None = None
    description: str | None = None
    framework_id: int | None = None


# ============================================================
# ACCREDITATION CYCLE RESPONSE
# ============================================================

class AccreditationCycleResponse(AccreditationCycleBase):
    id: int
    created_by: int | None = None
    framework_name: str | None = None
    framework_version: str | None = None
    framework_code: str | None = None
    framework_verification_status: str | None = None
    criterion_structure_verified: bool | None = None
    metric_catalogue_complete: bool | None = None
    catalogue_status: str | None = None
    allows_production_cycles: bool | None = None
    catalog_kind: str | None = None
    official_operational_metric_count: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)