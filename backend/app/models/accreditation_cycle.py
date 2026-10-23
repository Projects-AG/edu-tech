from datetime import datetime

from sqlalchemy import CheckConstraint, Column, Integer, String, DateTime, ForeignKey
from app.db.database import Base

CYCLE_MODE_INTERNAL_PREPARATION = "INTERNAL_PREPARATION"

PREPARATION_STATUSES = (
    "Preparation Draft",
    "Preparation Open",
    "Preparation Finalized",
    "Preparation Archived",
)


class AccreditationCycle(Base):
    __tablename__ = "accreditation_cycles"
    __table_args__ = (
        CheckConstraint(
            "cycle_mode IS NULL OR cycle_mode = 'INTERNAL_PREPARATION'",
            name="ck_accreditation_cycles_cycle_mode_values",
        ),
        CheckConstraint(
            "(cycle_mode = 'INTERNAL_PREPARATION' "
            "AND status IN ('Preparation Draft', 'Preparation Open', "
            "'Preparation Finalized', 'Preparation Archived')) "
            "OR (cycle_mode IS NULL "
            "AND status NOT IN ('Preparation Draft', 'Preparation Open', "
            "'Preparation Finalized', 'Preparation Archived'))",
            name="ck_accreditation_cycles_cycle_mode_status",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)

    # Institution to which this accreditation cycle belongs
    institution_id = Column(
        Integer,
        ForeignKey("institutions.id"),
        nullable=False,
        index=True
    )

    # Example: Cycle 3
    name = Column(
        String(100),
        nullable=False
    )

    # Example: CYCLE_3
    code = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    # Example: 2026-2031
    academic_period = Column(
        String(50),
        nullable=True
    )

    # Draft / Active / Completed / Archived
    status = Column(
        String(50),
        nullable=False,
        default="Draft"
    )

    # Optional description
    description = Column(
        String(500),
        nullable=True
    )

    # NULL for ordinary (official) cycles; INTERNAL_PREPARATION marks a
    # rehearsal cycle that uses the working catalogue and preparation
    # statuses. See app.services.cycle_mode.
    cycle_mode = Column(
        String(40),
        nullable=True
    )

    framework_id = Column(
        Integer,
        ForeignKey("naac_frameworks.id"),
        nullable=True,
        index=True,
    )

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

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