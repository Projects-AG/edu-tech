from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_db, get_current_user
from app.auth.registration_authority import ADMIN, get_role_name
from app.db.database import engine
from app.models import (
    Committee,
    CommitteeMember,
    Criterion,
    Department,
    Document,
    Submission,
    User,
)
from app.services.audit_service import record_audit
from app.services.report_service import PENDING_SUBMISSION_STATUSES
from app.schemas.committee import (
    CommitteeAvailableUserResponse,
    CommitteeCreate,
    CommitteeMemberCreate,
    CommitteeMemberResponse,
    CommitteeMemberUpdate,
    CommitteeResponse,
    CommitteeUpdate,
)

router = APIRouter(
    prefix="/committee",
    tags=["Committee Member"]
)

management_router = APIRouter(
    prefix="/committees",
    tags=["Committee Management"]
)

COMMITTEE_MANAGER_ROLES = {
    ADMIN,
    "NAAC Coordinator",
}

ALLOWED_COMMITTEE_ROLES = {
    "Member",
    "Coordinator",
    "Chairperson",
}

try:
    Committee.__table__.create(bind=engine, checkfirst=True)
    CommitteeMember.__table__.create(bind=engine, checkfirst=True)
except Exception:
    pass


def require_committee_manager(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    role_name = get_role_name(db, current_user.role_id)

    if role_name not in COMMITTEE_MANAGER_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to manage committees",
        )

    return current_user


def is_platform_admin(db: Session, user: User) -> bool:
    return get_role_name(db, user.role_id) == ADMIN


def can_access_institution(
    db: Session,
    user: User,
    institution_id: int | None,
) -> bool:
    if is_platform_admin(db, user):
        return True

    if user.institution_id is None:
        return institution_id is None

    return user.institution_id == institution_id


def get_accessible_committee(
    db: Session,
    current_user: User,
    committee_id: int,
) -> Committee:
    committee = (
        db.query(Committee)
        .filter(Committee.id == committee_id)
        .first()
    )

    if not committee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Committee not found",
        )

    if not can_access_institution(
        db,
        current_user,
        committee.institution_id,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access a committee from another institution",
        )

    return committee


def get_department_name(db: Session, department_id: int | None):
    if not department_id:
        return None

    department = (
        db.query(Department)
        .filter(Department.id == department_id)
        .first()
    )

    return department.name if department else None


def serialize_committee(
    db: Session,
    committee: Committee,
) -> dict:
    member_count = (
        db.query(CommitteeMember)
        .filter(CommitteeMember.committee_id == committee.id)
        .count()
    )

    return {
        "id": committee.id,
        "institution_id": committee.institution_id,
        "name": committee.name,
        "description": committee.description,
        "chairperson": committee.chairperson,
        "status": committee.status,
        "member_count": member_count,
        "criteria_count": 0,
        "created_by": committee.created_by,
        "created_at": committee.created_at,
        "updated_at": committee.updated_at,
    }


def serialize_member(
    db: Session,
    member: CommitteeMember,
) -> dict:
    user = db.query(User).filter(User.id == member.user_id).first()

    return {
        "id": member.id,
        "committee_id": member.committee_id,
        "user_id": member.user_id,
        "committee_role": member.committee_role,
        "name": user.name if user else None,
        "email": user.email if user else None,
        "system_role": (
            get_role_name(db, user.role_id)
            if user
            else None
        ),
        "department": (
            get_department_name(db, user.department_id)
            if user
            else None
        ),
        "created_at": member.created_at,
    }


def normalize_committee_role(committee_role: str | None) -> str:
    role = (committee_role or "Member").strip() or "Member"

    if role not in ALLOWED_COMMITTEE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid committee role",
        )

    return role


@router.get("/dashboard")
def committee_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    role_name = get_role_name(db, current_user.role_id)
    if role_name != "Committee Member":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only Committee Members can access "
                "the committee dashboard"
            ),
        )

    assigned_department_id = current_user.department_id or None
    if (
        role_name == "Committee Member"
        and not assigned_department_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "User is not assigned to a department. "
                "Ask an administrator to assign a department "
                "before accessing committee dashboard data."
            ),
        )

    inst_id = current_user.institution_id
    dept_id = assigned_department_id
    sub_query = db.query(Submission)
    doc_query = db.query(Document)

    if inst_id:
        sub_query = sub_query.filter(Submission.institution_id == inst_id)
        doc_query = doc_query.filter(Document.institution_id == inst_id)

    if dept_id:
        sub_query = sub_query.filter(Submission.department_id == dept_id)
        doc_query = doc_query.join(
            Submission,
            Document.submission_id == Submission.id,
        ).filter(Submission.department_id == dept_id)

    total_criteria = db.query(Criterion).count()
    documents_collected = doc_query.count()
    total_submissions = sub_query.count()
    pending_items = sub_query.filter(
        Submission.status.in_(PENDING_SUBMISSION_STATUSES)
    ).count()

    return {
        "message": "Committee Member Dashboard",
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "role": "Committee Member"
        },
        "statistics": {
            "total_criteria": total_criteria,
            "documents_collected": documents_collected,
            "total_submissions": total_submissions,
            "pending_items": pending_items
        }
    }


@management_router.get(
    "",
    response_model=list[CommitteeResponse],
)
def list_committees(
    current_user: User = Depends(require_committee_manager),
    db: Session = Depends(get_db),
):
    query = db.query(Committee)

    if not is_platform_admin(db, current_user):
        query = query.filter(
            Committee.institution_id == current_user.institution_id
        )

    committees = query.order_by(Committee.id).all()

    return [
        serialize_committee(db, committee)
        for committee in committees
    ]


@management_router.post(
    "",
    response_model=CommitteeResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_committee(
    payload: CommitteeCreate,
    current_user: User = Depends(require_committee_manager),
    db: Session = Depends(get_db),
):
    name = payload.name.strip()

    if not name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Committee name is required",
        )

    committee = Committee(
        institution_id=current_user.institution_id,
        name=name,
        description=(payload.description or "").strip() or None,
        chairperson=(payload.chairperson or "").strip() or None,
        status=(payload.status or "Active").strip() or "Active",
        created_by=current_user.id,
    )

    db.add(committee)
    db.flush()
    record_audit(
        db,
        user=current_user,
        action="COMMITTEE_CREATE",
        entity_type="Committee",
        entity_id=committee.id,
        new_values={"name": committee.name, "status": committee.status},
        institution_id=committee.institution_id,
    )
    db.commit()
    db.refresh(committee)

    return serialize_committee(db, committee)


@management_router.get(
    "/{committee_id}",
    response_model=CommitteeResponse,
)
def get_committee(
    committee_id: int,
    current_user: User = Depends(require_committee_manager),
    db: Session = Depends(get_db),
):
    committee = get_accessible_committee(
        db,
        current_user,
        committee_id,
    )

    return serialize_committee(db, committee)


@management_router.put(
    "/{committee_id}",
    response_model=CommitteeResponse,
)
def update_committee(
    committee_id: int,
    payload: CommitteeUpdate,
    current_user: User = Depends(require_committee_manager),
    db: Session = Depends(get_db),
):
    committee = get_accessible_committee(
        db,
        current_user,
        committee_id,
    )

    update_data = payload.model_dump(exclude_unset=True)

    if "name" in update_data:
        name = (update_data["name"] or "").strip()

        if not name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Committee name is required",
            )

        committee.name = name

    if "description" in update_data:
        committee.description = (
            (update_data["description"] or "").strip() or None
        )

    if "chairperson" in update_data:
        committee.chairperson = (
            (update_data["chairperson"] or "").strip() or None
        )

    if "status" in update_data:
        committee.status = (
            (update_data["status"] or "").strip() or committee.status
        )

    committee.updated_at = datetime.utcnow()
    record_audit(
        db,
        user=current_user,
        action="COMMITTEE_UPDATE",
        entity_type="Committee",
        entity_id=committee.id,
        new_values=update_data,
        institution_id=committee.institution_id,
    )
    db.commit()
    db.refresh(committee)

    return serialize_committee(db, committee)


@management_router.delete("/{committee_id}")
def delete_committee(
    committee_id: int,
    current_user: User = Depends(require_committee_manager),
    db: Session = Depends(get_db),
):
    committee = get_accessible_committee(
        db,
        current_user,
        committee_id,
    )

    record_audit(
        db,
        user=current_user,
        action="COMMITTEE_DELETE",
        entity_type="Committee",
        entity_id=committee.id,
        old_values={"name": committee.name},
        institution_id=committee.institution_id,
    )
    db.query(CommitteeMember).filter(
        CommitteeMember.committee_id == committee.id
    ).delete(synchronize_session=False)

    db.delete(committee)
    db.commit()

    return {
        "message": "Committee deleted successfully",
        "committee_id": committee_id,
    }


@management_router.get(
    "/{committee_id}/members",
    response_model=list[CommitteeMemberResponse],
)
def list_committee_members(
    committee_id: int,
    current_user: User = Depends(require_committee_manager),
    db: Session = Depends(get_db),
):
    committee = get_accessible_committee(
        db,
        current_user,
        committee_id,
    )

    members = (
        db.query(CommitteeMember)
        .filter(CommitteeMember.committee_id == committee.id)
        .order_by(CommitteeMember.id)
        .all()
    )

    return [
        serialize_member(db, member)
        for member in members
    ]


@management_router.get(
    "/{committee_id}/available-users",
    response_model=list[CommitteeAvailableUserResponse],
)
def list_available_committee_users(
    committee_id: int,
    current_user: User = Depends(require_committee_manager),
    db: Session = Depends(get_db),
):
    committee = get_accessible_committee(
        db,
        current_user,
        committee_id,
    )

    assigned_user_ids = [
        row[0]
        for row in db.query(CommitteeMember.user_id)
        .filter(CommitteeMember.committee_id == committee.id)
        .all()
    ]

    query = db.query(User).filter(User.is_active == True)

    if assigned_user_ids:
        query = query.filter(User.id.notin_(assigned_user_ids))

    if committee.institution_id is not None:
        query = query.filter(
            User.institution_id == committee.institution_id
        )
    elif not is_platform_admin(db, current_user):
        query = query.filter(
            User.institution_id == current_user.institution_id
        )

    users = query.order_by(User.id).all()

    return [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "system_role": get_role_name(db, user.role_id),
            "department": get_department_name(db, user.department_id),
        }
        for user in users
    ]


@management_router.post(
    "/{committee_id}/members",
    response_model=CommitteeMemberResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_committee_member(
    committee_id: int,
    payload: CommitteeMemberCreate,
    current_user: User = Depends(require_committee_manager),
    db: Session = Depends(get_db),
):
    committee = get_accessible_committee(
        db,
        current_user,
        committee_id,
    )

    user = db.query(User).filter(User.id == payload.user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign an inactive user",
        )

    if not can_access_institution(
        db,
        current_user,
        user.institution_id,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot assign a user from another institution",
        )

    if (
        committee.institution_id is not None
        and user.institution_id != committee.institution_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not belong to this committee's institution",
        )

    existing = (
        db.query(CommitteeMember)
        .filter(
            CommitteeMember.committee_id == committee.id,
            CommitteeMember.user_id == user.id,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This user is already a member of the committee.",
        )

    member = CommitteeMember(
        committee_id=committee.id,
        user_id=user.id,
        committee_role=normalize_committee_role(payload.committee_role),
    )

    db.add(member)
    db.flush()
    record_audit(
        db,
        user=current_user,
        action="COMMITTEE_MEMBER_ADD",
        entity_type="CommitteeMember",
        entity_id=member.id,
        new_values={
            "committee_id": committee.id,
            "user_id": user.id,
            "committee_role": member.committee_role,
        },
        institution_id=committee.institution_id,
    )
    db.commit()
    db.refresh(member)

    return serialize_member(db, member)


@management_router.put(
    "/members/{member_id}",
    response_model=CommitteeMemberResponse,
)
def update_committee_member_role(
    member_id: int,
    payload: CommitteeMemberUpdate,
    current_user: User = Depends(require_committee_manager),
    db: Session = Depends(get_db),
):
    member = (
        db.query(CommitteeMember)
        .filter(CommitteeMember.id == member_id)
        .first()
    )

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Committee member not found",
        )

    get_accessible_committee(
        db,
        current_user,
        member.committee_id,
    )

    old_role = member.committee_role
    member.committee_role = normalize_committee_role(
        payload.committee_role
    )

    record_audit(
        db,
        user=current_user,
        action="COMMITTEE_MEMBER_UPDATE",
        entity_type="CommitteeMember",
        entity_id=member.id,
        old_values={"committee_role": old_role},
        new_values={"committee_role": member.committee_role},
        institution_id=current_user.institution_id,
    )
    db.commit()
    db.refresh(member)

    return serialize_member(db, member)


@management_router.delete("/members/{member_id}")
def remove_committee_member(
    member_id: int,
    current_user: User = Depends(require_committee_manager),
    db: Session = Depends(get_db),
):
    member = (
        db.query(CommitteeMember)
        .filter(CommitteeMember.id == member_id)
        .first()
    )

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Committee member not found",
        )

    committee = get_accessible_committee(
        db,
        current_user,
        member.committee_id,
    )

    record_audit(
        db,
        user=current_user,
        action="COMMITTEE_MEMBER_REMOVE",
        entity_type="CommitteeMember",
        entity_id=member.id,
        old_values={
            "committee_id": member.committee_id,
            "user_id": member.user_id,
        },
        institution_id=committee.institution_id,
    )
    db.delete(member)
    db.commit()

    return {
        "message": "Committee member removed successfully",
        "member_id": member_id,
    }
