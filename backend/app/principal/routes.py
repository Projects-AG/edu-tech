from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_db, get_current_user
from app.models import User, Institution, Department, Submission, AccreditationCycle

router = APIRouter(
    prefix="/principal",
    tags=["Principal / Director"]
)


@router.get("/dashboard")
def principal_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    inst = None
    inst_id = current_user.institution_id
    if inst_id:
        inst = db.query(Institution).filter(Institution.id == inst_id).first()

    dept_query = db.query(Department)
    sub_query = db.query(Submission)
    cycle_query = db.query(AccreditationCycle)

    if inst_id:
        dept_query = dept_query.filter(Department.institution_id == inst_id)
        sub_query = sub_query.filter(Submission.institution_id == inst_id)
        cycle_query = cycle_query.filter(AccreditationCycle.institution_id == inst_id)

    total_departments = dept_query.count()
    total_submissions = sub_query.count()
    approved_submissions = sub_query.filter(Submission.status == "Approved").count()
    active_cycles = cycle_query.filter(AccreditationCycle.status != "Completed").count()

    return {
        "message": "Principal / Director Dashboard",
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "role": "Principal / Director"
        },
        "institution": {
            "id": inst.id if inst else None,
            "name": inst.name if inst else "Educational Institution",
            "code": inst.code if inst else "EDU"
        },
        "statistics": {
            "total_departments": total_departments,
            "total_submissions": total_submissions,
            "approved_submissions": approved_submissions,
            "active_cycles": active_cycles
        }
    }
