from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models import (
    AccreditationCycle,
    Institution,
    Module,
    NaacFramework,
    Permission,
    Role,
    RoleModulePermission,
    User,
)
from app.schemas.accreditation_cycle import (
    AccreditationCycleCreate,
    AccreditationCycleUpdate,
    AccreditationCycleResponse,
)
from app.schemas.metric import MetricResponse
from app.schemas.cycle_applicable_metric import (
    CycleApplicableMetricItem,
    CycleApplicableMetricReplaceRequest,
    CycleApplicableMetricResponse,
    CycleApplicabilityResponse,
)
from app.auth.dependencies import get_current_user, require_permission
from app.auth.registration_authority import ADMIN, get_role_name
from app.services.cycle_applicability_service import (
    add_cycle_applicable_metric,
    delete_cycle_applicability_rows,
    list_cycle_applicability,
    remove_cycle_applicable_metric,
    replace_cycle_applicable_metrics,
)
from app.services.audit_service import record_audit
from app.services.framework_service import (
    apply_framework_to_cycle,
    assert_cycle_framework_not_rewritten,
    assert_cycle_institution_reassignment,
    assert_cycle_status_allowed,
    assert_single_live_cycle_per_institution,
    cycle_metric_catalog,
    framework_readiness,
    official_operational_metric_rows,
    resolve_cycle_framework,
)


# ============================================================
# ACCREDITATION CYCLE ROUTER
# ============================================================

router = APIRouter(
    prefix="/accreditation-cycles",
    tags=["Accreditation Cycles"]
)


# ============================================================
# DATABASE DEPENDENCY
# ============================================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


def serialize_cycle(db: Session, cycle: AccreditationCycle) -> dict:
    framework = None
    if cycle.framework_id:
        framework = (
            db.query(NaacFramework)
            .filter(NaacFramework.id == cycle.framework_id)
            .first()
        )
    payload = AccreditationCycleResponse.model_validate(cycle).model_dump()
    if framework:
        readiness = framework_readiness(db, framework)
        payload["framework_name"] = framework.name
        payload["framework_version"] = framework.version
        payload["framework_code"] = framework.code
        payload["framework_verification_status"] = framework.verification_status
        payload["criterion_structure_verified"] = readiness[
            "criterion_structure_verified"
        ]
        payload["metric_catalogue_complete"] = readiness[
            "metric_catalogue_complete"
        ]
        payload["catalogue_status"] = readiness["catalogue_status"]
        payload["allows_production_cycles"] = readiness[
            "allows_production_cycles"
        ]
        catalog_kind, _catalog_metrics = cycle_metric_catalog(db, cycle)
        payload["catalog_kind"] = catalog_kind
        payload["official_operational_metric_count"] = len(
            official_operational_metric_rows(db, framework)
        )
    else:
        payload["catalog_kind"] = "WORKING"
        payload["official_operational_metric_count"] = 0
    return payload


def get_cycle_or_404(db: Session, cycle_id: int) -> AccreditationCycle:
    cycle = db.query(AccreditationCycle).filter(
        AccreditationCycle.id == cycle_id
    ).first()

    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Accreditation cycle not found"
        )

    return cycle


def ensure_cycle_institution_access(
    db: Session,
    current_user: User,
    cycle: AccreditationCycle,
) -> None:
    if get_role_name(db, current_user.role_id) == ADMIN:
        return

    if (
        not current_user.institution_id
        or cycle.institution_id != current_user.institution_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access another institution's accreditation cycle",
        )


def user_has_module_permission(
    db: Session,
    current_user: User,
    module_code: str,
    permission_name: str,
) -> bool:
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    module = db.query(Module).filter(Module.code == module_code).first()
    permission = (
        db.query(Permission)
        .filter(Permission.name == permission_name)
        .first()
    )
    if not role or not module or not permission:
        return False
    return (
        db.query(RoleModulePermission)
        .filter(
            RoleModulePermission.role_id == role.id,
            RoleModulePermission.module_id == module.id,
            RoleModulePermission.permission_id == permission.id,
            RoleModulePermission.allowed == True,
        )
        .first()
        is not None
    )


def require_cycle_view(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    if user_has_module_permission(
        db, current_user, "ACCREDITATION_CYCLES", "View"
    ) or user_has_module_permission(
        db, current_user, "FORMS_DATA", "View"
    ):
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Permission denied: View access to accreditation cycles",
    )


# ============================================================
# CREATE ACCREDITATION CYCLE
# ============================================================

@router.post(
    "",
    response_model=AccreditationCycleResponse,
    status_code=status.HTTP_201_CREATED
)
def create_accreditation_cycle(
    cycle_data: AccreditationCycleCreate,
    current_user: User = Depends(
        require_permission(
            "ACCREDITATION_CYCLES",
            "Create"
        )
    ),
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # 1. Check whether institution exists
    # --------------------------------------------------------

    institution = db.query(Institution).filter(
        Institution.id == cycle_data.institution_id
    ).first()

    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )

    if (
        get_role_name(db, current_user.role_id) != ADMIN
        and cycle_data.institution_id != current_user.institution_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create an accreditation cycle for another institution",
        )

    # --------------------------------------------------------
    # 2. Check duplicate cycle code
    # --------------------------------------------------------

    existing = db.query(AccreditationCycle).filter(
        AccreditationCycle.code == cycle_data.code
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Accreditation cycle code already exists"
        )

    # --------------------------------------------------------
    # 3. Create accreditation cycle
    # --------------------------------------------------------

    framework = resolve_cycle_framework(
        db,
        institution,
        cycle_data.framework_id,
    )
    assert_cycle_status_allowed(db, framework, cycle_data.status)
    assert_single_live_cycle_per_institution(
        db,
        cycle_data.institution_id,
        cycle_data.status,
    )

    cycle = AccreditationCycle(
        institution_id=cycle_data.institution_id,
        name=cycle_data.name,
        code=cycle_data.code,
        academic_period=cycle_data.academic_period,
        status=cycle_data.status,
        description=cycle_data.description,
        created_by=current_user.id,
        framework_id=framework.id,
    )

    db.add(cycle)
    db.flush()
    apply_framework_to_cycle(db, cycle, framework, current_user.id)
    record_audit(
        db,
        user=current_user,
        action="CYCLE_FRAMEWORK_BIND",
        entity_type="AccreditationCycle",
        entity_id=cycle.id,
        new_values={
            "framework_id": framework.id,
            "framework_code": framework.code,
            "framework_version": framework.version,
        },
        institution_id=institution.id,
    )
    db.commit()
    db.refresh(cycle)

    return serialize_cycle(db, cycle)


# ============================================================
# GET ALL ACCREDITATION CYCLES
# ============================================================

@router.get(
    "",
    response_model=list[AccreditationCycleResponse]
)
def get_accreditation_cycles(
    current_user: User = Depends(require_cycle_view),
    db: Session = Depends(get_db)
):
    query = db.query(AccreditationCycle)

    if get_role_name(db, current_user.role_id) != ADMIN:
        if not current_user.institution_id:
            return []

        query = query.filter(
            AccreditationCycle.institution_id == current_user.institution_id
        )

    return [serialize_cycle(db, cycle) for cycle in query.all()]


# ============================================================
# GET SINGLE ACCREDITATION CYCLE
# ============================================================

@router.get(
    "/{cycle_id}",
    response_model=AccreditationCycleResponse
)
def get_accreditation_cycle(
    cycle_id: int,
    current_user: User = Depends(require_cycle_view),
    db: Session = Depends(get_db)
):

    cycle = db.query(AccreditationCycle).filter(
        AccreditationCycle.id == cycle_id
    ).first()

    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Accreditation cycle not found"
        )

    if (
        get_role_name(db, current_user.role_id) != ADMIN
        and cycle.institution_id != current_user.institution_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access another institution's accreditation cycle",
        )

    return serialize_cycle(db, cycle)


# ============================================================
# UPDATE ACCREDITATION CYCLE
# ============================================================

@router.put(
    "/{cycle_id}",
    response_model=AccreditationCycleResponse
)
def update_accreditation_cycle(
    cycle_id: int,
    cycle_data: AccreditationCycleUpdate,
    current_user: User = Depends(
        require_permission(
            "ACCREDITATION_CYCLES",
            "Edit"
        )
    ),
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # 1. Find cycle
    # --------------------------------------------------------

    cycle = db.query(AccreditationCycle).filter(
        AccreditationCycle.id == cycle_id
    ).first()

    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Accreditation cycle not found"
        )

    ensure_cycle_institution_access(db, current_user, cycle)

    # --------------------------------------------------------
    # 2. Check institution if it is being changed
    # --------------------------------------------------------

    update_data = cycle_data.model_dump(
        exclude_unset=True
    )

    if "framework_id" in update_data:
        incoming_framework_id = update_data.pop("framework_id")
        assert_cycle_framework_not_rewritten(cycle, incoming_framework_id)

    if "institution_id" in update_data:

        institution = db.query(Institution).filter(
            Institution.id == update_data["institution_id"]
        ).first()

        if not institution:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Institution not found"
            )

        if (
            get_role_name(db, current_user.role_id) != ADMIN
            and institution.id != cycle.institution_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot move an accreditation cycle to another institution",
            )

        assert_cycle_institution_reassignment(db, cycle, institution)

    # --------------------------------------------------------
    # 3. Check duplicate cycle code
    # --------------------------------------------------------

    if "code" in update_data:

        existing = db.query(AccreditationCycle).filter(
            AccreditationCycle.code == update_data["code"],
            AccreditationCycle.id != cycle_id
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Accreditation cycle code already exists"
            )

    # --------------------------------------------------------
    # 4. Update fields
    # --------------------------------------------------------

    previous_status = cycle.status
    target_institution_id = update_data.get(
        "institution_id",
        cycle.institution_id,
    )
    target_status = update_data.get("status", cycle.status)

    if "status" in update_data:
        framework = None
        if cycle.framework_id:
            framework = (
                db.query(NaacFramework)
                .filter(NaacFramework.id == cycle.framework_id)
                .first()
            )
        assert_cycle_status_allowed(db, framework, update_data["status"])

    if "status" in update_data or "institution_id" in update_data:
        assert_single_live_cycle_per_institution(
            db,
            target_institution_id,
            target_status,
            exclude_cycle_id=cycle.id,
        )

    for field, value in update_data.items():
        setattr(cycle, field, value)

    if previous_status != cycle.status:
        record_audit(
            db,
            user=current_user,
            action="CYCLE_STATUS_CHANGE",
            entity_type="AccreditationCycle",
            entity_id=cycle.id,
            old_values={"status": previous_status},
            new_values={
                "status": cycle.status,
                "code": cycle.code,
            },
            institution_id=cycle.institution_id,
        )

    db.commit()
    db.refresh(cycle)

    return serialize_cycle(db, cycle)


# ============================================================
# DELETE ACCREDITATION CYCLE
# ============================================================

@router.delete(
    "/{cycle_id}"
)
def delete_accreditation_cycle(
    cycle_id: int,
    current_user: User = Depends(
        require_permission(
            "ACCREDITATION_CYCLES",
            "Delete"
        )
    ),
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # 1. Find cycle
    # --------------------------------------------------------

    cycle = db.query(AccreditationCycle).filter(
        AccreditationCycle.id == cycle_id
    ).first()

    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Accreditation cycle not found"
        )

    ensure_cycle_institution_access(db, current_user, cycle)

    # --------------------------------------------------------
    # 2. Delete cycle applicability mappings, then the cycle
    # --------------------------------------------------------

    record_audit(
        db,
        user=current_user,
        action="CYCLE_DELETE",
        entity_type="AccreditationCycle",
        entity_id=cycle.id,
        old_values={
            "status": cycle.status,
            "code": cycle.code,
            "framework_id": cycle.framework_id,
        },
        institution_id=cycle.institution_id,
    )
    delete_cycle_applicability_rows(db, cycle_id)
    db.delete(cycle)
    db.commit()

    return {
        "message": "Accreditation cycle deleted successfully",
        "cycle_id": cycle_id
    }


# ============================================================
# CYCLE APPLICABLE METRICS
# ============================================================

@router.get(
    "/{cycle_id}/metrics",
    response_model=list[MetricResponse],
)
def get_cycle_metrics(
    cycle_id: int,
    current_user: User = Depends(require_cycle_view),
    db: Session = Depends(get_db),
):
    cycle = get_cycle_or_404(db, cycle_id)
    ensure_cycle_institution_access(db, current_user, cycle)
    _catalog_kind, metrics = cycle_metric_catalog(db, cycle)
    return metrics


@router.get(
    "/{cycle_id}/applicable-metrics",
    response_model=CycleApplicabilityResponse,
)
def get_cycle_applicable_metrics(
    cycle_id: int,
    current_user: User = Depends(require_cycle_view),
    db: Session = Depends(get_db),
):
    cycle = get_cycle_or_404(db, cycle_id)
    ensure_cycle_institution_access(db, current_user, cycle)
    return list_cycle_applicability(db, cycle)


@router.put(
    "/{cycle_id}/applicable-metrics",
    response_model=CycleApplicabilityResponse,
)
def replace_cycle_applicable_metrics_endpoint(
    cycle_id: int,
    payload: CycleApplicableMetricReplaceRequest,
    current_user: User = Depends(
        require_permission(
            "ACCREDITATION_CYCLES",
            "Edit"
        )
    ),
    db: Session = Depends(get_db),
):
    cycle = get_cycle_or_404(db, cycle_id)
    ensure_cycle_institution_access(db, current_user, cycle)
    items = [
        item.model_dump()
        for item in payload.metrics
    ]
    return replace_cycle_applicable_metrics(
        db,
        cycle,
        items,
        actor_user=current_user,
    )


@router.post(
    "/{cycle_id}/applicable-metrics",
    response_model=CycleApplicableMetricResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_cycle_applicable_metric_endpoint(
    cycle_id: int,
    payload: CycleApplicableMetricItem,
    current_user: User = Depends(
        require_permission(
            "ACCREDITATION_CYCLES",
            "Edit"
        )
    ),
    db: Session = Depends(get_db),
):
    cycle = get_cycle_or_404(db, cycle_id)
    ensure_cycle_institution_access(db, current_user, cycle)
    return add_cycle_applicable_metric(
        db,
        cycle,
        payload.metric_id,
        payload.required,
        actor_user=current_user,
    )


@router.delete(
    "/{cycle_id}/applicable-metrics/{metric_id}",
    status_code=status.HTTP_200_OK,
)
def delete_cycle_applicable_metric_endpoint(
    cycle_id: int,
    metric_id: int,
    current_user: User = Depends(
        require_permission(
            "ACCREDITATION_CYCLES",
            "Edit"
        )
    ),
    db: Session = Depends(get_db),
):
    cycle = get_cycle_or_404(db, cycle_id)
    ensure_cycle_institution_access(db, current_user, cycle)
    remove_cycle_applicable_metric(
        db,
        cycle,
        metric_id,
        actor_user=current_user,
    )
    return {
        "message": "Applicable metric mapping removed",
        "cycle_id": cycle_id,
        "metric_id": metric_id,
    }