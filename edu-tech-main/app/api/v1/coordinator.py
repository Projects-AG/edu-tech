"""Coordinator aggregate APIs — dashboard + department progress."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps.deps import get_current_user, require_roles
from app.models.models import RoleName, User
from app.schemas.naac import (
    CoordinatorDashboardOut,
    CoordinatorDepartmentsResponse,
    DeptCriteriaBreakdownOut,
)
from app.services import coordinator_service

router = APIRouter(prefix="/coordinator", tags=["coordinator"])

_COORD_ROLES = (RoleName.ADMIN, RoleName.IQAC_COORDINATOR)


@router.get(
    "/dashboard",
    response_model=CoordinatorDashboardOut,
    dependencies=[Depends(require_roles(*_COORD_ROLES))],
)
def dashboard(
    cycle_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return coordinator_service.coordinator_dashboard(db, current_user, cycle_id)


@router.get(
    "/departments",
    response_model=CoordinatorDepartmentsResponse,
    dependencies=[Depends(require_roles(*_COORD_ROLES))],
)
def departments(
    cycle_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return coordinator_service.coordinator_departments(db, current_user, cycle_id)


@router.get(
    "/departments/{department_id}/criteria-breakdown",
    response_model=list[DeptCriteriaBreakdownOut],
    dependencies=[Depends(require_roles(*_COORD_ROLES))],
)
def department_criteria_breakdown(
    department_id: str,
    cycle_id: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return coordinator_service.department_criteria_breakdown(
        db, current_user, department_id, cycle_id
    )
