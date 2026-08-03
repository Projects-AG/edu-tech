# NAAC Platform — Foundation API (FastAPI)

Phase 1 (Foundation) implementation: auth, scoped RBAC, institutions,
departments, academic years, file uploads, audit logs, and a basic
dashboard summary endpoint.

## Setup

```bash
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env               # then edit DATABASE_URL / secrets

# Create the MySQL database first, e.g.:
#   mysql -u root -p -e "CREATE DATABASE naac_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
alembic revision --autogenerate -m "init"
alembic upgrade head

uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs (Swagger, auto-generated)

## Structure

```
app/
  core/       settings, JWT + password hashing
  db/         SQLAlchemy engine/session/base
  models/     ORM models (Institution, Department, User, RoleAssignment, ...)
  schemas/    Pydantic request/response schemas
  deps/       get_current_user, require_roles (scoped RBAC dependency)
  api/v1/     routers: auth, institutions, departments, academic_years,
              files, audit_log, dashboard
  main.py     FastAPI app + router wiring
alembic/      migrations
```

## Auth flow

1. `POST /api/v1/auth/register` — create a user under an institution
   (create the `Institution` first via `POST /api/v1/institutions`,
   which requires an ADMIN role — seed your first admin + institution
   directly in the DB for bootstrapping).
2. Assign roles by inserting rows into `role_assignments` (no endpoint yet —
   add a `RoleAssignmentsController` in Phase 1 hardening, or seed via SQL
   for now).
3. `POST /api/v1/auth/login` — returns `access_token` + `refresh_token`.
4. Use `Authorization: Bearer <access_token>` on all other endpoints.
5. `POST /api/v1/auth/refresh` — exchange a valid refresh token for a new
   access token.

## Scoped RBAC — important note

`require_roles(...)` (in `app/deps/deps.py`) proves a user holds a role
*somewhere* in the system. For department- or (from Phase 2) criterion-scoped
actions, add an explicit check against `RoleAssignment.scope_type` /
`department_id` in the route handler itself — role name alone is not enough
to prove access to a *specific* department's data. See the domain model spec
(section 3, Roles & Permissions Matrix) for the intended scoping rules.

## Not yet implemented (intentionally, per Phase 1 scope)

- Role assignment CRUD endpoints (seed manually for now)
- S3/R2/MinIO file storage (currently writes to local disk — swap the
  `files.py` router's local-write block for a `boto3` `upload_fileobj` call)
- Refresh token revocation endpoint / logout
- Phase 2+: Accreditation Cycle, Criteria, Key Indicators, Metrics, Evidence
