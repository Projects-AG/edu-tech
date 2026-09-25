from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.dependencies import get_db, require_permission
from app.models import (
    User,
    Role,
    Module,
    Permission,
    Institution,
    AccreditationCycle,
)


router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


# ============================================================
# ADMIN DASHBOARD
# ============================================================

@router.get("/dashboard")
def admin_dashboard(
    current_user: User = Depends(
        require_permission("USER_MANAGEMENT", "View")
    ),
    db: Session = Depends(get_db)
):
    total_users = db.query(User).count()
    active_users = db.query(User).filter(
        User.is_active == True
    ).count()

    total_roles = db.query(Role).count()
    total_modules = db.query(Module).count()
    total_permissions = db.query(Permission).count()
    total_institutions = db.query(Institution).count()
    total_cycles = db.query(AccreditationCycle).count()

    return {
        "message": "Admin dashboard data",
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
        },
        "statistics": {
            "total_users": total_users,
            "active_users": active_users,
            "total_roles": total_roles,
            "total_modules": total_modules,
            "total_permissions": total_permissions,
            "total_institutions": total_institutions,
            "total_accreditation_cycles": total_cycles,
        }
    }


# ============================================================
# USERS
# ============================================================

@router.get("/users")
def get_users(
    current_user: User = Depends(
        require_permission("USER_MANAGEMENT", "View")
    ),
    db: Session = Depends(get_db)
):
    users = db.query(User).all()

    result = []

    for user in users:
        role = db.query(Role).filter(
            Role.id == user.role_id
        ).first()

        result.append({
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": role.name if role else None,
            "institution_id": user.institution_id,
            "department_id": user.department_id,
            "is_active": user.is_active,
        })

    return result


# ============================================================
# ROLES
# ============================================================

@router.get("/roles")
def get_roles(
    current_user: User = Depends(
        require_permission("USER_MANAGEMENT", "View")
    ),
    db: Session = Depends(get_db)
):
    roles = db.query(Role).all()

    return [
        {
            "id": role.id,
            "name": role.name,
            "description": role.description,
        }
        for role in roles
    ]


# ============================================================
# PERMISSIONS
# ============================================================

@router.get("/permissions")
def get_permissions(
    current_user: User = Depends(
        require_permission("USER_MANAGEMENT", "View")
    ),
    db: Session = Depends(get_db)
):
    permissions = db.query(Permission).all()

    return [
        {
            "id": permission.id,
            "name": permission.name,
            "description": permission.description,
        }
        for permission in permissions
    ]


# ============================================================
# MODULES
# ============================================================

@router.get("/modules")
def get_modules(
    current_user: User = Depends(
        require_permission("USER_MANAGEMENT", "View")
    ),
    db: Session = Depends(get_db)
):
    modules = db.query(Module).all()

    return [
        {
            "id": module.id,
            "name": module.name,
            "code": module.code,
            "description": module.description,
        }
        for module in modules
    ]


# ============================================================
# INSTITUTIONS
# ============================================================

@router.get("/institutions")
def get_institutions(
    current_user: User = Depends(
        require_permission("INSTITUTION_MANAGEMENT", "View")
    ),
    db: Session = Depends(get_db)
):
    institutions = db.query(Institution).all()

    return [
        {
            "id": institution.id,
            "name": institution.name,
            "code": institution.code,
            "city": institution.city,
            "state": institution.state,
            "institution_type": institution.institution_type,
            "established_year": institution.established_year,
            "website": institution.website,
        }
        for institution in institutions
    ]


# ============================================================
# ACCREDITATION CYCLES
# ============================================================

@router.get("/accreditation-cycles")
def get_accreditation_cycles(
    current_user: User = Depends(
        require_permission("ACCREDITATION_CYCLES", "View")
    ),
    db: Session = Depends(get_db)
):
    cycles = db.query(AccreditationCycle).all()

    return [
        {
            "id": cycle.id,
            "institution_id": cycle.institution_id,
            "name": cycle.name,
            "code": cycle.code,
            "academic_period": cycle.academic_period,
            "status": cycle.status,
            "description": cycle.description,
        }
        for cycle in cycles
    ]