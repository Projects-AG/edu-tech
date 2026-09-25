from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    Boolean,
)

from app.db.database import Base


class EvidenceRequirement(Base):
    __tablename__ = "evidence_requirements"

    id = Column(Integer, primary_key=True, index=True)

    metric_id = Column(
        Integer,
        ForeignKey("metrics.id"),
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

    required = Column(
        Boolean,
        nullable=False,
        default=True
    )

    allowed_file_types = Column(
        String(300),
        nullable=True
    )

    max_files = Column(
        Integer,
        nullable=False,
        default=5
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