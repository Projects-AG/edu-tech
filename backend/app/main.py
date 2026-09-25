from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.auth.routes import router as auth_router
from app.institution.routes import router as institution_router
from app.accreditation.routes import router as accreditation_router
from app.admin.routes import router as admin_router
from app.coordinator.routes import router as coordinator_router
from app.department.routes import router as department_router
from app.faculty.routes import router as faculty_router

from app.criteria.routes import router as criteria_router
from app.section.routes import router as section_router
from app.metric.routes import router as metric_router
from app.evidence_requirement.routes import (
    router as evidence_requirement_router
)

from app.submission.routes import router as submission_router
from app.document.routes import router as document_router
from app.review.routes import router as review_router
from app.notification.routes import router as notification_router
from app.committee.routes import router as committee_router
from app.reviewer.routes import router as reviewer_router
from app.principal.routes import router as principal_router
from app.report.routes import router as report_router

from app.institution_request.routes import (
    router as institution_request_router
)


app = FastAPI(
    title="EduVerse NAAC API",
    description="Backend API for EduVerse NAAC Accreditation System",
    version="1.0.0"
)


# ============================================================
# STATIC FILES - EVIDENCE UPLOADS
# ============================================================

UPLOADS_DIR = (
    Path(__file__).resolve().parent.parent
    / "uploads"
)

UPLOADS_DIR.mkdir(
    parents=True,
    exist_ok=True
)

app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOADS_DIR)),
    name="uploads"
)


# ============================================================
# CORS CONFIGURATION
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ROUTES
# ============================================================

# ------------------------------------------------------------
# Core Authentication & Institution
# ------------------------------------------------------------

app.include_router(auth_router)
app.include_router(institution_router)


# ------------------------------------------------------------
# Roles & Accreditation Management
# ------------------------------------------------------------

app.include_router(accreditation_router)
app.include_router(admin_router)
app.include_router(coordinator_router)
app.include_router(department_router)
app.include_router(faculty_router)


# ------------------------------------------------------------
# NAAC Criteria Structure
# ------------------------------------------------------------

app.include_router(criteria_router)
app.include_router(section_router)
app.include_router(metric_router)
app.include_router(evidence_requirement_router)


# ------------------------------------------------------------
# Submissions & Documents
# ------------------------------------------------------------

app.include_router(submission_router)
app.include_router(document_router)


# ------------------------------------------------------------
# Review & Approval
# ------------------------------------------------------------

app.include_router(review_router)
app.include_router(notification_router)
app.include_router(committee_router)
app.include_router(reviewer_router)
app.include_router(principal_router)


# ------------------------------------------------------------
# Reports
# ------------------------------------------------------------

app.include_router(report_router)


# ------------------------------------------------------------
# Institution Registration Requests
# ------------------------------------------------------------

app.include_router(
    institution_request_router
)