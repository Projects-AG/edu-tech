from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_db
from app.auth.registration_authority import ADMIN, get_role_name
from app.models import AuditLog, User


router = APIRouter(
    prefix="/audit-logs",
    tags=["Audit Logs"],
)

AUDIT_VIEW_ROLES = {
    ADMIN,
    "Institution Admin",
    "NAAC Coordinator",
    "Principal / Director",
}


def require_audit_viewer(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    role_name = get_role_name(db, current_user.role_id)

    if role_name not in AUDIT_VIEW_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view audit logs",
        )

    return current_user


@router.get("")
def list_audit_logs(
    action: str | None = None,
    entity_type: str | None = None,
    user_id: int | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    limit: int = Query(default=100, ge=1, le=200),
    current_user: User = Depends(require_audit_viewer),
    db: Session = Depends(get_db),
):
    role_name = get_role_name(db, current_user.role_id)
    query = db.query(AuditLog, User).outerjoin(
        User,
        User.id == AuditLog.user_id,
    )

    if role_name != ADMIN:
        if not current_user.institution_id:
            return []

        query = query.filter(
            AuditLog.institution_id == current_user.institution_id
        )

    if action:
        query = query.filter(AuditLog.action == action)

    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)

    if user_id is not None:
        query = query.filter(AuditLog.user_id == user_id)

    if date_from is not None:
        query = query.filter(AuditLog.timestamp >= date_from)

    if date_to is not None:
        query = query.filter(AuditLog.timestamp <= date_to)

    rows = (
        query
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "user_name": user.name if user else None,
            "user_email": user.email if user else None,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "old_values": log.old_values,
            "new_values": log.new_values,
            "timestamp": log.timestamp,
            "institution_id": log.institution_id,
        }
        for log, user in rows
    ]
