from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import SessionLocal

from app.models import (
    User,
    Role,
    Module,
    Permission,
    RoleModulePermission,
    Institution,
    Faculty,
    Department,
    RegistrationRequest,
)

from app.schemas.auth import LoginRequest
from app.schemas.registration import (
    RegistrationRequestCreate,
    RegistrationRequestResponse,
)

from app.auth.security import (
    verify_password,
    create_access_token,
    hash_password,
)

from app.auth.dependencies import get_current_user


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# ============================================================
# DATABASE
# ============================================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ============================================================
# ROLE NAMES
#
# DO NOT RENAME THESE.
# These are the actual database role names.
# ============================================================

ADMIN_ROLE = "Admin"

INSTITUTION_ADMIN_ROLE = "Institution Admin"

NAAC_COORDINATOR_ROLE = "NAAC Coordinator"

COMMITTEE_MEMBER_ROLE = "Committee Member"

DEPT_COORDINATOR_ROLE = "Dept. Coordinator"

REVIEWER_ROLE = "Reviewer"

DATA_APPROVER_ROLE = "Data Approver"

PRINCIPAL_DIRECTOR_ROLE = "Principal / Director"


# ============================================================
# REGISTRATION AUTHORITY HIERARCHY
#
# Applicant Role
#       ↓
# Required Approver
#
# Existing project hierarchy is preserved.
#
# Institution Admin is an institution-management role.
# It is NOT publicly selectable.
#
# The first Institution Admin should be assigned by the
# authorized institutional/platform flow.
# ============================================================

REGISTRATION_AUTHORITY = {

    # Faculty / Staff
    COMMITTEE_MEMBER_ROLE:
        DEPT_COORDINATOR_ROLE,

    # Department HOD
    DEPT_COORDINATOR_ROLE:
        NAAC_COORDINATOR_ROLE,

    # IQAC / NAAC Coordinator
    NAAC_COORDINATOR_ROLE:
        PRINCIPAL_DIRECTOR_ROLE,

    # Principal / Director
    PRINCIPAL_DIRECTOR_ROLE:
        ADMIN_ROLE,

    # External accreditation roles
    REVIEWER_ROLE:
        ADMIN_ROLE,

    DATA_APPROVER_ROLE:
        ADMIN_ROLE,
}


# ============================================================
# PUBLIC REGISTRATION ROLES
#
# Admin and Institution Admin are NOT publicly selectable.
# ============================================================

PUBLIC_REGISTRATION_ROLES = {
    NAAC_COORDINATOR_ROLE,
    COMMITTEE_MEMBER_ROLE,
    DEPT_COORDINATOR_ROLE,
    REVIEWER_ROLE,
    DATA_APPROVER_ROLE,
    PRINCIPAL_DIRECTOR_ROLE,
}


# ============================================================
# ROLE NORMALIZATION
#
# Used only for comparing the role selected on the login
# screen with the actual role stored in the database.
#
# IMPORTANT:
# Institution Admin MUST be checked separately before Admin.
# Otherwise "Institution Admin" contains "Admin" and could
# accidentally be treated as the platform Admin role.
# ============================================================

def normalize_role(role_name):

    if not role_name:
        return ""

    clean = (
        str(role_name)
        .strip()
        .lower()
    )

    clean = (
        clean
        .replace(".", "")
        .replace("/", "")
        .replace("_", "")
        .replace("-", "")
        .replace(" ", "")
    )

    # --------------------------------------------------------
    # Institution Admin
    # --------------------------------------------------------

    if clean in [
        "institutionadmin",
        "institutionadministrator",
    ]:
        return "institutionadmin"

    # --------------------------------------------------------
    # Platform Admin
    # --------------------------------------------------------

    if clean in [
        "admin",
        "platformadmin",
        "platformadministrator",
    ]:
        return "admin"

    # --------------------------------------------------------
    # Department Coordinator
    # --------------------------------------------------------

    if clean in [
        "departmentcoordinator",
        "deptcoordinator",
    ]:
        return "deptcoordinator"

    # --------------------------------------------------------
    # Principal / Director
    # --------------------------------------------------------

    if clean in [
        "principaldirector",
        "principal",
        "director",
    ]:
        return "principaldirector"

    # --------------------------------------------------------
    # NAAC Coordinator
    # --------------------------------------------------------

    if clean in [
        "naaccoordinator",
        "coordinator",
    ]:
        return "naaccoordinator"

    # --------------------------------------------------------
    # Committee Member
    # --------------------------------------------------------

    if clean in [
        "committeemember",
        "facultystaff",
        "facultystaffmember",
    ]:
        return "committeemember"

    # --------------------------------------------------------
    # Data Approver
    # --------------------------------------------------------

    if clean in [
        "dataapprover",
        "dataapproval",
    ]:
        return "dataapprover"

    # --------------------------------------------------------
    # Reviewer
    # --------------------------------------------------------

    if clean in [
        "reviewer",
        "peerteam",
        "dwreviewer",
    ]:
        return "reviewer"

    return clean


# ============================================================
# GET ROLE BY ID
# ============================================================

def get_role_by_id(
    db: Session,
    role_id: int | None,
):

    if not role_id:
        return None

    return (
        db.query(Role)
        .filter(
            Role.id == role_id
        )
        .first()
    )


# ============================================================
# GET ROLE NAME
# ============================================================

def get_role_name(
    db: Session,
    role_id: int | None,
):

    role = get_role_by_id(
        db,
        role_id,
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
):

    requested_role = get_role_by_id(
        db,
        requested_role_id,
    )

    if not requested_role:
        return None

    approver_role_name = REGISTRATION_AUTHORITY.get(
        requested_role.name
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
):

    approver_role = get_required_approver_role(
        db,
        requested_role_id,
    )

    if not approver_role:
        return None

    return approver_role.name


# ============================================================
# LOGIN
# ============================================================

@router.post("/login")
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # Find user
    # --------------------------------------------------------

    user = (
        db.query(User)
        .filter(
            User.email == login_data.email
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # --------------------------------------------------------
    # Check active account
    # --------------------------------------------------------

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    # --------------------------------------------------------
    # Verify password
    # --------------------------------------------------------

    if not verify_password(
        login_data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # --------------------------------------------------------
    # Get actual role from database
    # --------------------------------------------------------

    role = (
        db.query(Role)
        .filter(
            Role.id == user.role_id
        )
        .first()
    )

    if not role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User role not found"
        )

    actual_role_name = role.name

    # --------------------------------------------------------
    # Validate selected role
    # --------------------------------------------------------

    if login_data.role:

        selected_role = normalize_role(
            login_data.role
        )

        actual_role = normalize_role(
            actual_role_name
        )

        if selected_role != actual_role:

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=(
                    "Selected role does not match "
                    "your account role."
                )
            )

    # --------------------------------------------------------
    # Create JWT
    # --------------------------------------------------------

    access_token = create_access_token({

        "user_id": user.id,

        "email": user.email,

        "role": actual_role_name,

        "role_id": user.role_id,

        "institution_id": user.institution_id,

        "faculty_id": user.faculty_id,

        "department_id": user.department_id,
    })

    # --------------------------------------------------------
    # Login response
    # --------------------------------------------------------

    return {

        "message": "Login successful",

        "access_token": access_token,

        "token_type": "bearer",

        "user": {

            "id": user.id,

            "name": user.name,

            "email": user.email,

            "role": actual_role_name,

            "role_id": user.role_id,

            "institution_id": user.institution_id,

            "faculty_id": user.faculty_id,

            "department_id": user.department_id,

            "is_active": user.is_active,
        }
    }


# ============================================================
# CURRENT USER
# ============================================================

@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # Get user's role
    # --------------------------------------------------------

    role = (
        db.query(Role)
        .filter(
            Role.id == current_user.role_id
        )
        .first()
    )

    if not role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User role not found"
        )

    # --------------------------------------------------------
    # Get role permissions
    # --------------------------------------------------------

    role_permissions = (

        db.query(
            Module,
            Permission,
            RoleModulePermission
        )

        .join(
            RoleModulePermission,
            RoleModulePermission.module_id
            == Module.id
        )

        .join(
            Permission,
            Permission.id
            == RoleModulePermission.permission_id
        )

        .filter(
            RoleModulePermission.role_id
            == role.id,

            RoleModulePermission.allowed
            == True
        )

        .all()
    )

    # --------------------------------------------------------
    # Organize permissions module-wise
    # --------------------------------------------------------

    permissions_by_module = {}

    for (
        module,
        permission,
        mapping
    ) in role_permissions:

        if module.code not in permissions_by_module:

            permissions_by_module[
                module.code
            ] = {

                "module_id": module.id,

                "module_name": module.name,

                "module_code": module.code,

                "permissions": []
            }

        permissions_by_module[
            module.code
        ][
            "permissions"
        ].append(
            permission.name
        )

    # --------------------------------------------------------
    # Return authenticated user
    # --------------------------------------------------------

    return {

        "user": {

            "id": current_user.id,

            "name": current_user.name,

            "email": current_user.email,

            "institution_id":
                current_user.institution_id,

            "faculty_id":
                current_user.faculty_id,

            "department_id":
                current_user.department_id,

            "is_active":
                current_user.is_active
        },

        "role": {

            "id": role.id,

            "name": role.name,

            "description": role.description
        },

        "permissions":
            list(
                permissions_by_module.values()
            )
    }


# ============================================================
# GET INSTITUTIONS
#
# Public endpoint used by registration page.
# ============================================================

@router.get("/institutions")
def get_registration_institutions(
    db: Session = Depends(get_db)
):

    institutions = (
        db.query(Institution)
        .order_by(Institution.id)
        .all()
    )

    return [
        {
            "id": institution.id,
            "name": institution.name,
            "code": institution.code,
            "city": institution.city,
            "state": institution.state,
            "institution_type":
                institution.institution_type,
            "established_year":
                institution.established_year,
            "website":
                institution.website,
        }
        for institution in institutions
    ]


# ============================================================
# GET FACULTIES
#
# Public endpoint used by registration page.
# ============================================================

@router.get("/faculties")
def get_registration_faculties(
    institution_id: int | None = None,
    db: Session = Depends(get_db)
):

    query = db.query(Faculty)

    if institution_id is not None:

        query = query.filter(
            Faculty.institution_id
            == institution_id
        )

    faculties = (
        query
        .order_by(Faculty.id)
        .all()
    )

    return [
        {
            "id": faculty.id,

            "institution_id":
                faculty.institution_id,

            "name": faculty.name,

            "code": faculty.code,

            "dean_name":
                faculty.dean_name,
        }
        for faculty in faculties
    ]


# ============================================================
# GET DEPARTMENTS
#
# Public endpoint used by registration page.
# ============================================================

@router.get("/departments")
def get_registration_departments(
    institution_id: int | None = None,
    faculty_id: int | None = None,
    db: Session = Depends(get_db)
):

    query = db.query(Department)

    if institution_id is not None:

        query = query.filter(
            Department.institution_id
            == institution_id
        )

    if faculty_id is not None:

        query = query.filter(
            Department.faculty_id
            == faculty_id
        )

    departments = (
        query
        .order_by(Department.id)
        .all()
    )

    return [
        {
            "id": department.id,

            "institution_id":
                department.institution_id,

            "faculty_id":
                department.faculty_id,

            "name":
                department.name,

            "code":
                department.code,

            "head_name":
                department.head_name,
        }
        for department in departments
    ]


# ============================================================
# PUBLIC REGISTRATION
#
# Applicant submits a registration request.
#
# IMPORTANT:
# User is NOT created here.
#
# Request goes to the correct authority.
# ============================================================

@router.post(
    "/register",
    response_model=RegistrationRequestResponse
)
def register(
    registration_data: RegistrationRequestCreate,
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # Validate requested role
    # --------------------------------------------------------

    requested_role = (
        db.query(Role)
        .filter(
            Role.id
            == registration_data.role_id
        )
        .first()
    )

    if not requested_role:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected role was not found."
        )

    # --------------------------------------------------------
    # Admin cannot be requested publicly
    # --------------------------------------------------------

    if requested_role.name == ADMIN_ROLE:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Admin accounts cannot be created "
                "through public registration."
            )
        )

    # --------------------------------------------------------
    # Institution Admin cannot be requested publicly
    #
    # Institution Admin is assigned through the
    # institution-management workflow.
    # --------------------------------------------------------

    if requested_role.name == INSTITUTION_ADMIN_ROLE:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Institution Admin accounts cannot be "
                "created through public registration."
            )
        )

    # --------------------------------------------------------
    # Make sure role is allowed for registration
    # --------------------------------------------------------

    if (
        requested_role.name
        not in PUBLIC_REGISTRATION_ROLES
    ):

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "The selected role is not available "
                "for public registration."
            )
        )

    # --------------------------------------------------------
    # Find next authority
    # --------------------------------------------------------

    approver_role_name = (
        REGISTRATION_AUTHORITY.get(
            requested_role.name
        )
    )

    if not approver_role_name:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "No registration authority is "
                "configured for this role."
            )
        )

    # --------------------------------------------------------
    # Verify institution
    # --------------------------------------------------------

    institution = (
        db.query(Institution)
        .filter(
            Institution.id
            == registration_data.institution_id
        )
        .first()
    )

    if not institution:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Institution not found."
        )

    # --------------------------------------------------------
    # Verify department
    # --------------------------------------------------------

    department = (
        db.query(Department)
        .filter(
            Department.id
            == registration_data.department_id
        )
        .first()
    )

    if not department:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department not found."
        )

    # --------------------------------------------------------
    # Department must belong to institution
    # --------------------------------------------------------

    if (
        department.institution_id
        != registration_data.institution_id
    ):

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Selected department does not belong "
                "to the selected institution."
            )
        )

    # --------------------------------------------------------
    # Check duplicate active user
    # --------------------------------------------------------

    existing_user = (
        db.query(User)
        .filter(
            User.email
            == registration_data.email
        )
        .first()
    )

    if existing_user:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "A user with this email "
                "already exists."
            )
        )

    # --------------------------------------------------------
    # Check duplicate pending request
    # --------------------------------------------------------

    existing_request = (
        db.query(RegistrationRequest)
        .filter(
            RegistrationRequest.email
            == registration_data.email,

            RegistrationRequest.status
            == "PENDING"
        )
        .first()
    )

    if existing_request:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "A pending registration request "
                "already exists for this email."
            )
        )

    # --------------------------------------------------------
    # Create registration request
    #
    # Faculty is derived from Department.faculty_id.
    # --------------------------------------------------------

    registration_request = RegistrationRequest(

        full_name=
            registration_data.full_name,

        email=
            registration_data.email,

        institution=
            institution.name,

        institution_id=
            institution.id,

        department=
            department.name,

        department_id=
            department.id,

        designation=
            registration_data.designation,

        password_hash=
            hash_password(
                registration_data.password
            ),

        requested_role_id=
            requested_role.id,

        assigned_role_id=
            None,

        status=
            "PENDING",

        reviewed_by=
            None,

        reviewed_at=
            None,

        rejection_reason=
            None,
    )

    db.add(
        registration_request
    )

    # --------------------------------------------------------
    # Commit safely
    # --------------------------------------------------------

    try:

        db.commit()

        db.refresh(
            registration_request
        )

    except Exception:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Failed to create registration request."
            )
        )

    # --------------------------------------------------------
    # Response
    # --------------------------------------------------------

    return RegistrationRequestResponse(

        message=(
            "Registration request submitted "
            "successfully."
        ),

        request_id=
            registration_request.id,

        status=
            registration_request.status,

        next_authority=
            approver_role_name,
    )