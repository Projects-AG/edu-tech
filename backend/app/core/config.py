from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url

_BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
    )

    # Legacy ``backend.app.*`` stack only. The live app uses app.settings.
    # These values are intentionally required: no placeholder database URL or
    # weak JWT secrets are shipped with the source.
    database_url: str
    jwt_access_secret: str
    jwt_refresh_secret: str
    jwt_access_expire_minutes: int = 15
    jwt_refresh_expire_days: int = 7

    # Object Storage (Supabase S3-compatible). No credentials are shipped
    # with the source; production values must come from the environment.
    storage_endpoint: str = ""
    storage_bucket: str = "naac-evidence"
    storage_access_key: str = ""
    storage_secret_key: str = ""

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    @field_validator("database_url")
    @classmethod
    def _require_postgresql(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError(
                "DATABASE_URL is required; SQLite fallback is disabled."
            )
        if value.startswith("postgres://"):
            value = "postgresql://" + value[len("postgres://"):]
        if make_url(value).get_backend_name() != "postgresql":
            raise ValueError("DATABASE_URL must use PostgreSQL.")
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
