from fastapi import FastAPI

from app.api.v1 import auth, institutions, departments, academic_years, files, audit_log, dashboard

app = FastAPI(title="NAAC Accreditation Platform — Foundation API", version="0.1.0")

app.include_router(auth.router, prefix="/api/v1")
app.include_router(institutions.router, prefix="/api/v1")
app.include_router(departments.router, prefix="/api/v1")
app.include_router(academic_years.router, prefix="/api/v1")
app.include_router(files.router, prefix="/api/v1")
app.include_router(audit_log.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}
