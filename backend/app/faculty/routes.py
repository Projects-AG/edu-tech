from typing import List

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from sqlalchemy.orm import Session

from app.auth.dependencies import (
    get_db,
    get_current_user,
)

from app.models import (
    EvidenceRequirement,
    Metric,
    User,
)

from app.schemas.evidence_requirement import (
    EvidenceRequirementCreate,
    EvidenceRequirementUpdate,
    EvidenceRequirementResponse,
)


router = APIRouter(
    prefix="/evidence-requirements",
    tags=["Evidence Requirements"],
)


# ============================================================
# GET ALL EVIDENCE REQUIREMENTS
# ============================================================

@router.get(
    "",
    response_model=List[EvidenceRequirementResponse]
)
def get_evidence_requirements(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    return (
        db.query(EvidenceRequirement)
        .order_by(
            EvidenceRequirement.id.asc()
        )
        .all()
    )


# ============================================================
# GET EVIDENCE REQUIREMENTS BY METRIC
# ============================================================

@router.get(
    "/metric/{metric_id}",
    response_model=List[EvidenceRequirementResponse]
)
def get_evidence_requirements_by_metric(
    metric_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    metric = (
        db.query(Metric)
        .filter(
            Metric.id == metric_id
        )
        .first()
    )

    if not metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Metric not found",
        )

    return (
        db.query(EvidenceRequirement)
        .filter(
            EvidenceRequirement.metric_id
            == metric_id
        )
        .order_by(
            EvidenceRequirement.id.asc()
        )
        .all()
    )


# ============================================================
# GET SINGLE EVIDENCE REQUIREMENT
# ============================================================

@router.get(
    "/{requirement_id}",
    response_model=EvidenceRequirementResponse
)
def get_evidence_requirement(
    requirement_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    requirement = (
        db.query(EvidenceRequirement)
        .filter(
            EvidenceRequirement.id
            == requirement_id
        )
        .first()
    )

    if not requirement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence requirement not found",
        )

    return requirement


# ============================================================
# CREATE EVIDENCE REQUIREMENT
# ============================================================

@router.post(
    "",
    response_model=EvidenceRequirementResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_evidence_requirement(
    requirement_data: EvidenceRequirementCreate,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    metric = (
        db.query(Metric)
        .filter(
            Metric.id
            == requirement_data.metric_id
        )
        .first()
    )

    if not metric:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Metric not found",
        )

    requirement = EvidenceRequirement(
        metric_id=requirement_data.metric_id,
        title=requirement_data.title,
        description=requirement_data.description,
        required=requirement_data.required,
        allowed_file_types=(
            requirement_data.allowed_file_types
        ),
        max_files=requirement_data.max_files,
    )

    db.add(requirement)
    db.commit()
    db.refresh(requirement)

    return requirement


# ============================================================
# UPDATE EVIDENCE REQUIREMENT
# ============================================================

@router.put(
    "/{requirement_id}",
    response_model=EvidenceRequirementResponse,
)
def update_evidence_requirement(
    requirement_id: int,
    requirement_data: EvidenceRequirementUpdate,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    requirement = (
        db.query(EvidenceRequirement)
        .filter(
            EvidenceRequirement.id
            == requirement_id
        )
        .first()
    )

    if not requirement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence requirement not found",
        )

    update_data = (
        requirement_data.model_dump(
            exclude_unset=True
        )
    )

    for field, value in update_data.items():
        setattr(
            requirement,
            field,
            value
        )

    db.commit()
    db.refresh(requirement)

    return requirement


# ============================================================
# DELETE EVIDENCE REQUIREMENT
# ============================================================

@router.delete(
    "/{requirement_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_evidence_requirement(
    requirement_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    requirement = (
        db.query(EvidenceRequirement)
        .filter(
            EvidenceRequirement.id
            == requirement_id
        )
        .first()
    )

    if not requirement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence requirement not found",
        )

    db.delete(requirement)
    db.commit()

    return None