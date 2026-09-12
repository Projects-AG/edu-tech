"""Submissions API — create, list, submit, approve, request correction."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps.deps import get_current_user, require_roles
from app.models.models import RoleName, User
from app.schemas.naac import (
    CorrectionRequest,
    SubmissionCreate,
    SubmissionListResponse,
    SubmissionOut,
)
from app.services import submission_service

router = APIRouter(prefix="/submissions", tags=["submissions"])

_READ_ROLES = (
    RoleName.ADMIN,
    RoleName.IQAC_COORDINATOR,
    RoleName.CRITERION_INCHARGE,
    RoleName.DEPARTMENT_CONTRIBUTOR,
    RoleName.REVIEWER,
    RoleName.FINAL_APPROVER,
)

_WRITE_ROLES = (
    RoleName.ADMIN,
    RoleName.IQAC_COORDINATOR,
    RoleName.CRITERION_INCHARGE,
    RoleName.DEPARTMENT_CONTRIBUTOR,
)

_IQAC_ROLES = (RoleName.ADMIN, RoleName.IQAC_COORDINATOR)


@router.get(
    "",
    response_model=SubmissionListResponse,
    dependencies=[Depends(require_roles(*_READ_ROLES))],
)
def list_submissions(
    cycle_id: str | None = Query(None),
    status: str | None = Query(None),
    q: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return submission_service.list_submissions(
        db,
        current_user.institution_id,
        cycle_id=cycle_id,
        status_filter=status,
        q=q,
    )


@router.get(
    "/stats",
    response_model=SubmissionListResponse,
    dependencies=[Depends(require_roles(*_READ_ROLES))],
)
def submission_stats(
    cycle_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = submission_service.list_submissions(
        db, current_user.institution_id, cycle_id=cycle_id
    )
    result.submissions = []
    return result


@router.post(
    "",
    response_model=SubmissionOut,
    status_code=201,
    dependencies=[Depends(require_roles(*_WRITE_ROLES))],
)
def create_submission(
    payload: SubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return submission_service.create_submission(db, current_user, payload)


@router.get(
    "/{submission_id}",
    response_model=SubmissionOut,
    dependencies=[Depends(require_roles(*_READ_ROLES))],
)
def get_submission(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return submission_service.get_submission(db, current_user, submission_id)


@router.post(
    "/{submission_id}/submit",
    response_model=SubmissionOut,
    dependencies=[Depends(require_roles(*_WRITE_ROLES))],
)
def submit_submission(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return submission_service.submit_submission(db, current_user, submission_id)


@router.post(
    "/{submission_id}/request-correction",
    response_model=SubmissionOut,
    dependencies=[Depends(require_roles(*_IQAC_ROLES))],
)
def request_correction(
    submission_id: str,
    payload: CorrectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return submission_service.request_correction(db, current_user, submission_id, payload)


@router.post(
    "/{submission_id}/approve",
    response_model=SubmissionOut,
    dependencies=[Depends(require_roles(*_IQAC_ROLES))],
)
def approve_submission(
    submission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return submission_service.approve_submission(db, current_user, submission_id)
