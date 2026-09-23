from datetime import datetime
from app.services.review_service import create_review_decision
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
)

from app.db.database import Base


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    institution_id = Column(
        Integer,
        ForeignKey("institutions.id"),
        nullable=False,
        index=True
    )

    cycle_id = Column(
        Integer,
        ForeignKey("accreditation_cycles.id"),
        nullable=True,
        index=True
    )

    criterion_id = Column(
        Integer,
        ForeignKey("criteria.id"),
        nullable=True,
        index=True
    )

    department_id = Column(
        Integer,
        ForeignKey("departments.id"),
        nullable=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    title = Column(
        String(200),
        nullable=False
    )

    metric_code = Column(
        String(50),
        nullable=True,
        index=True
    )

    status = Column(
        String(50),
        nullable=False,
        default="Draft",
        index=True
    )

    data_json = Column(
        Text,
        nullable=True
    )

    # ========================================================
    # REVIEW TRACKING
    # ========================================================

    reviewed_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        index=True
    )

    reviewed_at = Column(
        DateTime,
        nullable=True
    )

    # ========================================================
    # DATA APPROVAL TRACKING
    # ========================================================

    approved_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        index=True
    )

    approved_at = Column(
        DateTime,
        nullable=True
    )

    # ========================================================
    # FINAL APPROVAL TRACKING
    # ========================================================

    final_approved_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        index=True
    )

    final_approved_at = Column(
        DateTime,
        nullable=True
    )

    # ========================================================
    # CHANGE / REJECTION REASONS
    # ========================================================

    change_request_reason = Column(
        Text,
        nullable=True
    )

    rejection_reason = Column(
        Text,
        nullable=True
    )

    # ========================================================
    # FINAL SUBMISSION
    # ========================================================

    final_submitted_at = Column(
        DateTime,
        nullable=True
    )

    # ========================================================
    # TIMESTAMPS
    # ========================================================

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )