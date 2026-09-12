from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import (
    academic_years,
    audit_log,
    auth,
    coordinator,
    criteria,
    dashboard,
    departments,
    evidence,
    files,
    institutions,
    reviews,
    submissions,
)

app = FastAPI(
    title="NAAC Accreditation Platform — Phase 2 API",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(institutions.router, prefix="/api/v1")
app.include_router(departments.router, prefix="/api/v1")
app.include_router(academic_years.router, prefix="/api/v1")
app.include_router(files.router, prefix="/api/v1")
app.include_router(audit_log.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(criteria.router, prefix="/api/v1")
app.include_router(evidence.router, prefix="/api/v1")
app.include_router(submissions.router, prefix="/api/v1")
app.include_router(reviews.router, prefix="/api/v1")
app.include_router(coordinator.router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}
