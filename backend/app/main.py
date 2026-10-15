import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.settings import CORS_ORIGINS

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
from app.committee.routes import (
    router as committee_router,
    management_router as committee_management_router,
)
from app.reviewer.routes import router as reviewer_router
from app.principal.routes import router as principal_router
from app.report.routes import router as report_router

from app.institution_request.routes import (
    router as institution_request_router
)
from app.naac_framework.routes import (
    public_router as naac_framework_public_router,
    router as naac_framework_router,
)
from app.audit.routes import router as audit_router


logger = logging.getLogger("eduverse")

app = FastAPI(
    title="EduVerse NAAC API",
    description="Backend API for EduVerse NAAC Accreditation System",
    version="1.0.0"
)


# ============================================================
# CORS CONFIGURATION
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
):
    if isinstance(exc, StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=exc.headers,
        )

    if isinstance(exc, RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={"detail": exc.errors()},
        )

    logger.exception(
        "Unhandled error on %s %s",
        request.method,
        request.url.path,
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected error occurred."
        },
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
app.include_router(committee_management_router)
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
app.include_router(naac_framework_public_router)
app.include_router(naac_framework_router)
app.include_router(audit_router)