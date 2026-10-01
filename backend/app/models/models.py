import uuid
import enum
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer, JSON, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.session import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


UUID_STR = String(36)


# ── Enums ──────────────────────────────────────────────────────────────

class RoleName(str, enum.Enum):
    ADMIN = "ADMIN"
    IQAC_COORDINATOR = "IQAC_COORDINATOR"
    CRITERION_INCHARGE = "CRITERION_INCHARGE"
    DEPARTMENT_CONTRIBUTOR = "DEPARTMENT_CONTRIBUTOR"
    FACULTY = "FACULTY"
    REVIEWER = "REVIEWER"
    FINAL_APPROVER = "FINAL_APPROVER"


class ScopeType(str, enum.Enum):
    INSTITUTION = "INSTITUTION"
    DEPARTMENT = "DEPARTMENT"
    CRITERION = "CRITERION"


ROLE_ENUM = Enum(RoleName, native_enum=False, length=50)
SCOPE_ENUM = Enum(ScopeType, native_enum=False, length=50)


# ── Models ─────────────────────────────────────────────────────────────

class Institution(Base):
    __tablename__ = "institutions"

    id: Mapped[str] = mapped_column(UUID_STR, primary_key=True, default=gen_uuid)
    name: Mapped[str] = mapped_column(String, nullable=False)
    naac_id: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    type: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    departments: Mapped[list["Department"]] = relationship(back_populates="institution")
    users: Mapped[list["User"]] = relationship(back_populates="institution")
    academic_years: Mapped[list["AcademicYear"]] = relationship(back_populates="institution")


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[str] = mapped_column(UUID_STR, primary_key=True, default=gen_uuid)
    institution_id: Mapped[str] = mapped_column(ForeignKey("institutions.id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    code: Mapped[str] = mapped_column(String, nullable=False)

    institution: Mapped["Institution"] = relationship(back_populates="departments")
    users: Mapped[list["User"]] = relationship(back_populates="department")


class AcademicYear(Base):
    __tablename__ = "academic_years"

    id: Mapped[str] = mapped_column(UUID_STR, primary_key=True, default=gen_uuid)
    institution_id: Mapped[str] = mapped_column(ForeignKey("institutions.id"), nullable=False)
    label: Mapped[str] = mapped_column(String, nullable=False)
    start_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)

    institution: Mapped["Institution"] = relationship(back_populates="academic_years")


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(UUID_STR, primary_key=True, default=gen_uuid)
    institution_id: Mapped[str] = mapped_column(ForeignKey("institutions.id"), nullable=False)
    department_id: Mapped[str | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    institution: Mapped["Institution"] = relationship(back_populates="users")
    department: Mapped["Department | None"] = relationship(back_populates="users")
    role_assignments: Mapped[list["RoleAssignment"]] = relationship(back_populates="user")


class RoleAssignment(Base):
    __tablename__ = "role_assignments"

    id: Mapped[str] = mapped_column(UUID_STR, primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    role: Mapped[RoleName] = mapped_column(ROLE_ENUM, nullable=False)
    scope_type: Mapped[ScopeType] = mapped_column(SCOPE_ENUM, nullable=False)
    department_id: Mapped[str | None] = mapped_column(ForeignKey("departments.id"), nullable=True)

    user: Mapped["User"] = relationship(back_populates="role_assignments")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(UUID_STR, primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class FileUpload(Base):
    __tablename__ = "file_uploads"

    id: Mapped[str] = mapped_column(UUID_STR, primary_key=True, default=gen_uuid)
    institution_id: Mapped[str] = mapped_column(ForeignKey("institutions.id"), nullable=False)
    uploaded_by_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    file_name: Mapped[str] = mapped_column(String, nullable=False)
    storage_key: Mapped[str] = mapped_column(String, nullable=False)
    mime_type: Mapped[str] = mapped_column(String, nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    checksum: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(UUID_STR, primary_key=True, default=gen_uuid)
    institution_id: Mapped[str] = mapped_column(ForeignKey("institutions.id"), nullable=False)
    actor_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String, nullable=False)
    entity_type: Mapped[str] = mapped_column(String, nullable=False)
    entity_id: Mapped[str | None] = mapped_column(String, nullable=True)
    log_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
