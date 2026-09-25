from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models import (
    AccreditationCycle,
    Institution,
    User,
)
from app.schemas.accreditation_cycle import (
    AccreditationCycleCreate,
    AccreditationCycleUpdate,
    AccreditationCycleResponse,
)
from app.auth.dependencies import require_permission


# ============================================================
# ACCREDITATION CYCLE ROUTER
# ============================================================

router = APIRouter(
    prefix="/accreditation-cycles",
    tags=["Accreditation Cycles"]
)


# ============================================================
# DATABASE DEPENDENCY
# ============================================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ============================================================
# CREATE ACCREDITATION CYCLE
# ============================================================

@router.post(
    "",
    response_model=AccreditationCycleResponse,
    status_code=status.HTTP_201_CREATED
)
def create_accreditation_cycle(
    cycle_data: AccreditationCycleCreate,
    current_user: User = Depends(
        require_permission(
            "ACCREDITATION_CYCLES",
            "Create"
        )
    ),
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # 1. Check whether institution exists
    # --------------------------------------------------------

    institution = db.query(Institution).filter(
        Institution.id == cycle_data.institution_id
    ).first()

    if not institution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Institution not found"
        )

    # --------------------------------------------------------
    # 2. Check duplicate cycle code
    # --------------------------------------------------------

    existing = db.query(AccreditationCycle).filter(
        AccreditationCycle.code == cycle_data.code
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Accreditation cycle code already exists"
        )

    # --------------------------------------------------------
    # 3. Create accreditation cycle
    # --------------------------------------------------------

    cycle = AccreditationCycle(
        institution_id=cycle_data.institution_id,
        name=cycle_data.name,
        code=cycle_data.code,
        academic_period=cycle_data.academic_period,
        status=cycle_data.status,
        description=cycle_data.description,
        created_by=current_user.id
    )

    db.add(cycle)
    db.commit()
    db.refresh(cycle)

    return cycle


# ============================================================
# GET ALL ACCREDITATION CYCLES
# ============================================================

@router.get(
    "",
    response_model=list[AccreditationCycleResponse]
)
def get_accreditation_cycles(
    current_user: User = Depends(
        require_permission(
            "ACCREDITATION_CYCLES",
            "View"
        )
    ),
    db: Session = Depends(get_db)
):

    cycles = db.query(AccreditationCycle).all()

    return cycles


# ============================================================
# GET SINGLE ACCREDITATION CYCLE
# ============================================================

@router.get(
    "/{cycle_id}",
    response_model=AccreditationCycleResponse
)
def get_accreditation_cycle(
    cycle_id: int,
    current_user: User = Depends(
        require_permission(
            "ACCREDITATION_CYCLES",
            "View"
        )
    ),
    db: Session = Depends(get_db)
):

    cycle = db.query(AccreditationCycle).filter(
        AccreditationCycle.id == cycle_id
    ).first()

    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Accreditation cycle not found"
        )

    return cycle


# ============================================================
# UPDATE ACCREDITATION CYCLE
# ============================================================

@router.put(
    "/{cycle_id}",
    response_model=AccreditationCycleResponse
)
def update_accreditation_cycle(
    cycle_id: int,
    cycle_data: AccreditationCycleUpdate,
    current_user: User = Depends(
        require_permission(
            "ACCREDITATION_CYCLES",
            "Edit"
        )
    ),
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # 1. Find cycle
    # --------------------------------------------------------

    cycle = db.query(AccreditationCycle).filter(
        AccreditationCycle.id == cycle_id
    ).first()

    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Accreditation cycle not found"
        )

    # --------------------------------------------------------
    # 2. Check institution if it is being changed
    # --------------------------------------------------------

    update_data = cycle_data.model_dump(
        exclude_unset=True
    )

    if "institution_id" in update_data:

        institution = db.query(Institution).filter(
            Institution.id == update_data["institution_id"]
        ).first()

        if not institution:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Institution not found"
            )

    # --------------------------------------------------------
    # 3. Check duplicate cycle code
    # --------------------------------------------------------

    if "code" in update_data:

        existing = db.query(AccreditationCycle).filter(
            AccreditationCycle.code == update_data["code"],
            AccreditationCycle.id != cycle_id
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Accreditation cycle code already exists"
            )

    # --------------------------------------------------------
    # 4. Update fields
    # --------------------------------------------------------

    for field, value in update_data.items():
        setattr(cycle, field, value)

    db.commit()
    db.refresh(cycle)

    return cycle


# ============================================================
# DELETE ACCREDITATION CYCLE
# ============================================================

@router.delete(
    "/{cycle_id}"
)
def delete_accreditation_cycle(
    cycle_id: int,
    current_user: User = Depends(
        require_permission(
            "ACCREDITATION_CYCLES",
            "Delete"
        )
    ),
    db: Session = Depends(get_db)
):

    # --------------------------------------------------------
    # 1. Find cycle
    # --------------------------------------------------------

    cycle = db.query(AccreditationCycle).filter(
        AccreditationCycle.id == cycle_id
    ).first()

    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Accreditation cycle not found"
        )

    # --------------------------------------------------------
    # 2. Delete cycle
    # --------------------------------------------------------

    db.delete(cycle)
    db.commit()

    return {
        "message": "Accreditation cycle deleted successfully",
        "cycle_id": cycle_id
    }