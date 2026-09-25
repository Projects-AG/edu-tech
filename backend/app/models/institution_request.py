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


class InstitutionRequest(Base):
    __tablename__ = "institution_requests"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    # ============================================================
    # REQUESTER
    # ============================================================

    requester_name = Column(
        String(150),
        nullable=False,
    )

    requester_email = Column(
        String(150),
        nullable=False,
        index=True,
    )

    # ============================================================
    # INSTITUTION DETAILS
    # ============================================================

    institution_name = Column(
        String(200),
        nullable=False,
    )

    institution_code = Column(
        String(50),
        nullable=True,
        index=True,
    )

    official_email = Column(
        String(150),
        nullable=True,
    )

    address = Column(
        String(500),
        nullable=True,
    )

    city = Column(
        String(100),
        nullable=True,
    )

    state = Column(
        String(100),
        nullable=True,
    )

    pincode = Column(
        String(10),
        nullable=True,
    )

    institution_type = Column(
        String(100),
        nullable=True,
    )

    website = Column(
        String(255),
        nullable=True,
    )

    # ============================================================
    # STATUS
    # ============================================================

    status = Column(
        String(30),
        nullable=False,
        default="PENDING",
        index=True,
    )

    # ============================================================
    # ADMIN REVIEW
    # ============================================================

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

    created_institution_id = Column(
        Integer,
        ForeignKey("institutions.id"),
        nullable=True,
    )

    # ============================================================
    # TIMESTAMPS
    # ============================================================

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