from logging.config import fileConfig
import os

from dotenv import load_dotenv

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

from app.db.database import Base

# Import all models so Alembic can detect them
from app.models import (
    User,
    Role,
    Permission,
    Module,
    RoleModulePermission,
    Institution,
    AccreditationCycle,
    Department,
    Criterion,
    Submission,
    Document,
    DocumentVersion,
    Review,
    Notification,
    RegistrationRequest,
    Faculty,
    InstitutionRequest,
    Section,
    Metric,
    EvidenceRequirement,
)

# Load .env
load_dotenv()

# Alembic Config object
config = context.config

# Logging configuration
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# SQLAlchemy metadata
target_metadata = Base.metadata


# --------------------------------------------------
# OFFLINE MIGRATIONS
# --------------------------------------------------

def run_migrations_offline() -> None:

    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise RuntimeError(
            "DATABASE_URL not found in .env file"
        )

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


# --------------------------------------------------
# ONLINE MIGRATIONS
# --------------------------------------------------

def run_migrations_online() -> None:

    database_url = os.getenv(
        "DATABASE_URL",
        "sqlite:///./eduverse_naac.db"
    )

    try:
        connectable = engine_from_config(
            {
                "sqlalchemy.url": database_url
            },
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
        )

        with connectable.connect() as connection:

            context.configure(
                connection=connection,
                target_metadata=target_metadata,
            )

            with context.begin_transaction():
                context.run_migrations()

    except Exception:

        database_url = "sqlite:///./eduverse_naac.db"

        connectable = engine_from_config(
            {
                "sqlalchemy.url": database_url
            },
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
        )

        with connectable.connect() as connection:

            context.configure(
                connection=connection,
                target_metadata=target_metadata,
            )

            with context.begin_transaction():
                context.run_migrations()


# --------------------------------------------------
# RUN MIGRATION
# --------------------------------------------------

if context.is_offline_mode():

    run_migrations_offline()

else:

    run_migrations_online()