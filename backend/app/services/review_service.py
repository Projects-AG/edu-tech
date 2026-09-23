from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models import Review, Submission, User
from app.services.submission_service import transition_submission_state

def create_review_decision(
    db: Session,
    submission_id: int,
    reviewer_user: User,
    review_status: str,    # Approved, Rejected, Changes Requested
    comments: str = None,
    score: float = None,
    max_score: float = None,
) -> Review:
    
    submission = db.query(Submission).filter(Submission.id == submission_id).first()

    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )

    # Multi-tenant resource check / Institutiuon-level authorization
    if (reviewer_user.institution_id and submission.institution_id != reviewer_user.institution_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Resource belongs to another institution"
        )

     # Only submissions currently under review can receive a review decision
    if submission.status != "Under Review":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Only submissions under review "
                "can receive a reviewer decision"
            )
        )

    
    # Create Review record
    review = Review(
        submission_id=submission.id,
        reviewer_id=reviewer_user.id,
        status=review_status,
        comments=comments,
        score=score,
        max_score=max_score,
    )
    db.add(review)

    # The submission state is changed ONLY through the
    # centralized state machine.
    # Validate and apply submission state transition
    transition_submission_state(
        db=db,
        submission=submission,
        new_status=review_status,
        actor_user=reviewer_user
    )
    db.commit()
    db.refresh(review)

    return review
  
