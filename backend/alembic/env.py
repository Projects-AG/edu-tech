from logging.config import fileConfig
import os
from pathlib import Path

from dotenv import load_dotenv

from sqlalchemy import create_engine, pool
from sqlalchemy.engine import Connection

from alembic import context

from app.db.database import Base

# Import ALL live models so Alembic target_metadata is complete.
# Do NOT import app.models.models (dead UUID/Enum stack).
from app.models import (
    User,
    Role,
    Permission,
    Module,
    RoleModulePermission,
    Institution,
    AccreditationCycle,
    Department,
    Faculty,
    Criterion,
    Section,
    Metric,
    EvidenceRequirement,
    CycleApplicableMetric,
    NaacFramework,
    FrameworkCriterion,
    FrameworkMetric,
    Submission,
    Document,
    DocumentVersion,
    Review,
    Notification,
    RegistrationRequest,
    InstitutionRequest,
    Committee,
    CommitteeMember,
    AuditLog,
)

_BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(_BACKEND_DIR / ".env")

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_alembic_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise RuntimeError(
            "DATABASE_URL is not set. Alembic will not fall back to SQLite."
        )

    database_url = database_url.strip()

    # Render/Supabase hand out postgres:// URLs; SQLAlchemy wants the
    # postgresql:// prefix. Never log or echo the URL itself.
    if database_url.startswith("postgres://"):
        database_url = "postgresql://" + database_url[len("postgres://"):]

    if not database_url.startswith(("postgresql://", "postgresql+")):
        raise RuntimeError(
            "Alembic migrations must use PostgreSQL. "
            "Refusing non-PostgreSQL DATABASE_URL dialect."
        )

    return database_url


def require_postgresql_connection(database_url: str) -> Connection:
    engine = create_engine(
        database_url,
        poolclass=pool.NullPool,
    )

    try:
        connection = engine.connect()
    except Exception as exc:
        raise RuntimeError(
            "Alembic could not connect to PostgreSQL. "
            "Refusing to fall back to SQLite."
        ) from exc

    if connection.dialect.name != "postgresql":
        connection.close()
        raise RuntimeError(
            "Alembic connected to a non-PostgreSQL database. "
            "Refusing to continue."
        )

    return connection


def run_migrations_offline() -> None:
    database_url = get_alembic_database_url()

    context.configure(
        url=database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={
            "paramstyle": "named"
        },
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    database_url = get_alembic_database_url()
    connection = require_postgresql_connection(database_url)

    try:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            include_schemas=False,
        )

        with context.begin_transaction():
            context.run_migrations()
    finally:
        connection.close()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
