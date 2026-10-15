from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, get_db
from app.models import Module, Permission, Role, RoleModulePermission, NaacFramework, User
from app.schemas.naac_framework import (
    FrameworkRecommendationRequest,
    FrameworkRecommendationResponse,
    InstitutionCategoryOption,
    NaacFrameworkResponse,
)
from app.services.framework_service import (
    ensure_naac_frameworks,
    recommend_framework,
    serialize_framework_with_criteria,
)
from app.services.naac_framework_catalog import OFFICIAL_CATEGORIES


public_router = APIRouter(
    prefix="/public",
    tags=["Public NAAC Frameworks"],
)

router = APIRouter(
    prefix="/naac-frameworks",
    tags=["NAAC Frameworks"],
)


@public_router.get(
    "/institution-categories",
    response_model=list[InstitutionCategoryOption],
)
def list_public_institution_categories():
    return OFFICIAL_CATEGORIES


@public_router.post(
    "/framework-recommendation",
    response_model=FrameworkRecommendationResponse,
)
def public_framework_recommendation(
    payload: FrameworkRecommendationRequest,
    db: Session = Depends(get_db),
):
    try:
        return recommend_framework(db, payload.model_dump())
    finally:
        db.rollback()


def _has_module_view(db: Session, user: User, module_code: str) -> bool:
    role = db.query(Role).filter(Role.id == user.role_id).first()
    module = db.query(Module).filter(Module.code == module_code).first()
    permission = db.query(Permission).filter(Permission.name == "View").first()
    if not role or not module or not permission:
        return False
    return (
        db.query(RoleModulePermission)
        .filter(
            RoleModulePermission.role_id == role.id,
            RoleModulePermission.module_id == module.id,
            RoleModulePermission.permission_id == permission.id,
            RoleModulePermission.allowed.is_(True),
        )
        .first()
        is not None
    )


@router.get(
    "",
    response_model=list[NaacFrameworkResponse],
)
def list_naac_frameworks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not (
        _has_module_view(db, current_user, "ACCREDITATION_CYCLES")
        or _has_module_view(db, current_user, "INSTITUTION_MANAGEMENT")
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: View access to NAAC frameworks",
        )
    ensure_naac_frameworks(db)
    db.commit()
    rows = db.query(NaacFramework).order_by(NaacFramework.id.asc()).all()
    return [serialize_framework_with_criteria(db, row) for row in rows]
