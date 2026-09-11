# NAAC Platform — Foundation API (FastAPI)

Phase 1 (Foundation) implementation: PostgreSQL, JWT auth, role-based
registration, scoped RBAC, institutions, departments, academic years,
file uploads, audit logs, and a basic dashboard summary endpoint.

## Documentation & Architecture

- [Development diagram](https://apliaglobal77-my.sharepoint.com/:i:/g/personal/aniket_apliaglobal_com/IQDOrVPz0-71RoNiOlCeTbAJAboWP8zyGnxZZDVTomXw6Ds?e=oHfWiC)
- [NAAC modules](https://apliaglobal77-my.sharepoint.com/:t:/g/personal/aniket_apliaglobal_com/IQDrUgvd83AZQI0gcZwpixq1Afu51VrkT5X5zu0Zqxec-bw?e=RMfUqu)
- [Edu-tech architecture](https://apliaglobal77-my.sharepoint.com/:i:/g/personal/aniket_apliaglobal_com/IQCeafdTgGNnQKnU_BjJRB4CAcqQTEjY6TCKljgUkchTT8Y?e=hhcjre)
- [ER diagram (DrawSQL)](https://drawsql.app/draw?t=4c1c474e-e797-4bef-9080-03840901bf19&view=1)

## Setup

```bash
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env               # then edit DATABASE_URL / secrets

# Create the PostgreSQL database first, e.g.:
#   psql -U postgres -c "CREATE DATABASE naac_platform;"
alembic upgrade head

python scripts/seed_admin.py

uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs (Swagger, auto-generated)

Default seed login (change after first use):

- email: `admin@example.com`
- password: `ChangeMe123!`

## Structure

```
app/
  core/       settings, JWT + password hashing
  db/         SQLAlchemy engine/session/base
  models/     ORM models (Institution, Department, User, RoleAssignment, ...)
  schemas/    Pydantic request/response schemas
  constants/  role registration policy
  services/   user + auth business logic
  deps/       get_current_user, require_roles (scoped RBAC dependency)
  api/v1/     routers: auth, institutions, departments, academic_years,
              files, audit_log, dashboard
  main.py     FastAPI app + router wiring
alembic/      migrations
scripts/      bootstrap seed (first ADMIN)
```

## Auth flow

All roles use the same login endpoint. The JWT `roles` claim and `GET /auth/me`
tell the client which dashboard to show.

### Self-registration (public)

`POST /api/v1/auth/register` — only `DEPARTMENT_CONTRIBUTOR` and `FACULTY`.
Requires a valid `institution_id` and `department_id`.

Attempting to self-register as IQAC, Reviewer, Final Approver, or Admin returns 403.

### Admin / IQAC user creation

`POST /api/v1/auth/users` (ADMIN or IQAC_COORDINATOR):

- ADMIN may assign any role except ADMIN (ADMIN is seed-only)
- IQAC_COORDINATOR may assign CRITERION_INCHARGE, REVIEWER, DEPARTMENT_CONTRIBUTOR, FACULTY

`POST /api/v1/auth/users/{user_id}/roles` — add another scoped role to an existing user.

`GET /api/v1/auth/users` — list users in the actor's institution.

### Login / session

1. `POST /api/v1/auth/login` — returns `access_token`, `refresh_token`, `user`, and `roles`.
2. Use `Authorization: Bearer <access_token>` on protected endpoints.
3. `GET /api/v1/auth/me` — current user plus role assignments.
4. `POST /api/v1/auth/refresh` — exchange a valid refresh token for a new access token.
5. `POST /api/v1/auth/logout` — revoke the given refresh token, or all of the user's tokens if omitted.

## Role policy

| Role | Self-register | Who can create |
|------|---------------|----------------|
| DEPARTMENT_CONTRIBUTOR | Yes | Public, ADMIN, IQAC |
| FACULTY | Yes | Public, ADMIN, IQAC |
| CRITERION_INCHARGE | No | ADMIN, IQAC |
| REVIEWER | No | ADMIN, IQAC |
| IQAC_COORDINATOR | No | ADMIN |
| FINAL_APPROVER | No | ADMIN |
| ADMIN | No | Seed script only |

## Scoped RBAC — important note

`require_roles(...)` (in `app/deps/deps.py`) proves a user holds a role
*somewhere* in the system. For department- or (from Phase 2) criterion-scoped
actions, add an explicit check against `RoleAssignment.scope_type` /
`department_id` in the route handler itself — role name alone is not enough
to prove access to a *specific* department's data.

## Not yet implemented (intentionally, per Phase 1 scope)

- S3/R2/MinIO file storage (currently writes to local disk — swap the
  `files.py` router's local-write block for a `boto3` `upload_fileobj` call)
- Phase 2+: Accreditation Cycle, Criteria, Key Indicators, Metrics, Evidence
