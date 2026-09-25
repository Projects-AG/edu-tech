import json
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_db, get_current_user
from app.services.review_service import create_review_decision

from app.models import (
    Submission,
    User,
    Role,
    Review,
    RoleModulePermission,
    Module,
    Permission,
    Criterion,
    Department,
    Metric,
)
from app.schemas.submission import (
    SubmissionCreate,
    SubmissionUpdate,
    SubmissionResponse,
    SubmissionReviewRequest,
    SubmissionApprovalRequest,
    SubmissionChangeRequest,
    SubmissionRejectionRequest,
    FinalApprovalRequest,
    WorkflowActionResponse,
)

from app.schemas.review import ReviewResponse


router = APIRouter(
    prefix="/submissions",
    tags=["Submissions"]
)


# ============================================================
# ROLE NAMES
# ============================================================

DATA_ENTRY_ROLES = {
    "NAAC Coordinator",
    "Dept. Coordinator",
    "Committee Member",
}

REVIEWER_ROLE = "Reviewer"
DATA_APPROVER_ROLE = "Data Approver"
FINAL_APPROVER_ROLE = "Principal / Director"


# ============================================================
# RBAC HELPERS
# ============================================================

def get_user_role(
    current_user: User,
    db: Session
) -> str:

    role = (
        db.query(Role)
        .filter(Role.id == current_user.role_id)
        .first()
    )

    if not role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User role not found"
        )

    return role.name


def require_role(
    current_user: User,
    db: Session,
    allowed_roles: set[str]
):
    role_name = get_user_role(
        current_user,
        db
    )

    if role_name not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Role '{role_name}' is not authorized "
                "to perform this action"
            )
        )

    return role_name


def has_rbac_permission(
    current_user: User,
    db: Session,
    module_code: str,
    permission_name: str
) -> bool:

    role = (
        db.query(Role)
        .filter(Role.id == current_user.role_id)
        .first()
    )

    if not role:
        return False

    module = (
        db.query(Module)
        .filter(Module.code == module_code)
        .first()
    )

    if not module:
        return False

    permission = (
        db.query(Permission)
        .filter(Permission.name == permission_name)
        .first()
    )

    if not permission:
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


def require_rbac_permission(
    current_user: User,
    db: Session,
    module_code: str,
    permission_name: str
):

    role = (
        db.query(Role)
        .filter(Role.id == current_user.role_id)
        .first()
    )

    if not role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User role not found"
        )

    module = (
        db.query(Module)
        .filter(Module.code == module_code)
        .first()
    )

    if not module:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RBAC module '{module_code}' not found"
        )

    permission = (
        db.query(Permission)
        .filter(Permission.name == permission_name)
        .first()
    )

    if not permission:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                f"RBAC permission '{permission_name}' not found"
            )
        )

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

    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Role '{role.name}' does not have "
                f"'{permission_name}' permission for "
                f"'{module_code}'"
            )
        )

    return role.name


# ============================================================
# CRITERION / REVIEWER RBAC
# ============================================================

def get_submission_criterion_module(
    submission: Submission,
    db: Session
) -> str | None:

    criterion_number = None

    if submission.criterion_id:

        criterion = (
            db.query(Criterion)
            .filter(
                Criterion.id == submission.criterion_id
            )
            .first()
        )

        if criterion:

            raw_number = str(
                criterion.number
            ).strip()

            # Support criterion values such as:
            # C1, C2, C3
            # 1, 2, 3
            # 1.1, 2.1, etc.
            if raw_number.upper().startswith("C"):
                raw_number = raw_number[1:]

            criterion_number = raw_number.split(".")[0]

    if (
        not criterion_number
        and submission.metric_code
    ):

        metric_parts = str(
            submission.metric_code
        ).split(".")

        if metric_parts:

            criterion_number = metric_parts[0]

    if criterion_number in {
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
    }:

        return f"CRITERIA_{criterion_number}"

    return None


def require_reviewer_permission(
    submission: Submission,
    current_user: User,
    db: Session,
    permission_name: str
):

    role_name = get_user_role(
        current_user,
        db
    )

    if role_name != REVIEWER_ROLE:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Reviewers can perform this action"
        )

    module_code = get_submission_criterion_module(
        submission,
        db
    )

    if not module_code:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Reviewer access cannot be determined "
                "because this submission is not linked "
                "to a valid criterion"
            )
        )

    require_rbac_permission(
        current_user,
        db,
        module_code,
        permission_name
    )

    return module_code


# ============================================================
# SUBMISSION HELPERS
# ============================================================

def get_submission_or_404(
    sub_id: int,
    db: Session
) -> Submission:

    submission = (
        db.query(Submission)
        .filter(
            Submission.id == sub_id
        )
        .first()
    )

    if not submission:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )

    return submission


def verify_institution_access(
    submission: Submission,
    current_user: User
):

    if (
        current_user.institution_id
        and submission.institution_id
        != current_user.institution_id
    ):

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Forbidden: Resource belongs "
                "to another institution"
            )
        )


def verify_department_access(
    submission: Submission,
    current_user: User,
    role_name: str
):

    if role_name in {
        "Dept. Coordinator",
        "Committee Member",
    }:

        if (
            current_user.department_id
            and submission.department_id
            != current_user.department_id
        ):

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "You cannot access a submission "
                    "from another department"
                )
            )


# ============================================================
# GET ALL SUBMISSIONS
# ============================================================

@router.get(
    "",
    response_model=List[SubmissionResponse]
)
def get_submissions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    role_name = get_user_role(
        current_user,
        db
    )

    query = db.query(Submission)

    if current_user.institution_id:

        query = query.filter(
            Submission.institution_id
            == current_user.institution_id
        )

    # --------------------------------------------------------
    # Data Entry
    # --------------------------------------------------------

    if role_name in DATA_ENTRY_ROLES:

        require_rbac_permission(
            current_user,
            db,
            "FORMS_DATA",
            "View"
        )

        if (
            role_name in {
                "Dept. Coordinator",
                "Committee Member",
            }
            and current_user.department_id
        ):

            query = query.filter(
                Submission.department_id
                == current_user.department_id
            )

        return query.order_by(
            Submission.created_at.desc()
        ).all()

    # --------------------------------------------------------
    # Reviewer
    # --------------------------------------------------------

    if role_name == REVIEWER_ROLE:

        submissions = query.order_by(
            Submission.created_at.desc()
        ).all()

        reviewer_submissions = []

        for submission in submissions:

            module_code = get_submission_criterion_module(
                submission,
                db
            )

            if not module_code:
                continue

            has_view = has_rbac_permission(
                current_user,
                db,
                module_code,
                "View"
            )

            has_review = has_rbac_permission(
                current_user,
                db,
                module_code,
                "Review"
            )

            if has_view or has_review:

                reviewer_submissions.append(
                    submission
                )

        return reviewer_submissions

    # --------------------------------------------------------
    # Data Approver
    # --------------------------------------------------------

    if role_name == DATA_APPROVER_ROLE:

        require_rbac_permission(
            current_user,
            db,
            "FORMS_DATA",
            "Approve"
        )

        return query.order_by(
            Submission.created_at.desc()
        ).all()

    # --------------------------------------------------------
    # Principal / Director
    # --------------------------------------------------------

    if role_name == FINAL_APPROVER_ROLE:

        require_rbac_permission(
            current_user,
            db,
            "FORMS_DATA",
            "Approve"
        )

        return query.order_by(
            Submission.created_at.desc()
        ).all()

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=(
            f"Role '{role_name}' is not authorized "
            "to view submissions"
        )
    )


# ============================================================
# CREATE SUBMISSION
# ============================================================

@router.post(
    "",
    response_model=SubmissionResponse,
    status_code=status.HTTP_201_CREATED
)
def create_submission(
    sub_data: SubmissionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # RBAC
    # --------------------------------------------------------

    role_name = require_rbac_permission(
        current_user,
        db,
        "FORMS_DATA",
        "Create"
    )

    if role_name not in DATA_ENTRY_ROLES:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Role '{role_name}' cannot create "
                "submissions"
            )
        )

    # --------------------------------------------------------
    # Institution
    # --------------------------------------------------------

    if not current_user.institution_id:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to an institution"
        )

    institution_id = current_user.institution_id

    # --------------------------------------------------------
    # Validate requested institution
    # --------------------------------------------------------

    if (
        sub_data.institution_id is not None
        and sub_data.institution_id != institution_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You cannot create a submission "
                "for another institution"
            )
        )

    # ========================================================
    # DEPARTMENT
    # ========================================================
    #
    # NAAC Coordinator:
    #     institution-level
    #     department_id = NULL
    #
    # Dept Coordinator / Committee:
    #     department is mandatory
    #
    # IMPORTANT:
    #     0 is treated as NULL.
    # ========================================================

    department_id = sub_data.department_id

    # If frontend did not provide department,
    # use user's department.
    if department_id is None:

        department_id = current_user.department_id

    # CRITICAL FIX:
    # 0 is not a valid department ID.
    if department_id == 0:

        department_id = None

    # --------------------------------------------------------
    # Department based roles
    # --------------------------------------------------------

    if role_name in {
        "Dept. Coordinator",
        "Committee Member",
    }:

        user_department_id = current_user.department_id

        # Normalize user's department 0 to None.
        if user_department_id == 0:

            user_department_id = None

        if not user_department_id:

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "User is not assigned to a department"
                )
            )

        if department_id is None:

            department_id = user_department_id

        if department_id != user_department_id:

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "You cannot create a submission "
                    "for another department"
                )
            )

        # Verify department exists.
        department = (
            db.query(Department)
            .filter(
                Department.id == department_id
            )
            .first()
        )

        if not department:

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected department does not exist"
            )

        if department.institution_id != institution_id:

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Selected department belongs "
                    "to another institution"
                )
            )

    # --------------------------------------------------------
    # NAAC Coordinator
    # --------------------------------------------------------

    if role_name == "NAAC Coordinator":

        # Coordinator is institution-level.
        #
        # If no department is provided,
        # department_id remains NULL.
        #
        # If a department is explicitly provided,
        # validate it.

        if department_id is not None:

            department = (
                db.query(Department)
                .filter(
                    Department.id == department_id
                )
                .first()
            )

            if not department:

                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Selected department does not exist"
                    )
                )

            if department.institution_id != institution_id:

                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        "Selected department belongs "
                        "to another institution"
                    )
                )

    # --------------------------------------------------------
    # Convert JSON
    # --------------------------------------------------------

    data_json = None

    if sub_data.data_json is not None:

        if isinstance(
            sub_data.data_json,
            str
        ):

            data_json = sub_data.data_json

        else:

            data_json = json.dumps(
                sub_data.data_json
            )

    # --------------------------------------------------------
    # Create submission
    # --------------------------------------------------------

    submission = Submission(
        institution_id=institution_id,
        cycle_id=sub_data.cycle_id,
        criterion_id=sub_data.criterion_id,
        department_id=department_id,
        user_id=current_user.id,
        title=sub_data.title,
        metric_code=sub_data.metric_code,
        status="Draft",
        data_json=data_json,
    )

    try:

        db.add(submission)
        db.commit()
        db.refresh(submission)

    except Exception:

        db.rollback()
        raise

    return submission


# ============================================================
# DATA APPROVER QUEUE
# ============================================================

@router.get(
    "/approver-queue",
    response_model=List[SubmissionResponse]
)
def get_approver_queue(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    role_name = require_rbac_permission(
        current_user,
        db,
        "FORMS_DATA",
        "Approve"
    )

    if role_name != DATA_APPROVER_ROLE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Data Approvers can access the approver queue"
        )

    query = (
        db.query(Submission)
        .filter(
            Submission.status == "Approved",
            Submission.approved_by.is_(None)
        )
    )

    if current_user.institution_id:
        query = query.filter(
            Submission.institution_id
            == current_user.institution_id
        )

    return (
        query
        .order_by(Submission.updated_at.asc())
        .all()
    )


# ============================================================
# FINAL APPROVER QUEUE
# ============================================================

@router.get(
    "/final-approver-queue",
    response_model=List[SubmissionResponse]
)
def get_final_approver_queue(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    role_name = require_rbac_permission(
        current_user,
        db,
        "FORMS_DATA",
        "Approve"
    )

    if role_name != FINAL_APPROVER_ROLE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Principal / Director can access the final approval queue"
        )

    query = (
        db.query(Submission)
        .filter(
            Submission.status == "Approved",
            Submission.approved_by.is_not(None),
            Submission.final_approved_by.is_(None)
        )
    )

    if current_user.institution_id:
        query = query.filter(
            Submission.institution_id
            == current_user.institution_id
        )

    return (
        query
        .order_by(Submission.approved_at.asc())
        .all()
    )


# ============================================================
# GET SINGLE SUBMISSION
# ============================================================

@router.get(
    "/{sub_id}",
    response_model=SubmissionResponse
)
def get_submission(
    sub_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    submission = get_submission_or_404(
        sub_id,
        db
    )

    verify_institution_access(
        submission,
        current_user
    )

    role_name = get_user_role(
        current_user,
        db
    )

    # --------------------------------------------------------
    # Reviewer
    # --------------------------------------------------------

    if role_name == REVIEWER_ROLE:

        module_code = get_submission_criterion_module(
            submission,
            db
        )

        if not module_code:

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Reviewer access cannot be determined "
                    "for this submission"
                )
            )

        has_view = has_rbac_permission(
            current_user,
            db,
            module_code,
            "View"
        )

        has_review = has_rbac_permission(
            current_user,
            db,
            module_code,
            "Review"
        )

        if not has_view and not has_review:

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Reviewer does not have access "
                    f"to '{module_code}'"
                )
            )

        return submission

    # --------------------------------------------------------
    # Data Entry
    # --------------------------------------------------------

    if role_name in DATA_ENTRY_ROLES:

        require_rbac_permission(
            current_user,
            db,
            "FORMS_DATA",
            "View"
        )

        verify_department_access(
            submission,
            current_user,
            role_name
        )

        return submission

    # --------------------------------------------------------
    # Data Approver
    # --------------------------------------------------------

    if role_name == DATA_APPROVER_ROLE:

        require_rbac_permission(
            current_user,
            db,
            "FORMS_DATA",
            "Approve"
        )

        return submission

    # --------------------------------------------------------
    # Principal
    # --------------------------------------------------------

    if role_name == FINAL_APPROVER_ROLE:

        require_rbac_permission(
            current_user,
            db,
            "FORMS_DATA",
            "Approve"
        )

        return submission

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=(
            f"Role '{role_name}' is not authorized "
            "to view this submission"
        )
    )


# ============================================================
# UPDATE
# ============================================================

@router.put(
    "/{sub_id}",
    response_model=SubmissionResponse
)
def update_submission(
    sub_id: int,
    sub_data: SubmissionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    role_name = require_rbac_permission(
        current_user,
        db,
        "FORMS_DATA",
        "Edit"
    )

    if role_name not in DATA_ENTRY_ROLES:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Role '{role_name}' cannot edit "
                "submissions"
            )
        )

    submission = get_submission_or_404(
        sub_id,
        db
    )

    verify_institution_access(
        submission,
        current_user
    )

    verify_department_access(
        submission,
        current_user,
        role_name
    )

    if submission.user_id != current_user.id:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only the user who created this "
                "submission can edit it"
            )
        )

    allowed_statuses = {
        "Draft",
        "Changes Requested",
        "Resubmitted",
    }

    if submission.status not in allowed_statuses:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Submission cannot be edited while "
                f"its status is '{submission.status}'"
            )
        )

    update_dict = sub_data.model_dump(
        exclude_unset=True
    )

    # Institution cannot be changed.
    update_dict.pop(
        "institution_id",
        None
    )

    # --------------------------------------------------------
    # Department
    # --------------------------------------------------------

    if "department_id" in update_dict:

        department_id = update_dict["department_id"]

        if department_id == 0:

            department_id = None
            update_dict["department_id"] = None

        if role_name in {
            "Dept. Coordinator",
            "Committee Member",
        }:

            user_department_id = current_user.department_id

            if user_department_id == 0:

                user_department_id = None

            if not user_department_id:

                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "User is not assigned "
                        "to a department"
                    )
                )

            if department_id != user_department_id:

                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        "You cannot move a submission "
                        "to another department"
                    )
                )

    # --------------------------------------------------------
    # JSON
    # --------------------------------------------------------

    if "data_json" in update_dict:

        value = update_dict["data_json"]

        if value is None:

            update_dict["data_json"] = None

        elif isinstance(
            value,
            str
        ):

            update_dict["data_json"] = value

        else:

            update_dict["data_json"] = json.dumps(
                value
            )

    for key, value in update_dict.items():

        setattr(
            submission,
            key,
            value
        )

    submission.updated_at = datetime.utcnow()

    try:

        db.commit()
        db.refresh(submission)

    except Exception:

        db.rollback()
        raise

    return submission


# ============================================================
# SUBMIT
# ============================================================

@router.post(
    "/{sub_id}/submit",
    response_model=WorkflowActionResponse
)
def submit_submission(
    sub_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    role_name = get_user_role(
        current_user,
        db
    )

    if role_name not in DATA_ENTRY_ROLES:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Role '{role_name}' cannot submit "
                "submissions"
            )
        )

    require_rbac_permission(
        current_user,
        db,
        "FORMS_DATA",
        "Submit"
    )

    submission = get_submission_or_404(
        sub_id,
        db
    )

    verify_institution_access(
        submission,
        current_user
    )

    verify_department_access(
        submission,
        current_user,
        role_name
    )

    if submission.user_id != current_user.id:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only the submission creator "
                "can submit it"
            )
        )

    if submission.status not in {
        "Draft",
        "Resubmitted",
        "Changes Requested",
    }:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Submission cannot be submitted "
                f"from status '{submission.status}'"
            )
        )

    submission.status = "Submitted"
    submission.updated_at = datetime.utcnow()

    try:

        db.commit()
        db.refresh(submission)

    except Exception:

        db.rollback()
        raise

    return {
        "message": "Submission submitted successfully",
        "submission": submission,
    }


# ============================================================
# START REVIEW
# ============================================================

@router.post(
    "/{sub_id}/start-review",
    response_model=WorkflowActionResponse
)
def start_review(
    sub_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    submission = get_submission_or_404(
        sub_id,
        db
    )

    verify_institution_access(
        submission,
        current_user
    )

    require_reviewer_permission(
        submission,
        current_user,
        db,
        "Review"
    )

    if submission.status not in {
        "Submitted",
        "Resubmitted",
    }:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Only submitted or resubmitted "
                "submissions can enter review"
            )
        )

    submission.status = "Under Review"
    submission.reviewed_by = current_user.id
    submission.reviewed_at = datetime.utcnow()
    submission.updated_at = datetime.utcnow()

    try:

        db.commit()
        db.refresh(submission)

    except Exception:

        db.rollback()
        raise

    return {
        "message": "Submission is now under review",
        "submission": submission,
    }


# ============================================================
# REVIEW
# ============================================================

@router.post(
    "/{sub_id}/review",
    response_model=WorkflowActionResponse
)
def review_submission(
    sub_id: int,
    review_data: SubmissionReviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    submission = get_submission_or_404(
        sub_id,
        db
    )

    verify_institution_access(
        submission,
        current_user
    )

    require_reviewer_permission(
        submission,
        current_user,
        db,
        "Review"
    )

    if submission.status != "Under Review":

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Only submissions under review "
                "can be reviewed"
            )
        )

    # ========================================================
    # DETERMINE MAXIMUM SCORE FROM METRIC
    # ========================================================

    max_score = None

    if submission.metric_code:

        metric = (
            db.query(Metric)
            .filter(
                Metric.code == submission.metric_code
            )
            .first()
        )

        if metric:
            max_score = metric.max_score

    # ========================================================
    # VALIDATE REVIEWER SCORE
    # ========================================================

    if review_data.score is not None:

        if max_score is None:

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Unable to determine maximum score "
                    "for this metric"
                )
            )

        if review_data.score > max_score:

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Score cannot exceed maximum score "
                    f"of {max_score}"
                )
            )
    # ========================================================
    # CREATE REVIEW DECISION THROUGH SERVICE
    # ========================================================

    review = create_review_decision(
        db=db,
        submission_id=submission.id,
        reviewer_user=current_user,
        review_status=review_data.status,
        comments=review_data.comments,
        score=review_data.score,
        max_score=max_score,
    )

    if review_data.status == "Changes Requested":
        submission.change_request_reason = review_data.comments

    elif review_data.status == "Rejected":
        submission.rejection_reason = review_data.comments

    submission.reviewed_by = current_user.id
    submission.reviewed_at = datetime.utcnow()
    submission.updated_at = datetime.utcnow()

    try:
        db.commit()
        db.refresh(submission)

    except Exception:
        db.rollback()
        raise

    return {
        "message": "Review decision recorded successfully",
        "submission": submission,
    }

# ============================================================
# REVIEW HISTORY
# ============================================================

@router.get(
    "/{sub_id}/reviews",
    response_model=List[ReviewResponse]
)
def get_review_history(
    sub_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    submission = get_submission_or_404(
        sub_id,
        db
    )

    verify_institution_access(
        submission,
        current_user
    )

    reviews = (
        db.query(Review)
        .filter(
            Review.submission_id == submission.id
        )
        .order_by(
            Review.created_at.asc()
        )
        .all()
    )

    return reviews

# ============================================================
# RESUBMIT
# ============================================================

@router.post(
    "/{sub_id}/resubmit",
    response_model=WorkflowActionResponse
)
def resubmit_submission(
    sub_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    role_name = require_rbac_permission(
        current_user,
        db,
        "FORMS_DATA",
        "Submit"
    )

    if role_name not in DATA_ENTRY_ROLES:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Role '{role_name}' cannot resubmit "
                "submissions"
            )
        )

    submission = get_submission_or_404(
        sub_id,
        db
    )

    verify_institution_access(
        submission,
        current_user
    )

    verify_department_access(
        submission,
        current_user,
        role_name
    )

    if submission.user_id != current_user.id:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only the submission creator "
                "can resubmit it"
            )
        )

    if submission.status != "Changes Requested":

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Only submissions with requested "
                "changes can be resubmitted"
            )
        )

    submission.status = "Resubmitted"
    submission.updated_at = datetime.utcnow()

    try:

        db.commit()
        db.refresh(submission)

    except Exception:

        db.rollback()
        raise

    return {
        "message": "Submission resubmitted successfully",
        "submission": submission,
    }


# ============================================================
# DATA APPROVER
# ============================================================

@router.post(
    "/{sub_id}/data-approve",
    response_model=WorkflowActionResponse
)
def data_approve_submission(
    sub_id: int,
    approval_data: SubmissionApprovalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    role_name = require_rbac_permission(
        current_user,
        db,
        "FORMS_DATA",
        "Approve"
    )

    if role_name != DATA_APPROVER_ROLE:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only Data Approvers can perform "
                "data approval"
            )
        )

    submission = get_submission_or_404(
        sub_id,
        db
    )

    verify_institution_access(
        submission,
        current_user
    )

    if submission.status != "Approved":

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Only reviewer-approved submissions "
                "can be approved by the Data Approver"
            )
        )

    if submission.approved_by is not None:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "This submission has already been "
                "approved by a Data Approver"
            )
        )

    submission.approved_by = current_user.id
    submission.approved_at = datetime.utcnow()
    submission.updated_at = datetime.utcnow()

    try:

        db.commit()
        db.refresh(submission)

    except Exception:

        db.rollback()
        raise

    return {
        "message": "Submission approved by Data Approver",
        "submission": submission,
    }


# ============================================================
# DATA APPROVER - REQUEST CHANGES
# ============================================================

# ============================================================
# DATA APPROVER - REJECT
# ============================================================

@router.post(
    "/{sub_id}/data-reject",
    response_model=WorkflowActionResponse
)
def data_reject_submission(
    sub_id: int,
    rejection_data: SubmissionRejectionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    role_name = require_rbac_permission(
        current_user,
        db,
        "FORMS_DATA",
        "Approve"
    )

    if role_name != DATA_APPROVER_ROLE:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only Data Approvers can reject "
                "submissions"
            )
        )

    submission = get_submission_or_404(
        sub_id,
        db
    )

    verify_institution_access(
        submission,
        current_user
    )

    if submission.status != "Approved":

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Only reviewer-approved submissions "
                "can be rejected by the Data Approver"
            )
        )

    submission.status = "Rejected"

    submission.rejection_reason = (
        rejection_data.reason
    )

    submission.updated_at = datetime.utcnow()

    try:

        db.commit()
        db.refresh(submission)

    except Exception:

        db.rollback()
        raise

    return {
        "message": "Submission rejected by Data Approver",
        "submission": submission,
    }

# ============================================================
# FINAL APPROVAL
# ============================================================

@router.post(
    "/{sub_id}/final-approve",
    response_model=WorkflowActionResponse
)
def final_approve_submission(
    sub_id: int,
    final_data: FinalApprovalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    role_name = require_rbac_permission(
        current_user,
        db,
        "FORMS_DATA",
        "Approve"
    )

    if role_name != FINAL_APPROVER_ROLE:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only Principal / Director can "
                "grant final approval"
            )
        )

    submission = get_submission_or_404(
        sub_id,
        db
    )

    verify_institution_access(
        submission,
        current_user
    )

    if submission.approved_by is None:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Data Approver approval is required "
                "before final approval"
            )
        )

    if submission.status != "Approved":

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Only approved submissions can "
                "receive final approval"
            )
        )

    submission.status = "Final Approval"

    submission.final_approved_by = current_user.id
    submission.final_approved_at = datetime.utcnow()
    submission.updated_at = datetime.utcnow()

    try:

        db.commit()
        db.refresh(submission)

    except Exception:

        db.rollback()
        raise

    return {
        "message": "Final approval granted",
        "submission": submission,
    }


# ============================================================
# FINAL REJECTION
# ============================================================

@router.post(
    "/{sub_id}/final-reject",
    response_model=WorkflowActionResponse
)
def final_reject_submission(
    sub_id: int,
    rejection_data: SubmissionRejectionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    role_name = require_rbac_permission(
        current_user,
        db,
        "FORMS_DATA",
        "Approve"
    )

    if role_name != FINAL_APPROVER_ROLE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Principal / Director can reject final approval"
        )

    submission = get_submission_or_404(
        sub_id,
        db
    )

    verify_institution_access(
        submission,
        current_user
    )

    if submission.approved_by is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Data Approver approval is required before final rejection"
        )

    if submission.status != "Approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only approved submissions can be finally rejected"
        )

    submission.status = "Rejected"
    submission.rejection_reason = rejection_data.reason
    # submission.final_approved_by = current_user.id
    # submission.final_approved_at = datetime.utcnow()
    submission.updated_at = datetime.utcnow()

    try:
        db.commit()
        db.refresh(submission)

    except Exception:
        db.rollback()
        raise

    return {
        "message": "Final approval rejected",
        "submission": submission,
    }


# ============================================================
# FINAL SUBMISSION
# ============================================================

@router.post(
    "/{sub_id}/final-submit",
    response_model=WorkflowActionResponse
)
def final_submit_submission(
    sub_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    role_name = require_rbac_permission(
        current_user,
        db,
        "FORMS_DATA",
        "Approve"
    )

    if role_name != FINAL_APPROVER_ROLE:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only Principal / Director can "
                "perform final submission"
            )
        )

    submission = get_submission_or_404(
        sub_id,
        db
    )

    verify_institution_access(
        submission,
        current_user
    )

    if submission.final_approved_by is None:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Final approval is required "
                "before final submission"
            )
        )

    if submission.status != "Final Approval":

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Only finally approved submissions "
                "can be submitted"
            )
        )

    submission.status = "Final Submitted"

    submission.final_submitted_at = datetime.utcnow()
    submission.updated_at = datetime.utcnow()

    try:

        db.commit()
        db.refresh(submission)

    except Exception:

        db.rollback()
        raise

    return {
        "message": "Final NAAC submission completed",
        "submission": submission,
    }


# ============================================================
# REJECT
# ============================================================

@router.post(
    "/{sub_id}/reject",
    response_model=WorkflowActionResponse
)
def reject_submission(
    sub_id: int,
    rejection_data: SubmissionRejectionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    submission = get_submission_or_404(
        sub_id,
        db
    )

    verify_institution_access(
        submission,
        current_user
    )

    require_reviewer_permission(
        submission,
        current_user,
        db,
        "Review"
    )

    if submission.status != "Under Review":

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Only submissions under review "
                "can be rejected"
            )
        )

 
    # Create rejection decision through the centralized review service.
    review = create_review_decision(
        db=db,
        submission_id=submission.id,
        reviewer_user=current_user,
        review_status="Rejected",
        comments=rejection_data.reason,
    )
    
    submission.rejection_reason = rejection_data.reason
    submission.reviewed_by = current_user.id
    submission.reviewed_at = datetime.utcnow()
    submission.updated_at = datetime.utcnow()

  

    try:

        db.commit()
        db.refresh(submission)

    except Exception:

        db.rollback()
        raise

    return {
        "message": "Submission rejected",
        "submission": submission,
    }