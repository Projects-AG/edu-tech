from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import get_db, get_current_user
from app.models import User, Criterion, Document, Submission

router = APIRouter(
    prefix="/committee",
    tags=["Committee Member"]
)


@router.get("/dashboard")
def committee_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    inst_id = current_user.institution_id
    sub_query = db.query(Submission)
    doc_query = db.query(Document)

    if inst_id:
        sub_query = sub_query.filter(Submission.institution_id == inst_id)
        doc_query = doc_query.filter(Document.institution_id == inst_id)

    total_criteria = db.query(Criterion).count()
    documents_collected = doc_query.count()
    total_submissions = sub_query.count()
    pending_items = sub_query.filter(Submission.status == "Draft").count()

    return {
        "message": "Committee Member Dashboard",
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "role": "Committee Member"
        },
        "statistics": {
            "total_criteria": total_criteria,
            "documents_collected": documents_collected,
            "total_submissions": total_submissions,
            "pending_items": pending_items
        }
    }
