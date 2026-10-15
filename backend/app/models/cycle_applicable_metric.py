from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)

from app.db.database import Base


class CycleApplicableMetric(Base):
    """Maps a global catalog metric as applicable to one accreditation cycle."""

    __tablename__ = "cycle_applicable_metrics"
    __table_args__ = (
        UniqueConstraint(
            "cycle_id",
            "metric_id",
            name="uq_cycle_applicable_metric",
        ),
    )

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    cycle_id = Column(
        Integer,
        ForeignKey(
            "accreditation_cycles.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    metric_id = Column(
        Integer,
        ForeignKey(
            "metrics.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    required = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    exception_type = Column(
        String(40),
        nullable=True,
    )

    justification = Column(
        Text,
        nullable=True,
    )

    approved_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    approved_at = Column(
        DateTime,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
