from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey

from app.db.database import Base


class Department(Base):
    __tablename__ = "departments"

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

    faculty_id = Column(
        Integer,
        ForeignKey("faculties.id"),
        nullable=True,
        index=True
    )

    name = Column(
        String(150),
        nullable=False
    )

    code = Column(
        String(50),
        nullable=False,
        index=True
    )

    head_name = Column(
        String(100),
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