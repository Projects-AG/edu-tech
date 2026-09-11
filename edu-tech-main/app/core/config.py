from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    jwt_access_secret: str
    jwt_refresh_secret: str
    jwt_access_expire_minutes: int = 15
    jwt_refresh_expire_days: int = 7
    storage_endpoint: str = "http://localhost:9000"
    storage_bucket: str = "naac-evidence"
    storage_access_key: str = "minioadmin"
    storage_secret_key: str = "minioadmin"

    class Config:
        env_file = ".env"


settings = Settings()
