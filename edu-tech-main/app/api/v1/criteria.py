"""Criteria API — list with progress aggregates + criterion detail."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps.deps import get_current_user, require_roles
from app.models.models import RoleName, User
from app.schemas.naac import CriteriaListResponse, CriterionOut
from app.services import criteria_service

router = APIRouter(prefix="/criteria", tags=["criteria"])


@router.get(
    "",
    response_model=CriteriaListResponse,
    dependencies=[Depends(require_roles(RoleName.ADMIN, RoleName.IQAC_COORDINATOR))],
)
def list_criteria(
    cycle_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return criteria_service.list_criteria_cards(db, current_user.institution_id, cycle_id)


@router.get(
    "/{criterion_id}",
    response_model=CriterionOut,
    dependencies=[
        Depends(
            require_roles(
                RoleName.ADMIN,
                RoleName.IQAC_COORDINATOR,
                RoleName.CRITERION_INCHARGE,
            )
        )
    ],
)
def get_criterion(
    criterion_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    detail = criteria_service.get_criterion_detail(db, current_user.institution_id, criterion_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Criterion not found")
    return detail
