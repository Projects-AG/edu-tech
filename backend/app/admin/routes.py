from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_db, get_current_user, require_permission
from app.auth.security import hash_password

from app.auth.registration_authority import (
    get_role_name,
    get_authorized_registration_requests,
    validate_registration_approval,
)

from app.models import (
    User,
    Role,
    Module,
    Permission,
    RoleModulePermission,
    Institution,
    Faculty,
    Department,
    AccreditationCycle,
    RegistrationRequest,
)

from app.schemas.admin import (
    AdminUserCreate,
    AdminUserUpdate,
    RegistrationApprovalRequest,
    RegistrationRejectionRequest,
)


# ============================================================
# ADMIN ROUTER
# ============================================================

router = APIRouter(
    prefix="/admin",
    tags=["Admin"]
)


# ============================================================
# ROLE NAMES
# ============================================================

ADMIN_ROLE = "Admin"
NAAC_COORDINATOR_ROLE = "NAAC Coordinator"
COMMITTEE_MEMBER_ROLE = "Committee Member"
DEPT_COORDINATOR_ROLE = "Dept. Coordinator"
REVIEWER_ROLE = "Reviewer"
DATA_APPROVER_ROLE = "Data Approver"
PRINCIPAL_DIRECTOR_ROLE = "Principal / Director"


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def get_role(
    db: Session,
    role_id: int | None
):
    if not role_id:
        return None

    return (
        db.query(Role)
        .filter(Role.id == role_id)
        .first()
    )


def get_institution(
    db: Session,
    institution_id: int | None
):
    if not institution_id:
        return None

    return (
        db.query(Institution)
        .filter(Institution.id == institution_id)
        .first()
    )


def get_department(
    db: Session,
    department_id: int | None
):
    if not department_id:
        return None

    return (
        db.query(Department)
        .filter(Department.id == department_id)
        .first()
    )


def get_faculty(
    db: Session,
    faculty_id: int | None
):
    if not faculty_id:
        return None

    return (
        db.query(Faculty)
        .filter(Faculty.id == faculty_id)
        .first()
    )


def get_faculty_from_department(
    db: Session,
    department_id: int | None
):
    department = get_department(
        db,
        department_id
    )

    if not department or not department.faculty_id:
        return None

    return get_faculty(
        db,
        department.faculty_id
    )


def validate_user_hierarchy(
    db: Session,
    institution_id: int | None,
    faculty_id: int | None,
    department_id: int | None,
):
    """
    Validates:

    Institution
        ↓
    Faculty
        ↓
    Department
    """

    institution = None
    faculty = None
    department = None

    # --------------------------------------------------------
    # Institution
    # --------------------------------------------------------

    if institution_id is not None:

        institution = get_institution(
            db,
            institution_id
        )

        if not institution:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Institution not found"
            )

    # --------------------------------------------------------
    # Faculty
    # --------------------------------------------------------

    if faculty_id is not None:

        faculty = get_faculty(
            db,
            faculty_id
        )

        if not faculty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Faculty not found"
            )

        if (
            institution_id is not None
            and faculty.institution_id != institution_id
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Selected faculty does not belong "
                    "to the selected institution."
                )
            )

    # --------------------------------------------------------
    # Department
    # --------------------------------------------------------

    if department_id is not None:

        department = get_department(
            db,
            department_id
        )

        if not department:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found"
            )

        if (
            institution_id is not None
            and department.institution_id != institution_id
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Selected department does not belong "
                    "to the selected institution."
                )
            )

        # ----------------------------------------------------
        # Department → Faculty
        # ----------------------------------------------------

        if department.faculty_id:

            if (
                faculty_id is not None
                and department.faculty_id != faculty_id
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Selected department does not belong "
                        "to the selected faculty."
                    )
                )

    return institution, faculty, department


# ============================================================
# ADMIN DASHBOARD
# ============================================================

@router.get("/dashboard")
def admin_dashboard(
    current_user: User = Depends(
        require_permission("USER_MANAGEMENT", "View")
    ),
    db: Session = Depends(get_db)
):

    total_users = (
        db.query(User)
        .count()
    )

    active_users = (
        db.query(User)
        .filter(
            User.is_active == True
        )
        .count()
    )

    total_roles = (
        db.query(Role)
        .count()
    )

    total_modules = (
        db.query(Module)
        .count()
    )

    total_permissions = (
        db.query(Permission)
        .count()
    )

    total_institutions = (
        db.query(Institution)
        .count()
    )

    total_cycles = (
        db.query(AccreditationCycle)
        .count()
    )

    pending_requests = (
        db.query(RegistrationRequest)
        .filter(
            RegistrationRequest.status == "PENDING"
        )
        .count()
    )

    return {

        "message": "Admin dashboard data",

        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
        },

        "statistics": {

            "total_users": total_users,

            "active_users": active_users,

            "total_roles": total_roles,

            "total_modules": total_modules,

            "total_permissions":
                total_permissions,

            "total_institutions":
                total_institutions,

            "total_accreditation_cycles":
                total_cycles,

            "pending_registration_requests":
                pending_requests,
        }
    }


# ============================================================
# GET ALL USERS
# ============================================================

@router.get("/users")
def get_users(
    current_user: User = Depends(
        require_permission("USER_MANAGEMENT", "View")
    ),
    db: Session = Depends(get_db)
):

    users = (
        db.query(User)
        .order_by(User.id)
        .all()
    )

    result = []

    for user in users:

        role = get_role(
            db,
            user.role_id
        )

        institution = get_institution(
            db,
            user.institution_id
        )

        department = get_department(
            db,
            user.department_id
        )

        faculty = get_faculty(
            db,
            user.faculty_id
        )

        result.append({

            "id": user.id,

            "name": user.name,

            "email": user.email,

            "role_id": user.role_id,

            "role": (
                role.name
                if role
                else None
            ),

            "role_name": (
                role.name
                if role
                else None
            ),

            "institution_id":
                user.institution_id,

            "institution":
                institution.name
                if institution
                else None,

            "institution_name":
                institution.name
                if institution
                else None,

            "faculty_id":
                user.faculty_id,

            "faculty":
                faculty.name
                if faculty
                else None,

            "faculty_name":
                faculty.name
                if faculty
                else None,

            "department_id":
                user.department_id,

            "department":
                department.name
                if department
                else None,

            "department_name":
                department.name
                if department
                else None,

            "is_active":
                user.is_active,
        })

    return result


# ============================================================
# CREATE USER
# ============================================================

@router.post(
    "/users",
    status_code=status.HTTP_201_CREATED
)
def create_user(
    user_data: AdminUserCreate,
    current_user: User = Depends(
        require_permission("USER_MANAGEMENT", "Create")
    ),
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # Duplicate email
    # --------------------------------------------------------

    existing_user = (
        db.query(User)
        .filter(
            User.email == user_data.email
        )
        .first()
    )

    if existing_user:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "A user with this email already exists"
            )
        )

    # --------------------------------------------------------
    # Role
    # --------------------------------------------------------

    role = get_role(
        db,
        user_data.role_id
    )

    if not role:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )

    # --------------------------------------------------------
    # Validate hierarchy
    # --------------------------------------------------------

    validate_user_hierarchy(
        db=db,
        institution_id=user_data.institution_id,
        faculty_id=user_data.faculty_id,
        department_id=user_data.department_id,
    )

    # --------------------------------------------------------
    # Create user
    # --------------------------------------------------------

    new_user = User(

        name=user_data.name,

        email=user_data.email,

        password_hash=
            hash_password(
                user_data.password
            ),

        role_id=user_data.role_id,

        institution_id=
            user_data.institution_id,

        faculty_id=
            user_data.faculty_id,

        department_id=
            user_data.department_id,

        is_active=True,
    )

    db.add(new_user)

    try:

        db.commit()

        db.refresh(new_user)

    except Exception:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )

    return {

        "message":
            "User created successfully",

        "user": {

            "id": new_user.id,

            "name": new_user.name,

            "email": new_user.email,

            "role_id": new_user.role_id,

            "role": role.name,

            "institution_id":
                new_user.institution_id,

            "faculty_id":
                new_user.faculty_id,

            "department_id":
                new_user.department_id,

            "is_active":
                new_user.is_active,
        }
    }


# ============================================================
# GET USER BY ID
# ============================================================

@router.get("/users/{user_id}")
def get_user(
    user_id: int,
    current_user: User = Depends(
        require_permission("USER_MANAGEMENT", "View")
    ),
    db: Session = Depends(get_db)
):

    user = (
        db.query(User)
        .filter(
            User.id == user_id
        )
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    role = get_role(
        db,
        user.role_id
    )

    institution = get_institution(
        db,
        user.institution_id
    )

    faculty = get_faculty(
        db,
        user.faculty_id
    )

    department = get_department(
        db,
        user.department_id
    )

    return {

        "id": user.id,

        "name": user.name,

        "email": user.email,

        "role_id": user.role_id,

        "role": (
            role.name
            if role
            else None
        ),

        "institution_id":
            user.institution_id,

        "institution":
            institution.name
            if institution
            else None,

        "faculty_id":
            user.faculty_id,

        "faculty":
            faculty.name
            if faculty
            else None,

        "department_id":
            user.department_id,

        "department":
            department.name
            if department
            else None,

        "is_active":
            user.is_active,
    }


# ============================================================
# UPDATE USER
# ============================================================

@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    user_data: AdminUserUpdate,
    current_user: User = Depends(
        require_permission("USER_MANAGEMENT", "Edit")
    ),
    db: Session = Depends(get_db)
):

    user = (
        db.query(User)
        .filter(
            User.id == user_id
        )
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # --------------------------------------------------------
    # Email
    # --------------------------------------------------------

    if user_data.email is not None:

        existing_user = (
            db.query(User)
            .filter(
                User.email == user_data.email,
                User.id != user_id,
            )
            .first()
        )

        if existing_user:

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "A user with this email already exists"
                )
            )

        user.email = user_data.email

    # --------------------------------------------------------
    # Name
    # --------------------------------------------------------

    if user_data.name is not None:

        user.name = user_data.name

    # --------------------------------------------------------
    # Password
    # --------------------------------------------------------

    if user_data.password is not None:

        user.password_hash = hash_password(
            user_data.password
        )

    # --------------------------------------------------------
    # Role
    # --------------------------------------------------------

    if user_data.role_id is not None:

        role = get_role(
            db,
            user_data.role_id
        )

        if not role:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )

        user.role_id = user_data.role_id

    # --------------------------------------------------------
    # Institution
    # --------------------------------------------------------

    if user_data.institution_id is not None:

        institution = get_institution(
            db,
            user_data.institution_id
        )

        if not institution:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Institution not found"
            )

        user.institution_id = (
            user_data.institution_id
        )

    # --------------------------------------------------------
    # Faculty
    # --------------------------------------------------------

    if user_data.faculty_id is not None:

        faculty = get_faculty(
            db,
            user_data.faculty_id
        )

        if not faculty:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Faculty not found"
            )

        user.faculty_id = (
            user_data.faculty_id
        )

    # --------------------------------------------------------
    # Department
    # --------------------------------------------------------

    if user_data.department_id is not None:

        department = get_department(
            db,
            user_data.department_id
        )

        if not department:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found"
            )

        user.department_id = (
            user_data.department_id
        )

    # --------------------------------------------------------
    # Validate final hierarchy
    # --------------------------------------------------------

    validate_user_hierarchy(
        db=db,
        institution_id=user.institution_id,
        faculty_id=user.faculty_id,
        department_id=user.department_id,
    )

    # --------------------------------------------------------
    # Active status
    # --------------------------------------------------------

    if user_data.is_active is not None:

        user.is_active = (
            user_data.is_active
        )

    try:

        db.commit()

        db.refresh(user)

    except Exception:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user"
        )

    role = get_role(
        db,
        user.role_id
    )

    return {

        "message":
            "User updated successfully",

        "user": {

            "id": user.id,

            "name": user.name,

            "email": user.email,

            "role_id": user.role_id,

            "role":
                role.name
                if role
                else None,

            "institution_id":
                user.institution_id,

            "faculty_id":
                user.faculty_id,

            "department_id":
                user.department_id,

            "is_active":
                user.is_active,
        }
    }


# ============================================================
# DELETE USER
# ============================================================

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: User = Depends(
        require_permission("USER_MANAGEMENT", "Delete")
    ),
    db: Session = Depends(get_db)
):

    user = (
        db.query(User)
        .filter(
            User.id == user_id
        )
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user.id == current_user.id:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "You cannot delete your own account"
            )
        )

    db.delete(user)

    try:

        db.commit()

    except Exception:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user"
        )

    return {

        "message":
            "User deleted successfully",

        "user_id":
            user_id,
    }


# ============================================================
# ROLES
# ============================================================

@router.get("/roles")
def get_roles(
    current_user: User = Depends(
        require_permission("USER_MANAGEMENT", "View")
    ),
    db: Session = Depends(get_db)
):

    roles = (
        db.query(Role)
        .order_by(Role.id)
        .all()
    )

    return [

        {
            "id": role.id,

            "name": role.name,

            "description":
                role.description,
        }

        for role in roles
    ]


# ============================================================
# PERMISSIONS
# ============================================================

@router.get("/permissions")
def get_permissions(
    current_user: User = Depends(
        require_permission("USER_MANAGEMENT", "View")
    ),
    db: Session = Depends(get_db)
):

    permissions = (
        db.query(Permission)
        .order_by(Permission.id)
        .all()
    )

    return [

        {
            "id": permission.id,

            "name": permission.name,

            "description":
                permission.description,
        }

        for permission in permissions
    ]


# ============================================================
# MODULES
# ============================================================

@router.get("/modules")
def get_modules(
    current_user: User = Depends(
        require_permission("USER_MANAGEMENT", "View")
    ),
    db: Session = Depends(get_db)
):

    modules = (
        db.query(Module)
        .order_by(Module.id)
        .all()
    )

    return [

        {
            "id": module.id,

            "name": module.name,

            "code": module.code,

            "description":
                module.description,
        }

        for module in modules
    ]


# ============================================================
# INSTITUTIONS
# ============================================================

@router.get("/institutions")
def get_institutions(
    current_user: User = Depends(
        require_permission(
            "INSTITUTION_MANAGEMENT",
            "View"
        )
    ),
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
# ACCREDITATION CYCLES
# ============================================================

@router.get("/accreditation-cycles")
def get_accreditation_cycles(
    current_user: User = Depends(
        require_permission(
            "ACCREDITATION_CYCLES",
            "View"
        )
    ),
    db: Session = Depends(get_db)
):

    cycles = (
        db.query(AccreditationCycle)
        .order_by(AccreditationCycle.id)
        .all()
    )

    return [

        {
            "id": cycle.id,

            "institution_id":
                cycle.institution_id,

            "name": cycle.name,

            "code": cycle.code,

            "academic_period":
                cycle.academic_period,

            "status":
                cycle.status,

            "description":
                cycle.description,
        }

        for cycle in cycles
    ]


# ============================================================
# REGISTRATION REQUESTS
#
# IMPORTANT:
#
# These endpoints DO NOT use:
#
# require_permission("USER_MANAGEMENT", "View")
#
# because registration authorization now follows the
# organizational hierarchy.
#
# ============================================================

@router.get("/registration-requests")
def get_registration_requests(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):

    requests = get_authorized_registration_requests(
        db=db,
        current_user=current_user,
    )

    result = []

    for request in requests:

        # ----------------------------------------------------
        # Requested role
        # ----------------------------------------------------

        requested_role = get_role(
            db,
            request.requested_role_id
        )

        # ----------------------------------------------------
        # Assigned role
        # ----------------------------------------------------

        assigned_role = get_role(
            db,
            request.assigned_role_id
        )

        # ----------------------------------------------------
        # Department
        # ----------------------------------------------------

        department = get_department(
            db,
            request.department_id
        )

        # ----------------------------------------------------
        # Faculty is derived from department
        #
        # RegistrationRequest does NOT store faculty_id.
        # ----------------------------------------------------

        faculty = None

        if (
            department
            and department.faculty_id
        ):

            faculty = get_faculty(
                db,
                department.faculty_id
            )

        # ----------------------------------------------------
        # Institution
        # ----------------------------------------------------

        institution = get_institution(
            db,
            request.institution_id
        )

        # ----------------------------------------------------
        # Reviewer / authorizer
        # ----------------------------------------------------

        reviewed_by_user = None

        if request.reviewed_by:

            reviewed_by_user = (
                db.query(User)
                .filter(
                    User.id
                    == request.reviewed_by
                )
                .first()
            )

        result.append({

            "id": request.id,

            "full_name":
                request.full_name,

            "email":
                request.email,

            "institution":
                (
                    institution.name
                    if institution
                    else request.institution
                ),

            "institution_id":
                request.institution_id,

            "faculty":
                (
                    faculty.name
                    if faculty
                    else None
                ),

            "faculty_id":
                (
                    faculty.id
                    if faculty
                    else None
                ),

            "department":
                (
                    department.name
                    if department
                    else request.department
                ),

            "department_id":
                request.department_id,

            "designation":
                request.designation,

            "requested_role":
                (
                    requested_role.name
                    if requested_role
                    else None
                ),

            "requested_role_id":
                request.requested_role_id,

            "assigned_role":
                (
                    assigned_role.name
                    if assigned_role
                    else None
                ),

            "assigned_role_id":
                request.assigned_role_id,

            "status":
                request.status,

            "reviewed_by":
                request.reviewed_by,

            "reviewed_by_name":
                (
                    reviewed_by_user.name
                    if reviewed_by_user
                    else None
                ),

            "reviewed_at":
                request.reviewed_at,

            "rejection_reason":
                request.rejection_reason,

            "created_at":
                request.created_at,

            "updated_at":
                request.updated_at,
        })

    return result


# ============================================================
# GET SINGLE REGISTRATION REQUEST
# ============================================================

@router.get(
    "/registration-requests/{request_id}"
)
def get_registration_request(
    request_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):

    request = (
        db.query(RegistrationRequest)
        .filter(
            RegistrationRequest.id
            == request_id
        )
        .first()
    )

    if not request:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Registration request not found"
            )
        )

    # --------------------------------------------------------
    # Check whether this authority can process this request
    # --------------------------------------------------------

    if request.status == "PENDING":

        validate_registration_approval(
            db=db,
            registration_request=request,
            current_user=current_user,
        )

    else:

        # ----------------------------------------------------
        # For already processed requests:
        # Admin can view all.
        #
        # Other authorities can only view requests
        # belonging to their institution.
        # ----------------------------------------------------

        current_role_name = get_role_name(
            db,
            current_user.role_id
        )

        if current_role_name != ADMIN_ROLE:

            if (
                current_user.institution_id
                and
                request.institution_id
                != current_user.institution_id
            ):

                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        "You can only view registration "
                        "requests from your institution."
                    )
                )

    requested_role = get_role(
        db,
        request.requested_role_id
    )

    assigned_role = get_role(
        db,
        request.assigned_role_id
    )

    institution = get_institution(
        db,
        request.institution_id
    )

    department = get_department(
        db,
        request.department_id
    )

    faculty = None

    if (
        department
        and department.faculty_id
    ):

        faculty = get_faculty(
            db,
            department.faculty_id
        )

    reviewed_by_user = None

    if request.reviewed_by:

        reviewed_by_user = (
            db.query(User)
            .filter(
                User.id
                == request.reviewed_by
            )
            .first()
        )

    return {

        "id":
            request.id,

        "full_name":
            request.full_name,

        "email":
            request.email,

        "institution":
            (
                institution.name
                if institution
                else request.institution
            ),

        "institution_id":
            request.institution_id,

        "faculty":
            (
                faculty.name
                if faculty
                else None
            ),

        "faculty_id":
            (
                faculty.id
                if faculty
                else None
            ),

        "department":
            (
                department.name
                if department
                else request.department
            ),

        "department_id":
            request.department_id,

        "designation":
            request.designation,

        "requested_role":
            (
                requested_role.name
                if requested_role
                else None
            ),

        "requested_role_id":
            request.requested_role_id,

        "assigned_role":
            (
                assigned_role.name
                if assigned_role
                else None
            ),

        "assigned_role_id":
            request.assigned_role_id,

        "status":
            request.status,

        "reviewed_by":
            request.reviewed_by,

        "reviewed_by_name":
            (
                reviewed_by_user.name
                if reviewed_by_user
                else None
            ),

        "reviewed_at":
            request.reviewed_at,

        "rejection_reason":
            request.rejection_reason,

        "created_at":
            request.created_at,

        "updated_at":
            request.updated_at,
    }


# ============================================================
# APPROVE REGISTRATION REQUEST
#
# THIS IS THE MAIN HIERARCHICAL AUTHORIZATION ENDPOINT
#
# Committee Member
#       ↓
# Dept. Coordinator
#
# Dept. Coordinator
#       ↓
# NAAC Coordinator
#
# NAAC Coordinator
#       ↓
# Principal / Director
#
# Principal / Director
#       ↓
# Admin
#
# Reviewer
#       ↓
# Admin
#
# Data Approver
#       ↓
# Admin
#
# ============================================================

@router.post(
    "/registration-requests/{request_id}/approve"
)
def approve_registration_request(
    request_id: int,
    approval_data: RegistrationApprovalRequest,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # Find request
    # --------------------------------------------------------

    registration_request = (
        db.query(RegistrationRequest)
        .filter(
            RegistrationRequest.id
            == request_id
        )
        .first()
    )

    if not registration_request:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Registration request not found"
            )
        )

    # --------------------------------------------------------
    # Must be pending
    # --------------------------------------------------------

    if (
        registration_request.status
        != "PENDING"
    ):

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Only pending registration "
                "requests can be approved."
            )
        )

    # --------------------------------------------------------
    # HIERARCHICAL AUTHORIZATION
    #
    # This replaces Admin-only approval.
    # --------------------------------------------------------

    validate_registration_approval(
        db=db,
        registration_request=
            registration_request,
        current_user=current_user,
    )

    # --------------------------------------------------------
    # Requested role
    # --------------------------------------------------------

    requested_role = get_role(
        db,
        registration_request.requested_role_id
    )

    if not requested_role:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Requested role was not found."
            )
        )

    # --------------------------------------------------------
    # Final assigned role
    # --------------------------------------------------------

    assigned_role = get_role(
        db,
        approval_data.role_id
    )

    if not assigned_role:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assigned role not found."
        )

    # --------------------------------------------------------
    # SECURITY:
    #
    # Non-Admin authorities cannot change the requested role.
    #
    # Example:
    #
    # Applicant requests Committee Member
    #
    # Dept. Coordinator can approve as Committee Member,
    # but cannot secretly turn them into Admin.
    #
    # Admin can make final role decisions.
    # --------------------------------------------------------

    current_role_name = get_role_name(
        db,
        current_user.role_id
    )

    if current_role_name != ADMIN_ROLE:

        if (
            approval_data.role_id
            != registration_request.requested_role_id
        ):

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "You cannot change the requested "
                    "role during authorization."
                )
            )

    # --------------------------------------------------------
    # Determine institution
    # --------------------------------------------------------

    institution_id = (
        approval_data.institution_id
        if approval_data.institution_id
        is not None
        else registration_request.institution_id
    )

    if not institution_id:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Institution is required."
            )
        )

    institution = get_institution(
        db,
        institution_id
    )

    if not institution:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found."
        )

    # --------------------------------------------------------
    # Determine department
    # --------------------------------------------------------

    department_id = (
        approval_data.department_id
        if approval_data.department_id
        is not None
        else registration_request.department_id
    )

    department = None

    if department_id:

        department = get_department(
            db,
            department_id
        )

        if not department:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found."
            )

        if (
            department.institution_id
            != institution_id
        ):

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Department does not belong "
                    "to the selected institution."
                )
            )

    # --------------------------------------------------------
    # Determine faculty
    #
    # Faculty is derived from department unless Admin
    # explicitly supplies a valid faculty.
    # --------------------------------------------------------

    faculty_id = None

    if approval_data.faculty_id is not None:

        faculty = get_faculty(
            db,
            approval_data.faculty_id
        )

        if not faculty:

            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Faculty not found."
            )

        if (
            faculty.institution_id
            != institution_id
        ):

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Faculty does not belong "
                    "to the selected institution."
                )
            )

        faculty_id = faculty.id

    elif department and department.faculty_id:

        faculty_id = department.faculty_id

    # --------------------------------------------------------
    # Validate faculty → department
    # --------------------------------------------------------

    if (
        department
        and department.faculty_id
        and faculty_id
        and department.faculty_id
        != faculty_id
    ):

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Faculty does not match "
                "the selected department."
            )
        )

    # --------------------------------------------------------
    # Duplicate user
    # --------------------------------------------------------

    existing_user = (
        db.query(User)
        .filter(
            User.email
            == registration_request.email
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
    # CREATE USER
    # --------------------------------------------------------

    new_user = User(

        name=
            registration_request.full_name,

        email=
            registration_request.email,

        password_hash=
            registration_request.password_hash,

        role_id=
            assigned_role.id,

        institution_id=
            institution_id,

        faculty_id=
            faculty_id,

        department_id=
            department_id,

        is_active=True,
    )

    db.add(new_user)

    # --------------------------------------------------------
    # UPDATE REGISTRATION REQUEST
    # --------------------------------------------------------

    registration_request.status = "APPROVED"

    registration_request.assigned_role_id = (
        assigned_role.id
    )

    registration_request.reviewed_by = (
        current_user.id
    )

    from datetime import datetime

    registration_request.reviewed_at = (
        datetime.utcnow()
    )

    registration_request.institution_id = (
        institution_id
    )

    registration_request.department_id = (
        department_id
    )

    try:

        db.commit()

        db.refresh(new_user)

        db.refresh(
            registration_request
        )

    except Exception:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Failed to approve registration request."
            )
        )

    # --------------------------------------------------------
    # RESPONSE
    # --------------------------------------------------------

    return {

        "message":
            "Registration request approved successfully",

        "authorization": {

            "authorized_by":
                current_user.name,

            "authorized_by_role":
                current_role_name,

            "requested_role":
                requested_role.name,

            "assigned_role":
                assigned_role.name,
        },

        "registration_request": {

            "id":
                registration_request.id,

            "status":
                registration_request.status,

            "reviewed_by":
                registration_request.reviewed_by,

            "reviewed_at":
                registration_request.reviewed_at,
        },

        "user": {

            "id":
                new_user.id,

            "name":
                new_user.name,

            "email":
                new_user.email,

            "role_id":
                new_user.role_id,

            "role":
                assigned_role.name,

            "institution_id":
                new_user.institution_id,

            "faculty_id":
                new_user.faculty_id,

            "department_id":
                new_user.department_id,

            "is_active":
                new_user.is_active,
        }
    }


# ============================================================
# REJECT REGISTRATION REQUEST
#
# Same hierarchy applies.
# ============================================================

@router.post(
    "/registration-requests/{request_id}/reject"
)
def reject_registration_request(
    request_id: int,
    rejection_data: RegistrationRejectionRequest,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):

    registration_request = (
        db.query(RegistrationRequest)
        .filter(
            RegistrationRequest.id
            == request_id
        )
        .first()
    )

    if not registration_request:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Registration request not found"
            )
        )

    # --------------------------------------------------------
    # Must be pending
    # --------------------------------------------------------

    if (
        registration_request.status
        != "PENDING"
    ):

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Only pending registration "
                "requests can be rejected."
            )
        )

    # --------------------------------------------------------
    # Hierarchical authorization
    # --------------------------------------------------------

    validate_registration_approval(
        db=db,
        registration_request=
            registration_request,
        current_user=current_user,
    )

    # --------------------------------------------------------
    # Reject
    # --------------------------------------------------------

    from datetime import datetime

    registration_request.status = "REJECTED"

    registration_request.reviewed_by = (
        current_user.id
    )

    registration_request.reviewed_at = (
        datetime.utcnow()
    )

    registration_request.rejection_reason = (
        rejection_data.reason
    )

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
                "Failed to reject registration request."
            )
        )

    return {

        "message":
            "Registration request rejected successfully",

        "authorization": {

            "rejected_by":
                current_user.name,

            "rejected_by_role":
                get_role_name(
                    db,
                    current_user.role_id
                ),
        },

        "registration_request": {

            "id":
                registration_request.id,

            "status":
                registration_request.status,

            "rejection_reason":
                registration_request.rejection_reason,

            "reviewed_by":
                registration_request.reviewed_by,

            "reviewed_at":
                registration_request.reviewed_at,
        }
    }