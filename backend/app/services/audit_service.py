from datetime import datetime

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.user import User


SENSITIVE_KEY_FRAGMENTS = (
    "password",
    "token",
    "jwt",
    "secret",
    "authorization",
    "api_key",
    "access_token",
    "refresh_token",
)


def _is_sensitive_key(key: str) -> bool:
    lowered = str(key).lower()
    return any(fragment in lowered for fragment in SENSITIVE_KEY_FRAGMENTS)


def sanitize_audit_values(values):
    if values is None:
        return None

    if not isinstance(values, dict):
        return values

    return {
        key: value
        for key, value in values.items()
        if not _is_sensitive_key(key)
    }


def record_audit(
    db: Session,
    *,
    user: User | None = None,
    action: str,
    entity_type: str,
    entity_id: int | None = None,
    old_values: dict | None = None,
    new_values: dict | None = None,
    institution_id: int | None = None,
) -> AuditLog:
    resolved_institution_id = institution_id
    if resolved_institution_id is None and user is not None:
        resolved_institution_id = user.institution_id

    entry = AuditLog(
        user_id=user.id if user is not None else None,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_values=sanitize_audit_values(old_values),
        new_values=sanitize_audit_values(new_values),
        timestamp=datetime.utcnow(),
        institution_id=resolved_institution_id,
    )
    db.add(entry)
    db.flush()
    return entry
