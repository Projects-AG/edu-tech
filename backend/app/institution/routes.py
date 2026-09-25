from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models import Institution, User
from app.schemas.institution import (
    InstitutionCreate,
    InstitutionUpdate,
    InstitutionResponse,
)
from app.auth.dependencies import (
    get_current_user,
    require_permission,
)


router = APIRouter(
    prefix="/institutions",
    tags=["Institution Management"]
)


# --------------------------------------------------
# Database dependency
# --------------------------------------------------

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# --------------------------------------------------
# CREATE INSTITUTION
# --------------------------------------------------

@router.post(
    "",
    response_model=InstitutionResponse,
    status_code=status.HTTP_201_CREATED
)
def create_institution(
    institution_data: InstitutionCreate,
    current_user: User = Depends(
        require_permission(
            "INSTITUTION_MANAGEMENT",
            "Create"
        )
    ),
    db: Session = Depends(get_db)
):

    # Check duplicate institution code
    existing = db.query(Institution).filter(
        Institution.code == institution_data.code
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Institution code already exists"
        )

    institution = Institution(
        name=institution_data.name,
        code=institution_data.code,
        address=institution_data.address,
        city=institution_data.city,
        state=institution_data.state,
        pincode=institution_data.pincode,
        institution_type=institution_data.institution_type,
        established_year=institution_data.established_year,
        website=institution_data.website,
        created_by=current_user.id
    )

    db.add(institution)
    db.commit()
    db.refresh(institution)

    return institution


# --------------------------------------------------
# GET ALL INSTITUTIONS
# --------------------------------------------------

@router.get(
    "",
    response_model=list[InstitutionResponse]
)
def get_institutions(
    current_user: User = Depends(
        require_permission(
            "INSTITUTION_MANAGEMENT",
            "View"
        )
    ),
    db: Session = Depends(get_db)
):

    institutions = db.query(Institution).all()

    return institutions


# --------------------------------------------------
# GET SINGLE INSTITUTION
# --------------------------------------------------

@router.get(
    "/{institution_id}",
    response_model=InstitutionResponse
)
def get_institution(
    institution_id: int,
    current_user: User = Depends(
        require_permission(
            "INSTITUTION_MANAGEMENT",
            "View"
        )
    ),
    db: Session = Depends(get_db)
):

    institution = db.query(Institution).filter(
        Institution.id == institution_id
    ).first()

    if not institution:
        raise HTTPException(
            status_code=404,
            detail="Institution not found"
        )

    return institution


# --------------------------------------------------
# UPDATE INSTITUTION
# --------------------------------------------------

@router.put(
    "/{institution_id}",
    response_model=InstitutionResponse
)
def update_institution(
    institution_id: int,
    institution_data: InstitutionUpdate,
    current_user: User = Depends(
        require_permission(
            "INSTITUTION_MANAGEMENT",
            "Edit"
        )
    ),
    db: Session = Depends(get_db)
):

    institution = db.query(Institution).filter(
        Institution.id == institution_id
    ).first()

    if not institution:
        raise HTTPException(
            status_code=404,
            detail="Institution not found"
        )

    update_data = institution_data.model_dump(
        exclude_unset=True
    )

    # Check duplicate code if code is being changed
    if "code" in update_data:

        existing = db.query(Institution).filter(
            Institution.code == update_data["code"],
            Institution.id != institution_id
        ).first()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="Institution code already exists"
            )

    for field, value in update_data.items():
        setattr(institution, field, value)

    db.commit()
    db.refresh(institution)

    return institution


# --------------------------------------------------
# DELETE INSTITUTION
# --------------------------------------------------

@router.delete(
    "/{institution_id}"
)
def delete_institution(
    institution_id: int,
    current_user: User = Depends(
        require_permission(
            "INSTITUTION_MANAGEMENT",
            "Delete"
        )
    ),
    db: Session = Depends(get_db)
):

    institution = db.query(Institution).filter(
        Institution.id == institution_id
    ).first()

    if not institution:
        raise HTTPException(
            status_code=404,
            detail="Institution not found"
        )

    db.delete(institution)
    db.commit()

    return {
        "message": "Institution deleted successfully",
        "institution_id": institution_id
    }