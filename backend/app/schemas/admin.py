from pydantic import BaseModel, Field


# ============================================================
# ADMIN USER MANAGEMENT
# ============================================================

class AdminUserCreate(BaseModel):

    name: str = Field(
        min_length=2,
        max_length=100
    )

    email: str = Field(
        min_length=3,
        max_length=150
    )

    password: str = Field(
        min_length=8,
        max_length=128
    )

    role_id: int

    institution_id: int | None = None

    faculty_id: int | None = None

    department_id: int | None = None


# ============================================================
# UPDATE USER
# ============================================================

class AdminUserUpdate(BaseModel):

    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=100
    )

    email: str | None = Field(
        default=None,
        min_length=3,
        max_length=150
    )

    password: str | None = Field(
        default=None,
        min_length=8,
        max_length=128
    )

    role_id: int | None = None

    institution_id: int | None = None

    faculty_id: int | None = None

    department_id: int | None = None

    is_active: bool | None = None


# ============================================================
# REGISTRATION APPROVAL
#
# The approving authority is NOT sent from frontend.
#
# Backend determines the correct authority using:
#
# requested_role
#       ↓
# REGISTRATION_AUTHORITY
#       ↓
# current logged-in user's role
#
# Example:
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
# ============================================================

class RegistrationApprovalRequest(BaseModel):

    # Final role assigned to the new user.
    #
    # For non-Admin authorities this must match
    # the requested role.
    #
    # Admin may assign/change the final role.
    role_id: int

    # Optional institution override.
    #
    # If omitted, backend uses the institution
    # from the registration request.
    institution_id: int | None = None

    # Optional faculty.
    #
    # Backend validates that the faculty belongs
    # to the selected institution.
    #
    # If omitted, backend derives faculty from
    # Department.faculty_id.
    faculty_id: int | None = None

    # Optional department override.
    #
    # If omitted, backend uses the department
    # from the registration request.
    department_id: int | None = None


# ============================================================
# REGISTRATION REJECTION
# ============================================================

class RegistrationRejectionRequest(BaseModel):

    reason: str = Field(
        min_length=3,
        max_length=500
    )