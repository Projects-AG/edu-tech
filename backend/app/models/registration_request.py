from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Text,
    ForeignKey,
)

from app.db.database import Base


class RegistrationRequest(Base):
    __tablename__ = "registration_requests"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    full_name = Column(
        String(150),
        nullable=False,
    )

    email = Column(
        String(150),
        nullable=False,
        index=True,
    )

    institution = Column(
        String(250),
        nullable=False,
    )

    institution_id = Column(
        Integer,
        ForeignKey("institutions.id"),
        nullable=True,
        index=True,
    )

    department = Column(
        String(150),
        nullable=False,
    )

    department_id = Column(
        Integer,
        ForeignKey("departments.id"),
        nullable=True,
        index=True,
    )

    designation = Column(
        String(150),
        nullable=False,
    )

    password_hash = Column(
        String(255),
        nullable=False,
    )

    # ========================================================
    # ROLE REQUESTED BY APPLICANT
    # ========================================================

    requested_role_id = Column(
        Integer,
        ForeignKey("roles.id"),
        nullable=True,
        index=True,
    )

    # ========================================================
    # FINAL ROLE ASSIGNED AFTER AUTHORIZATION
    # ========================================================

    assigned_role_id = Column(
        Integer,
        nullable=True,
        index=True,
    )

    # ========================================================
    # REGISTRATION STATUS
    # ========================================================

    status = Column(
        String(50),
        nullable=False,
        default="PENDING",
        index=True,
    )

    # ========================================================
    # WHO AUTHORIZED / REJECTED
    # ========================================================

    reviewed_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    reviewed_at = Column(
        DateTime,
        nullable=True,
    )

    rejection_reason = Column(
        Text,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )