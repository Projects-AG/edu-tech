from datetime import datetime

from fastapi import (
    APIRouter,
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

from app.models import (
    Institution,
    InstitutionRequest,
    User,
)

from app.schemas.institution_request import (
    InstitutionRequestCreate,
    InstitutionRequestResponse,
    InstitutionRequestReject,
)


router = APIRouter(
    prefix="/institution-requests",
    tags=["Institution Requests"],
)


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

        website=(
            request.website.strip()
            if request.website
            else None
        ),

        status="PENDING",
    )

    db.add(institution_request)
    db.commit()
    db.refresh(institution_request)

    return institution_request


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
    requests = (
        db.query(InstitutionRequest)
        .order_by(
            InstitutionRequest.created_at.desc()
        )
        .all()
    )

    return requests


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

    return request


# ============================================================
# ADMIN - APPROVE REQUEST
# ============================================================

@router.post(
    "/{request_id}/approve",
    response_model=InstitutionRequestResponse,
)
def approve_institution_request(
    request_id: int,
    current_user: User = Depends(
        require_permission(
            "INSTITUTION_MANAGEMENT",
            "Create",
        )
    ),
    db: Session = Depends(get_db),
):
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
    )

    db.add(institution)
    db.flush()

    # --------------------------------------------------------
    # Update request
    # --------------------------------------------------------

    request.status = "APPROVED"

    request.reviewed_by = current_user.id

    request.reviewed_at = datetime.utcnow()

    request.created_institution_id = institution.id

    request.rejection_reason = None

    db.commit()
    db.refresh(request)

    return request


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

    return request


