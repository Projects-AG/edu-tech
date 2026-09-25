from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
)

from app.db.database import Base


class Criterion(Base):
    __tablename__ = "criteria"

    # ---------------------------------------------------------
    # PRIMARY KEY
    # ---------------------------------------------------------
    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    # ---------------------------------------------------------
    # ACCREDITATION CYCLE
    # ---------------------------------------------------------
    cycle_id = Column(
        Integer,
        ForeignKey("accreditation_cycles.id"),
        nullable=True,
        index=True
    )

    # ---------------------------------------------------------
    # CRITERION INFORMATION
    # ---------------------------------------------------------
    number = Column(
        String(10),
        nullable=False
    )  # Example: C1, C2, C3...

    title = Column(
        String(200),
        nullable=False
    )

    description = Column(
        String(500),
        nullable=True
    )

    # ---------------------------------------------------------
    # CRITERION WEIGHTAGE
    # ---------------------------------------------------------
    weightage = Column(
        Integer,
        nullable=False,
        default=100
    )

    # ---------------------------------------------------------
    # COMPLETION PROGRESS
    # ---------------------------------------------------------
    completion_percentage = Column(
        Float,
        nullable=False,
        default=0.0
    )

    # ---------------------------------------------------------
    # TIMESTAMPS
    # ---------------------------------------------------------
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

