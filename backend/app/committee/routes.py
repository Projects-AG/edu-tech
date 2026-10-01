from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_db, get_current_user
from app.models import (
    User,
    Criterion,
    Document,
    Submission,
    Committee,
    CommitteeMember,
    CommitteeCriterionAssignment,
)

from app.schemas.committee import (
    CommitteeCreate,
    CommitteeUpdate,
    CommitteeResponse,
    CommitteeMemberCreate,
    CommitteeMemberResponse,
    CommitteeAssignmentCreate,
    CommitteeAssignmentResponse,
)

router = APIRouter(
    prefix="/committee",
    tags=["Committee Member"]
)


@router.get("/dashboard")
def committee_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    inst_id = current_user.institution_id
    sub_query = db.query(Submission)
    doc_query = db.query(Document)

    if inst_id:
        sub_query = sub_query.filter(Submission.institution_id == inst_id)
        doc_query = doc_query.filter(Document.institution_id == inst_id)

    total_criteria = db.query(Criterion).count()
    documents_collected = doc_query.count()
    total_submissions = sub_query.count()
    pending_items = sub_query.filter(Submission.status == "Draft").count()

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

# ============================================================
# CREATE COMMITTEE
# ============================================================

@router.post(
    "",
    response_model=CommitteeResponse,
    status_code=status.HTTP_201_CREATED
)
def create_committee(
    committee_data: CommitteeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.institution_id:
        raise HTTPException(
            status_code=400,
            detail="User is not associated with an institution"
        )

    if committee_data.chairperson_id is not None:
        chairperson = (
            db.query(User)
            .filter(User.id == committee_data.chairperson_id)
            .first()
        )

        if not chairperson:
            raise HTTPException(
                status_code=404,
                detail="Chairperson not found"
            )

        if chairperson.institution_id != current_user.institution_id:
            raise HTTPException(
                status_code=403,
                detail="Chairperson must belong to the same institution"
            )

    committee = Committee(
        institution_id=current_user.institution_id,
        name=committee_data.name,
        description=committee_data.description,
        chairperson_id=committee_data.chairperson_id,
        status=committee_data.status
    )

    db.add(committee)
    db.commit()
    db.refresh(committee)

    return committee


# ============================================================
# GET ALL COMMITTEES
# ============================================================

@router.get(
    "",
    response_model=list[CommitteeResponse]
)
def get_committees(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.institution_id:
        return []

    return (
        db.query(Committee)
        .filter(
            Committee.institution_id == current_user.institution_id
        )
        .all()
    )


# ============================================================
# GET SINGLE COMMITTEE
# ============================================================

@router.get(
    "/{committee_id}",
    response_model=CommitteeResponse
)
def get_committee(
    committee_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    committee = (
        db.query(Committee)
        .filter(
            Committee.id == committee_id,
            Committee.institution_id == current_user.institution_id
        )
        .first()
    )

    if not committee:
        raise HTTPException(
            status_code=404,
            detail="Committee not found"
        )

    return committee


# ============================================================
# UPDATE COMMITTEE
# ============================================================

@router.put(
    "/{committee_id}",
    response_model=CommitteeResponse
)
def update_committee(
    committee_id: int,
    committee_data: CommitteeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    committee = (
        db.query(Committee)
        .filter(
            Committee.id == committee_id,
            Committee.institution_id == current_user.institution_id
        )
        .first()
    )

    if not committee:
        raise HTTPException(
            status_code=404,
            detail="Committee not found"
        )

    update_data = committee_data.model_dump(
        exclude_unset=True
    )

    if "chairperson_id" in update_data:
        chairperson_id = update_data["chairperson_id"]

        if chairperson_id is not None:
            chairperson = (
                db.query(User)
                .filter(User.id == chairperson_id)
                .first()
            )

            if not chairperson:
                raise HTTPException(
                    status_code=404,
                    detail="Chairperson not found"
                )

            if chairperson.institution_id != current_user.institution_id:
                raise HTTPException(
                    status_code=403,
                    detail="Chairperson must belong to the same institution"
                )

    for field, value in update_data.items():
        setattr(committee, field, value)

    db.commit()
    db.refresh(committee)

    return committee


# ============================================================
# DELETE COMMITTEE
# ============================================================

@router.delete("/{committee_id}")
def delete_committee(
    committee_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    committee = (
        db.query(Committee)
        .filter(
            Committee.id == committee_id,
            Committee.institution_id == current_user.institution_id
        )
        .first()
    )

    if not committee:
        raise HTTPException(
            status_code=404,
            detail="Committee not found"
        )

    db.delete(committee)
    db.commit()

    return {
        "message": "Committee deleted successfully",
        "committee_id": committee_id
    }


##Committee Member Routes

# ============================================================
# ADD COMMITTEE MEMBER
# ============================================================

@router.post(
    "/{committee_id}/members",
    response_model=CommitteeMemberResponse,
    status_code=status.HTTP_201_CREATED
)
def add_committee_member(
    committee_id: int,
    member_data: CommitteeMemberCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.institution_id:
        raise HTTPException(
            status_code=400,
            detail="User is not associated with an institution"
        )

    committee = (
        db.query(Committee)
        .filter(
            Committee.id == committee_id,
            Committee.institution_id == current_user.institution_id
        )
        .first()
    )

    if not committee:
        raise HTTPException(
            status_code=404,
            detail="Committee not found"
        )

    user = (
        db.query(User)
        .filter(User.id == member_data.user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    if user.institution_id != current_user.institution_id:
        raise HTTPException(
            status_code=403,
            detail="User must belong to the same institution"
        )

    existing_member = (
        db.query(CommitteeMember)
        .filter(
            CommitteeMember.committee_id == committee_id,
            CommitteeMember.user_id == member_data.user_id
        )
        .first()
    )

    if existing_member:
        raise HTTPException(
            status_code=409,
            detail="User is already a member of this committee"
        )

    committee_member = CommitteeMember(
        committee_id=committee_id,
        user_id=member_data.user_id,
        committee_role=member_data.committee_role
    )

    db.add(committee_member)
    db.commit()
    db.refresh(committee_member)

    return committee_member


# ============================================================
# GET COMMITTEE MEMBERS
# ============================================================

@router.get(
    "/{committee_id}/members",
    response_model=list[CommitteeMemberResponse]
)
def get_committee_members(
    committee_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.institution_id:
        return []

    committee = (
        db.query(Committee)
        .filter(
            Committee.id == committee_id,
            Committee.institution_id == current_user.institution_id
        )
        .first()
    )

    if not committee:
        raise HTTPException(
            status_code=404,
            detail="Committee not found"
        )

    return (
        db.query(CommitteeMember)
        .join(User, User.id == CommitteeMember.user_id)
        .filter(
            CommitteeMember.committee_id == committee_id,
            User.institution_id == current_user.institution_id
        )
        .all()
    )


# ============================================================
# REMOVE COMMITTEE MEMBER
# ============================================================

@router.delete(
    "/{committee_id}/members/{user_id}"
)
def remove_committee_member(
    committee_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.institution_id:
        raise HTTPException(
            status_code=400,
            detail="User is not associated with an institution"
        )

    committee = (
        db.query(Committee)
        .filter(
            Committee.id == committee_id,
            Committee.institution_id == current_user.institution_id
        )
        .first()
    )

    if not committee:
        raise HTTPException(
            status_code=404,
            detail="Committee not found"
        )

    committee_member = (
        db.query(CommitteeMember)
        .join(User, User.id == CommitteeMember.user_id)
        .filter(
            CommitteeMember.committee_id == committee_id,
            CommitteeMember.user_id == user_id,
            User.institution_id == current_user.institution_id
        )
        .first()
    )

    if not committee_member:
        raise HTTPException(
            status_code=404,
            detail="Committee member not found"
        )

    db.delete(committee_member)
    db.commit()

    return {
        "message": "Committee member removed successfully",
        "committee_id": committee_id,
        "user_id": user_id
    }



# ============================================================
# ASSIGN CRITERION RESPONSIBILITY
# ============================================================

@router.post(
    "/{committee_id}/assignments",
    response_model=CommitteeAssignmentResponse,
    status_code=status.HTTP_201_CREATED
)
def assign_criterion_to_member(
    committee_id: int,
    assignment_data: CommitteeAssignmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    committee = (
        db.query(Committee)
        .filter(
            Committee.id == committee_id,
            Committee.institution_id == current_user.institution_id
        )
        .first()
    )

    if not committee:
        raise HTTPException(
            status_code=404,
            detail="Committee not found"
        )

    member = (
        db.query(CommitteeMember)
        .filter(
            CommitteeMember.id == assignment_data.committee_member_id,
            CommitteeMember.committee_id == committee_id
        )
        .first()
    )

    if not member:
        raise HTTPException(
            status_code=404,
            detail="Committee member not found"
        )

    criterion = (
        db.query(Criterion)
        .filter(Criterion.id == assignment_data.criterion_id)
        .first()
    )

    if not criterion:
        raise HTTPException(
            status_code=404,
            detail="Criterion not found"
        )

    existing = (
        db.query(CommitteeCriterionAssignment)
        .filter(
            CommitteeCriterionAssignment.committee_member_id
            == member.id,
            CommitteeCriterionAssignment.criterion_id
            == criterion.id
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Criterion is already assigned to this committee member"
        )

    assignment = CommitteeCriterionAssignment(
        committee_id=committee_id,
        committee_member_id=member.id,
        criterion_id=criterion.id,
        responsibility=assignment_data.responsibility
    )

    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    return assignment


# ============================================================
# GET COMMITTEE ASSIGNMENTS
# ============================================================

@router.get(
    "/{committee_id}/assignments",
    response_model=list[CommitteeAssignmentResponse]
)
def get_committee_assignments(
    committee_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    committee = (
        db.query(Committee)
        .filter(
            Committee.id == committee_id,
            Committee.institution_id == current_user.institution_id
        )
        .first()
    )

    if not committee:
        raise HTTPException(
            status_code=404,
            detail="Committee not found"
        )

    return (
        db.query(CommitteeCriterionAssignment)
        .filter(
            CommitteeCriterionAssignment.committee_id == committee_id
        )
        .all()
    )


# ============================================================
# REMOVE CRITERION ASSIGNMENT
# ============================================================

@router.delete(
    "/{committee_id}/assignments/{assignment_id}"
)
def remove_criterion_assignment(
    committee_id: int,
    assignment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    committee = (
        db.query(Committee)
        .filter(
            Committee.id == committee_id,
            Committee.institution_id == current_user.institution_id
        )
        .first()
    )

    if not committee:
        raise HTTPException(
            status_code=404,
            detail="Committee not found"
        )

    assignment = (
        db.query(CommitteeCriterionAssignment)
        .filter(
            CommitteeCriterionAssignment.id == assignment_id,
            CommitteeCriterionAssignment.committee_id == committee_id
        )
        .first()
    )

    if not assignment:
        raise HTTPException(
            status_code=404,
            detail="Assignment not found"
        )

    db.delete(assignment)
    db.commit()

    return {
        "message": "Criterion assignment removed successfully",
        "assignment_id": assignment_id
    }