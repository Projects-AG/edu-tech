from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_db, require_permission
from app.models import User, Institution, AccreditationCycle


# ============================================================
# COORDINATOR ROUTER
# ============================================================

router = APIRouter(
    prefix="/coordinator",
    tags=["NAAC Coordinator"]
)


# ============================================================
# COORDINATOR DASHBOARD
# ============================================================

@router.get("/dashboard")
def coordinator_dashboard(
    current_user: User = Depends(
        require_permission("DASHBOARD", "View")
    ),
    db: Session = Depends(get_db)
):
    # --------------------------------------------------------
    # Institution
    # --------------------------------------------------------

    institution = None

    if current_user.institution_id:
        institution = db.query(Institution).filter(
            Institution.id == current_user.institution_id
        ).first()

    # --------------------------------------------------------
    # Accreditation cycles
    # --------------------------------------------------------

    cycles_query = db.query(AccreditationCycle)

    if current_user.institution_id:
        cycles_query = cycles_query.filter(
            AccreditationCycle.institution_id
            == current_user.institution_id
        )

    total_cycles = cycles_query.count()

    active_cycles = cycles_query.filter(
        AccreditationCycle.status == "In Progress"
    ).count()

    draft_cycles = cycles_query.filter(
        AccreditationCycle.status == "Draft"
    ).count()

    completed_cycles = cycles_query.filter(
        AccreditationCycle.status == "Completed"
    ).count()

    return {
        "message": "NAAC Coordinator dashboard data",

        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "role": "NAAC Coordinator",
        },

        "institution": {
            "id": institution.id if institution else None,
            "name": institution.name if institution else None,
            "code": institution.code if institution else None,
        },

        "statistics": {
            "total_accreditation_cycles": total_cycles,
            "active_cycles": active_cycles,
            "draft_cycles": draft_cycles,
            "completed_cycles": completed_cycles,
        }
    }


# ============================================================
# ACCREDITATION CYCLES
# ============================================================

@router.get("/accreditation-cycles")
def coordinator_accreditation_cycles(
    current_user: User = Depends(
        require_permission("ACCREDITATION_CYCLES", "View")
    ),
    db: Session = Depends(get_db)
):
    query = db.query(AccreditationCycle)

    if current_user.institution_id:
        query = query.filter(
            AccreditationCycle.institution_id
            == current_user.institution_id
        )

    cycles = query.all()

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