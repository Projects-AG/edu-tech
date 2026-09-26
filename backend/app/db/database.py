import os

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import (
    sessionmaker,
    declarative_base,
)

load_dotenv()


# ============================================================
# DATABASE URL
# ============================================================

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./eduverse_naac.db"
)


# ============================================================
# SQLITE SCHEMA COMPATIBILITY
# ============================================================


def ensure_sqlite_compatibility() -> None:
    """Add missing columns to an older SQLite users table."""
    if "sqlite" not in DATABASE_URL:
        return

    db_path = DATABASE_URL.replace("sqlite:///", "")
    if not db_path:
        return

    if not os.path.exists(db_path):
        return

    try:
        import sqlite3

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in cursor.fetchall()]

        required_columns = {
            "institution_id": "INTEGER",
            "faculty_id": "INTEGER",
            "department_id": "INTEGER",
            "is_active": "BOOLEAN DEFAULT 1",
        }

        for column_name, column_type in required_columns.items():
            if column_name not in columns:
                try:
                    cursor.execute(
                        f"ALTER TABLE users ADD COLUMN {column_name} {column_type}"
                    )
                except sqlite3.DatabaseError:
                    pass

        conn.commit()
        conn.close()
    except Exception:
        # Ignore compatibility errors at startup; the app should still boot
        # and the next request will surface the real issue if needed.
        pass


# ============================================================
# DATABASE ENGINE
# ============================================================

try:
    if "postgresql" in DATABASE_URL:
        engine = create_engine(
            DATABASE_URL
        )

        # Test connection
        with engine.connect() as conn:
            pass

    else:
        engine = create_engine(
            DATABASE_URL,
            connect_args={
                "check_same_thread": False
            }
        )
        ensure_sqlite_compatibility()

except Exception:
    # Fallback to SQLite
    DATABASE_URL = (
        "sqlite:///./eduverse_naac.db"
    )

    engine = create_engine(
        DATABASE_URL,
        connect_args={
            "check_same_thread": False
        }
    )
    ensure_sqlite_compatibility()


# ============================================================
# SESSION
# ============================================================

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


# ============================================================
# BASE
# ============================================================

Base = declarative_base()


# ============================================================
# DATABASE DEPENDENCY
# ============================================================

def get_db():
    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()