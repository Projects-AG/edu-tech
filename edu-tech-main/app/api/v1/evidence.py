"""Evidence / documents registry API."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps.deps import get_current_user, require_roles
from app.models.models import RoleName, User
from app.schemas.naac import (
    EvidenceCreate,
    EvidenceListResponse,
    EvidenceOut,
    EvidenceStatusUpdate,
)
from app.services import evidence_service

router = APIRouter(prefix="/evidence", tags=["evidence"])

_READ_ROLES = (
    RoleName.ADMIN,
    RoleName.IQAC_COORDINATOR,
    RoleName.CRITERION_INCHARGE,
    RoleName.DEPARTMENT_CONTRIBUTOR,
    RoleName.FACULTY,
    RoleName.REVIEWER,
    RoleName.FINAL_APPROVER,
)

_WRITE_ROLES = (
    RoleName.ADMIN,
    RoleName.IQAC_COORDINATOR,
    RoleName.CRITERION_INCHARGE,
    RoleName.DEPARTMENT_CONTRIBUTOR,
    RoleName.FACULTY,
)

_STATUS_ROLES = (RoleName.ADMIN, RoleName.IQAC_COORDINATOR, RoleName.CRITERION_INCHARGE)


@router.get(
    "",
    response_model=EvidenceListResponse,
    dependencies=[Depends(require_roles(*_READ_ROLES))],
)
def list_evidence(
    cycle_id: str | None = Query(None),
    status: str | None = Query(None, alias="status"),
    criterion_id: str | None = Query(None),
    department_id: str | None = Query(None),
    q: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return evidence_service.list_evidence(
        db,
        current_user.institution_id,
        cycle_id=cycle_id,
        status_filter=status,
        criterion_id=criterion_id,
        department_id=department_id,
        q=q,
    )


@router.get(
    "/stats",
    response_model=EvidenceListResponse,
    dependencies=[Depends(require_roles(*_READ_ROLES))],
)
def evidence_stats(
    cycle_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Stats-only convenience: returns stats with empty documents list."""
    result = evidence_service.list_evidence(
        db, current_user.institution_id, cycle_id=cycle_id
    )
    result.documents = []
    return result


@router.post(
    "",
    response_model=EvidenceOut,
    status_code=201,
    dependencies=[Depends(require_roles(*_WRITE_ROLES))],
)
def create_evidence(
    payload: EvidenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return evidence_service.create_evidence(db, current_user, payload)


@router.patch(
    "/{evidence_id}/status",
    response_model=EvidenceOut,
    dependencies=[Depends(require_roles(*_STATUS_ROLES))],
)
def update_evidence_status(
    evidence_id: str,
    payload: EvidenceStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return evidence_service.update_evidence_status(db, current_user, evidence_id, payload)
