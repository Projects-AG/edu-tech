from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    Float,
    Boolean,
    Index,
    text,
)

from app.db.database import Base

CATALOG_KIND_WORKING = "WORKING"
CATALOG_KIND_OFFICIAL = "OFFICIAL"


class Metric(Base):
    __tablename__ = "metrics"
    __table_args__ = (
        CheckConstraint(
            "catalog_kind IN ('WORKING', 'OFFICIAL')",
            name="ck_metrics_catalog_kind",
        ),
        CheckConstraint(
            "(catalog_kind = 'WORKING' AND framework_id IS NULL) "
            "OR (catalog_kind = 'OFFICIAL' AND framework_id IS NOT NULL)",
            name="ck_metrics_catalog_framework_alignment",
        ),
        Index(
            "uq_metrics_official_framework_code",
            "framework_id",
            "code",
            unique=True,
            postgresql_where=text(
                "catalog_kind = 'OFFICIAL' AND framework_id IS NOT NULL"
            ),
        ),
    )

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
        Text,
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

    catalog_kind = Column(
        String(20),
        nullable=False,
        default=CATALOG_KIND_WORKING,
        server_default=CATALOG_KIND_WORKING,
        index=True,
    )

    framework_id = Column(
        Integer,
        ForeignKey(
            "naac_frameworks.id",
            ondelete="RESTRICT",
            name="fk_metrics_framework_id",
        ),
        nullable=True,
        index=True,
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
