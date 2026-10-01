from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.api.deps.deps import require_roles
from backend.app.models.models import Department, RoleName
from backend.app.schemas.schemas import DepartmentCreate, DepartmentOut

router = APIRouter(prefix="/departments", tags=["departments"])


@router.post(
    "",
    response_model=DepartmentOut,
    status_code=201,
    dependencies=[Depends(require_roles(RoleName.ADMIN, RoleName.IQAC_COORDINATOR))],
)
def create_department(payload: DepartmentCreate, db: Session = Depends(get_db)):
    department = Department(**payload.model_dump())
    db.add(department)
    db.commit()
    db.refresh(department)
    return department


@router.get("/institution/{institution_id}", response_model=list[DepartmentOut])
def list_departments(institution_id: str, db: Session = Depends(get_db)):
    return db.query(Department).filter(Department.institution_id == institution_id).all()
