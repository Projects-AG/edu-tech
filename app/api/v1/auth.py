from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import JWTError

from app.db.session import get_db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
)
from app.core.config import settings
from app.models.models import User, RoleAssignment, RefreshToken, AuditLog
from app.schemas.schemas import (
    LoginRequest,
    TokenPair,
    RefreshRequest,
    AccessTokenResponse,
    UserCreate,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        institution_id=payload.institution_id,
        department_id=payload.department_id,
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenPair)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    roles = [a.role.value for a in db.query(RoleAssignment).filter(RoleAssignment.user_id == user.id).all()]

    access_token = create_access_token({"sub": user.id, "institution_id": user.institution_id, "roles": roles})
    refresh_token = create_refresh_token({"sub": user.id})

    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_password(refresh_token),
            expires_at=datetime.utcnow() + timedelta(days=settings.jwt_refresh_expire_days),
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

    return TokenPair(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    try:
        decoded = decode_refresh_token(payload.refresh_token)
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
    if not any(verify_password(payload.refresh_token, t.token_hash) for t in stored_tokens):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token not recognized")

    user = db.get(User, user_id)
    roles = [a.role.value for a in db.query(RoleAssignment).filter(RoleAssignment.user_id == user_id).all()]
    access_token = create_access_token({"sub": user.id, "institution_id": user.institution_id, "roles": roles})
    return AccessTokenResponse(access_token=access_token)
