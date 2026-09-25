from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from app.db.database import Base


class AccreditationCycle(Base):
    __tablename__ = "accreditation_cycles"

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