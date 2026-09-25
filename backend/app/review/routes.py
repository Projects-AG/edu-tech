from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.auth.dependencies import get_db, get_current_user
from app.models import Review, Submission, User, Role
from app.schemas.review import (
    ReviewResponse,
    ReviewDecisionRequest
)

from app.services.review_service import create_review_decision

router = APIRouter(
    prefix="",
    tags=["Review & Approval"]
)


def get_user_role(
    current_user: User,
    db: Session
):
    return db.query(Role).filter(
        Role.id == current_user.role_id
    ).first()


def verify_institution_access(
    current_user: User,
    submission: Submission
):
    if (
        current_user.institution_id
        and submission.institution_id != current_user.institution_id
    ):
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Resource belongs to another institution"
        )


# ============================================================
# GET ALL REVIEWS
# ============================================================

@router.get(
    "/reviews",
    response_model=List[ReviewResponse]
)
def get_reviews(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = (
        db.query(Review)
        .join(
            Submission,
            Review.submission_id == Submission.id
        )
    )

    if current_user.institution_id:
        query = query.filter(
            Submission.institution_id == current_user.institution_id
        )

    return query.order_by(
        Review.created_at.desc()
    ).all()


# ============================================================
# REVIEWER DECISION
# ============================================================

@router.post(
    "/reviews/{submission_id}/decision",
    response_model=ReviewResponse
)
def submit_review_decision(
    submission_id: int,
    review_data: ReviewDecisionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # --------------------------------------------------------
    # VERIFY CURRENT USER ROLE
    # --------------------------------------------------------

    role = get_user_role(current_user, db)

    if not role or role.name != "Reviewer":
        raise HTTPException(
            status_code=403,
            detail="Only Reviewers can submit review decisions"
        )

    # --------------------------------------------------------
    # FIND SUBMISSION
    # --------------------------------------------------------

    submission = (
        db.query(Submission)
        .filter(Submission.id == submission_id)
        .first()
    )

    if not submission:
        raise HTTPException(
            status_code=404,
            detail="Submission not found"
        )

    # --------------------------------------------------------
    # VERIFY INSTITUTION ACCESS
    # --------------------------------------------------------

    verify_institution_access(
        current_user=current_user,
        submission=submission
    )

    # --------------------------------------------------------
    # CREATE REVIEW DECISION
    # --------------------------------------------------------

    return create_review_decision(
        db=db,
        submission_id=submission_id,
        reviewer_user=current_user,
        review_status=review_data.status,
        comments=review_data.comments,
        score=review_data.score,
        max_score=review_data.max_score,
    )

# ============================================================
# DATA APPROVER DASHBOARD
# ============================================================

@router.get("/approver/dashboard")
def approver_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    role = get_user_role(current_user, db)

    if not role or role.name != "Data Approver":
        raise HTTPException(
            status_code=403,
            detail="Only Data Approvers can access this dashboard"
        )

    query = db.query(Submission)

    if current_user.institution_id:
        query = query.filter(
            Submission.institution_id == current_user.institution_id
        )

    pending_reviews = query.filter(
        Submission.status == "Approved"
    ).count()

    changes_requested = query.filter(
        Submission.status == "Changes Requested"
    ).count()

    final_approved = query.filter(
        Submission.status == "Final Approval"
    ).count()

    final_submitted = query.filter(
        Submission.status == "Final Submitted"
    ).count()

    rejected = query.filter(
        Submission.status == "Rejected"
    ).count()

    return {
        "message": "Data Approver Dashboard",
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "role": role.name
        },
        "statistics": {
            "pending_approvals": pending_reviews,
            "changes_requested": changes_requested,
            "final_approved": final_approved,
            "final_submitted": final_submitted,
            "rejected": rejected
        }
    }