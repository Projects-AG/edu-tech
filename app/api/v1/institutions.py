from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps.deps import require_roles
from app.models.models import Institution, RoleName
from app.schemas.schemas import InstitutionCreate, InstitutionOut

router = APIRouter(prefix="/institutions", tags=["institutions"])


@router.post("", response_model=InstitutionOut, status_code=201, dependencies=[Depends(require_roles(RoleName.ADMIN))])
def create_institution(payload: InstitutionCreate, db: Session = Depends(get_db)):
    institution = Institution(**payload.model_dump())
    db.add(institution)
    db.commit()
    db.refresh(institution)
    return institution


@router.get("/{institution_id}", response_model=InstitutionOut)
def get_institution(institution_id: str, db: Session = Depends(get_db)):
    return db.get(Institution, institution_id)
