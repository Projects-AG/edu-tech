from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.auth.dependencies import (
    get_db,
    get_current_user,
    require_permission
)

from app.models import Section, Criterion, User

from app.schemas.section import (
    SectionCreate,
    SectionUpdate,
    SectionResponse
)


router = APIRouter(
    prefix="/sections",
    tags=["NAAC Sections"]
)


# ============================================================
# GET ALL SECTIONS
# ============================================================

@router.get("", response_model=List[SectionResponse])
def get_sections(
    criterion_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    query = db.query(Section)

    if criterion_id is not None:
        query = query.filter(
            Section.criterion_id == criterion_id
        )

    return query.order_by(
        Section.display_order.asc()
    ).all()


# ============================================================
# GET SECTION BY ID
# ============================================================

@router.get("/{section_id}", response_model=SectionResponse)
def get_section(
    section_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    section = db.query(Section).filter(
        Section.id == section_id
    ).first()

    if not section:
        raise HTTPException(
            status_code=404,
            detail="Section not found"
        )

    return section


# ============================================================
# CREATE SECTION
# ============================================================

@router.post(
    "",
    response_model=SectionResponse,
    status_code=status.HTTP_201_CREATED
)
def create_section(
    section_data: SectionCreate,
    current_user: User = Depends(
        require_permission("CRITERIA_1", "Create")
    ),
    db: Session = Depends(get_db)
):

    # Check criterion exists
    criterion = db.query(Criterion).filter(
        Criterion.id == section_data.criterion_id
    ).first()

    if not criterion:
        raise HTTPException(
            status_code=404,
            detail="Criterion not found"
        )

    section = Section(
        criterion_id=section_data.criterion_id,
        code=section_data.code,
        title=section_data.title,
        description=section_data.description,
        weightage=section_data.weightage,
        display_order=section_data.display_order
    )

    db.add(section)
    db.commit()
    db.refresh(section)

    return section


# ============================================================
# UPDATE SECTION
# ============================================================

@router.put(
    "/{section_id}",
    response_model=SectionResponse
)
def update_section(
    section_id: int,
    section_data: SectionUpdate,
    current_user: User = Depends(
        require_permission("CRITERIA_1", "Update")
    ),
    db: Session = Depends(get_db)
):

    section = db.query(Section).filter(
        Section.id == section_id
    ).first()

    if not section:
        raise HTTPException(
            status_code=404,
            detail="Section not found"
        )

    update_data = section_data.model_dump(
        exclude_unset=True
    )

    for key, value in update_data.items():
        setattr(section, key, value)

    db.commit()
    db.refresh(section)

    return section


# ============================================================
# DELETE SECTION
# ============================================================

@router.delete("/{section_id}")
def delete_section(
    section_id: int,
    current_user: User = Depends(
        require_permission("CRITERIA_1", "Delete")
    ),
    db: Session = Depends(get_db)
):

    section = db.query(Section).filter(
        Section.id == section_id
    ).first()

    if not section:
        raise HTTPException(
            status_code=404,
            detail="Section not found"
        )

    db.delete(section)
    db.commit()

    return {
        "message": "Section deleted successfully"
    }