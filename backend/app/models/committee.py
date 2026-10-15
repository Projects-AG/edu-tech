from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)

from app.db.database import Base


class Committee(Base):
    __tablename__ = "committees"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    institution_id = Column(
        Integer,
        ForeignKey("institutions.id"),
        nullable=True,
        index=True,
    )

    name = Column(
        String(200),
        nullable=False,
    )

    description = Column(
        Text,
        nullable=True,
    )

    chairperson = Column(
        String(150),
        nullable=True,
    )

    status = Column(
        String(50),
        nullable=False,
        default="Active",
    )

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )


class CommitteeMember(Base):
    __tablename__ = "committee_members"
    __table_args__ = (
        UniqueConstraint(
            "committee_id",
            "user_id",
            name="uq_committee_user",
        ),
    )

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    committee_id = Column(
        Integer,
        ForeignKey("committees.id"),
        nullable=False,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    committee_role = Column(
        String(50),
        nullable=False,
        default="Member",
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
