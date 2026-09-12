from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps.deps import get_current_user, require_roles
from app.models.models import RoleName, User
from app.schemas.schemas import (
    AccessTokenResponse,
    AdminUserCreate,
    LoginRequest,
    LoginResponse,
    LogoutRequest,
    MeResponse,
    RefreshRequest,
    RegisterRequest,
    RoleAssignmentCreate,
    RoleAssignmentOut,
    UserOut,
    UserWithRoles,
)
from app.services import auth_service, user_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_with_roles(db: Session, user: User) -> UserWithRoles:
    assignments = user_service.get_user_roles(db, user.id)
    return UserWithRoles.model_validate(user).model_copy(
        update={"roles": [RoleAssignmentOut.model_validate(a) for a in assignments]}
    )


@router.post("/register", response_model=UserWithRoles, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    user = user_service.create_user_with_role(
        db,
        institution_id=payload.institution_id,
        department_id=payload.department_id,
        name=payload.name,
        email=payload.email,
        password=payload.password,
        role=payload.role,
        allow_self_register=True,
    )
    return _user_with_roles(db, user)


@router.post(
    "/users",
    response_model=UserWithRoles,
    status_code=201,
    dependencies=[Depends(require_roles(RoleName.ADMIN, RoleName.IQAC_COORDINATOR))],
)
def create_user(
    payload: AdminUserCreate,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    user = user_service.create_user_with_role(
        db,
        institution_id=payload.institution_id,
        department_id=payload.department_id,
        name=payload.name,
        email=payload.email,
        password=payload.password,
        role=payload.role,
        scope_type=payload.scope_type,
        actor=actor,
    )
    return _user_with_roles(db, user)


@router.get(
    "/users",
    response_model=list[UserOut],
    dependencies=[Depends(require_roles(RoleName.ADMIN, RoleName.IQAC_COORDINATOR))],
)
def list_users(db: Session = Depends(get_db), actor: User = Depends(get_current_user)):
    return user_service.list_institution_users(db, actor.institution_id)


@router.post(
    "/users/{user_id}/roles",
    response_model=RoleAssignmentOut,
    status_code=201,
    dependencies=[Depends(require_roles(RoleName.ADMIN, RoleName.IQAC_COORDINATOR))],
)
def assign_user_role(
    user_id: str,
    payload: RoleAssignmentCreate,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return user_service.add_role_to_user(
        db,
        actor=actor,
        target_user_id=user_id,
        role=payload.role,
        scope_type=payload.scope_type,
        department_id=payload.department_id,
        criterion_id=payload.criterion_id,
    )


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user, roles, access_token, refresh_token = auth_service.login(db, payload.email, payload.password)
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserOut.model_validate(user),
        roles=roles,
    )


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    access_token = auth_service.refresh_access_token(db, payload.refresh_token)
    return AccessTokenResponse(access_token=access_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    payload: LogoutRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    auth_service.logout(db, current_user, payload.refresh_token if payload else None)


@router.get("/me", response_model=MeResponse)
def me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _user_with_roles(db, current_user)
