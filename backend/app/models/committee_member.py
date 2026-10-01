from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from app.db.database import Base


class CommitteeMember(Base):
    __tablename__ = "committee_members"

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

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    committee_role = Column(
        String(100),
        nullable=False,
        default="MEMBER"
    )

    joined_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )