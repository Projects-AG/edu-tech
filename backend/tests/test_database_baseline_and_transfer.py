"""Safety tests for the canonical schema, stamping, and data transfer.

These tests only run against the separate PostgreSQL database named by
``EDUVERSE_TEST_DATABASE_URL`` (its name must end with ``_test``). The test
fixture drops and recreates the ``public`` schema in that disposable database;
it never touches the development database.
"""

from __future__ import annotations

import asyncio
import hashlib
import os
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.pool import NullPool

# This must run before importing anything from app.*.
from tests.db_test_guard import activate_test_database

activate_test_database()
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault(
    "JWT_SECRET",
    "test-only-jwt-secret-do-not-use-in-production-0123456789",
)

from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi import HTTPException  # noqa: E402

from scripts import export_sqlite_to_postgres as exporter  # noqa: E402
from scripts.db_common import (  # noqa: E402
    BACKEND_DIR,
    get_current_heads,
    get_script_head_revision,
    get_script_heads,
    load_metadata,
    verify_schema,
)
from scripts.stamp_existing import main as stamp_main  # noqa: E402
from scripts.transfer_evidence import (  # noqa: E402
    build_manifest,
    legacy_path_to_key,
    missing_storage_settings,
)

TEST_LABEL = "eduverse-ci"


def alembic_config() -> Config:
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option(
        "script_location",
        str(BACKEND_DIR / "alembic"),
    )
    return config


def reset_public_schema() -> None:
    """Recreate the public schema in the disposable test database."""
    from app.db.database import engine

    engine.dispose()
    database_url = os.environ["DATABASE_URL"]
    admin = create_engine(
        database_url,
        isolation_level="AUTOCOMMIT",
        poolclass=NullPool,
    )
    try:
        with admin.connect() as connection:
            connection.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
            connection.execute(text("CREATE SCHEMA public"))
    finally:
        admin.dispose()


@pytest.fixture()
def fresh_database() -> str:
    reset_public_schema()
    command.upgrade(alembic_config(), "head")
    return os.environ["DATABASE_URL"]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


# ---------------------------------------------------------------------------
# Migration graph and metadata
# ---------------------------------------------------------------------------


def test_exactly_one_alembic_head() -> None:
    heads = get_script_heads()
    assert len(heads) == 1
    assert get_script_head_revision() == heads[0]


def test_metadata_contains_all_models() -> None:
    metadata = load_metadata()
    assert len(metadata.tables) == 27
    assert "accreditation_cycles" in metadata.tables
    assert "cycle_applicable_metrics" in metadata.tables

    cycle_mode = metadata.tables["accreditation_cycles"].columns["cycle_mode"]
    assert cycle_mode.nullable is True

    constraint_names = {
        constraint.name
        for constraint in metadata.tables["accreditation_cycles"].constraints
    }
    assert "ck_accreditation_cycles_cycle_mode_values" in constraint_names
    assert "ck_accreditation_cycles_cycle_mode_status" in constraint_names

    required = metadata.tables["cycle_applicable_metrics"].columns["required"]
    assert required.server_default is not None

    metric_indexes = {
        index.name: index
        for index in metadata.tables["metrics"].indexes
    }
    official = metric_indexes["uq_metrics_official_framework_code"]
    assert official.unique is True
    assert official.dialect_options["postgresql"]["where"] is not None


def test_fresh_upgrade_matches_models(fresh_database: str) -> None:
    head = get_script_head_revision()
    assert get_current_heads(fresh_database) == (head,)
    assert verify_schema(fresh_database, expect_heads=(head,)) == []

    engine = create_engine(fresh_database, poolclass=NullPool)
    try:
        inspector = inspect(engine)
        tables = set(inspector.get_table_names())
        assert len(tables) == 28  # 27 application tables + alembic_version
        assert "users" in tables
        assert "faculties" in tables
        assert "document_versions" in tables

        with engine.connect() as connection:
            partial_indexes = connection.execute(
                text(
                    "SELECT indexname, indexdef FROM pg_indexes "
                    "WHERE schemaname = 'public' AND indexname IN "
                    "('uq_metrics_official_framework_code', "
                    "'uq_framework_metric_operational_metric_id')"
                )
            ).fetchall()
            assert {row.indexname for row in partial_indexes} == {
                "uq_metrics_official_framework_code",
                "uq_framework_metric_operational_metric_id",
            }
            for row in partial_indexes:
                assert " WHERE " in row.indexdef.upper()

            checks = connection.execute(
                text(
                    "SELECT conname FROM pg_constraint "
                    "WHERE conname IN "
                    "('ck_accreditation_cycles_cycle_mode_values', "
                    "'ck_accreditation_cycles_cycle_mode_status')"
                )
            ).fetchall()
            assert len(checks) == 2

            defaults = dict(
                connection.execute(
                    text(
                        "SELECT table_name || '.' || column_name, column_default "
                        "FROM information_schema.columns "
                        "WHERE table_schema = 'public' AND ("
                        "(table_name = 'metrics' AND column_name = 'catalog_kind') OR "
                        "(table_name = 'cycle_applicable_metrics' "
                        "AND column_name = 'required'))"
                    )
                ).fetchall()
            )
            assert "WORKING" in defaults["metrics.catalog_kind"]
            assert defaults["cycle_applicable_metrics.required"] == "true"
    finally:
        engine.dispose()


# ---------------------------------------------------------------------------
# Verified stamping
# ---------------------------------------------------------------------------


def test_stamp_refuses_schema_drift(fresh_database: str, capsys) -> None:
    head = get_script_head_revision()
    assert get_current_heads(fresh_database) == (head,)

    engine = create_engine(fresh_database, poolclass=NullPool)
    try:
        with engine.begin() as connection:
            connection.execute(text("CREATE TABLE schema_drift_test (id integer)"))
    finally:
        engine.dispose()

    result = stamp_main(["--confirm"])
    output = capsys.readouterr()
    assert result == 1
    assert "Refusing to stamp" in output.err
    assert get_current_heads(fresh_database) == (head,)

    engine = create_engine(fresh_database, poolclass=NullPool)
    try:
        with engine.begin() as connection:
            connection.execute(text("DROP TABLE schema_drift_test"))
    finally:
        engine.dispose()


def test_stamp_accepts_matching_schema(fresh_database: str) -> None:
    head = get_script_head_revision()
    assert stamp_main([]) == 0
    assert stamp_main(["--confirm"]) == 0
    assert get_current_heads(fresh_database) == (head,)


# ---------------------------------------------------------------------------
# SQLite export
# ---------------------------------------------------------------------------


def test_export_is_read_only_and_preserves_data(
    fresh_database: str,
    tmp_path: Path,
) -> None:
    source = BACKEND_DIR / "eduverse_naac.db"
    metadata = load_metadata()
    before = sha256_file(source)

    readonly = exporter.open_source_readonly(source)
    try:
        with pytest.raises(sqlite3.OperationalError):
            readonly.execute("DELETE FROM users")
    finally:
        readonly.close()

    dry_run = exporter.export(
        source,
        fresh_database,
        confirm=False,
        backup_dir=tmp_path,
        metadata=metadata,
    )
    assert dry_run["status"] == "dry-run"
    assert sha256_file(source) == before

    result = exporter.export(
        source,
        fresh_database,
        confirm=True,
        backup_dir=tmp_path,
        metadata=metadata,
    )
    assert result["status"] == "transferred"
    assert result["validated"] is True
    assert Path(result["backup"]).is_file()
    assert sha256_file(source) == before

    assert result["counts"] == {
        "accreditation_cycles": 1,
        "criteria": 7,
        "departments": 4,
        "documents": 1,
        "institutions": 1,
        "modules": 17,
        "notifications": 0,
        "permissions": 8,
        "reviews": 12,
        "role_module_permissions": 434,
        "roles": 7,
        "submissions": 9,
        "users": 9,
    }

    evidence = result["evidence"]
    assert evidence["documents"] == 1
    assert evidence["unmapped_legacy_paths"] == [
        {"document_id": 1, "path": "/uploads/faculty_ratio_2025.pdf"}
    ]

    engine = create_engine(fresh_database, poolclass=NullPool)
    try:
        with engine.connect() as connection:
            for table_name, expected in result["counts"].items():
                actual = connection.execute(
                    text(f'SELECT COUNT(*) FROM "{table_name}"')
                ).scalar_one()
                assert actual == expected

            assert connection.execute(
                text("SELECT is_active FROM users WHERE id = 1")
            ).scalar_one() is True

            created_at = connection.execute(
                text(
                    "SELECT created_at FROM accreditation_cycles WHERE id = 1"
                )
            ).scalar_one()
            assert isinstance(created_at, datetime)

            path = connection.execute(
                text("SELECT file_path FROM documents WHERE id = 1")
            ).scalar_one()
            assert path == "/uploads/faculty_ratio_2025.pdf"

            users_id = connection.execute(
                text("SELECT id FROM users ORDER BY id")
            ).scalars().all()
            assert users_id == list(range(1, 10))

            sequence = connection.execute(
                text("SELECT last_value, is_called FROM users_id_seq")
            ).one()
            assert sequence.last_value == 9
            assert sequence.is_called is True

            # No demo/catalogue rows are invented by the export.
            assert connection.execute(
                text("SELECT COUNT(*) FROM naac_frameworks")
            ).scalar_one() == 0
            assert connection.execute(
                text("SELECT COUNT(*) FROM metrics")
            ).scalar_one() == 0
            assert connection.execute(
                text("SELECT COUNT(*) FROM faculties")
            ).scalar_one() == 0

            problems = exporter.validate_target_foreign_keys(
                connection,
                metadata,
                set(result["counts"]),
            )
            assert problems == []
    finally:
        engine.dispose()

    with pytest.raises(RuntimeError, match="not empty"):
        exporter.export(
            source,
            fresh_database,
            confirm=True,
            backup_dir=tmp_path,
            metadata=metadata,
        )

    assert sha256_file(source) == before


def test_export_rejects_orphaned_source_rows(
    fresh_database: str,
    tmp_path: Path,
) -> None:
    source = tmp_path / "orphaned.db"
    shutil.copy2(BACKEND_DIR / "eduverse_naac.db", source)

    connection = sqlite3.connect(source)
    try:
        connection.execute("DELETE FROM roles WHERE id = 7")
        connection.commit()
    finally:
        connection.close()

    with pytest.raises(RuntimeError, match="foreign-key problems"):
        exporter.export(
            source,
            fresh_database,
            confirm=True,
            backup_dir=tmp_path / "backups",
            metadata=load_metadata(),
        )


# ---------------------------------------------------------------------------
# Evidence helpers and storage validation
# ---------------------------------------------------------------------------


def test_legacy_evidence_mapping(tmp_path: Path) -> None:
    assert (
        legacy_path_to_key(
            "/uploads/evidence/submission_11/abc.png"
        )
        == "evidence/submission_11/abc.png"
    )
    assert legacy_path_to_key("uploads/evidence/x/y.pdf") == "evidence/x/y.pdf"
    assert legacy_path_to_key("evidence/x/y.pdf") == "evidence/x/y.pdf"
    assert legacy_path_to_key("/uploads/faculty_ratio_2025.pdf") is None

    root = tmp_path / "evidence"
    (root / "submission_1").mkdir(parents=True)
    (root / "submission_1" / "proof.pdf").write_bytes(b"pdf")
    manifest = build_manifest(root)
    assert len(manifest) == 1
    assert manifest[0]["key"] == "evidence/submission_1/proof.pdf"
    assert manifest[0]["size"] == 3

    missing = missing_storage_settings(
        {
            "endpoint": "",
            "bucket": "naac-evidence",
            "access_key": "",
            "secret_key": "",
        }
    )
    assert missing == ["STORAGE_ENDPOINT", "STORAGE_ACCESS_KEY", "STORAGE_SECRET_KEY"]


def test_storage_validation_names_never_values(monkeypatch) -> None:
    import app.settings as settings

    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "STORAGE_ENDPOINT", "")
    monkeypatch.setattr(settings, "STORAGE_BUCKET", "naac-evidence")
    monkeypatch.setattr(settings, "STORAGE_ACCESS_KEY", "")
    monkeypatch.setattr(settings, "STORAGE_SECRET_KEY", "")

    with pytest.raises(RuntimeError) as excinfo:
        settings.validate_storage_configuration()
    message = str(excinfo.value)
    assert "STORAGE_ENDPOINT" in message
    assert "STORAGE_ACCESS_KEY" in message
    assert "STORAGE_SECRET_KEY" in message
    assert "secret-value" not in message

    monkeypatch.setattr(settings, "STORAGE_ENDPOINT", "https://example.supabase.co/storage/v1/s3")
    monkeypatch.setattr(settings, "STORAGE_ACCESS_KEY", "access")
    monkeypatch.setattr(settings, "STORAGE_SECRET_KEY", "secret-value")
    settings.validate_storage_configuration()


def test_upload_fails_clearly_when_storage_is_unconfigured(monkeypatch) -> None:
    import app.document.routes as routes
    from io import BytesIO

    monkeypatch.setattr(routes, "_s3_client", None)
    monkeypatch.setattr(routes, "_s3_bucket", None)
    monkeypatch.setattr(
        routes,
        "missing_storage_settings",
        lambda: ["STORAGE_ENDPOINT", "STORAGE_ACCESS_KEY"],
    )

    with pytest.raises(HTTPException) as excinfo:
        routes.upload_to_supabase(BytesIO(b"x"), "evidence/x")
    assert excinfo.value.status_code == 500
    assert "STORAGE_ENDPOINT" in excinfo.value.detail


def test_legacy_local_paths_are_explicit() -> None:
    import app.document.routes as routes

    assert routes.is_legacy_local_path("/uploads/faculty_ratio_2025.pdf")
    assert routes.is_legacy_local_path("/uploads/evidence/submission_1/x.pdf")

    missing = SimpleNamespace(file_path="/uploads/faculty_ratio_2025.pdf")
    with pytest.raises(HTTPException) as excinfo:
        routes.resolve_evidence_file(missing)
    assert excinfo.value.status_code == 404
    assert "legacy" in excinfo.value.detail.lower()

    traversal = SimpleNamespace(
        file_path="/uploads/evidence/../../.env"
    )
    with pytest.raises(HTTPException) as excinfo:
        routes.resolve_evidence_file(traversal)
    assert excinfo.value.status_code == 403


# ---------------------------------------------------------------------------
# Application startup
# ---------------------------------------------------------------------------


def test_database_url_rejects_sqlite(monkeypatch) -> None:
    from app.settings import _require_database_url

    monkeypatch.setenv("DATABASE_URL", "sqlite:///unsafe.db")
    with pytest.raises(RuntimeError, match="PostgreSQL"):
        _require_database_url()

    monkeypatch.setenv("DATABASE_URL", "postgres://user:pass@example/db")
    assert _require_database_url().startswith("postgresql://")


def test_app_imports_and_openapi_is_available() -> None:
    import app.main
    import httpx

    paths = app.main.app.openapi()["paths"]
    assert "/openapi.json" not in paths  # served by FastAPI, not a user route
    assert any(path.startswith("/documents") for path in paths)
    assert any(path.startswith("/auth") for path in paths)

    async def fetch_openapi():
        transport = httpx.ASGITransport(app=app.main.app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            return await client.get("/openapi.json")

    response = asyncio.run(fetch_openapi())
    assert response.status_code == 200
    assert "openapi" in response.json()
