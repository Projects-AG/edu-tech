from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.constants.roles import (
    DEPARTMENT_SCOPED_ROLES,
    SELF_REGISTERABLE_ROLES,
    allowed_roles_for_actor,
    default_scope_for_role,
)
from app.core.security import hash_password
from app.models.models import (
    AuditLog,
    Department,
    Institution,
    RoleAssignment,
    RoleName,
    ScopeType,
    User,
)


def get_user_roles(db: Session, user_id: str) -> list[RoleAssignment]:
    return db.query(RoleAssignment).filter(RoleAssignment.user_id == user_id).all()


def actor_role_names(db: Session, user: User) -> set[RoleName]:
    return {a.role for a in get_user_roles(db, user.id)}


def _require_institution(db: Session, institution_id: str) -> Institution:
    institution = db.get(Institution, institution_id)
    if not institution:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Institution not found")
    return institution


def _require_department(db: Session, department_id: str, institution_id: str) -> Department:
    department = db.get(Department, department_id)
    if not department or department.institution_id != institution_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department not found in this institution",
        )
    return department


def assign_role(
    db: Session,
    user: User,
    role: RoleName,
    scope_type: ScopeType | None = None,
    department_id: str | None = None,
) -> RoleAssignment:
    resolved_scope = default_scope_for_role(role, scope_type)

    if resolved_scope == ScopeType.INSTITUTION:
        department_id = None
    elif resolved_scope == ScopeType.DEPARTMENT:
        if not department_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="department_id is required for department-scoped roles",
            )
        _require_department(db, department_id, user.institution_id)
    elif resolved_scope == ScopeType.CRITERION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Criterion-scoped assignments are not available yet",
        )

    existing = (
        db.query(RoleAssignment)
        .filter(
            RoleAssignment.user_id == user.id,
            RoleAssignment.role == role,
            RoleAssignment.scope_type == resolved_scope,
            RoleAssignment.department_id == department_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role already assigned")

    assignment = RoleAssignment(
        user_id=user.id,
        role=role,
        scope_type=resolved_scope,
        department_id=department_id,
    )
    db.add(assignment)
    return assignment


def create_user_with_role(
    db: Session,
    *,
    institution_id: str,
    department_id: str | None,
    name: str,
    email: str,
    password: str,
    role: RoleName,
    scope_type: ScopeType | None = None,
    actor: User | None = None,
    allow_self_register: bool = False,
) -> User:
    _require_institution(db, institution_id)

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    if allow_self_register:
        if role not in SELF_REGISTERABLE_ROLES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This role cannot be self-registered",
            )
    elif actor is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to create this user")
    else:
        if actor.institution_id != institution_id and RoleName.ADMIN not in actor_role_names(db, actor):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot create users for another institution",
            )
        permitted = allowed_roles_for_actor(actor_role_names(db, actor))
        if role not in permitted:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot assign this role",
            )

    if role in DEPARTMENT_SCOPED_ROLES and not department_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="department_id is required for this role",
        )
    if department_id:
        _require_department(db, department_id, institution_id)

    user = User(
        institution_id=institution_id,
        department_id=department_id,
        name=name,
        email=email,
        password_hash=hash_password(password),
    )
    db.add(user)
    db.flush()

    assign_role(db, user, role, scope_type=scope_type, department_id=department_id)
    db.add(
        AuditLog(
            institution_id=user.institution_id,
            actor_id=actor.id if actor else user.id,
            action="USER_REGISTERED",
            entity_type="User",
            entity_id=user.id,
            log_metadata={"role": role.value},
        )
    )
    db.commit()
    db.refresh(user)
    return user


def list_institution_users(db: Session, institution_id: str) -> list[User]:
    return db.query(User).filter(User.institution_id == institution_id).order_by(User.created_at.desc()).all()


def add_role_to_user(
    db: Session,
    *,
    actor: User,
    target_user_id: str,
    role: RoleName,
    scope_type: ScopeType | None,
    department_id: str | None,
) -> RoleAssignment:
    target = db.get(User, target_user_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    actor_roles = actor_role_names(db, actor)
    if RoleName.ADMIN not in actor_roles and actor.institution_id != target.institution_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot manage users in another institution")

    if role not in allowed_roles_for_actor(actor_roles):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot assign this role")

    assignment = assign_role(db, target, role, scope_type=scope_type, department_id=department_id)
    db.add(
        AuditLog(
            institution_id=target.institution_id,
            actor_id=actor.id,
            action="ROLE_ASSIGNED",
            entity_type="RoleAssignment",
            entity_id=target.id,
            log_metadata={"role": role.value},
        )
    )
    db.commit()
    db.refresh(assignment)
    return assignment
