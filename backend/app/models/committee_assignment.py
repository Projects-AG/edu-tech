from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)

from app.db.database import Base


class CommitteeCriterionAssignment(Base):
    __tablename__ = "committee_criterion_assignments"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    committee_id = Column(
        Integer,
        ForeignKey("committees.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    committee_member_id = Column(
        Integer,
        ForeignKey("committee_members.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    criterion_id = Column(
        Integer,
        ForeignKey("criteria.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    responsibility = Column(
        String(200),
        nullable=True
    )

    assigned_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "committee_member_id",
            "criterion_id",
            name="uq_committee_member_criterion"
        ),
    )