"""Live application configuration.

Secrets and connection details come from environment variables
(typically backend/.env). This module is imported by the running
FastAPI app, JWT helpers, and the SQLAlchemy engine.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy.engine import make_url

BACKEND_DIR = Path(__file__).resolve().parents[1]

load_dotenv(BACKEND_DIR / ".env")

ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip().lower()

_WEAK_JWT_SECRETS = {
    "",
    "change-me",
    "change-me-access",
    "eduverse-naac-development-secret-key",
    "secret",
    "changeme",
    "your-secret-key",
}

_PRODUCTION_ENVIRONMENTS = {"production", "prod"}


def _is_production() -> bool:
    return ENVIRONMENT in _PRODUCTION_ENVIRONMENTS


def _require_database_url() -> str:
    database_url = os.getenv("DATABASE_URL", "").strip()

    if not database_url:
        raise RuntimeError(
            "DATABASE_URL is not set. PostgreSQL is required; "
            "SQLite fallback is disabled."
        )

    # Render/Supabase may provide the legacy postgres:// prefix.
    if database_url.startswith("postgres://"):
        database_url = "postgresql://" + database_url[len("postgres://"):]

    url = make_url(database_url)
    if url.get_backend_name() != "postgresql":
        raise RuntimeError(
            "DATABASE_URL must use PostgreSQL. "
            "SQLite and other dialects are not allowed."
        )

    return database_url


def _require_jwt_secret() -> str:
    jwt_secret = os.getenv("JWT_SECRET", "").strip()

    if not jwt_secret:
        raise RuntimeError(
            "JWT_SECRET is not set. Copy backend/.env.example "
            "to backend/.env and set a secret."
        )

    if _is_production():
        if jwt_secret in _WEAK_JWT_SECRETS or len(jwt_secret) < 32:
            raise RuntimeError(
                "JWT_SECRET is missing or too weak for production. "
                "Set a random secret of at least 32 characters."
            )

    return jwt_secret


def _expire_minutes() -> int:
    raw = os.getenv("JWT_ACCESS_EXPIRE_MINUTES", "480").strip()

    try:
        minutes = int(raw)
    except ValueError as exc:
        raise RuntimeError(
            "JWT_ACCESS_EXPIRE_MINUTES must be an integer."
        ) from exc

    if minutes <= 0:
        raise RuntimeError(
            "JWT_ACCESS_EXPIRE_MINUTES must be greater than 0."
        )

    return minutes


def get_cors_origins() -> list[str]:
    raw = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).strip()

    if not raw:
        raise RuntimeError("CORS_ORIGINS is empty.")

    if raw.startswith("["):
        parsed = json.loads(raw)
        origins = [str(item).strip() for item in parsed if str(item).strip()]
    else:
        origins = [
            part.strip().strip('"').strip("'")
            for part in raw.split(",")
            if part.strip()
        ]

    if not origins:
        raise RuntimeError("CORS_ORIGINS did not contain any origins.")

    if _is_production() and any(origin == "*" for origin in origins):
        raise RuntimeError(
            "Wildcard CORS origins are not allowed in production."
        )

    return origins


DATABASE_URL = _require_database_url()
JWT_SECRET = _require_jwt_secret()
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256").strip() or "HS256"
JWT_ACCESS_EXPIRE_MINUTES = _expire_minutes()
CORS_ORIGINS = get_cors_origins()


# ---------------------------------------------------------------------------
# Supabase Storage (S3-compatible, private bucket)
# ---------------------------------------------------------------------------

DEFAULT_STORAGE_BUCKET = "naac-evidence"

STORAGE_ENDPOINT = os.getenv("STORAGE_ENDPOINT", "").strip()
STORAGE_BUCKET = (
    os.getenv("STORAGE_BUCKET", DEFAULT_STORAGE_BUCKET).strip()
    or DEFAULT_STORAGE_BUCKET
)
STORAGE_ACCESS_KEY = os.getenv("STORAGE_ACCESS_KEY", "").strip()
STORAGE_SECRET_KEY = os.getenv("STORAGE_SECRET_KEY", "").strip()


def missing_storage_settings() -> list[str]:
    """Return the names of required storage settings that are not set.

    Only variable names are returned, never values, so the result is safe
    to log or display in an API error.
    """
    required = {
        "STORAGE_ENDPOINT": STORAGE_ENDPOINT,
        "STORAGE_BUCKET": STORAGE_BUCKET,
        "STORAGE_ACCESS_KEY": STORAGE_ACCESS_KEY,
        "STORAGE_SECRET_KEY": STORAGE_SECRET_KEY,
    }
    return [name for name, value in required.items() if not str(value).strip()]


def storage_is_configured() -> bool:
    return not missing_storage_settings()


def validate_storage_configuration() -> None:
    """Fail fast in production when Supabase Storage is not configured.

    Development keeps the explicit local-file fallback so the app remains
    usable without cloud credentials. Production uploads must never silently
    write to a local directory that disappears on redeploy.
    """
    if not _is_production():
        return

    missing = missing_storage_settings()
    if missing:
        raise RuntimeError(
            "Supabase Storage is not configured for production. "
            "Missing environment variables: " + ", ".join(missing)
        )
