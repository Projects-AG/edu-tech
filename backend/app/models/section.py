from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    Float,
)

from app.db.database import Base


class Section(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True, index=True)

    criterion_id = Column(
        Integer,
        ForeignKey("criteria.id"),
        nullable=False,
        index=True
    )

    code = Column(String(50), nullable=False, index=True)

    title = Column(String(200), nullable=False)

    description = Column(Text, nullable=True)

    weightage = Column(Float, nullable=False, default=0.0)

    display_order = Column(Integer, nullable=False, default=1)

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