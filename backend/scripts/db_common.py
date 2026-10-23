"""Shared helpers for safe database administration scripts.

These helpers never print or log connection URLs or credentials.
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import dotenv_values
from sqlalchemy import create_engine, pool
from sqlalchemy.engine import make_url

BACKEND_DIR = Path(__file__).resolve().parents[1]
ALEMBIC_INI = BACKEND_DIR / "alembic.ini"


class SchemaVerificationError(RuntimeError):
    pass


def resolve_database_url(explicit: str | None = None) -> str:
    """Resolve a PostgreSQL URL from an argument, environment, or .env.

    The returned string keeps the password so callers can connect, but it
    must never be printed. Prefer the ``DATABASE_URL`` environment variable.
    """
    raw = (explicit or os.getenv("DATABASE_URL") or "").strip()

    if not raw:
        cfg = dotenv_values(BACKEND_DIR / ".env")
        raw = (cfg.get("DATABASE_URL") or "").strip()

    if not raw:
        raise RuntimeError(
            "DATABASE_URL is not set. Refusing to fall back to SQLite."
        )

    if raw.startswith("postgres://"):
        raw = "postgresql://" + raw[len("postgres://"):]

    url = make_url(raw)
    if url.get_backend_name() != "postgresql":
        raise RuntimeError(
            "DATABASE_URL must use PostgreSQL. SQLite is not supported."
        )

    return url.render_as_string(hide_password=False)


def load_metadata():
    """Import all live models and return ``Base.metadata``.

    ``DATABASE_URL`` must already be set: importing app.db.database opens a
    short validation connection.
    """
    from app.db.database import Base

    import app.models  # noqa: F401  (registers every model on Base.metadata)

    return Base.metadata


def collect_schema_diffs(database_url: str):
    from alembic.autogenerate import compare_metadata
    from alembic.migration import MigrationContext

    metadata = load_metadata()
    engine = create_engine(database_url, poolclass=pool.NullPool)
    try:
        with engine.connect() as connection:
            context = MigrationContext.configure(
                connection,
                opts={
                    "compare_type": True,
                    "compare_server_default": True,
                    "include_schemas": False,
                },
            )
            return compare_metadata(context, metadata)
    finally:
        engine.dispose()


def get_current_heads(database_url: str) -> tuple[str, ...]:
    from alembic.migration import MigrationContext

    engine = create_engine(database_url, poolclass=pool.NullPool)
    try:
        with engine.connect() as connection:
            return tuple(
                MigrationContext.configure(connection).get_current_heads()
            )
    finally:
        engine.dispose()


def get_script_heads() -> tuple[str, ...]:
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    config = Config(str(ALEMBIC_INI))
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    script = ScriptDirectory.from_config(config)
    return tuple(script.get_heads())


def get_script_head_revision() -> str:
    heads = get_script_heads()
    if len(heads) != 1:
        raise SchemaVerificationError(
            "Expected exactly one Alembic head, found: " + ", ".join(heads)
        )
    return heads[0]


def describe_diff(diff) -> str:
    """Render one Alembic diff tuple without any connection information."""
    if isinstance(diff, (list, tuple)):
        kind = diff[0] if diff else "unknown"
        if kind == "add_table":
            return f"add_table: {diff[1]}"
        if kind == "remove_table":
            return f"remove_table: {diff[1]}"
        if kind in ("add_column", "remove_column"):
            return f"{kind}: {diff[2]}.{diff[3].name}"
        if kind in ("add_index", "remove_index"):
            return f"{kind}: {diff[1].name}"
        if kind in ("add_fk", "remove_fk"):
            return f"{kind}: {diff[0]}"
        if kind == "modify_type":
            return f"modify_type: {diff[2]}.{diff[3]}"
        if kind == "modify_nullable":
            return f"modify_nullable: {diff[2]}.{diff[3]}"
        if kind == "modify_default":
            return f"modify_default: {diff[2]}.{diff[3]}"
        return repr(diff)
    return repr(diff)


def verify_schema(
    database_url: str,
    *,
    expect_heads: tuple[str, ...] | None = None,
) -> list[str]:
    """Return a list of schema differences; empty means the schema matches.

    Only structural metadata and server defaults are compared. Data is
    never read or modified.
    """
    diffs = [describe_diff(diff) for diff in collect_schema_diffs(database_url)]

    if expect_heads is not None:
        current = get_current_heads(database_url)
        if tuple(sorted(current)) != tuple(sorted(expect_heads)):
            diffs.append(
                "alembic revision mismatch: current="
                + (", ".join(current) if current else "<none>")
                + " expected="
                + (", ".join(expect_heads) if expect_heads else "<none>")
            )

    return diffs
