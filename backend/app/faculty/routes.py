from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_db
from app.models import User, Faculty
from app.schemas.faculty import FacultyResponse


router = APIRouter(
    prefix="/faculties",
    tags=["Faculty Management"]
)


@router.get("", response_model=list[FacultyResponse])
def get_faculties(
    institution_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Faculty)

    if institution_id is not None:
        query = query.filter(
            Faculty.institution_id == institution_id
        )

    return query.order_by(Faculty.id).all()