# Archived Alembic history

These revision files were the project's original migration history. They are
kept for auditability but are **not** loaded by Alembic: the active migration
directory is `backend/alembic/versions/`, which now contains a single squashed
baseline (`dfaf63608354_initial_schema.py`).

## Why the history was squashed

The legacy chain could not create a fresh database:

- Several revisions assumed the application tables already existed (they
  stamped or altered an existing schema).
- No revision created `users`, `roles`, `permissions`, `modules`,
  `role_module_permissions`, `faculties`, `institution_requests`,
  `committees`, `committee_members`, or `document_versions`.
- One branch created `institutions` with a foreign key to `users` before
  `users` existed.

The squashed baseline was generated from the live SQLAlchemy models against
an empty PostgreSQL database and then hand-checked for FK ordering, indexes,
partial unique indexes, check constraints, and server defaults.

## Existing databases

There are exactly two safe paths for an existing database.

### 1. Schema matches the baseline exactly

Run the read-only verifier first:

```powershell
cd backend
python -m scripts.verify_schema
```

If and only if it reports **Schema verification OK**, stamp the database so
Alembic records the baseline without touching application data:

```powershell
python -m scripts.stamp_existing --confirm
```

The command refuses to stamp when any structural difference exists. It purges
only the `alembic_version` bookkeeping rows (required because the old revision
IDs are not part of the active migration graph); it does not touch data.

### 2. Schema differs (including the original local PostgreSQL database)

Do **not** stamp and do **not** run `alembic upgrade head` against the
existing database. The baseline is a fresh-install schema, not an in-place
upgrade. Instead:

1. Create a new empty PostgreSQL database (or Supabase project).
2. Run `alembic upgrade head` against the new database.
3. Transfer data with
   `scripts/export_sqlite_to_postgres.py` (for the SQLite data) or write a
   one-off, read-only export for the old PostgreSQL database.
4. Validate row counts, foreign keys, and sequences before switching traffic.

See `docs/DATABASE_DEPLOYMENT.md` for the complete runbook.

## Do not delete

These files document how the production schema evolved. Keep them under
version control even though Alembic no longer executes them.
