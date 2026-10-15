"""Guard for database-backed tests and test migrations.

Only a separate PostgreSQL database whose name ends with ``_test`` may be
used, and it must differ from the development DATABASE_URL in backend/.env.
Connection strings are never printed.

Usage from backend/:
    python -m tests.db_test_guard check
    python -m tests.db_test_guard alembic upgrade head

Database-backed test modules call ``activate_test_database()`` before
importing anything from ``app``.
"""

import os
import sys
from pathlib import Path

from dotenv import dotenv_values
from sqlalchemy.engine import make_url

TEST_URL_ENV = "EDUVERSE_TEST_DATABASE_URL"
BACKEND_DIR = Path(__file__).resolve().parents[1]


class DatabaseGuardError(RuntimeError):
    pass


def _identity(url) -> tuple:
    return (
        (url.host or "localhost").lower(),
        url.port or 5432,
        url.database,
    )


def require_test_database_url() -> str:
    raw = os.getenv(TEST_URL_ENV, "").strip()
    if not raw:
        raise DatabaseGuardError(
            f"{TEST_URL_ENV} is not set. Database-backed tests only run "
            "against a separate test database."
        )
    try:
        url = make_url(raw)
    except Exception as exc:
        raise DatabaseGuardError(
            f"{TEST_URL_ENV} is not a valid database URL."
        ) from exc
    if not url.drivername.startswith("postgresql"):
        raise DatabaseGuardError("The test database must be PostgreSQL.")
    if not url.database or not url.database.endswith("_test"):
        raise DatabaseGuardError(
            "The test database name must end with '_test'."
        )

    dev_raw = (dotenv_values(BACKEND_DIR / ".env").get("DATABASE_URL") or "").strip()
    if dev_raw:
        if _identity(make_url(dev_raw)) == _identity(url):
            raise DatabaseGuardError(
                "The test database is the development database. Refusing."
            )
    return raw


def guarded_database_name() -> str:
    return make_url(require_test_database_url()).database


def activate_test_database() -> str:
    """Point DATABASE_URL at the test database before app is imported."""
    url = require_test_database_url()
    if "app.db.database" in sys.modules:
        raise DatabaseGuardError(
            "app.db.database was imported before the test database was "
            "activated. Import this guard first."
        )
    os.environ["DATABASE_URL"] = url
    return make_url(url).database


def _main(argv: list[str]) -> int:
    if not argv or argv[0] not in {"check", "alembic"}:
        print("usage: python -m tests.db_test_guard check | alembic <args>")
        return 2
    name = activate_test_database()
    print(f"Using test database: {name}")
    if argv[0] == "check":
        return 0
    from alembic.config import main as alembic_main

    os.chdir(BACKEND_DIR)
    alembic_main(argv=argv[1:])
    return 0


if __name__ == "__main__":
    raise SystemExit(_main(sys.argv[1:]))
