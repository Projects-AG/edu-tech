from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    Float,
    Boolean,
)

from app.db.database import Base


class Metric(Base):
    __tablename__ = "metrics"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    section_id = Column(
        Integer,
        ForeignKey("sections.id"),
        nullable=False,
        index=True
    )

    code = Column(
        String(50),
        nullable=False,
        index=True
    )

    title = Column(
        String(300),
        nullable=False
    )

    description = Column(
        Text,
        nullable=True
    )

    metric_type = Column(
        String(50),
        nullable=False,
        default="Quantitative"
    )

    weightage = Column(
        Float,
        nullable=False,
        default=0.0
    )

    max_score = Column(
        Float,
        nullable=False,
        default=100.0
    )

    requires_evidence = Column(
        Boolean,
        nullable=False,
        default=True
    )

    display_order = Column(
        Integer,
        nullable=False,
        default=1
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