from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps.deps import require_roles
from app.models.models import AcademicYear, RoleName
from app.schemas.schemas import AcademicYearCreate, AcademicYearOut

router = APIRouter(prefix="/academic-years", tags=["academic-years"])


@router.post(
    "",
    response_model=AcademicYearOut,
    status_code=201,
    dependencies=[Depends(require_roles(RoleName.ADMIN, RoleName.IQAC_COORDINATOR))],
)
def create_academic_year(payload: AcademicYearCreate, db: Session = Depends(get_db)):
    year = AcademicYear(**payload.model_dump())
    db.add(year)
    db.commit()
    db.refresh(year)
    return year


@router.get("/institution/{institution_id}", response_model=list[AcademicYearOut])
def list_academic_years(institution_id: str, db: Session = Depends(get_db)):
    return db.query(AcademicYear).filter(AcademicYear.institution_id == institution_id).all()
