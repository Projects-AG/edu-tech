from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import User, Role, RegistrationRequest


# ============================================================
# EXISTING PROJECT ROLE NAMES
# DO NOT CHANGE THESE NAMES
# ============================================================

ADMIN = "Admin"
NAAC_COORDINATOR = "NAAC Coordinator"
COMMITTEE_MEMBER = "Committee Member"
DEPT_COORDINATOR = "Dept. Coordinator"
REVIEWER = "Reviewer"
DATA_APPROVER = "Data Approver"
PRINCIPAL_DIRECTOR = "Principal / Director"


# ============================================================
# REGISTRATION AUTHORITY HIERARCHY
#
# applicant role -> approving role
#
# Keep existing project role names.
# ============================================================

REGISTRATION_AUTHORITY = {

    # Faculty / Staff
    COMMITTEE_MEMBER: DEPT_COORDINATOR,

    # Department HOD
    DEPT_COORDINATOR: NAAC_COORDINATOR,

    # IQAC Coordinator
    NAAC_COORDINATOR: PRINCIPAL_DIRECTOR,

    # Institution Admin
    PRINCIPAL_DIRECTOR: ADMIN,

    # External accreditation roles
    REVIEWER: ADMIN,

    DATA_APPROVER: ADMIN,
}


# ============================================================
# GET ROLE NAME
# ============================================================

def get_role_name(
    db: Session,
    role_id: int | None,
) -> str | None:

    if not role_id:
        return None

    role = (
        db.query(Role)
        .filter(Role.id == role_id)
        .first()
    )

    if not role:
        return None

    return role.name


# ============================================================
# GET REQUIRED APPROVER ROLE
# ============================================================

def get_required_approver_role(
    db: Session,
    requested_role_id: int,
) -> Role | None:

    requested_role_name = get_role_name(
        db,
        requested_role_id,
    )

    if not requested_role_name:
        return None

    approver_role_name = REGISTRATION_AUTHORITY.get(
        requested_role_name
    )

    if not approver_role_name:
        return None

    return (
        db.query(Role)
        .filter(
            Role.name == approver_role_name
        )
        .first()
    )


# ============================================================
# GET REQUIRED APPROVER NAME
# ============================================================

def get_required_approver_name(
    db: Session,
    requested_role_id: int,
) -> str | None:

    role = get_required_approver_role(
        db,
        requested_role_id,
    )

    if not role:
        return None

    return role.name


# ============================================================
# VALIDATE WHETHER CURRENT USER CAN APPROVE
# ============================================================

def validate_registration_approval(
    db: Session,
    registration_request: RegistrationRequest,
    current_user: User,
):
    """
    Checks whether the currently logged-in user is the
    correct authority for this registration request.
    """

    requested_role_id = (
        registration_request.requested_role_id
    )

    if not requested_role_id:
        raise HTTPException(
            status_code=400,
            detail=(
                "Registration request does not have "
                "a requested role."
            ),
        )

    requested_role_name = get_role_name(
        db,
        requested_role_id,
    )

    if not requested_role_name:
        raise HTTPException(
            status_code=400,
            detail="Requested role was not found.",
        )

    required_approver_name = REGISTRATION_AUTHORITY.get(
        requested_role_name
    )

    if not required_approver_name:
        raise HTTPException(
            status_code=403,
            detail=(
                f"No registration authority is configured "
                f"for {requested_role_name}."
            ),
        )

    current_role_name = get_role_name(
        db,
        current_user.role_id,
    )

    if current_role_name != required_approver_name:
        raise HTTPException(
            status_code=403,
            detail=(
                f"Only {required_approver_name} can authorize "
                f"{requested_role_name} registrations."
            ),
        )

    # ========================================================
    # ADMIN
    #
    # Admin is the top-level NAAC authority.
    # Admin can approve institution-level and external roles.
    # ========================================================

    if current_role_name == ADMIN:
        return True

    # ========================================================
    # INSTITUTION / DEPARTMENT SCOPING
    # ========================================================

    if (
        registration_request.institution_id
        and current_user.institution_id
        and
        registration_request.institution_id
        != current_user.institution_id
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "You can only authorize registrations "
                "belonging to your institution."
            ),
        )

    # ========================================================
    # DEPARTMENT HOD
    #
    # Committee Member -> Dept. Coordinator
    #
    # HOD can authorize faculty/staff from their department.
    # ========================================================

    if current_role_name == DEPT_COORDINATOR:

        if not current_user.department_id:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Department Coordinator is not assigned "
                    "to a department."
                ),
            )

        if (
            registration_request.department_id
            != current_user.department_id
        ):
            raise HTTPException(
                status_code=403,
                detail=(
                    "You can only authorize faculty/staff "
                    "from your department."
                ),
            )

    # ========================================================
    # IQAC COORDINATOR
    #
    # Dept. Coordinator -> NAAC Coordinator
    #
    # Coordinator can authorize HOD registrations
    # belonging to the same institution.
    # ========================================================

    elif current_role_name == NAAC_COORDINATOR:

        if not current_user.institution_id:
            raise HTTPException(
                status_code=403,
                detail=(
                    "NAAC Coordinator is not assigned "
                    "to an institution."
                ),
            )

        if (
            registration_request.institution_id
            != current_user.institution_id
        ):
            raise HTTPException(
                status_code=403,
                detail=(
                    "You can only authorize registrations "
                    "from your institution."
                ),
            )

    # ========================================================
    # PRINCIPAL / DIRECTOR
    #
    # NAAC Coordinator -> Principal / Director
    #
    # Institution-level authority.
    # ========================================================

    elif current_role_name == PRINCIPAL_DIRECTOR:

        if not current_user.institution_id:
            raise HTTPException(
                status_code=403,
                detail=(
                    "Principal / Director is not assigned "
                    "to an institution."
                ),
            )

        if (
            registration_request.institution_id
            != current_user.institution_id
        ):
            raise HTTPException(
                status_code=403,
                detail=(
                    "You can only authorize registrations "
                    "from your institution."
                ),
            )

    return True


# ============================================================
# GET REGISTRATION REQUESTS VISIBLE TO CURRENT USER
# ============================================================

def get_authorized_registration_requests(
    db: Session,
    current_user: User,
):
    """
    Returns only registration requests that the logged-in
    authority is allowed to process.
    """

    current_role_name = get_role_name(
        db,
        current_user.role_id,
    )

    if not current_role_name:
        return []

    # ========================================================
    # ADMIN
    #
    # Admin can see all registration requests.
    # ========================================================

    if current_role_name == ADMIN:

        return (
            db.query(RegistrationRequest)
            .order_by(
                RegistrationRequest.created_at.desc()
            )
            .all()
        )

    # ========================================================
    # FIND WHICH APPLICANT ROLE THIS AUTHORITY CAN APPROVE
    # ========================================================

    applicant_role_names = [
        applicant_role
        for applicant_role, approver_role
        in REGISTRATION_AUTHORITY.items()
        if approver_role == current_role_name
    ]

    if not applicant_role_names:
        return []

    applicant_roles = (
        db.query(Role)
        .filter(
            Role.name.in_(applicant_role_names)
        )
        .all()
    )

    applicant_role_ids = [
        role.id
        for role in applicant_roles
    ]

    if not applicant_role_ids:
        return []

    query = (
        db.query(RegistrationRequest)
        .filter(
            RegistrationRequest.requested_role_id.in_(
                applicant_role_ids
            ),
            RegistrationRequest.status == "PENDING",
        )
    )

    # ========================================================
    # INSTITUTION SCOPE
    # ========================================================

    if current_user.institution_id:

        query = query.filter(
            RegistrationRequest.institution_id
            == current_user.institution_id
        )

    # ========================================================
    # DEPARTMENT SCOPE FOR HOD
    # ========================================================

    if current_role_name == DEPT_COORDINATOR:

        if not current_user.department_id:
            return []

        query = query.filter(
            RegistrationRequest.department_id
            == current_user.department_id
        )

    return (
        query
        .order_by(
            RegistrationRequest.created_at.desc()
        )
        .all()
    )