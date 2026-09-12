"""Review queue API for coordinator Review & Approval page."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps.deps import get_current_user, require_roles
from app.models.models import RoleName, User
from app.schemas.naac import ReviewListResponse, SubmissionOut
from app.services import submission_service

router = APIRouter(prefix="/reviews", tags=["reviews"])

_REVIEW_ROLES = (
    RoleName.ADMIN,
    RoleName.IQAC_COORDINATOR,
    RoleName.CRITERION_INCHARGE,
    RoleName.REVIEWER,
    RoleName.FINAL_APPROVER,
)


@router.get(
    "/queue",
    response_model=ReviewListResponse,
    dependencies=[Depends(require_roles(*_REVIEW_ROLES))],
)
def review_queue(
    cycle_id: str | None = Query(None),
    status: str | None = Query(None),
    q: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return submission_service.list_review_queue(
        db,
        current_user.institution_id,
        cycle_id=cycle_id,
        status_filter=status,
        q=q,
    )


@router.get(
    "/stats",
    response_model=ReviewListResponse,
    dependencies=[Depends(require_roles(*_REVIEW_ROLES))],
)
def review_stats(
    cycle_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = submission_service.list_review_queue(
        db, current_user.institution_id, cycle_id=cycle_id
    )
    result.queue = []
    return result


@router.get(
    "/{submission_id}",
    response_model=SubmissionOut,
    dependencies=[Depends(require_roles(*_REVIEW_ROLES))],
)
def review_detail(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return submission_service.get_submission(db, current_user, submission_id)


@router.post(
    "/{submission_id}/start",
    response_model=SubmissionOut,
    dependencies=[Depends(require_roles(*_REVIEW_ROLES))],
)
def start_review(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return submission_service.start_review(db, current_user, submission_id)
