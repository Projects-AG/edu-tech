from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.auth.dependencies import get_db, require_permission
from app.auth.registration_authority import ADMIN, PRINCIPAL_DIRECTOR, get_role_name
from app.models import (
    Institution,
    Module,
    Permission,
    Role,
    RoleModulePermission,
    User,
)
from app.services.audit_service import record_audit
from app.services.notification_service import notify_role_users
from app.services.report_service import (
    build_final_report_html,
    calculate_institution_reports,
    get_active_cycle,
    get_final_report_eligibility,
    get_latest_completed_cycle,
    persist_final_report_html,
    read_stored_final_report,
    remove_final_report_file,
    stored_final_report_exists,
)

router = APIRouter(
    prefix="/reports",
    tags=["NAAC Reports"]
)


def has_reports_approve(db: Session, current_user: User) -> bool:
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    module = db.query(Module).filter(Module.code == "REPORTS").first()
    permission = db.query(Permission).filter(Permission.name == "Approve").first()

    if not role or not module or not permission:
        return False

    allowed = (
        db.query(RoleModulePermission)
        .filter(
            RoleModulePermission.role_id == role.id,
            RoleModulePermission.module_id == module.id,
            RoleModulePermission.permission_id == permission.id,
            RoleModulePermission.allowed.is_(True),
        )
        .first()
    )
    return allowed is not None


FINAL_REPORT_DOWNLOAD_FORBIDDEN = (
    "Only the institution's Principal / Director can download the final "
    "NAAC report"
)


def can_download_final_report(db: Session, current_user: User) -> bool:
    return (
        get_role_name(db, current_user.role_id) == PRINCIPAL_DIRECTOR
        and bool(current_user.institution_id)
        and has_reports_approve(db, current_user)
    )


def scoped_institution_id(
    db: Session,
    current_user: User,
    requested_institution_id: int | None = None,
) -> int | None:
    role_name = get_role_name(db, current_user.role_id)

    if requested_institution_id is not None:
        institution = (
            db.query(Institution)
            .filter(Institution.id == requested_institution_id)
            .first()
        )
        if not institution:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Institution not found",
            )
        if role_name != ADMIN:
            if current_user.institution_id != requested_institution_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot report on another institution",
                )
            return current_user.institution_id
        return requested_institution_id

    if current_user.institution_id:
        return current_user.institution_id

    if role_name == ADMIN:
        return None

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="User is not assigned to an institution",
    )


def attach_final_report_state(
    db: Session,
    current_user: User,
    reports: dict,
    institution_id: int | None = None,
) -> dict:
    if institution_id is None:
        institution_id = scoped_institution_id(db, current_user)
    eligibility = get_final_report_eligibility(db, institution_id)
    active_cycle = get_active_cycle(db, institution_id)
    completed_cycle = get_latest_completed_cycle(db, institution_id)
    stored_cycle = None
    if (
        completed_cycle
        and stored_final_report_exists(
            completed_cycle.institution_id,
            completed_cycle.id,
        )
    ):
        stored_cycle = completed_cycle

    can_download = can_download_final_report(db, current_user) and (
        stored_cycle is not None or eligibility["eligible"]
    )
    display_cycle = active_cycle or completed_cycle
    reports["final_report"] = {
        **eligibility,
        "can_download": can_download,
        "role": get_role_name(db, current_user.role_id),
        "cycle_status": display_cycle.status if display_cycle else None,
        "report_available": stored_cycle is not None,
        "stored_cycle_id": stored_cycle.id if stored_cycle else None,
    }
    if display_cycle and not reports.get("cycle"):
        reports["cycle"] = {
            "id": display_cycle.id,
            "name": display_cycle.name,
            "code": display_cycle.code,
            "academic_period": display_cycle.academic_period,
            "status": display_cycle.status,
            "framework_id": getattr(display_cycle, "framework_id", None),
        }
        cycle_progress = reports.get("cycle_progress") or {}
        reports["cycle"]["framework_name"] = cycle_progress.get("framework_name")
        reports["cycle"]["framework_version"] = cycle_progress.get(
            "framework_version"
        )
        reports["cycle"]["framework_code"] = cycle_progress.get("framework_code")
    return reports


@router.get("/summary")
def get_summary_report(
    institution_id: int | None = Query(default=None),
    current_user: User = Depends(
        require_permission("REPORTS", "View")
    ),
    db: Session = Depends(get_db)
):
    institution_id = scoped_institution_id(
        db,
        current_user,
        institution_id,
    )
    role_name = get_role_name(db, current_user.role_id)
    department_id = None
    if role_name in {"Dept. Coordinator", "Committee Member"}:
        department_id = current_user.department_id or None
        if not department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not assigned to a department",
            )
    reports = calculate_institution_reports(
        db,
        institution_id,
        department_id,
    )
    cycle = get_active_cycle(db, institution_id)
    reports["cycle"] = (
        {
            "id": cycle.id,
            "name": cycle.name,
            "code": cycle.code,
            "academic_period": cycle.academic_period,
            "status": cycle.status,
        }
        if cycle
        else None
    )
    return attach_final_report_state(
        db,
        current_user,
        reports,
        institution_id,
    )


@router.get("/aqar")
def get_aqar_report(
    institution_id: int | None = Query(default=None),
    current_user: User = Depends(
        require_permission("REPORTS", "View")
    ),
    db: Session = Depends(get_db)
):
    institution_id = scoped_institution_id(
        db,
        current_user,
        institution_id,
    )
    reports = calculate_institution_reports(db, institution_id)
    cycle = get_active_cycle(db, institution_id)
    return {
        "report_type": (
            "Internal progress summary (AQAR preparation; "
            "not an official NAAC AQAR)"
        ),
        "official_naac_document": False,
        "academic_year": cycle.academic_period if cycle else None,
        "cycle": cycle.name if cycle else None,
        "data": reports
    }


@router.get("/ssr")
def get_ssr_report(
    institution_id: int | None = Query(default=None),
    current_user: User = Depends(
        require_permission("REPORTS", "View")
    ),
    db: Session = Depends(get_db)
):
    institution_id = scoped_institution_id(
        db,
        current_user,
        institution_id,
    )
    reports = calculate_institution_reports(db, institution_id)
    cycle = get_active_cycle(db, institution_id)
    return {
        "report_type": (
            "Internal progress summary (SSR preparation; "
            "not an official NAAC SSR)"
        ),
        "official_naac_document": False,
        "cycle": cycle.name if cycle else None,
        "academic_year": cycle.academic_period if cycle else None,
        "data": reports
    }


@router.get("/criteria")
def get_criterion_report(
    institution_id: int | None = Query(default=None),
    current_user: User = Depends(
        require_permission("REPORTS", "View")
    ),
    db: Session = Depends(get_db)
):
    institution_id = scoped_institution_id(
        db,
        current_user,
        institution_id,
    )
    reports = calculate_institution_reports(db, institution_id)
    return {
        "report_type": "criterion",
        "criteria": reports["criterion_report"],
    }


@router.get("/evidence")
def get_evidence_report(
    institution_id: int | None = Query(default=None),
    current_user: User = Depends(
        require_permission("REPORTS", "View")
    ),
    db: Session = Depends(get_db)
):
    institution_id = scoped_institution_id(
        db,
        current_user,
        institution_id,
    )
    reports = calculate_institution_reports(db, institution_id)
    return {
        "report_type": "evidence",
        "evidence": reports["evidence"],
    }


@router.get("/progress")
def get_progress_report(
    institution_id: int | None = Query(default=None),
    current_user: User = Depends(
        require_permission("REPORTS", "View")
    ),
    db: Session = Depends(get_db)
):
    institution_id = scoped_institution_id(
        db,
        current_user,
        institution_id,
    )
    reports = calculate_institution_reports(db, institution_id)
    return {
        "report_type": "progress",
        "progress": reports["progress_report"],
    }


@router.post("/finalize")
def finalize_accreditation_cycle(
    current_user: User = Depends(
        require_permission("REPORTS", "Approve")
    ),
    db: Session = Depends(get_db),
):
    role_name = get_role_name(db, current_user.role_id)
    if role_name != PRINCIPAL_DIRECTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Principal / Director can finalize an accreditation cycle",
        )

    if not current_user.institution_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to an institution",
        )

    cycle = get_active_cycle(db, current_user.institution_id)
    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No active accreditation cycle exists for this institution",
        )

    if cycle.institution_id != current_user.institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot finalize another institution's accreditation cycle",
        )

    if cycle.status == "Completed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This accreditation cycle has already been finalized",
        )

    eligibility = get_final_report_eligibility(
        db,
        current_user.institution_id,
    )
    if not eligibility.get("eligible"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=eligibility,
        )

    if stored_final_report_exists(cycle.institution_id, cycle.id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A final internal progress report already exists for this cycle",
        )

    html, _filename = build_final_report_html(
        db,
        current_user.institution_id,
    )

    created_path = None
    previous_status = cycle.status
    try:
        created_path = persist_final_report_html(
            cycle.institution_id,
            cycle.id,
            html,
        )
        cycle.status = "Completed"
        record_audit(
            db,
            user=current_user,
            action="CYCLE_FINALIZE",
            entity_type="AccreditationCycle",
            entity_id=cycle.id,
            old_values={"status": previous_status},
            new_values={
                "status": "Completed",
                "report_path": created_path,
            },
            institution_id=cycle.institution_id,
        )
        notify_role_users(
            db=db,
            role_name="NAAC Coordinator",
            title="Accreditation Cycle Finalized",
            message=(
                f"Accreditation cycle '{cycle.name}' has been finalized. "
                "The final internal progress report is available. It is "
                "not an official NAAC accreditation outcome."
            ),
            institution_id=cycle.institution_id,
            notif_type="success",
        )
        db.commit()
        db.refresh(cycle)
    except FileExistsError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A final internal progress report already exists for this cycle",
        )
    except Exception:
        db.rollback()
        if created_path:
            remove_final_report_file(cycle.institution_id, cycle.id)
        raise

    return {
        "success": True,
        "cycle_id": cycle.id,
        "cycle_name": cycle.name,
        "status": cycle.status,
        "report_available": True,
        "report_path": created_path,
    }


@router.get("/final/download")
def download_final_report(
    institution_id: int | None = Query(default=None),
    current_user: User = Depends(
        require_permission("REPORTS", "Approve")
    ),
    db: Session = Depends(get_db)
):
    if not can_download_final_report(db, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=FINAL_REPORT_DOWNLOAD_FORBIDDEN,
        )

    institution_id = scoped_institution_id(
        db,
        current_user,
        institution_id,
    )
    completed_cycle = get_latest_completed_cycle(db, institution_id)
    if completed_cycle:
        stored = read_stored_final_report(
            completed_cycle.institution_id,
            completed_cycle.id,
        )
        if stored is not None:
            filename = "naac-final-report.html"
            return Response(
                content=stored,
                media_type="text/html; charset=utf-8",
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}"',
                },
            )

    eligibility = get_final_report_eligibility(db, institution_id)
    if not eligibility["eligible"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=eligibility["reason"],
        )

    html, filename = build_final_report_html(db, institution_id)

    return Response(
        content=html.encode("utf-8"),
        media_type="text/html; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
