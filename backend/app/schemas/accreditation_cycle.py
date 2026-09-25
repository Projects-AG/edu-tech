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


# ============================================================
# ACCREDITATION CYCLE RESPONSE
# ============================================================

class AccreditationCycleResponse(AccreditationCycleBase):
    id: int
    created_by: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)