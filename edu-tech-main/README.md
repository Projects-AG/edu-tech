# NAAC Platform — Foundation + Phase 2 API (FastAPI)

Phase 1 (Foundation): PostgreSQL, JWT auth, role-based registration,
scoped RBAC, institutions, departments, academic years, file uploads,
audit logs, and a basic dashboard summary endpoint.

Phase 2 (NAAC Coordinator domain): accreditation cycles, criteria /
key indicators / metrics catalog, evidence registry, submissions with
review workflow, and coordinator aggregate APIs that match the IQAC
frontend mock shapes.

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
python scripts/seed_naac_cycle.py

uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs (Swagger, auto-generated)

Default seed logins (change after first use):

| User | Email | Password | Role |
|------|-------|----------|------|
| Admin | `admin@example.com` | `ChangeMe123!` | ADMIN |
| IQAC / NAAC Coordinator | `iqac@example.com` | `ChangeMe123!` | IQAC_COORDINATOR |

(If `seed_admin.py` was customized earlier, use that admin password. IQAC credentials come from `scripts/seed_naac_cycle.py`.)

## Structure

```
app/
  core/       settings, JWT + password hashing
  db/         SQLAlchemy engine/session/base
  models/     ORM models (Institution … AccreditationCycle, Criterion, Evidence, …)
  schemas/    Pydantic request/response schemas (schemas.py + naac.py)
  constants/  role registration policy
  services/   auth, user, criteria, evidence, submission, coordinator
  deps/       get_current_user, require_roles
  api/v1/     routers (auth, foundation, criteria, evidence, submissions,
              reviews, coordinator)
  main.py     FastAPI app + router wiring
alembic/      migrations (001 foundation, 002 naac domain)
scripts/      seed_admin.py, seed_naac_cycle.py
```

## Auth flow

All roles use the same login endpoint. The JWT `roles` claim and `GET /auth/me`
tell the client which dashboard to show.

### Self-registration (public)

`POST /api/v1/auth/register` — only `DEPARTMENT_CONTRIBUTOR` and `FACULTY`.
Requires a valid `institution_id` and `department_id`.

### Admin / IQAC user creation

`POST /api/v1/auth/users` (ADMIN or IQAC_COORDINATOR):

- ADMIN may assign any role except ADMIN (ADMIN is seed-only)
- IQAC_COORDINATOR may assign CRITERION_INCHARGE, REVIEWER, DEPARTMENT_CONTRIBUTOR, FACULTY

`POST /api/v1/auth/users/{user_id}/roles` — add another scoped role (supports
`criterion_id` when `scope_type=CRITERION`).

### Login / session

1. `POST /api/v1/auth/login` — returns `access_token`, `refresh_token`, `user`, and `roles`.
2. Use `Authorization: Bearer <access_token>` on protected endpoints.
3. `GET /api/v1/auth/me` — current user plus role assignments.
4. `POST /api/v1/auth/refresh` — exchange refresh token for a new access token.
5. `POST /api/v1/auth/logout` — revoke refresh token(s).

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

## Phase 2 — NAAC Coordinator APIs

All under `/api/v1`, JWT-protected. Aggregates require `ADMIN` or `IQAC_COORDINATOR`.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/coordinator/dashboard?cycle_id=` | Welcome banner, stats, criteria progress, attention, recent submissions |
| GET | `/coordinator/departments?cycle_id=` | Department progress board |
| GET | `/coordinator/departments/{id}/criteria-breakdown` | Per-dept criteria % |
| GET | `/criteria?cycle_id=` | Criteria monitor cards + stats |
| GET | `/criteria/{id}` | Criterion detail + key indicators + metrics |
| GET | `/evidence?cycle_id=&status=&criterion_id=&department_id=&q=` | Documents registry |
| GET | `/evidence/stats?cycle_id=` | Document status counts |
| POST | `/evidence` | Attach uploaded file to metric + department |
| PATCH | `/evidence/{id}/status` | Verify / request correction |
| GET | `/submissions?cycle_id=&status=&q=` | Submissions board + stats |
| POST | `/submissions` | Create draft submission |
| GET | `/submissions/{id}` | Detail + workflow |
| POST | `/submissions/{id}/submit` | DRAFT → SUBMITTED |
| POST | `/submissions/{id}/request-correction` | IQAC correction with note |
| POST | `/submissions/{id}/approve` | IQAC approve |
| GET | `/reviews/queue?cycle_id=&status=&q=` | Review & approval queue |
| GET | `/reviews/stats?cycle_id=` | Review pipeline counts |
| GET | `/reviews/{submission_id}` | Inspection panel payload |
| POST | `/reviews/{submission_id}/start` | Move to UNDER_REVIEW |

Progress numbers on dashboard / criteria / departments are **derived** from
Evidence + Submission statuses (not stored as static fields).

## Scoped RBAC — important note

`require_roles(...)` proves a user holds a role *somewhere* in the system.
For department- or criterion-scoped actions, also check
`RoleAssignment.scope_type` / `department_id` / `criterion_id` in the handler.

## Not yet implemented

- S3/R2/MinIO file storage (local disk today)
- Reports & Analytics export, Notifications, SSR/AQAR document generation
- Frontend wire-up (coordinator UI still uses mocks; swap to these APIs next)
