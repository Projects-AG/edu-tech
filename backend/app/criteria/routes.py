from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.auth.dependencies import get_db, get_current_user, require_permission
from app.auth.registration_authority import get_role_name
from app.models import Criterion, User
from app.schemas.criterion import CriterionCreate, CriterionUpdate, CriterionResponse
from app.services.report_service import compute_criteria_progress

router = APIRouter(
    prefix="/criteria",
    tags=["NAAC Criteria"]
)


@router.get("", response_model=List[CriterionResponse])
def get_criteria(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    department_id = None
    if get_role_name(db, current_user.role_id) == "Dept. Coordinator":
        department_id = current_user.department_id

    return compute_criteria_progress(
        db,
        institution_id=current_user.institution_id,
        department_id=department_id,
    )


@router.post("", response_model=CriterionResponse, status_code=status.HTTP_201_CREATED)
def create_criterion(
    c_data: CriterionCreate,
    current_user: User = Depends(require_permission("CRITERIA_1", "Create")),
    db: Session = Depends(get_db)
):
    criterion = Criterion(
        number=c_data.number,
        title=c_data.title,
        description=c_data.description,
        weightage=c_data.weightage,
        completion_percentage=c_data.completion_percentage,
        cycle_id=c_data.cycle_id
    )
    db.add(criterion)
    db.commit()
    db.refresh(criterion)
    return criterion
