from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models import (
    AccreditationCycle,
    AuditLog,
    Committee,
    Department,
    Document,
    Faculty,
    Institution,
    InstitutionRequest,
    NaacFramework,
    RegistrationRequest,
    Submission,
    User,
)
from app.institution.defaults import (
    ensure_default_faculty_and_department,
)
from app.schemas.institution import (
    InstitutionCreate,
    InstitutionUpdate,
    InstitutionResponse,
)
from app.auth.dependencies import (
    get_current_user,
    require_permission,
)
from app.auth.registration_authority import ADMIN, get_role_name
from app.services.audit_service import record_audit
from app.services.framework_service import (
    assert_confirmable_framework,
    assert_framework_matches_category,
    assert_institution_update_consistent,
    category_framework_to_confirm,
    cycle_framework_eligibility,
    framework_readiness,
    get_framework_or_404,
    institution_profile,
)


CATEGORY_CONFIRMATION_NOTE = (
    "Loaded from the official NAAC category mapping by a platform Admin."
)


router = APIRouter(
    prefix="/institutions",
    tags=["Institution Management"]
)


# --------------------------------------------------
# Database dependency
# --------------------------------------------------

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


def is_platform_admin(db: Session, user: User) -> bool:
    return get_role_name(db, user.role_id) == ADMIN


def serialize_institution(db: Session, institution: Institution) -> dict:
    payload = InstitutionResponse.model_validate(institution).model_dump()
    eligibility = cycle_framework_eligibility(db, institution)
    payload["eligible_cycle_framework_id"] = eligibility["framework_id"]
    payload["eligible_cycle_framework_reason"] = eligibility["reason"]
    if not institution.confirmed_framework_id:
        return payload
    framework = (
        db.query(NaacFramework)
        .filter(NaacFramework.id == institution.confirmed_framework_id)
        .first()
    )
    if not framework:
        return payload
    readiness = framework_readiness(db, framework)
    payload["confirmed_framework_name"] = framework.name
    payload["confirmed_framework_code"] = framework.code
    payload["confirmed_framework_version"] = framework.version
    payload["criterion_structure_verified"] = readiness[
        "criterion_structure_verified"
    ]
    payload["metric_catalogue_complete"] = readiness[
        "metric_catalogue_complete"
    ]
    payload["metric_rules_verified"] = readiness["metric_rules_verified"]
    payload["catalogue_status"] = readiness["catalogue_status"]
    return payload


def assert_institution_access(
    db: Session,
    current_user: User,
    institution_id: int,
):
    if is_platform_admin(db, current_user):
        return

    if current_user.institution_id != institution_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access another institution",
        )


def blocking_institution_relations(
    db: Session,
    institution_id: int,
) -> list[str]:
    checks = (
        (
            "users",
            db.query(User)
            .filter(User.institution_id == institution_id)
            .first(),
        ),
        (
            "faculties",
            db.query(Faculty)
            .filter(Faculty.institution_id == institution_id)
            .first(),
        ),
        (
            "departments",
            db.query(Department)
            .filter(Department.institution_id == institution_id)
            .first(),
        ),
        (
            "submissions",
            db.query(Submission)
            .filter(Submission.institution_id == institution_id)
            .first(),
        ),
        (
            "documents",
            db.query(Document)
            .filter(Document.institution_id == institution_id)
            .first(),
        ),
        (
            "committees",
            db.query(Committee)
            .filter(Committee.institution_id == institution_id)
            .first(),
        ),
        (
            "accreditation_cycles",
            db.query(AccreditationCycle)
            .filter(AccreditationCycle.institution_id == institution_id)
            .first(),
        ),
        (
            "registration_requests",
            db.query(RegistrationRequest)
            .filter(RegistrationRequest.institution_id == institution_id)
            .first(),
        ),
        (
            "institution_requests",
            db.query(InstitutionRequest)
            .filter(
                InstitutionRequest.created_institution_id
                == institution_id
            )
            .first(),
        ),
        (
            "audit_logs",
            db.query(AuditLog)
            .filter(AuditLog.institution_id == institution_id)
            .first(),
        ),
    )

    return [name for name, row in checks if row is not None]


# --------------------------------------------------
# CREATE INSTITUTION
# --------------------------------------------------

@router.post(
    "",
    response_model=InstitutionResponse,
    status_code=status.HTTP_201_CREATED
)
def create_institution(
    institution_data: InstitutionCreate,
    current_user: User = Depends(
        require_permission(
            "INSTITUTION_MANAGEMENT",
            "Create"
        )
    ),
    db: Session = Depends(get_db)
):
    if not is_platform_admin(db, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform Admin can create institutions",
        )

    # Check duplicate institution code
    existing = db.query(Institution).filter(
        Institution.code == institution_data.code
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Institution code already exists"
        )

    confirmed_framework_id = institution_data.confirmed_framework_id
    confirmation_note = None
    if confirmed_framework_id:
        confirmed = get_framework_or_404(db, confirmed_framework_id)
        assert_confirmable_framework(confirmed)
        assert_framework_matches_category(
            institution_profile(institution_data),
            confirmed,
        )
    elif institution_data.official_category:
        derived = category_framework_to_confirm(
            db,
            institution_profile(institution_data),
        )
        if derived is not None:
            confirmed_framework_id = derived.id
            confirmation_note = CATEGORY_CONFIRMATION_NOTE

    institution = Institution(
        name=institution_data.name,
        code=institution_data.code,
        address=institution_data.address,
        city=institution_data.city,
        state=institution_data.state,
        pincode=institution_data.pincode,
        institution_type=institution_data.institution_type,
        official_category=institution_data.official_category,
        affiliation_status=institution_data.affiliation_status,
        affiliated_university=institution_data.affiliated_university,
        autonomous_status=institution_data.autonomous_status,
        is_constituent_unit=institution_data.is_constituent_unit,
        parent_institution_name=institution_data.parent_institution_name,
        programme_level=institution_data.programme_level,
        existing_naac_status=institution_data.existing_naac_status,
        previous_cycle_number=institution_data.previous_cycle_number,
        application_pathway=institution_data.application_pathway,
        confirmed_framework_id=confirmed_framework_id,
        established_year=institution_data.established_year,
        website=institution_data.website,
        created_by=current_user.id
    )
    if confirmed_framework_id:
        institution.framework_confirmed_by = current_user.id
        institution.framework_confirmed_at = datetime.utcnow()
        institution.framework_confirmation_note = confirmation_note

    db.add(institution)
    db.flush()
    ensure_default_faculty_and_department(db, institution)
    record_audit(
        db,
        user=current_user,
        action="INSTITUTION_CREATE",
        entity_type="Institution",
        entity_id=institution.id,
        new_values={
            "name": institution.name,
            "code": institution.code,
            "official_category": institution.official_category,
            "confirmed_framework_id": institution.confirmed_framework_id,
        },
        institution_id=institution.id,
    )
    db.commit()
    db.refresh(institution)

    return serialize_institution(db, institution)


# --------------------------------------------------
# GET ALL INSTITUTIONS
# --------------------------------------------------

@router.get(
    "",
    response_model=list[InstitutionResponse]
)
def get_institutions(
    current_user: User = Depends(
        require_permission(
            "INSTITUTION_MANAGEMENT",
            "View"
        )
    ),
    db: Session = Depends(get_db)
):

    query = db.query(Institution)

    if not is_platform_admin(db, current_user):
        if not current_user.institution_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not assigned to an institution",
            )

        query = query.filter(
            Institution.id == current_user.institution_id
        )

    institutions = query.order_by(Institution.id).all()

    return [serialize_institution(db, item) for item in institutions]


# --------------------------------------------------
# CURRENT USER INSTITUTION
# --------------------------------------------------

@router.get(
    "/me",
    response_model=InstitutionResponse
)
def get_my_institution(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.institution_id:
        raise HTTPException(
            status_code=404,
            detail="User is not assigned to an institution"
        )

    institution = db.query(Institution).filter(
        Institution.id == current_user.institution_id
    ).first()

    if not institution:
        raise HTTPException(
            status_code=404,
            detail="Institution not found"
        )

    return serialize_institution(db, institution)


# --------------------------------------------------
# GET SINGLE INSTITUTION
# --------------------------------------------------

@router.get(
    "/{institution_id}",
    response_model=InstitutionResponse
)
def get_institution(
    institution_id: int,
    current_user: User = Depends(
        require_permission(
            "INSTITUTION_MANAGEMENT",
            "View"
        )
    ),
    db: Session = Depends(get_db)
):

    institution = db.query(Institution).filter(
        Institution.id == institution_id
    ).first()

    if not institution:
        raise HTTPException(
            status_code=404,
            detail="Institution not found"
        )

    assert_institution_access(
        db,
        current_user,
        institution.id
    )

    return serialize_institution(db, institution)


# --------------------------------------------------
# UPDATE INSTITUTION
# --------------------------------------------------

@router.put(
    "/{institution_id}",
    response_model=InstitutionResponse
)
def update_institution(
    institution_id: int,
    institution_data: InstitutionUpdate,
    current_user: User = Depends(
        require_permission(
            "INSTITUTION_MANAGEMENT",
            "Edit"
        )
    ),
    db: Session = Depends(get_db)
):

    institution = db.query(Institution).filter(
        Institution.id == institution_id
    ).first()

    if not institution:
        raise HTTPException(
            status_code=404,
            detail="Institution not found"
        )

    assert_institution_access(
        db,
        current_user,
        institution.id
    )

    update_data = institution_data.model_dump(
        exclude_unset=True
    )

    if (
        "confirmed_framework_id" in update_data
        and not is_platform_admin(db, current_user)
    ):
        update_data.pop("confirmed_framework_id")

    assert_institution_update_consistent(db, institution, update_data)

    if (
        is_platform_admin(db, current_user)
        and "confirmed_framework_id" not in update_data
        and not institution.confirmed_framework_id
    ):
        merged_profile = institution_profile(institution)
        merged_profile.update({
            key: value
            for key, value in update_data.items()
            if key in merged_profile
        })
        if merged_profile.get("official_category"):
            derived = category_framework_to_confirm(db, merged_profile)
            if derived is not None:
                update_data["confirmed_framework_id"] = derived.id
                update_data["framework_confirmation_note"] = (
                    CATEGORY_CONFIRMATION_NOTE
                )

    if update_data.get("confirmed_framework_id") and (
        update_data["confirmed_framework_id"]
        != institution.confirmed_framework_id
    ):
        institution.framework_confirmed_by = current_user.id
        institution.framework_confirmed_at = datetime.utcnow()

    # Check duplicate code if code is being changed
    if "code" in update_data:

        existing = db.query(Institution).filter(
            Institution.code == update_data["code"],
            Institution.id != institution_id
        ).first()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Institution code already exists"
            )

    old_values = {
        "name": institution.name,
        "code": institution.code,
    }

    for field, value in update_data.items():
        setattr(institution, field, value)

    record_audit(
        db,
        user=current_user,
        action="INSTITUTION_UPDATE",
        entity_type="Institution",
        entity_id=institution.id,
        old_values=old_values,
        new_values=update_data,
        institution_id=institution.id,
    )
    db.commit()
    db.refresh(institution)

    return serialize_institution(db, institution)


# --------------------------------------------------
# DELETE INSTITUTION
# --------------------------------------------------

@router.delete(
    "/{institution_id}"
)
def delete_institution(
    institution_id: int,
    current_user: User = Depends(
        require_permission(
            "INSTITUTION_MANAGEMENT",
            "Delete"
        )
    ),
    db: Session = Depends(get_db)
):
    if not is_platform_admin(db, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform Admin can delete institutions",
        )

    institution = db.query(Institution).filter(
        Institution.id == institution_id
    ).first()

    if not institution:
        raise HTTPException(
            status_code=404,
            detail="Institution not found"
        )

    assert_institution_access(
        db,
        current_user,
        institution.id
    )

    blocking = blocking_institution_relations(
        db,
        institution.id,
    )
    if blocking:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Cannot delete institution while related "
                "records exist: "
                + ", ".join(blocking)
            ),
        )

    delete_audit = record_audit(
        db,
        user=current_user,
        action="INSTITUTION_DELETE",
        entity_type="Institution",
        entity_id=institution.id,
        old_values={"name": institution.name, "code": institution.code},
        institution_id=institution.id,
    )
    # The delete-event audit is not a pre-existing related record.
    # Clear its institution_id so the FK does not block this delete.
    delete_audit.institution_id = None
    db.delete(institution)
    db.commit()

    return {
        "message": "Institution deleted successfully",
        "institution_id": institution_id
    }