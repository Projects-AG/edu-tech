from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.models import User, RoleAssignment, RoleName

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = decode_access_token(token)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user = db.get(User, payload.get("sub"))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


def require_roles(*allowed_roles: RoleName):
    """
    Proves the user holds one of the allowed roles SOMEWHERE in their
    institution. For department- or criterion-scoped resources, additionally
    check RoleAssignment.scope on the specific resource in the route handler
    -- role name alone is not sufficient for scoped actions (see domain model
    spec, section 3: Roles & Permissions Matrix).
    """

    def checker(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> User:
        assignments = db.query(RoleAssignment).filter(RoleAssignment.user_id == current_user.id).all()
        held_roles = {a.role for a in assignments}
        if not held_roles.intersection(allowed_roles):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return current_user

    return checker
