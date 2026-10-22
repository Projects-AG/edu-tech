from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_db, get_current_user
from app.auth.registration_authority import REVIEWER, get_role_name
from app.models import User, Submission, Document, Review
from app.services.report_service import REVIEWABLE_STATUSES
from app.submission.routes import get_submissions

router = APIRouter(
    prefix="/reviewer",
    tags=["Reviewer"]
)


@router.get("/dashboard")
def reviewer_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if get_role_name(db, current_user.role_id) != REVIEWER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Reviewers can access this dashboard",
        )

    if not current_user.institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not assigned to an institution",
        )

    inst_id = current_user.institution_id
    doc_query = db.query(Document)

    doc_query = doc_query.filter(Document.institution_id == inst_id)

    visible_submissions = get_submissions(
        current_user=current_user,
        db=db,
    )
    pending_submissions = [
        submission
        for submission in visible_submissions
        if submission.status in REVIEWABLE_STATUSES
    ]
    pending_reviews = len(pending_submissions)
    completed_reviews = db.query(Review).filter(
        Review.reviewer_id == current_user.id,
        Review.submission_id.in_(
            db.query(Submission.id).filter(
                Submission.institution_id == inst_id
            )
        ),
    ).count()

    pending_submission_ids = [
        submission.id for submission in pending_submissions
    ]
    if pending_submission_ids:
        evidence_items = doc_query.filter(
            Document.submission_id.in_(pending_submission_ids)
        ).count()
    else:
        evidence_items = 0

    return {
        "message": "Reviewer Dashboard",
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "role": "Reviewer"
        },
        "statistics": {
            "pending_reviews": pending_reviews,
            "completed_reviews": completed_reviews,
            "evidence_items": evidence_items
        }
    }
