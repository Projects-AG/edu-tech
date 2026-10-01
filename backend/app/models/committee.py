from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from app.db.database import Base


class Committee(Base):
    __tablename__ = "committees"

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

    name = Column(
        String(200),
        nullable=False
    )

    description = Column(
        String(1000),
        nullable=True
    )

    chairperson_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    status = Column(
        String(50),
        nullable=False,
        default="ACTIVE"
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