from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.deps.deps import get_current_user
from app.models.models import Department, User as UserModel, FileUpload

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def summary(db: Session = Depends(get_db), current_user: UserModel = Depends(get_current_user)):
    institution_id = current_user.institution_id
    department_count = db.query(func.count(Department.id)).filter(
        Department.institution_id == institution_id
    ).scalar()
    user_count = db.query(func.count(UserModel.id)).filter(
        UserModel.institution_id == institution_id
    ).scalar()
    file_count = db.query(func.count(FileUpload.id)).filter(
        FileUpload.institution_id == institution_id
    ).scalar()

    return {
        "institution_id": institution_id,
        "department_count": department_count,
        "user_count": user_count,
        "file_upload_count": file_count,
    }
