from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models import (
    User,
    Role,
    Module,
    Permission,
    RoleModulePermission,
)
from app.auth.security import decode_access_token


# ============================================================
# HTTP AUTHENTICATION
# ============================================================

security = HTTPBearer()


# ============================================================
# DATABASE DEPENDENCY
# ============================================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ============================================================
# CURRENT USER
# ============================================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """
    Validate JWT token and return the authenticated User.
    """

    # --------------------------------------------------------
    # Get token from Authorization: Bearer <token>
    # --------------------------------------------------------

    token = credentials.credentials

    print("\n========== AUTH DEBUG ==========")
    print(
        "TOKEN RECEIVED:",
        token[:30] + "..." if token else "NO TOKEN"
    )

    # --------------------------------------------------------
    # Decode JWT
    # --------------------------------------------------------

    try:
        payload = decode_access_token(token)

        print("DECODED PAYLOAD:", payload)

    except Exception as e:
        print("JWT DECODE ERROR:", repr(e))
        print("================================\n")

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # --------------------------------------------------------
    # Get user_id from JWT
    # --------------------------------------------------------

    user_id = payload.get("user_id")

    print("USER ID FROM TOKEN:", user_id)

    if not user_id:
        print("ERROR: user_id missing from token")
        print("================================\n")

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # --------------------------------------------------------
    # Find user in database
    # --------------------------------------------------------

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    print("USER FOUND:", user)

    if not user:
        print("ERROR: User not found")
        print("================================\n")

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # --------------------------------------------------------
    # Check active status
    # --------------------------------------------------------

    print("USER EMAIL:", user.email)
    print("USER ACTIVE:", user.is_active)
    print("USER ROLE ID:", user.role_id)

    if not user.is_active:
        print("ERROR: User account is inactive")
        print("================================\n")

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    # --------------------------------------------------------
    # Authentication successful
    # --------------------------------------------------------

    print("AUTH SUCCESS:", user.email)
    print("================================\n")

    return user


# ============================================================
# PERMISSION CHECK
# ============================================================

def require_permission(
    module_code: str,
    permission_name: str,
):
    """
    Check whether the authenticated user's role
    has the requested permission for a module.
    """

    def permission_checker(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        # ----------------------------------------------------
        # Get user's role
        # ----------------------------------------------------

        role = (
            db.query(Role)
            .filter(Role.id == current_user.role_id)
            .first()
        )

        if not role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User role not found",
            )

        # ----------------------------------------------------
        # Get module
        # ----------------------------------------------------

        module = (
            db.query(Module)
            .filter(Module.code == module_code)
            .first()
        )

        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Module not found",
            )

        # ----------------------------------------------------
        # Get permission
        # ----------------------------------------------------

        permission = (
            db.query(Permission)
            .filter(Permission.name == permission_name)
            .first()
        )

        if not permission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Permission not found",
            )

        # ----------------------------------------------------
        # Check role permission
        # ----------------------------------------------------

        role_permission = (
            db.query(RoleModulePermission)
            .filter(
                RoleModulePermission.role_id == role.id,
                RoleModulePermission.module_id == module.id,
                RoleModulePermission.permission_id == permission.id,
                RoleModulePermission.allowed == True,
            )
            .first()
        )

        if not role_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Permission denied: "
                    f"{permission_name} access to {module_code}"
                ),
            )

        return current_user

    return permission_checker