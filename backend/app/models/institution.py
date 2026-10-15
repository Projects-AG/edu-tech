from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
)

from app.db.database import Base


class Institution(Base):
    __tablename__ = "institutions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(200),
        nullable=False
    )

    code = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    address = Column(
        String(500),
        nullable=True
    )

    city = Column(
        String(100),
        nullable=True
    )

    state = Column(
        String(100),
        nullable=True
    )

    pincode = Column(
        String(10),
        nullable=True
    )

    institution_type = Column(
        String(100),
        nullable=True
    )

    official_category = Column(
        String(80),
        nullable=True,
        index=True,
    )

    affiliation_status = Column(
        String(80),
        nullable=True,
    )

    affiliated_university = Column(
        String(200),
        nullable=True,
    )

    autonomous_status = Column(
        String(40),
        nullable=True,
    )

    is_constituent_unit = Column(
        Boolean,
        nullable=True,
    )

    parent_institution_name = Column(
        String(200),
        nullable=True,
    )

    programme_level = Column(
        String(30),
        nullable=True,
    )

    existing_naac_status = Column(
        String(80),
        nullable=True,
    )

    previous_cycle_number = Column(
        String(40),
        nullable=True,
    )

    application_pathway = Column(
        String(80),
        nullable=True,
    )

    confirmed_framework_id = Column(
        Integer,
        ForeignKey("naac_frameworks.id"),
        nullable=True,
        index=True,
    )

    framework_confirmed_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    framework_confirmed_at = Column(
        DateTime,
        nullable=True,
    )

    framework_confirmation_note = Column(
        String(500),
        nullable=True,
    )

    established_year = Column(
        Integer,
        nullable=True
    )

    website = Column(
        String(255),
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