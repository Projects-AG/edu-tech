from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import get_db, get_current_user
from app.models import User
from app.services.report_service import calculate_institution_reports

router = APIRouter(
    prefix="/reports",
    tags=["NAAC Reports"]
)


@router.get("/summary")
def get_summary_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return calculate_institution_reports(db, current_user.institution_id)


@router.get("/aqar")
def get_aqar_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reports = calculate_institution_reports(db, current_user.institution_id)
    return {
        "report_type": "AQAR (Annual Quality Assurance Report)",
        "academic_year": "2025-2026",
        "data": reports
    }


@router.get("/ssr")
def get_ssr_report(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    reports = calculate_institution_reports(db, current_user.institution_id)
    return {
        "report_type": "SSR (Self Study Report)",
        "cycle": "Cycle 3",
        "data": reports
    }
