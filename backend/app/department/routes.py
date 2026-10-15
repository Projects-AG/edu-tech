from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.auth.dependencies import get_db, require_permission, get_current_user
from app.auth.registration_authority import ADMIN, get_role_name
from app.models import Department, User, Submission, Document, Institution, Criterion
from app.services.report_service import (
    APPROVED_SUBMISSION_STATUSES,
    PENDING_SUBMISSION_STATUSES,
)
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentResponse
from app.services.audit_service import record_audit

router = APIRouter(
    prefix="",
    tags=["Department Management"]
)


def is_platform_admin(db: Session, user: User) -> bool:
    return get_role_name(db, user.role_id) == ADMIN


def assert_department_institution_access(
    db: Session,
    current_user: User,
    institution_id: int,
):
    if is_platform_admin(db, current_user):
        return

    if current_user.institution_id != institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access departments of another institution",
        )


def get_accessible_department(
    db: Session,
    current_user: User,
    dept_id: int,
) -> Department:
    dept = db.query(Department).filter(Department.id == dept_id).first()

    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found",
        )

    assert_department_institution_access(
        db,
        current_user,
        dept.institution_id,
    )

    return dept


@router.get("/departments", response_model=List[DepartmentResponse])
def get_departments(
    institution_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Department)

    if is_platform_admin(db, current_user):
        if institution_id:
            query = query.filter(Department.institution_id == institution_id)
    else:
        if not current_user.institution_id:
            return []

        if institution_id and institution_id != current_user.institution_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot access departments of another institution",
            )

        query = query.filter(
            Department.institution_id == current_user.institution_id
        )

    return query.order_by(Department.id).all()


@router.post("/departments", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    dept_data: DepartmentCreate,
    current_user: User = Depends(require_permission("INSTITUTION_MANAGEMENT", "Create")),
    db: Session = Depends(get_db)
):
    # Enforce multi-tenant resource security
    if current_user.institution_id and dept_data.institution_id != current_user.institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create department for another institution"
        )

    dept = Department(
        institution_id=dept_data.institution_id,
        name=dept_data.name,
        code=dept_data.code,
        head_name=dept_data.head_name
    )
    db.add(dept)
    db.flush()
    record_audit(
        db,
        user=current_user,
        action="DEPARTMENT_CREATE",
        entity_type="Department",
        entity_id=dept.id,
        new_values={
            "name": dept.name,
            "code": dept.code,
            "head_name": dept.head_name,
        },
        institution_id=dept.institution_id,
    )
    db.commit()
    db.refresh(dept)
    return dept


@router.put("/departments/{dept_id}", response_model=DepartmentResponse)
def update_department(
    dept_id: int,
    dept_update: DepartmentUpdate,
    current_user: User = Depends(require_permission("INSTITUTION_MANAGEMENT", "Edit")),
    db: Session = Depends(get_db)
):
    dept = get_accessible_department(db, current_user, dept_id)
    old_values = {
        "name": dept.name,
        "code": dept.code,
        "head_name": dept.head_name,
    }

    if dept_update.name is not None:
        dept.name = dept_update.name
    if dept_update.code is not None:
        dept.code = dept_update.code
    if dept_update.head_name is not None:
        dept.head_name = dept_update.head_name
    if dept_update.faculty_id is not None:
        dept.faculty_id = dept_update.faculty_id

    record_audit(
        db,
        user=current_user,
        action="DEPARTMENT_UPDATE",
        entity_type="Department",
        entity_id=dept.id,
        old_values=old_values,
        new_values=dept_update.model_dump(exclude_unset=True),
        institution_id=dept.institution_id,
    )
    db.commit()
    db.refresh(dept)
    return dept


@router.delete("/departments/{dept_id}")
def delete_department(
    dept_id: int,
    current_user: User = Depends(require_permission("INSTITUTION_MANAGEMENT", "Delete")),
    db: Session = Depends(get_db)
):
    dept = get_accessible_department(db, current_user, dept_id)

    record_audit(
        db,
        user=current_user,
        action="DEPARTMENT_DELETE",
        entity_type="Department",
        entity_id=dept.id,
        old_values={"name": dept.name, "code": dept.code},
        institution_id=dept.institution_id,
    )
    db.delete(dept)
    db.commit()

    return {
        "message": "Department deleted successfully",
        "department_id": dept_id,
    }


@router.get("/department/profile")
def get_department_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.department_id:
        raise HTTPException(status_code=404, detail="User is not assigned to a department")

    dept = db.query(Department).filter(Department.id == current_user.department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    return dept


@router.put("/department/profile")
def update_department_profile(
    dept_update: DepartmentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    role_name = get_role_name(db, current_user.role_id)
    if role_name not in {ADMIN, "Dept. Coordinator"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Department Coordinators can update the department profile",
        )

    if not current_user.department_id:
        raise HTTPException(status_code=404, detail="User is not assigned to a department")

    dept = db.query(Department).filter(Department.id == current_user.department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # Only update allowed fields (never institution_id)
    if dept_update.name is not None:
        dept.name = dept_update.name
    if dept_update.code is not None:
        dept.code = dept_update.code
    if dept_update.head_name is not None:
        dept.head_name = dept_update.head_name

    db.commit()
    db.refresh(dept)
    return dept


@router.get("/department/metrics")
def get_department_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    inst_id = current_user.institution_id
    dept_id = current_user.department_id

    sub_query = db.query(Submission)
    if inst_id:
        sub_query = sub_query.filter(Submission.institution_id == inst_id)
    if dept_id:
        sub_query = sub_query.filter(Submission.department_id == dept_id)

    total_subs = sub_query.count()
    approved_subs = sub_query.filter(
        Submission.status.in_(APPROVED_SUBMISSION_STATUSES)
    ).count()
    draft_subs = sub_query.filter(Submission.status == "Draft").count()
    submitted_subs = sub_query.filter(Submission.status == "Submitted").count()

    completion_rate = (
        round((approved_subs / total_subs * 100), 1) if total_subs > 0 else 0.0
    )

    return {
        "department_id": dept_id,
        "total_submissions": total_subs,
        "approved_submissions": approved_subs,
        "draft_submissions": draft_subs,
        "submitted_submissions": submitted_subs,
        "completion_rate_percentage": completion_rate
    }


@router.get("/department/dashboard")
def department_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    role_name = get_role_name(db, current_user.role_id)
    if role_name != "Dept. Coordinator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only Department Coordinators can access "
                "the department dashboard"
            ),
        )

    # Multi-tenant scoping
    institution_id = current_user.institution_id
    dept_id = current_user.department_id or None

    if not dept_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not assigned to a department",
        )

    sub_query = db.query(Submission)
    doc_query = db.query(Document)

    if institution_id:
        sub_query = sub_query.filter(Submission.institution_id == institution_id)
        doc_query = doc_query.filter(Document.institution_id == institution_id)

    if dept_id:
        sub_query = sub_query.filter(Submission.department_id == dept_id)
        doc_query = doc_query.join(
            Submission,
            Document.submission_id == Submission.id,
        ).filter(Submission.department_id == dept_id)

    total_submissions = sub_query.count()
    approved_submissions = sub_query.filter(
        Submission.status.in_(APPROVED_SUBMISSION_STATUSES)
    ).count()
    pending_submissions = sub_query.filter(
        Submission.status.in_(PENDING_SUBMISSION_STATUSES)
    ).count()
    total_documents = doc_query.count()

    dept_info = None
    if dept_id:
        dept_obj = db.query(Department).filter(Department.id == dept_id).first()
        if dept_obj:
            dept_info = {"id": dept_obj.id, "name": dept_obj.name, "code": dept_obj.code}

    return {
        "message": "Department Coordinator Dashboard",
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "role": "Dept. Coordinator"
        },
        "department": dept_info,
        "statistics": {
            "total_submissions": total_submissions,
            "approved_submissions": approved_submissions,
            "pending_submissions": pending_submissions,
            "total_documents": total_documents
        }
    }
