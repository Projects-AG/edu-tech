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


class Review(Base):
    __tablename__ = "reviews"

    # ---------------------------------------------------------
    # PRIMARY KEY
    # ---------------------------------------------------------
    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    # ---------------------------------------------------------
    # SUBMISSION BEING REVIEWED
    # ---------------------------------------------------------
    submission_id = Column(
        Integer,
        ForeignKey("submissions.id"),
        nullable=False,
        index=True
    )

    # ---------------------------------------------------------
    # REVIEWER
    # ---------------------------------------------------------
    reviewer_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    # ---------------------------------------------------------
    # REVIEW RESULT
    #
    # Allowed values:
    #
    # Approved
    # Rejected
    # Changes Requested
    # ---------------------------------------------------------
    status = Column(
        String(50),
        nullable=False,
        index=True
    )

    # ---------------------------------------------------------
    # REVIEWER COMMENTS
    # ---------------------------------------------------------
    comments = Column(
        Text,
        nullable=True
    )

    # ---------------------------------------------------------
    # SCORING
    #
    # score = actual marks awarded by reviewer
    # max_score = maximum marks for the metric
    # ---------------------------------------------------------
    score = Column(
        Float,
        nullable=True
    )

    max_score = Column(
        Float,
        nullable=True
    )

    # ---------------------------------------------------------
    # TIMESTAMP
    # ---------------------------------------------------------
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )