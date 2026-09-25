from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_db, get_current_user
from app.models import User, Submission, Document, Review

router = APIRouter(
    prefix="/reviewer",
    tags=["Reviewer"]
)


@router.get("/dashboard")
def reviewer_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    inst_id = current_user.institution_id
    sub_query = db.query(Submission)
    doc_query = db.query(Document)

    if inst_id:
        sub_query = sub_query.filter(Submission.institution_id == inst_id)
        doc_query = doc_query.filter(Document.institution_id == inst_id)

    pending_reviews = sub_query.filter(Submission.status == "Submitted").count()
    completed_reviews = db.query(Review).filter(Review.reviewer_id == current_user.id).count()
    evidence_items = doc_query.count()

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
