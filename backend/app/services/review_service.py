from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models import Review, Submission, User
from app.services.submission_service import transition_submission_state


VALID_REVIEW_DECISIONS = {
    "Approved",
    "Rejected",
    "Changes Requested",
}


def create_review_decision(
    db: Session,
    submission_id: int,
    reviewer_user: User,
    review_status: str,
    comments: str = None,
    score: float = None,
    max_score: float = None,
) -> Review:

    # ---------------------------------------------------------
    # VALIDATE REVIEW DECISION
    # ---------------------------------------------------------

    if review_status not in VALID_REVIEW_DECISIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invalid review decision. Allowed values are: "
                "Approved, Rejected, Changes Requested"
            )
        )

    # ---------------------------------------------------------
    # FIND SUBMISSION
    # ---------------------------------------------------------

    submission = (
        db.query(Submission)
        .filter(Submission.id == submission_id)
        .first()
    )

    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )

    # ---------------------------------------------------------
    # MULTI-TENANT RESOURCE CHECK
    # ---------------------------------------------------------

    if (
        reviewer_user.institution_id
        and submission.institution_id != reviewer_user.institution_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Resource belongs to another institution"
        )

    # ---------------------------------------------------------
    # REVIEWER CAN ONLY DECIDE ON SUBMISSIONS UNDER REVIEW
    # ---------------------------------------------------------

    if submission.status != "Under Review":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Only submissions under review "
                "can receive a reviewer decision"
            )
        )

    # ---------------------------------------------------------
    # SCORE VALIDATION
    # ---------------------------------------------------------

    if score is not None and max_score is not None:
        if score > max_score:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Score cannot be greater than max_score"
            )

    # ---------------------------------------------------------
    # CREATE REVIEW RECORD
    # ---------------------------------------------------------

    review = Review(
        submission_id=submission.id,
        reviewer_id=reviewer_user.id,
        status=review_status,
        comments=comments,
        score=score,
        max_score=max_score,
    )

    db.add(review)

    # ---------------------------------------------------------
    # CENTRALIZED SUBMISSION STATE TRANSITION
    # ---------------------------------------------------------

    transition_submission_state(
        db=db,
        submission=submission,
        new_status=review_status,
        actor_user=reviewer_user
    )

    # ---------------------------------------------------------
    # COMMIT
    # ---------------------------------------------------------

    db.commit()
    db.refresh(review)

    return review