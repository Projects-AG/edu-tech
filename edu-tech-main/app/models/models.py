import uuid
import enum
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer, JSON, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


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


class CycleStatus(str, enum.Enum):
    PLANNING = "PLANNING"
    SSR_IN_PROGRESS = "SSR_IN_PROGRESS"
    SUBMITTED = "SUBMITTED"
    COMPLETED = "COMPLETED"


class EvidenceStatus(str, enum.Enum):
    PENDING_REVIEW = "PENDING_REVIEW"
    VERIFIED = "VERIFIED"
    NEEDS_CORRECTION = "NEEDS_CORRECTION"


class SubmissionStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    NEEDS_CORRECTION = "NEEDS_CORRECTION"
    APPROVED = "APPROVED"


class ReviewStage(str, enum.Enum):
    DRAFT = "DRAFT"
    REVIEWER = "REVIEWER"
    COMMITTEE = "COMMITTEE"
    DATA_APPROVAL = "DATA_APPROVAL"
    SSR_LOCK = "SSR_LOCK"


class ReviewStepState(str, enum.Enum):
    DONE = "DONE"
    CURRENT = "CURRENT"
    PENDING = "PENDING"


UUID_STR = String(36)
ROLE_ENUM = Enum(RoleName, native_enum=False, length=50)
SCOPE_ENUM = Enum(ScopeType, native_enum=False, length=50)
CYCLE_STATUS_ENUM = Enum(CycleStatus, native_enum=False, length=50)
EVIDENCE_STATUS_ENUM = Enum(EvidenceStatus, native_enum=False, length=50)
SUBMISSION_STATUS_ENUM = Enum(SubmissionStatus, native_enum=False, length=50)
REVIEW_STAGE_ENUM = Enum(ReviewStage, native_enum=False, length=50)
REVIEW_STEP_STATE_ENUM = Enum(ReviewStepState, native_enum=False, length=50)


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
    cycles: Mapped[list["AccreditationCycle"]] = relationship(back_populates="institution")


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
    label: Mapped[str] = mapped_column(String, nullable=False)  # e.g. "2025-2026"
    start_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)

    institution: Mapped["Institution"] = relationship(back_populates="academic_years")
    cycles: Mapped[list["AccreditationCycle"]] = relationship(back_populates="academic_year")


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


# A user can hold a role scoped to the whole institution, one department,
# or one criterion. Scope powers RBAC checks on scoped resources —
# role name alone is not enough.
class RoleAssignment(Base):
    __tablename__ = "role_assignments"

    id: Mapped[str] = mapped_column(UUID_STR, primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    role: Mapped[RoleName] = mapped_column(ROLE_ENUM, nullable=False)
    scope_type: Mapped[ScopeType] = mapped_column(SCOPE_ENUM, nullable=False)
    department_id: Mapped[str | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    criterion_id: Mapped[str | None] = mapped_column(ForeignKey("criteria.id"), nullable=True)

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
    action: Mapped[str] = mapped_column(String, nullable=False)  # e.g. "USER_LOGIN"
    entity_type: Mapped[str] = mapped_column(String, nullable=False)
    entity_id: Mapped[str | None] = mapped_column(String, nullable=True)
    log_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# ---------- Phase 2: NAAC accreditation domain ----------


class AccreditationCycle(Base):
    __tablename__ = "accreditation_cycles"

    id: Mapped[str] = mapped_column(UUID_STR, primary_key=True, default=gen_uuid)
    institution_id: Mapped[str] = mapped_column(ForeignKey("institutions.id"), nullable=False)
    academic_year_id: Mapped[str | None] = mapped_column(ForeignKey("academic_years.id"), nullable=True)
    title: Mapped[str] = mapped_column(String, nullable=False)  # e.g. "CYCLE 3"
    label: Mapped[str] = mapped_column(String, nullable=False)  # e.g. "2026–27"
    status: Mapped[CycleStatus] = mapped_column(
        CYCLE_STATUS_ENUM, nullable=False, default=CycleStatus.SSR_IN_PROGRESS
    )
    ssr_target_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=85)
    expected_submission: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    institution: Mapped["Institution"] = relationship(back_populates="cycles")
    academic_year: Mapped["AcademicYear | None"] = relationship(back_populates="cycles")
    criteria: Mapped[list["Criterion"]] = relationship(back_populates="cycle")
    submissions: Mapped[list["Submission"]] = relationship(back_populates="cycle")


class Criterion(Base):
    __tablename__ = "criteria"

    id: Mapped[str] = mapped_column(UUID_STR, primary_key=True, default=gen_uuid)
    cycle_id: Mapped[str] = mapped_column(ForeignKey("accreditation_cycles.id"), nullable=False)
    code: Mapped[str] = mapped_column(String, nullable=False)  # C1..C7
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    in_charge_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    lead_label: Mapped[str | None] = mapped_column(String, nullable=True)  # e.g. "Academics"

    cycle: Mapped["AccreditationCycle"] = relationship(back_populates="criteria")
    in_charge: Mapped["User | None"] = relationship(foreign_keys=[in_charge_user_id])
    key_indicators: Mapped[list["KeyIndicator"]] = relationship(back_populates="criterion")
    submissions: Mapped[list["Submission"]] = relationship(back_populates="criterion")


class KeyIndicator(Base):
    __tablename__ = "key_indicators"

    id: Mapped[str] = mapped_column(UUID_STR, primary_key=True, default=gen_uuid)
    criterion_id: Mapped[str] = mapped_column(ForeignKey("criteria.id"), nullable=False)
    code: Mapped[str] = mapped_column(String, nullable=False)  # 1.1
    name: Mapped[str] = mapped_column(String, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    criterion: Mapped["Criterion"] = relationship(back_populates="key_indicators")
    metrics: Mapped[list["Metric"]] = relationship(back_populates="key_indicator")


class Metric(Base):
    __tablename__ = "metrics"

    id: Mapped[str] = mapped_column(UUID_STR, primary_key=True, default=gen_uuid)
    key_indicator_id: Mapped[str] = mapped_column(ForeignKey("key_indicators.id"), nullable=False)
    code: Mapped[str] = mapped_column(String, nullable=False)  # 1.1.1
    name: Mapped[str] = mapped_column(String, nullable=False)
    weightage: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    key_indicator: Mapped["KeyIndicator"] = relationship(back_populates="metrics")
    evidence_items: Mapped[list["Evidence"]] = relationship(back_populates="metric")


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[str] = mapped_column(UUID_STR, primary_key=True, default=gen_uuid)
    institution_id: Mapped[str] = mapped_column(ForeignKey("institutions.id"), nullable=False)
    cycle_id: Mapped[str] = mapped_column(ForeignKey("accreditation_cycles.id"), nullable=False)
    metric_id: Mapped[str] = mapped_column(ForeignKey("metrics.id"), nullable=False)
    department_id: Mapped[str] = mapped_column(ForeignKey("departments.id"), nullable=False)
    file_upload_id: Mapped[str] = mapped_column(ForeignKey("file_uploads.id"), nullable=False)
    uploaded_by_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    unit: Mapped[str | None] = mapped_column(String, nullable=True)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[EvidenceStatus] = mapped_column(
        EVIDENCE_STATUS_ENUM, nullable=False, default=EvidenceStatus.PENDING_REVIEW
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    metric: Mapped["Metric"] = relationship(back_populates="evidence_items")
    department: Mapped["Department"] = relationship()
    file_upload: Mapped["FileUpload"] = relationship()
    uploaded_by: Mapped["User"] = relationship(foreign_keys=[uploaded_by_id])


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[str] = mapped_column(UUID_STR, primary_key=True, default=gen_uuid)
    institution_id: Mapped[str] = mapped_column(ForeignKey("institutions.id"), nullable=False)
    cycle_id: Mapped[str] = mapped_column(ForeignKey("accreditation_cycles.id"), nullable=False)
    criterion_id: Mapped[str] = mapped_column(ForeignKey("criteria.id"), nullable=False)
    department_id: Mapped[str] = mapped_column(ForeignKey("departments.id"), nullable=False)
    submitted_by_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    ref_code: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[SubmissionStatus] = mapped_column(
        SUBMISSION_STATUS_ENUM, nullable=False, default=SubmissionStatus.DRAFT
    )
    correction_note: Mapped[str | None] = mapped_column(String, nullable=True)
    correction_by_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    correction_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    assigned_to_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    cycle: Mapped["AccreditationCycle"] = relationship(back_populates="submissions")
    criterion: Mapped["Criterion"] = relationship(back_populates="submissions")
    department: Mapped["Department"] = relationship()
    submitted_by: Mapped["User"] = relationship(foreign_keys=[submitted_by_id])
    correction_by: Mapped["User | None"] = relationship(foreign_keys=[correction_by_id])
    assigned_to: Mapped["User | None"] = relationship(foreign_keys=[assigned_to_id])
    evidence_links: Mapped[list["SubmissionEvidence"]] = relationship(
        back_populates="submission", cascade="all, delete-orphan"
    )
    review_actions: Mapped[list["ReviewAction"]] = relationship(
        back_populates="submission", cascade="all, delete-orphan"
    )


class SubmissionEvidence(Base):
    __tablename__ = "submission_evidence"

    id: Mapped[str] = mapped_column(UUID_STR, primary_key=True, default=gen_uuid)
    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id"), nullable=False)
    evidence_id: Mapped[str] = mapped_column(ForeignKey("evidence.id"), nullable=False)

    submission: Mapped["Submission"] = relationship(back_populates="evidence_links")
    evidence: Mapped["Evidence"] = relationship()


class ReviewAction(Base):
    __tablename__ = "review_actions"

    id: Mapped[str] = mapped_column(UUID_STR, primary_key=True, default=gen_uuid)
    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id"), nullable=False)
    stage: Mapped[ReviewStage] = mapped_column(REVIEW_STAGE_ENUM, nullable=False)
    state: Mapped[ReviewStepState] = mapped_column(REVIEW_STEP_STATE_ENUM, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    assigned_to_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    note: Mapped[str | None] = mapped_column(String, nullable=True)
    acted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    submission: Mapped["Submission"] = relationship(back_populates="review_actions")
    assigned_to: Mapped["User | None"] = relationship(foreign_keys=[assigned_to_id])
