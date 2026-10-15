from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.settings import DATABASE_URL

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        conn.close()
except Exception as exc:
    raise RuntimeError(
        "Could not connect to PostgreSQL using DATABASE_URL. "
        "SQLite fallback is disabled."
    ) from exc

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()
