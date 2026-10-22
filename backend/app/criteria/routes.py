from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List

from app.auth.dependencies import get_db, get_current_user, require_permission
from app.auth.registration_authority import get_role_name
from app.models import AccreditationCycle, Criterion, NaacFramework, User
from app.schemas.criterion import CriterionCreate, CriterionUpdate, CriterionResponse
from app.services.framework_service import framework_criteria_payload
from app.services.report_service import build_progress, get_active_cycle

router = APIRouter(
    prefix="/criteria",
    tags=["NAAC Criteria"]
)


@router.get("", response_model=List[CriterionResponse])
def get_criteria(
    cycle_id: int | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    role_name = get_role_name(db, current_user.role_id)
    cycle = None
    if cycle_id is not None:
        cycle = (
            db.query(AccreditationCycle)
            .filter(AccreditationCycle.id == cycle_id)
            .first()
        )
        if not cycle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Accreditation cycle not found",
            )
        if role_name != "Admin" and (
            not current_user.institution_id
            or cycle.institution_id != current_user.institution_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot access criteria for another institution's cycle",
            )
    elif current_user.institution_id:
        cycle = get_active_cycle(db, current_user.institution_id)

    department_id = None
    if role_name == "Dept. Coordinator":
        department_id = current_user.department_id

    progress = build_progress(
        db,
        institution_id=(
            cycle.institution_id if cycle else current_user.institution_id
        ),
        department_id=department_id,
        cycle=cycle,
    )
    progress_rows = progress["criteria"]
    if not cycle or not cycle.framework_id:
        return progress_rows

    framework = (
        db.query(NaacFramework)
        .filter(NaacFramework.id == cycle.framework_id)
        .first()
    )
    if not framework:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Accreditation cycle framework not found",
        )

    definitions = framework_criteria_payload(db, framework)
    if not definitions:
        return []

    progress_by_number = {
        str(item["number"]).upper().removeprefix("C"): item
        for item in progress_rows
    }
    cycle_progress = progress["cycle_progress"]
    results = []
    for definition in definitions:
        criterion_progress = progress_by_number.get(
            str(definition["number"]).upper().removeprefix("C"),
            {},
        )
        results.append({
            "id": definition["id"],
            "framework_criterion_id": definition["id"],
            "operational_criterion_id": criterion_progress.get("id"),
            "number": definition["number"],
            "title": definition["title"],
            "description": definition.get("description"),
            "weightage": criterion_progress.get("weightage"),
            "completion_percentage": criterion_progress.get(
                "completion_percentage",
                0,
            ),
            "cycle_id": cycle.id,
            "created_at": criterion_progress.get(
                "created_at",
                definition.get("created_at"),
            ),
            "updated_at": criterion_progress.get("updated_at"),
            "status": criterion_progress.get("status", "Not Started"),
            "total_submissions": criterion_progress.get("total_submissions", 0),
            "approved_submissions": criterion_progress.get(
                "approved_submissions",
                0,
            ),
            "total_metrics": criterion_progress.get("total_metrics", 0),
            "total_evidence": criterion_progress.get("total_evidence", 0),
            "progress_cycle_id": cycle.id,
            "applicability_configured": cycle_progress.get(
                "applicability_configured",
                False,
            ),
            "uses_catalog_fallback": cycle_progress.get(
                "uses_catalog_fallback",
                False,
            ),
            "required_metric_count": criterion_progress.get(
                "required_metric_count",
                0,
            ),
            "optional_metric_count": criterion_progress.get(
                "optional_metric_count",
                0,
            ),
            "finalized_count": criterion_progress.get("finalized_count", 0),
            "pending_count": criterion_progress.get("pending_count", 0),
            "under_review_count": criterion_progress.get(
                "under_review_count",
                0,
            ),
            "changes_requested_count": criterion_progress.get(
                "changes_requested_count",
                0,
            ),
            "rejected_count": criterion_progress.get("rejected_count", 0),
            "missing_required_count": criterion_progress.get(
                "missing_required_count",
                0,
            ),
            "framework_code": framework.code,
            "framework_name": framework.name,
        })
    return results


@router.post("", response_model=CriterionResponse, status_code=status.HTTP_201_CREATED)
def create_criterion(
    c_data: CriterionCreate,
    current_user: User = Depends(require_permission("CRITERIA_1", "Create")),
    db: Session = Depends(get_db)
):
    criterion = Criterion(
        number=c_data.number,
        title=c_data.title,
        description=c_data.description,
        weightage=c_data.weightage,
        completion_percentage=c_data.completion_percentage,
        cycle_id=c_data.cycle_id
    )
    db.add(criterion)
    db.commit()
    db.refresh(criterion)
    return criterion
