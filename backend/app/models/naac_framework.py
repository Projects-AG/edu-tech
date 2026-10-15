from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)

from app.db.database import Base


class NaacFramework(Base):
    """Versioned official or internal NAAC pathway definition."""

    __tablename__ = "naac_frameworks"
    __table_args__ = (
        UniqueConstraint("code", "version", name="uq_naac_framework_code_version"),
    )

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(80), nullable=False, index=True)
    name = Column(String(250), nullable=False)
    version = Column(String(80), nullable=False)
    pathway_type = Column(String(40), nullable=False, index=True)
    institution_category = Column(String(80), nullable=False, index=True)
    programme_level = Column(String(30), nullable=True)
    source_title = Column(String(300), nullable=True)
    source_url = Column(String(500), nullable=True)
    issuing_authority = Column(String(200), nullable=True)
    publication_date = Column(Date, nullable=True)
    effective_from = Column(Date, nullable=True)
    effective_to = Column(Date, nullable=True)
    verification_status = Column(String(60), nullable=False, index=True)
    status = Column(String(40), nullable=False, default="ACTIVE")
    allows_production_cycles = Column(Boolean, nullable=False, default=False)
    uses_seven_criteria = Column(Boolean, nullable=False, default=False)
    official_criterion_count = Column(Integer, nullable=True)
    official_metric_count = Column(Integer, nullable=True)
    official_metric_count_note = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )


class FrameworkCriterion(Base):
    """Criteria belonging to one framework version."""

    __tablename__ = "framework_criteria"
    __table_args__ = (
        UniqueConstraint(
            "framework_id",
            "number",
            name="uq_framework_criterion_number",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    framework_id = Column(
        Integer,
        ForeignKey("naac_frameworks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    number = Column(String(10), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(String(500), nullable=True)
    display_order = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class FrameworkMetric(Base):
    """Official metric rows for a framework version.

    Seeded only when a source-backed official code exists. Do not invent IDs.
    """

    __tablename__ = "framework_metrics"
    __table_args__ = (
        UniqueConstraint(
            "framework_id",
            "official_code",
            name="uq_framework_metric_code",
        ),
        Index(
            "uq_framework_metric_operational_metric_id",
            "operational_metric_id",
            unique=True,
            postgresql_where=text("operational_metric_id IS NOT NULL"),
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    framework_id = Column(
        Integer,
        ForeignKey("naac_frameworks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    framework_criterion_id = Column(
        Integer,
        ForeignKey("framework_criteria.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    official_code = Column(String(50), nullable=False)
    title = Column(Text, nullable=False)
    required_default = Column(Boolean, nullable=False, default=False)
    metric_kind = Column(String(20), nullable=True)
    weightage = Column(Float, nullable=True)
    verification_status = Column(String(60), nullable=False)
    maps_to_metric_id = Column(
        Integer,
        ForeignKey("metrics.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    operational_metric_id = Column(
        Integer,
        ForeignKey(
            "metrics.id",
            ondelete="SET NULL",
            name="fk_framework_metrics_operational_metric_id",
        ),
        nullable=True,
        index=True,
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
