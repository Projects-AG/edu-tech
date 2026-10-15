from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_db, require_permission
from app.auth.registration_authority import get_role_name
from app.models import User, Institution, AccreditationCycle
from app.services.report_service import (
    ACTIVE_CYCLE_STATUSES,
    calculate_institution_reports,
    get_final_report_eligibility,
)


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
    role_name = get_role_name(db, current_user.role_id)
    if role_name != "NAAC Coordinator":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only NAAC Coordinators can access "
                "the coordinator dashboard"
            ),
        )

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
        AccreditationCycle.status.in_(ACTIVE_CYCLE_STATUSES)
    ).count()

    draft_cycles = cycles_query.filter(
        AccreditationCycle.status == "Draft"
    ).count()

    completed_cycles = cycles_query.filter(
        AccreditationCycle.status == "Completed"
    ).count()

    reports = calculate_institution_reports(
        db,
        current_user.institution_id,
    )
    eligibility = get_final_report_eligibility(
        db,
        current_user.institution_id,
    )

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
            "total_submissions": reports["submission_funnel"]["total"],
            "approved_submissions": (
                reports["submission_funnel"]["approved"]
                + reports["submission_funnel"]["final_approval"]
                + reports["submission_funnel"]["final_submitted"]
            ),
            "total_evidence": reports["evidence"]["total_documents"],
            "overall_completion_percentage": reports[
                "overall_completion_percentage"
            ],
            "cycle_id": reports["cycle_progress"]["cycle_id"],
            "applicability_configured": reports["cycle_progress"][
                "applicability_configured"
            ],
            "uses_catalog_fallback": reports["cycle_progress"][
                "uses_catalog_fallback"
            ],
            "total_applicable_metrics": reports["cycle_progress"][
                "total_applicable_metrics"
            ],
            "required_metric_count": reports["cycle_progress"][
                "required_metric_count"
            ],
            "optional_metric_count": reports["cycle_progress"][
                "optional_metric_count"
            ],
            "finalized_required_count": reports["cycle_progress"][
                "finalized_required_count"
            ],
            "pending_required_count": reports["cycle_progress"][
                "pending_required_count"
            ],
            "missing_required_metrics": reports["cycle_progress"][
                "missing_required_metrics"
            ],
            "eligibility_status": eligibility.get("eligibility_status"),
            "naac_required_optional_verified": eligibility.get(
                "naac_required_optional_verified"
            ),
        },
        "cycle_progress": reports["cycle_progress"],
        "final_report": {
            "eligible": eligibility.get("eligible"),
            "eligibility_status": eligibility.get("eligibility_status"),
            "reason": eligibility.get("reason"),
            "naac_required_optional_verified": eligibility.get(
                "naac_required_optional_verified"
            ),
        },
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