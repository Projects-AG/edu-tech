from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Database
    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/naac_platform"

    # JWT
    jwt_access_secret: str = "change-me-access"
    jwt_refresh_secret: str = "change-me-refresh"
    jwt_access_expire_minutes: int = 15
    jwt_refresh_expire_days: int = 7

    # Object Storage (MinIO / S3)
    storage_endpoint: str = "http://localhost:9000"
    storage_bucket: str = "naac-evidence"
    storage_access_key: str = "minioadmin"
    storage_secret_key: str = "minioadmin"

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
