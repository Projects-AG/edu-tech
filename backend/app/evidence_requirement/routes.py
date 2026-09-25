from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.auth.dependencies import (
    get_db,
    get_current_user,
    require_permission
)

from app.models import (
    EvidenceRequirement,
    Metric,
    User
)

from app.schemas.evidence_requirement import (
    EvidenceRequirementCreate,
    EvidenceRequirementUpdate,
    EvidenceRequirementResponse
)


router = APIRouter(
    prefix="/evidence-requirements",
    tags=["NAAC Evidence Requirements"]
)


# ============================================================
# GET ALL EVIDENCE REQUIREMENTS
# ============================================================

@router.get(
    "",
    response_model=List[EvidenceRequirementResponse]
)
def get_evidence_requirements(
    metric_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    query = db.query(EvidenceRequirement)

    if metric_id is not None:
        query = query.filter(
            EvidenceRequirement.metric_id == metric_id
        )

    return query.order_by(
        EvidenceRequirement.id.asc()
    ).all()


# ============================================================
# GET EVIDENCE REQUIREMENT BY ID
# ============================================================

@router.get(
    "/{evidence_id}",
    response_model=EvidenceRequirementResponse
)
def get_evidence_requirement(
    evidence_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    evidence = db.query(EvidenceRequirement).filter(
        EvidenceRequirement.id == evidence_id
    ).first()

    if not evidence:
        raise HTTPException(
            status_code=404,
            detail="Evidence requirement not found"
        )

    return evidence


# ============================================================
# CREATE EVIDENCE REQUIREMENT
# ============================================================

@router.post(
    "",
    response_model=EvidenceRequirementResponse,
    status_code=status.HTTP_201_CREATED
)
def create_evidence_requirement(
    evidence_data: EvidenceRequirementCreate,
    current_user: User = Depends(
        require_permission("CRITERIA_1", "Create")
    ),
    db: Session = Depends(get_db)
):

    # Check metric exists
    metric = db.query(Metric).filter(
        Metric.id == evidence_data.metric_id
    ).first()

    if not metric:
        raise HTTPException(
            status_code=404,
            detail="Metric not found"
        )

    evidence = EvidenceRequirement(
        metric_id=evidence_data.metric_id,
        title=evidence_data.title,
        description=evidence_data.description,
        required=evidence_data.required,
        allowed_file_types=evidence_data.allowed_file_types,
        max_files=evidence_data.max_files
    )

    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    return evidence


# ============================================================
# UPDATE EVIDENCE REQUIREMENT
# ============================================================

@router.put(
    "/{evidence_id}",
    response_model=EvidenceRequirementResponse
)
def update_evidence_requirement(
    evidence_id: int,
    evidence_data: EvidenceRequirementUpdate,
    current_user: User = Depends(
        require_permission("CRITERIA_1", "Update")
    ),
    db: Session = Depends(get_db)
):

    evidence = db.query(EvidenceRequirement).filter(
        EvidenceRequirement.id == evidence_id
    ).first()

    if not evidence:
        raise HTTPException(
            status_code=404,
            detail="Evidence requirement not found"
        )

    update_data = evidence_data.model_dump(
        exclude_unset=True
    )

    for key, value in update_data.items():
        setattr(evidence, key, value)

    db.commit()
    db.refresh(evidence)

    return evidence


# ============================================================
# DELETE EVIDENCE REQUIREMENT
# ============================================================

@router.delete("/{evidence_id}")
def delete_evidence_requirement(
    evidence_id: int,
    current_user: User = Depends(
        require_permission("CRITERIA_1", "Delete")
    ),
    db: Session = Depends(get_db)
):

    evidence = db.query(EvidenceRequirement).filter(
        EvidenceRequirement.id == evidence_id
    ).first()

    if not evidence:
        raise HTTPException(
            status_code=404,
            detail="Evidence requirement not found"
        )

    db.delete(evidence)
    db.commit()

    return {
        "message": "Evidence requirement deleted successfully"
    }