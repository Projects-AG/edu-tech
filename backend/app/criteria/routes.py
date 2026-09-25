from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.auth.dependencies import get_db, get_current_user, require_permission
from app.models import Criterion, User, AccreditationCycle
from app.schemas.criterion import CriterionCreate, CriterionUpdate, CriterionResponse

router = APIRouter(
    prefix="/criteria",
    tags=["NAAC Criteria"]
)


@router.get("", response_model=List[CriterionResponse])
def get_criteria(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    criteria = db.query(Criterion).all()
    # Default initial 7 criteria if empty
    if not criteria:
        default_criteria = [
            {"number": "C1", "title": "Curricular Aspects", "completion_percentage": 85.0},
            {"number": "C2", "title": "Teaching-Learning & Evaluation", "completion_percentage": 68.0},
            {"number": "C3", "title": "Research, Innovations & Extension", "completion_percentage": 74.0},
            {"number": "C4", "title": "Infrastructure & Learning Resources", "completion_percentage": 59.0},
            {"number": "C5", "title": "Student Support & Progression", "completion_percentage": 79.0},
            {"number": "C6", "title": "Governance, Leadership & Management", "completion_percentage": 65.0},
            {"number": "C7", "title": "Institutional Values & Best Practices", "completion_percentage": 72.0},
        ]
        for c in default_criteria:
            obj = Criterion(
                number=c["number"],
                title=c["title"],
                weightage=100,
                completion_percentage=c["completion_percentage"]
            )
            db.add(obj)
        db.commit()
        criteria = db.query(Criterion).all()
    return criteria


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
