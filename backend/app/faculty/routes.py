from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_db
from app.auth.registration_authority import ADMIN, get_role_name
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
    is_admin = get_role_name(db, current_user.role_id) == ADMIN

    if not is_admin and not current_user.institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not assigned to an institution",
        )

    query = db.query(Faculty)

    if is_admin:
        if institution_id is not None:
            query = query.filter(
                Faculty.institution_id == institution_id
            )
    else:
        if (
            institution_id is not None
            and institution_id != current_user.institution_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot access faculties of another institution",
            )

        query = query.filter(
            Faculty.institution_id == current_user.institution_id
        )

    return query.order_by(Faculty.id).all()