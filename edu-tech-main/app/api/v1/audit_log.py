from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps.deps import require_roles
from app.models.models import AuditLog, RoleName
from app.schemas.schemas import AuditLogOut

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


@router.get(
    "/institution/{institution_id}",
    response_model=list[AuditLogOut],
    dependencies=[Depends(require_roles(RoleName.ADMIN, RoleName.IQAC_COORDINATOR))],
)
def list_audit_logs(institution_id: str, db: Session = Depends(get_db), limit: int = 100):
    return (
        db.query(AuditLog)
        .filter(AuditLog.institution_id == institution_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
