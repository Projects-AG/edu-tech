from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

from app.models.models import RoleName, ScopeType


# ---------- Auth ----------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str


class RefreshRequest(BaseModel):
    refresh_token: str


class AccessTokenResponse(BaseModel):
    access_token: str


# ---------- Institution ----------
class InstitutionCreate(BaseModel):
    name: str
    type: str
    naac_id: str | None = None


class InstitutionOut(BaseModel):
    id: str
    name: str
    type: str
    naac_id: str | None
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Department ----------
class DepartmentCreate(BaseModel):
    institution_id: str
    name: str
    code: str


class DepartmentOut(BaseModel):
    id: str
    institution_id: str
    name: str
    code: str

    class Config:
        from_attributes = True


# ---------- Academic Year ----------
class AcademicYearCreate(BaseModel):
    institution_id: str
    label: str
    start_date: datetime
    end_date: datetime
    is_active: bool = False


class AcademicYearOut(BaseModel):
    id: str
    label: str
    start_date: datetime
    end_date: datetime
    is_active: bool

    class Config:
        from_attributes = True


# ---------- User ----------
class UserCreate(BaseModel):
    institution_id: str
    department_id: str | None = None
    name: str
    email: EmailStr
    password: str = Field(min_length=8)


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    institution_id: str
    department_id: str | None
    is_active: bool

    class Config:
        from_attributes = True


class RoleAssignmentCreate(BaseModel):
    user_id: str
    role: RoleName
    scope_type: ScopeType
    department_id: str | None = None


# ---------- Audit Log ----------
class AuditLogOut(BaseModel):
    id: str
    action: str
    entity_type: str
    entity_id: str | None
    created_at: datetime

    class Config:
        from_attributes = True
