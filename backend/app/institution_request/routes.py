from datetime import datetime

from fastapi import (
    APIRouter,
    Body,
    Depends,
    HTTPException,
    status,
)

from sqlalchemy.orm import Session

from app.auth.dependencies import (
    get_current_user,
    require_permission,
    get_db,
)
from app.auth.registration_authority import ADMIN, get_role_name

from app.institution.defaults import (
    ensure_default_faculty_and_department,
)
from app.models import (
    Institution,
    InstitutionRequest,
    NaacFramework,
    User,
)

from app.schemas.institution_request import (
    InstitutionRequestApprove,
    InstitutionRequestCreate,
    InstitutionRequestResponse,
    InstitutionRequestReject,
)
from app.services.audit_service import record_audit
from app.services.framework_service import (
    PROFILE_FIELDS,
    assert_confirmable_framework,
    assert_framework_matches_category,
    copy_profile_fields,
    ensure_naac_frameworks,
    get_framework_or_404,
    institution_profile,
    recommend_framework,
    sanitize_profile_for_category,
    serialize_framework_with_criteria,
)


router = APIRouter(
    prefix="/institution-requests",
    tags=["Institution Requests"],
)


def is_platform_admin(db: Session, user: User) -> bool:
    return get_role_name(db, user.role_id) == ADMIN


def require_platform_admin(db: Session, current_user: User) -> None:
    if not is_platform_admin(db, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform Admin can manage institution requests",
        )


def serialize_institution_request(
    db: Session,
    request: InstitutionRequest,
) -> dict:
    recommended = None
    confirmed = None
    if request.recommended_framework_id:
        framework = (
            db.query(NaacFramework)
            .filter(NaacFramework.id == request.recommended_framework_id)
            .first()
        )
        if framework:
            recommended = serialize_framework_with_criteria(db, framework)
    if request.confirmed_framework_id:
        framework = (
            db.query(NaacFramework)
            .filter(NaacFramework.id == request.confirmed_framework_id)
            .first()
        )
        if framework:
            confirmed = serialize_framework_with_criteria(db, framework)

    payload = InstitutionRequestResponse.model_validate(request).model_dump()
    payload["recommended_framework"] = recommended
    payload["confirmed_framework"] = confirmed
    return payload


# ============================================================
# PUBLIC - REQUEST NEW INSTITUTION
# ============================================================

@router.post(
    "",
    response_model=InstitutionRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_institution_request(
    request: InstitutionRequestCreate,
    db: Session = Depends(get_db),
):
    # --------------------------------------------------------
    # Check if institution already exists
    # --------------------------------------------------------

    existing = (
        db.query(Institution)
        .filter(
            Institution.name.ilike(
                request.institution_name.strip()
            )
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400,
            detail=(
                "This institution already exists. "
                "Please select it from the registration list."
            ),
        )

    # --------------------------------------------------------
    # Check duplicate pending request
    # --------------------------------------------------------

    existing_request = (
        db.query(InstitutionRequest)
        .filter(
            InstitutionRequest.institution_name.ilike(
                request.institution_name.strip()
            ),
            InstitutionRequest.status == "PENDING",
        )
        .first()
    )

    if existing_request:
        raise HTTPException(
            status_code=400,
            detail=(
                "A request for this institution "
                "is already pending."
            ),
        )

    # --------------------------------------------------------
    # Create request
    # --------------------------------------------------------

    institution_request = InstitutionRequest(
        requester_name=request.requester_name.strip(),

        requester_email=str(
            request.requester_email
        ).lower().strip(),

        institution_name=request.institution_name.strip(),

        institution_code=(
            request.institution_code.strip()
            if request.institution_code
            else None
        ),

        official_email=(
            str(request.official_email).lower().strip()
            if request.official_email
            else None
        ),

        address=(
            request.address.strip()
            if request.address
            else None
        ),

        city=(
            request.city.strip()
            if request.city
            else None
        ),

        state=(
            request.state.strip()
            if request.state
            else None
        ),

        pincode=(
            request.pincode.strip()
            if request.pincode
            else None
        ),

        institution_type=(
            request.institution_type.strip()
            if request.institution_type
            else None
        ),

        official_category=(
            request.official_category.strip().upper()
            if request.official_category
            else None
        ),
        affiliation_status=(
            request.affiliation_status.strip()
            if request.affiliation_status
            else None
        ),
        affiliated_university=(
            request.affiliated_university.strip()
            if request.affiliated_university
            else None
        ),
        autonomous_status=(
            request.autonomous_status.strip()
            if request.autonomous_status
            else None
        ),
        is_constituent_unit=request.is_constituent_unit,
        parent_institution_name=(
            request.parent_institution_name.strip()
            if request.parent_institution_name
            else None
        ),
        programme_level=(
            request.programme_level.strip().upper()
            if request.programme_level
            else None
        ),
        existing_naac_status=(
            request.existing_naac_status.strip()
            if request.existing_naac_status
            else None
        ),
        previous_cycle_number=(
            request.previous_cycle_number.strip()
            if request.previous_cycle_number
            else None
        ),
        application_pathway=(
            request.application_pathway.strip()
            if request.application_pathway
            else None
        ),

        website=(
            request.website.strip()
            if request.website
            else None
        ),

        status="PENDING",
    )

    cleaned_profile = sanitize_profile_for_category(
        institution_profile(institution_request)
    )
    for field in PROFILE_FIELDS:
        setattr(institution_request, field, cleaned_profile[field])

    recommendation = recommend_framework(db, cleaned_profile)
    institution_request.recommended_framework_id = recommendation[
        "recommended_framework_id"
    ]
    institution_request.recommendation_status = recommendation[
        "recommendation_status"
    ]
    institution_request.recommendation_reason = recommendation[
        "recommendation_reason"
    ]

    db.add(institution_request)
    db.commit()
    db.refresh(institution_request)

    return serialize_institution_request(db, institution_request)


# ============================================================
# ADMIN - GET REQUESTS
# ============================================================

@router.get(
    "",
    response_model=list[InstitutionRequestResponse],
)
def get_institution_requests(
    current_user: User = Depends(
        require_permission(
            "INSTITUTION_MANAGEMENT",
            "View",
        )
    ),
    db: Session = Depends(get_db),
):
    require_platform_admin(db, current_user)

    requests = (
        db.query(InstitutionRequest)
        .order_by(
            InstitutionRequest.created_at.desc()
        )
        .all()
    )

    return [
        serialize_institution_request(db, item)
        for item in requests
    ]


# ============================================================
# ADMIN - GET SINGLE REQUEST
# ============================================================

@router.get(
    "/{request_id}",
    response_model=InstitutionRequestResponse,
)
def get_institution_request(
    request_id: int,
    current_user: User = Depends(
        require_permission(
            "INSTITUTION_MANAGEMENT",
            "View",
        )
    ),
    db: Session = Depends(get_db),
):
    require_platform_admin(db, current_user)

    request = (
        db.query(InstitutionRequest)
        .filter(
            InstitutionRequest.id == request_id
        )
        .first()
    )

    if not request:
        raise HTTPException(
            status_code=404,
            detail="Institution request not found.",
        )

    return serialize_institution_request(db, request)


# ============================================================
# ADMIN - APPROVE REQUEST
# ============================================================

@router.post(
    "/{request_id}/approve",
    response_model=InstitutionRequestResponse,
)
def approve_institution_request(
    request_id: int,
    payload: InstitutionRequestApprove | None = Body(default=None),
    current_user: User = Depends(
        require_permission(
            "INSTITUTION_MANAGEMENT",
            "Create",
        )
    ),
    db: Session = Depends(get_db),
):
    require_platform_admin(db, current_user)

    request = (
        db.query(InstitutionRequest)
        .filter(
            InstitutionRequest.id == request_id
        )
        .first()
    )

    if not request:
        raise HTTPException(
            status_code=404,
            detail="Institution request not found.",
        )

    if request.status != "PENDING":
        raise HTTPException(
            status_code=400,
            detail=(
                "Only pending institution requests "
                "can be approved."
            ),
        )

    # --------------------------------------------------------
    # Check duplicate institution name
    # --------------------------------------------------------

    existing_name = (
        db.query(Institution)
        .filter(
            Institution.name.ilike(
                request.institution_name
            )
        )
        .first()
    )

    if existing_name:
        raise HTTPException(
            status_code=400,
            detail=(
                "An institution with this name "
                "already exists."
            ),
        )

    # --------------------------------------------------------
    # Generate code if requester did not provide one
    # --------------------------------------------------------

    institution_code = request.institution_code

    if institution_code:
        existing_code = (
            db.query(Institution)
            .filter(
                Institution.code
                == institution_code
            )
            .first()
        )

        if existing_code:
            raise HTTPException(
                status_code=400,
                detail=(
                    "The requested institution code "
                    "already exists."
                ),
            )

    else:
        base_code = "INST"
        counter = 1

        institution_code = (
            f"{base_code}-{request.id:04d}"
        )

        while (
            db.query(Institution)
            .filter(
                Institution.code
                == institution_code
            )
            .first()
        ):
            counter += 1

            institution_code = (
                f"{base_code}-{request.id:04d}-{counter}"
            )

    # --------------------------------------------------------
    # Create institution
    # --------------------------------------------------------

    approval = payload or InstitutionRequestApprove()
    ensure_naac_frameworks(db)
    confirmed_framework_id = approval.confirmed_framework_id
    override_reason = (
        approval.override_reason.strip()
        if approval.override_reason
        else None
    )

    if confirmed_framework_id is None:
        confirmed_framework_id = request.recommended_framework_id

    confirmed_framework = None
    if confirmed_framework_id:
        confirmed_framework = get_framework_or_404(db, confirmed_framework_id)
        assert_confirmable_framework(confirmed_framework)
        # An override reason is recorded but never bypasses category mapping.
        assert_framework_matches_category(
            sanitize_profile_for_category(institution_profile(request)),
            confirmed_framework,
        )

    institution = Institution(
        name=request.institution_name,
        code=institution_code,
        address=request.address,
        city=request.city,
        state=request.state,
        pincode=request.pincode,
        institution_type=request.institution_type,
        website=request.website,
        created_by=current_user.id,
        confirmed_framework_id=(
            confirmed_framework.id if confirmed_framework else None
        ),
        framework_confirmed_by=(
            current_user.id if confirmed_framework else None
        ),
        framework_confirmed_at=(
            datetime.utcnow() if confirmed_framework else None
        ),
        framework_confirmation_note=override_reason,
    )
    copy_profile_fields(request, institution)

    db.add(institution)
    db.flush()
    ensure_default_faculty_and_department(db, institution)

    # --------------------------------------------------------
    # Update request
    # --------------------------------------------------------

    request.status = "APPROVED"

    request.reviewed_by = current_user.id

    request.reviewed_at = datetime.utcnow()

    request.created_institution_id = institution.id

    request.rejection_reason = None
    request.confirmed_framework_id = (
        confirmed_framework.id if confirmed_framework else None
    )
    request.framework_override_reason = override_reason

    record_audit(
        db,
        user=current_user,
        action="INSTITUTION_FRAMEWORK_CONFIRM",
        entity_type="Institution",
        entity_id=institution.id,
        new_values={
            "confirmed_framework_id": request.confirmed_framework_id,
            "recommendation_status": request.recommendation_status,
            "override_reason": override_reason,
        },
        institution_id=institution.id,
    )

    db.commit()
    db.refresh(request)

    return serialize_institution_request(db, request)


# ============================================================
# ADMIN - REJECT REQUEST
# ============================================================

@router.post(
    "/{request_id}/reject",
    response_model=InstitutionRequestResponse,
)
def reject_institution_request(
    request_id: int,
    rejection: InstitutionRequestReject,
    current_user: User = Depends(
        require_permission(
            "INSTITUTION_MANAGEMENT",
            "Create",
        )
    ),
    db: Session = Depends(get_db),
):
    require_platform_admin(db, current_user)

    request = (
        db.query(InstitutionRequest)
        .filter(
            InstitutionRequest.id == request_id
        )
        .first()
    )

    if not request:
        raise HTTPException(
            status_code=404,
            detail="Institution request not found.",
        )

    if request.status != "PENDING":
        raise HTTPException(
            status_code=400,
            detail=(
                "Only pending institution requests "
                "can be rejected."
            ),
        )

    request.status = "REJECTED"

    request.reviewed_by = current_user.id

    request.reviewed_at = datetime.utcnow()

    request.rejection_reason = (
        rejection.reason.strip()
    )

    db.commit()
    db.refresh(request)

    return serialize_institution_request(db, request)


