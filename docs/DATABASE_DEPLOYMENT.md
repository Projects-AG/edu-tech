# Database and Evidence Deployment Guide

This guide covers the safe path from a local SQLite database or an existing
PostgreSQL database to a fresh Supabase PostgreSQL database, plus the Render
and Supabase Storage configuration used by the running application.

## Safety rules

These rules apply to every step in this document.

1. **Never run a destructive command against a database that contains data
   you still need.** That includes `DROP`, `TRUNCATE`, `alembic downgrade`,
   recreating a Supabase project, and running `init_db.py`.
2. **Never run `init_db.py` in production.** It calls
   `Base.metadata.create_all()` and seeds demo users, departments, and
   cycles. The production database is created by Alembic only.
3. **Never stamp a database without verifying its schema first.** A stamp
   only changes `alembic_version`; it does not make a mismatched schema
   correct.
4. **Never print or commit credentials.** `DATABASE_URL`, `JWT_SECRET`,
   `STORAGE_ACCESS_KEY`, and `STORAGE_SECRET_KEY` belong in `.env` or the
   Render environment, never in source, logs, screenshots, or tickets.
5. **Take a backup before any write.** The transfer utility creates its own
   SQLite backup; take a PostgreSQL/Supabase snapshot before a production
   cutover.
6. **Keep the old database and old evidence files until the new deployment
   has been validated.** This guide never deletes them.

## Canonical schema

The live schema is defined by the SQLAlchemy models and by one Alembic
baseline:

- Baseline: `backend/alembic/versions/dfaf63608354_initial_schema.py`
- 27 application tables
- Foreign keys, check constraints, server defaults, partial unique indexes,
  and JSONB columns are included
- The baseline's `downgrade()` intentionally raises `NotImplementedError`;
  restore from a backup instead of downgrading

The previous 16 revisions are archived under
`backend/alembic/legacy_versions/` and are **not** executed by Alembic. They
are retained for auditability. Their identifiers may still appear in
`alembic_version` on old databases.

Do not create a second, sequential baseline. If the models change later,
add a normal revision on top of `dfaf63608354`.

## Environment variables

### Backend (Render / local)

| Variable | Required | Notes |
| --- | --- | --- |
| `ENVIRONMENT` | Yes | `production` on Render. Missing storage makes startup fail in production by design. |
| `DATABASE_URL` | Yes | PostgreSQL only. `postgres://` is normalized to `postgresql://`. Use the direct/session connection for migrations. |
| `JWT_SECRET` | Yes | At least 32 random characters in production. |
| `JWT_ALGORITHM` | No | Defaults to `HS256`. |
| `JWT_ACCESS_EXPIRE_MINUTES` | No | Defaults to `480`. |
| `CORS_ORIGINS` | Yes | Comma-separated exact frontend origins. Wildcards are rejected in production. |
| `STORAGE_ENDPOINT` | Yes in production | Supabase S3 endpoint, e.g. `https://<project-ref>.supabase.co/storage/v1/s3`. |
| `STORAGE_BUCKET` | Yes | Defaults to `naac-evidence`. Keep the bucket private. |
| `STORAGE_ACCESS_KEY` | Yes in production | Supabase S3 access key. |
| `STORAGE_SECRET_KEY` | Yes in production | Supabase S3 secret key. |
| `AWS_DEFAULT_REGION` | Sometimes | Set only if the S3 client reports `NoRegionError`. |

`backend/.env.example` documents the same variables. Copy it to
`backend/.env` for local development and fill in real values locally.

### Frontend (Render static site / local)

| Variable | Notes |
| --- | --- |
| `VITE_API_BASE_URL` | Backend origin only, e.g. `https://eduverse-api.onrender.com`. Do not append `/api` or a trailing slash. Vite bakes this in at build time, so rebuild after changing it. |

`frontend/.env.example` contains the local default. Do not commit
`frontend/.env.local`.

## Supabase project setup

1. Create or select the Supabase project.
2. Open **Project Settings -> Database** and copy the connection string.
   - Prefer the **direct** connection or **session pooler** on port `5432`
     for Alembic and the transfer scripts.
   - The transaction pooler (port `6543`) is intended for application
     traffic; migrations and `pg_dump` are safer on a direct/session
     connection.
   - Keep `sslmode=require` if the connection string includes it.
3. Open **Storage** and create a **private** bucket named `naac-evidence`.
   Do not make evidence public. The application serves downloads through
   authenticated API routes.
4. Open **Project Settings -> Storage -> S3 access keys** and create an
   access key pair for the backend. Do not use the service-role key as an
   S3 secret.
5. Put the connection string and S3 values only in Render environment
   variables or the local `backend/.env`.

The application checks the four `STORAGE_*` variables at startup when
`ENVIRONMENT=production`. If any are missing, startup fails with the names
of the missing variables. It never prints their values.

## Scenario A: fresh PostgreSQL database

Use this for a brand-new Supabase project, a new empty database, or a
disposable staging database.

```powershell
cd backend

# Point at the fresh database. Do not paste the URL into a shell history
# that is shared or recorded; use your shell's secret mechanism.
$env:DATABASE_URL = "<fresh-postgresql-url>"

# Create every table, index, constraint, and the alembic_version row.
python -m alembic upgrade head

# Read-only verification: zero differences and one expected head.
python -m scripts.verify_schema --expect-head

# Optional drift check used during development.
python -m alembic check
```

Expected result:

- `alembic current` prints `dfaf63608354 (head)`
- `scripts.verify_schema --expect-head` prints
  `Schema verification OK: database matches the models.`
- `alembic check` prints `No new upgrade operations detected.`

If `alembic check` reports operations, stop. Do not autogenerate a second
baseline. Compare the model change with the baseline and add one normal
revision on top.

## Scenario B: existing PostgreSQL database

There are only two safe paths. Decide with the read-only verifier, not by
assuming SQLite and PostgreSQL schemas match.

### B1. The existing schema already matches the models

```powershell
cd backend
$env:DATABASE_URL = "<existing-postgresql-url>"

# Read-only. Must report zero differences.
python -m scripts.verify_schema

# No-op unless --confirm is supplied. Refuses on any difference.
python -m scripts.stamp_existing --confirm

python -m scripts.verify_schema --expect-head
```

`stamp_existing` clears only the `alembic_version` bookkeeping rows and
writes the baseline revision. It does not alter application tables or rows.
The purge is required because old revision identifiers are no longer in the
active migration graph.

### B2. The existing schema differs (including the original local DB)

Do **not** run `alembic upgrade head` and do **not** stamp. The baseline is a
fresh-install schema, not an in-place upgrade. Instead:

1. Take a full backup/snapshot of the existing database.
2. Create a new empty PostgreSQL database or Supabase project.
3. Initialize the new database with Scenario A.
4. Transfer data with a reviewed, read-only export:
   - SQLite source: use `scripts/export_sqlite_to_postgres.py` (below).
   - Old PostgreSQL source: use a one-off `pg_dump`/mapping job reviewed
     against the baseline. The old local database in this repository is
     known to have schema drift and must not be stamped.
5. Validate row counts, foreign keys, primary keys, sequences, and
   application behavior.
6. Switch `DATABASE_URL` only after validation succeeds.

The original local PostgreSQL database is at a legacy revision and has
structural differences from the models. It is not eligible for
`stamp_existing` in its current state. Preserve it as a rollback source.

## Scenario C: transfer the SQLite data

The SQLite file `backend/eduverse_naac.db` is a legacy data source, not a
migration target. Never run Alembic against it.

The transfer utility:

- opens the SQLite source read-only;
- creates a timestamped, integrity-checked SQLite backup before writing;
- requires the target to be at the baseline and empty;
- preserves primary keys and relationships;
- defers nullable foreign keys involved in cycles;
- resets PostgreSQL sequences after insert;
- validates source and target foreign keys and row counts;
- reports evidence references without inventing files or rows;
- inserts no demo or catalogue data.

At the time of writing the SQLite source contains 13 application tables
(14 tables including `alembic_version`) and 503 application rows. Verify
those numbers before and after your transfer.
The single `documents` row references `/uploads/faculty_ratio_2025.pdf`,
which is not present under `backend/uploads/`; the report will flag it.

### Dry run

The target must already be initialized (Scenario A), match the canonical
baseline exactly, and be empty. A dry run still checks those conditions but
does not write.

```powershell
cd backend
$env:DATABASE_URL = "<fresh-postgresql-url>"

python -m scripts.export_sqlite_to_postgres
```

Review the printed row counts, insert order, deferred foreign keys, and
evidence warnings.

### Confirmed transfer

```powershell
cd backend
$env:DATABASE_URL = "<fresh-postgresql-url>"

python -m scripts.export_sqlite_to_postgres --confirm
```

The backup is written to `backend/backups/` by default. That directory is
ignored by Git; keep a separate protected copy. Use `--backup-dir` to place
it on an encrypted volume.

If the command fails, nothing is committed: all inserts run in one
transaction. The target remains empty, or is rolled back, and the source is
untouched. Re-running against a non-empty target is refused by design.

After a successful transfer:

```powershell
python -m scripts.verify_schema --expect-head
```

Then check the counts and sequences, for example:

```sql
SELECT 'users' AS table_name, COUNT(*) FROM users
UNION ALL SELECT 'institutions', COUNT(*) FROM institutions
UNION ALL SELECT 'submissions', COUNT(*) FROM submissions
UNION ALL SELECT 'documents', COUNT(*) FROM documents;

SELECT last_value, is_called FROM users_id_seq;
```

For the current SQLite snapshot, `users` must end at id 9 and
`users_id_seq.last_value` must be 9 with `is_called = true`. Do not insert a
fake row to advance a sequence.

## Scenario D: transfer evidence files

Evidence files live in `backend/uploads/evidence/` locally and are ignored
by Git. They must be backed up separately and uploaded to the private
Supabase bucket.

The utility:

- reads local files only;
- uploads to `evidence/<relative-path>` so keys match the live upload code;
- validates the uploaded size with `head_object`;
- skips objects whose size already matches unless `--overwrite` is used;
- never deletes objects;
- reports legacy paths outside `uploads/evidence/` and leaves them unchanged.

Local files that have no matching row in the freshly exported SQLite data are
still uploaded. They are unreferenced by that database but are needed if you
later transfer the older PostgreSQL document rows, and they are never
deleted automatically.

### Dry run and upload

```powershell
cd backend

# Storage variables must be present in the environment or backend/.env.
python -m scripts.transfer_evidence

python -m scripts.transfer_evidence --confirm
```

### Rewrite document paths (explicit opt-in)

After a successful upload, rewrite legacy `/uploads/evidence/...` document
paths to bucket-relative keys:

```powershell
cd backend
$env:DATABASE_URL = "<fresh-postgresql-url>"

python -m scripts.transfer_evidence --confirm --update-database
```

Only documents whose local file was uploaded are rewritten. Rows whose file
is missing stay unchanged and are reported. The legacy path
`/uploads/faculty_ratio_2025.pdf` is outside `uploads/evidence/`, so it is
deliberately not rewritten. Re-upload that file through the application or
update the document manually after confirming the correct object.

The bucket must stay private. Replacing an evidence file through the
application creates a new key and a new `document_versions` row; old objects
are retained because historical versions may reference them.

## Verification checklist

Run these after initialization, transfer, or a restore.

```powershell
cd backend
$env:DATABASE_URL = "<target-postgresql-url>"

python -m scripts.verify_schema --expect-head
python -m alembic current
python -m alembic heads
```

Application checks:

1. Start the API: `uvicorn app.main:app --host 0.0.0.0 --port 8001`.
2. Open `/openapi.json` or `/docs`.
3. Log in with an existing account.
4. Open a submission, upload a small evidence file, download it, and replace
   it. All three must work against the private bucket.
5. Confirm that a download of a legacy missing file returns a clear error,
   not a broken link.

For a production dry run, use a disposable staging database and staging
bucket first. Do not test write operations against the production database
or bucket without approval.

## Render deployment

### Backend web service

- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check path: `/docs` (or `/openapi.json`); the API has no custom
  `/health` route.
- Environment: all backend variables from the table above, with
  `ENVIRONMENT=production`.

A pre-deploy command `python -m alembic upgrade head` is safe **only** for a
database that is already on the canonical baseline or is brand new. Do not
enable it against an unverified existing database; initialize/verify that
database first as described in Scenario B.

Render may briefly run the old and new instances together. Apply schema
changes before routing traffic, and prefer backward-compatible changes.

### Frontend static site

- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- Environment: `VITE_API_BASE_URL=https://<backend-service>.onrender.com`
- SPA rewrite: `/*` -> `/index.html`

Add the final frontend origin to the backend `CORS_ORIGINS`. Rebuild the
frontend after changing `VITE_API_BASE_URL`, because Vite embeds it at build
time.

## Backup, rollback, and recovery

### Before cutover

1. Snapshot the existing PostgreSQL database (Supabase backup/PITR or
   `pg_dump --format=custom --no-owner --no-acl`).
2. Copy `backend/eduverse_naac.db` and `backend/uploads/evidence/` to a
   protected location.
3. Record row counts and the current Alembic revision of the old database.
4. Store environment values in a password manager, not in a ticket.
5. Record the exact commit/deploy being released.

### Rollback

- **Application:** redeploy the previous Render release and point
  `VITE_API_BASE_URL` back to the previous backend if needed.
- **Database:** restore the snapshot into a new database/project, verify it,
  then update `DATABASE_URL`. Do not run `alembic downgrade`; the baseline
  downgrade is intentionally blocked and older revisions are archived.
- **Evidence:** old objects are retained. If a replace operation succeeded,
  the previous object still exists under its old key; document versions
  record the mapping.

### Recovery from a failed transfer

- If the transfer failed before commit, the target is still empty. Fix the
  reported source problem and retry.
- If the target contains partial data, it is not a valid target. Confirm it
  is the **new disposable** database, recreate it, run Scenario A, and
  transfer again. Never drop the old production database.
- If evidence uploads partially succeeded, re-run `transfer_evidence`; it
  skips objects whose size already matches. Database paths are only updated
  after all uploads succeed.

## Automated tests

The schema/transfer tests run only against a separate PostgreSQL database
whose name ends with `_test`. The fixture drops and recreates `public` in
that disposable database, so never point the variable at development or
production.

```powershell
cd backend
$env:EDUVERSE_TEST_DATABASE_URL = "<disposable-postgresql-url-ending-in-_test>"
$env:DATABASE_URL = $env:EDUVERSE_TEST_DATABASE_URL

python -m pytest tests/test_database_baseline_and_transfer.py -q
```

The tests cover:

- a single Alembic head;
- fresh upgrade and model/metadata parity;
- partial indexes, check constraints, and server defaults;
- stamping only when the schema matches;
- read-only SQLite export, PK/FK preservation, sequence reset, and refusal
  of a non-empty target;
- no demo rows during export;
- storage configuration validation and clear upload failures;
- legacy evidence path handling;
- application import and OpenAPI route availability.

Do not run the older test modules against the development database without
reviewing their fixtures; they predate the test-database guard.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| `DATABASE_URL is not set` | Set it in the shell or `backend/.env`. There is no SQLite fallback. |
| `must use PostgreSQL` | Replace a SQLite or other URL. `postgres://` is accepted and normalized. |
| `Schema verification FAILED` | Do not stamp. Use a fresh baseline database and transfer data. |
| `Refusing to stamp` | Expected on drift. Read the listed differences; migrate to a fresh database. |
| `Target database is not empty` | The transfer target already has rows. Do not overwrite it; use a fresh empty database. |
| `Source data has foreign-key problems` | Fix the source rows (or exclude them explicitly) before transfer. Nothing was written. |
| `Supabase Storage is not configured` | Set the listed `STORAGE_*` variables. Restart the backend. |
| `NoRegionError` from boto3 | Set `AWS_DEFAULT_REGION` to the region required by the S3 endpoint, then restart. |
| Legacy evidence download returns 404 | The row points outside `uploads/evidence` or the local file was never migrated. Re-upload or map it explicitly. |
| `alembic check` shows operations | Do not autogenerate a new baseline. Review the model change and add one revision on top of `dfaf63608354`. |
