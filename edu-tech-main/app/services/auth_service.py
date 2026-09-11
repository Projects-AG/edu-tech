from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_token,
    verify_password,
    verify_token,
)
from app.models.models import AuditLog, RefreshToken, RoleAssignment, User
from app.services.user_service import get_user_roles


def _role_values(assignments: list[RoleAssignment]) -> list[str]:
    return [a.role.value for a in assignments]


def issue_access_token(user: User, roles: list[str]) -> str:
    return create_access_token(
        {"sub": user.id, "institution_id": user.institution_id, "roles": roles}
    )


def login(db: Session, email: str, password: str) -> tuple[User, list[str], str, str]:
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    roles = _role_values(get_user_roles(db, user.id))
    access_token = issue_access_token(user, roles)
    refresh_token = create_refresh_token({"sub": user.id})

    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(refresh_token),
            expires_at=datetime.now(timezone.utc).replace(tzinfo=None)
            + timedelta(days=settings.jwt_refresh_expire_days),
        )
    )
    db.add(
        AuditLog(
            institution_id=user.institution_id,
            actor_id=user.id,
            action="USER_LOGIN",
            entity_type="User",
            entity_id=user.id,
        )
    )
    db.commit()
    return user, roles, access_token, refresh_token


def refresh_access_token(db: Session, refresh_token: str) -> str:
    try:
        decoded = decode_refresh_token(refresh_token)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user_id = decoded.get("sub")
    stored_tokens = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked.is_(False),
            RefreshToken.expires_at > datetime.utcnow(),
        )
        .all()
    )
    if not any(verify_token(refresh_token, t.token_hash) for t in stored_tokens):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token not recognized")

    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    roles = _role_values(get_user_roles(db, user.id))
    return issue_access_token(user, roles)


def logout(db: Session, user: User, refresh_token: str | None = None) -> None:
    query = db.query(RefreshToken).filter(
        RefreshToken.user_id == user.id,
        RefreshToken.revoked.is_(False),
    )
    tokens = query.all()
    if refresh_token:
        matched = [t for t in tokens if verify_token(refresh_token, t.token_hash)]
        if not matched:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token not recognized")
        tokens = matched
    for token in tokens:
        token.revoked = True
    db.commit()
