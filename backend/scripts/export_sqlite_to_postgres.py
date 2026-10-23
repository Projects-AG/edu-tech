"""Export the legacy SQLite database into a fresh PostgreSQL baseline.

Safety rules
------------
* The source SQLite database is opened **read-only**.
* A timestamped SQLite backup is created before any target writes.
* The target database must already be at the canonical Alembic baseline and
  every application table must be empty. Existing data is never overwritten.
* All inserts run in one transaction; counts and foreign keys are validated
  before commit.
* Primary keys are preserved and PostgreSQL sequences are reset afterwards.
* No demo/catalogue rows are seeded.

Usage (from ``backend/``)::

    python -m scripts.export_sqlite_to_postgres              # dry run
    python -m scripts.export_sqlite_to_postgres --confirm    # write

Prefer ``DATABASE_URL`` for the target. ``--target`` is accepted for
convenience but environment variables keep credentials out of process lists.
Connection URLs are never printed.
"""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
from datetime import date, datetime
from pathlib import Path

from sqlalchemy import Boolean, Date, DateTime, Float, Integer, Numeric, JSON
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Connection
from sqlalchemy.pool import NullPool

from scripts.db_common import BACKEND_DIR, load_metadata, resolve_database_url

DEFAULT_SOURCE = BACKEND_DIR / "eduverse_naac.db"
DEFAULT_BACKUP_DIR = BACKEND_DIR / "backups"
SKIP_SOURCE_TABLES = {"alembic_version", "sqlite_sequence"}


# ---------------------------------------------------------------------------
# Source inspection (read-only)
# ---------------------------------------------------------------------------


def open_source_readonly(source: Path) -> sqlite3.Connection:
    if not source.is_file():
        raise RuntimeError(f"SQLite source not found: {source}")

    uri = f"file:{source.as_posix()}?mode=ro"
    connection = sqlite3.connect(uri, uri=True)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA query_only = ON")
    return connection


def source_tables(connection: sqlite3.Connection) -> list[str]:
    rows = connection.execute(
        "SELECT name FROM sqlite_master "
        "WHERE type = 'table' AND name NOT LIKE 'sqlite_%' "
        "ORDER BY name"
    ).fetchall()
    return [
        row["name"]
        for row in rows
        if row["name"] not in SKIP_SOURCE_TABLES
    ]


def source_columns(
    connection: sqlite3.Connection,
    table: str,
) -> list[str]:
    rows = connection.execute(f'PRAGMA table_info("{table}")').fetchall()
    return [row["name"] for row in rows]


def read_source_rows(
    connection: sqlite3.Connection,
    table: str,
) -> list[dict]:
    rows = connection.execute(f'SELECT * FROM "{table}"').fetchall()
    return [dict(row) for row in rows]


def backup_source(
    source: Path,
    backup_dir: Path,
) -> Path:
    """Create a consistent timestamped copy of the SQLite source."""
    backup_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    backup_path = backup_dir / f"{source.stem}_{stamp}.db"

    if backup_path.exists():
        raise RuntimeError(f"Backup already exists: {backup_path}")

    source_connection = open_source_readonly(source)
    destination = sqlite3.connect(backup_path)
    try:
        source_connection.backup(destination)
        destination.commit()
        integrity = destination.execute("PRAGMA integrity_check").fetchone()
        if not integrity or integrity[0] != "ok":
            raise RuntimeError("SQLite backup failed integrity check")
    finally:
        destination.close()

    # SQLite backups are logically identical but not byte-identical (free
    # pages are compacted), so compare table names and row counts.
    source_tables_map = {
        name: source_connection.execute(
            f'SELECT COUNT(*) FROM "{name}"'
        ).fetchone()[0]
        for name in source_tables(source_connection)
    }
    backup_connection = sqlite3.connect(backup_path)
    backup_connection.row_factory = sqlite3.Row
    try:
        backup_tables_map = {
            name: backup_connection.execute(
                f'SELECT COUNT(*) FROM "{name}"'
            ).fetchone()[0]
            for name in source_tables(backup_connection)
        }
    finally:
        backup_connection.close()
        source_connection.close()

    if source_tables_map != backup_tables_map:
        raise RuntimeError(
            "Backup row counts differ from source; refusing to continue"
        )

    return backup_path


# ---------------------------------------------------------------------------
# Value conversion
# ---------------------------------------------------------------------------


def convert_value(value, column):
    if value is None:
        return None

    column_type = column.type

    if isinstance(column_type, Boolean):
        if isinstance(value, str):
            return value.strip().lower() in {"1", "true", "t", "yes", "y"}
        return bool(value)

    if isinstance(column_type, DateTime):
        if isinstance(value, datetime):
            return value
        if isinstance(value, date):
            return datetime(value.year, value.month, value.day)
        if isinstance(value, str):
            text_value = value.strip()
            if not text_value:
                return None
            return datetime.fromisoformat(text_value.replace("Z", "+00:00"))

    if isinstance(column_type, Date):
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, date):
            return value
        if isinstance(value, str):
            text_value = value.strip()
            if not text_value:
                return None
            return date.fromisoformat(text_value)

    if isinstance(column_type, JSON):
        if isinstance(value, (dict, list)):
            return value
        if isinstance(value, str):
            text_value = value.strip()
            if not text_value:
                return None
            return json.loads(text_value)

    if isinstance(column_type, Integer):
        return int(value)

    if isinstance(column_type, (Float, Numeric)):
        return float(value)

    return value


# ---------------------------------------------------------------------------
# Plan and validation
# ---------------------------------------------------------------------------


def build_insert_plan(metadata, exported_tables: set[str]):
    """Return (order, deferred_fks) for the exported subset.

    Cycles are broken only on nullable foreign-key columns. Deferred values
    are restored with UPDATE statements after all rows are inserted, so no
    data is lost.
    """
    tables = {
        name: metadata.tables[name]
        for name in exported_tables
        if name in metadata.tables
    }
    deps: dict[str, set[str]] = {name: set() for name in tables}
    edges: list[tuple[str, str]] = []

    for child_name, table in tables.items():
        for constraint in table.foreign_key_constraints:
            parent_name = constraint.elements[0].column.table.name
            if parent_name == child_name or parent_name not in tables:
                continue
            if parent_name not in deps[child_name]:
                deps[child_name].add(parent_name)
                edges.append((child_name, parent_name))

    order: list[str] = []
    ready = sorted(name for name in tables if not deps[name])
    deferred: list[tuple[str, str]] = []

    while len(order) < len(tables):
        while ready:
            name = ready.pop(0)
            if name in order:
                continue
            order.append(name)
            for other in sorted(tables):
                if name in deps[other]:
                    deps[other].discard(name)
                    if not deps[other] and other not in order:
                        ready.append(other)
            ready = sorted(set(ready))

        if len(order) == len(tables):
            break

        # A cycle remains. Break one nullable edge and remember it.
        broken = False
        for child_name, parent_name in sorted(edges):
            if parent_name not in deps.get(child_name, set()):
                continue
            table = tables[child_name]
            constraints = [
                constraint
                for constraint in table.foreign_key_constraints
                if constraint.elements[0].column.table.name == parent_name
            ]
            if not constraints:
                continue
            constraint = constraints[0]
            if all(element.parent.nullable for element in constraint.elements):
                deps[child_name].discard(parent_name)
                deferred.append(
                    (
                        child_name,
                        tuple(element.parent.name for element in constraint.elements),
                        parent_name,
                        tuple(element.column.name for element in constraint.elements),
                    )
                )
                broken = True
                break

        if not broken:
            remaining = sorted(name for name in tables if name not in order)
            raise RuntimeError(
                "Cannot order tables because of a non-nullable foreign-key "
                "cycle: " + ", ".join(remaining)
            )

        ready = sorted(name for name in tables if name not in order and not deps[name])

    return order, deferred


def validate_source_foreign_keys(
    connection: sqlite3.Connection,
    metadata,
    exported_tables: set[str],
) -> list[str]:
    """Check source orphans against the target FK metadata (read-only)."""
    problems: list[str] = []

    for child_name in sorted(exported_tables):
        table = metadata.tables[child_name]
        for constraint in table.foreign_key_constraints:
            parent_name = constraint.elements[0].column.table.name
            if parent_name not in exported_tables:
                continue
            child_columns = [
                element.parent.name for element in constraint.elements
            ]
            parent_columns = [
                element.column.name for element in constraint.elements
            ]
            if not child_columns:
                continue

            # Skip columns that do not exist in the SQLite source.
            available = set(source_columns(connection, child_name))
            if any(column not in available for column in child_columns):
                continue

            join = " AND ".join(
                f'child."{child}" = parent."{parent}"'
                for child, parent in zip(child_columns, parent_columns)
            )
            not_null = " AND ".join(
                f'child."{column}" IS NOT NULL' for column in child_columns
            )
            query = (
                f'SELECT COUNT(*) FROM "{child_name}" AS child '
                f'LEFT JOIN "{parent_name}" AS parent ON {join} '
                f"WHERE {not_null} AND parent.\"{parent_columns[0]}\" IS NULL"
            )
            missing = connection.execute(query).fetchone()[0]
            if missing:
                problems.append(
                    f"{child_name} -> {parent_name}: "
                    f"{missing} row(s) reference missing parents"
                )

    return problems


def target_tables(engine) -> set[str]:
    return set(inspect(engine).get_table_names())


def validate_target_empty(connection: Connection, metadata) -> None:
    non_empty = []
    for table_name in sorted(metadata.tables):
        count = connection.execute(
            text(f'SELECT COUNT(*) FROM "{table_name}"')
        ).scalar_one()
        if count:
            non_empty.append(f"{table_name}={count}")

    if non_empty:
        raise RuntimeError(
            "Target database is not empty; refusing to modify it. "
            "Rows found: " + ", ".join(non_empty)
        )


def validate_target_foreign_keys(
    connection: Connection,
    metadata,
    exported_tables: set[str],
) -> list[str]:
    problems: list[str] = []

    for child_name in sorted(exported_tables):
        table = metadata.tables[child_name]
        for constraint in table.foreign_key_constraints:
            parent_name = constraint.elements[0].column.table.name
            if parent_name not in metadata.tables:
                continue
            child_columns = [
                element.parent.name for element in constraint.elements
            ]
            parent_columns = [
                element.column.name for element in constraint.elements
            ]
            join = " AND ".join(
                f'child."{child}" = parent."{parent}"'
                for child, parent in zip(child_columns, parent_columns)
            )
            not_null = " AND ".join(
                f'child."{column}" IS NOT NULL' for column in child_columns
            )
            query = (
                f'SELECT COUNT(*) FROM "{child_name}" AS child '
                f'LEFT JOIN "{parent_name}" AS parent ON {join} '
                f"WHERE {not_null} AND parent.\"{parent_columns[0]}\" IS NULL"
            )
            missing = connection.execute(text(query)).scalar_one()
            if missing:
                problems.append(
                    f"{child_name} -> {parent_name}: "
                    f"{missing} row(s) reference missing parents"
                )

    return problems


def reset_sequences(
    connection: Connection,
    metadata,
    exported_tables: set[str],
) -> list[str]:
    reset: list[str] = []

    for table_name in sorted(exported_tables):
        table = metadata.tables[table_name]
        primary_keys = list(table.primary_key.columns)
        if len(primary_keys) != 1:
            continue
        pk = primary_keys[0]
        if not isinstance(pk.type, Integer):
            continue

        sequence = connection.execute(
            text("SELECT pg_get_serial_sequence(:table, :column)"),
            {"table": table_name, "column": pk.name},
        ).scalar()

        if not sequence:
            continue

        connection.execute(
            text(
                f'SELECT setval('
                f'CAST(:sequence AS regclass), '
                f'COALESCE((SELECT MAX("{pk.name}") FROM "{table_name}"), 1), '
                f'(SELECT MAX("{pk.name}") FROM "{table_name}") IS NOT NULL'
                f")"
            ),
            {"sequence": sequence},
        )
        reset.append(table_name)

    return reset


# ---------------------------------------------------------------------------
# Evidence reference report
# ---------------------------------------------------------------------------


def evidence_report(
    connection: sqlite3.Connection,
    exported_tables: set[str],
) -> dict:
    report = {
        "documents": 0,
        "mapped_keys": 0,
        "already_remote": 0,
        "missing_local_files": [],
        "unmapped_legacy_paths": [],
        "other_paths": [],
    }

    if "documents" not in exported_tables:
        return report

    rows = connection.execute(
        'SELECT id, file_path FROM "documents" ORDER BY id'
    ).fetchall()

    for row in rows:
        report["documents"] += 1
        stored = (row["file_path"] or "").replace("\\", "/").strip()

        if stored.startswith("/uploads/evidence/"):
            local = BACKEND_DIR / stored.lstrip("/")
            if local.is_file():
                report["mapped_keys"] += 1
            else:
                report["missing_local_files"].append(
                    {"document_id": row["id"], "path": stored}
                )
        elif stored.startswith("/uploads/"):
            report["unmapped_legacy_paths"].append(
                {"document_id": row["id"], "path": stored}
            )
        elif stored.startswith("evidence/"):
            report["already_remote"] += 1
        else:
            report["other_paths"].append(
                {"document_id": row["id"], "path": stored}
            )

    return report


# ---------------------------------------------------------------------------
# Main export
# ---------------------------------------------------------------------------


def export(
    source: Path,
    target_url: str,
    *,
    confirm: bool,
    backup_dir: Path,
    metadata,
) -> dict:
    connection = open_source_readonly(source)
    try:
        tables = source_tables(connection)
        exported_tables = {
            name for name in tables if name in metadata.tables
        }
        skipped = sorted(set(tables) - exported_tables)

        if not exported_tables:
            raise RuntimeError("No exportable tables found in the SQLite source")

        rows_by_table = {
            name: read_source_rows(connection, name)
            for name in sorted(exported_tables)
        }
        source_column_map = {
            name: source_columns(connection, name)
            for name in sorted(exported_tables)
        }
        counts = {name: len(rows) for name, rows in rows_by_table.items()}
        order, deferred = build_insert_plan(metadata, exported_tables)
        fk_problems = validate_source_foreign_keys(
            connection, metadata, exported_tables
        )
        evidence = evidence_report(connection, exported_tables)
    finally:
        connection.close()

    if fk_problems:
        raise RuntimeError(
            "Source data has foreign-key problems:\n- "
            + "\n- ".join(fk_problems)
        )

    engine = create_engine(target_url, poolclass=NullPool)

    try:
        existing = target_tables(engine)
        missing_target = sorted(set(metadata.tables) - existing)
        if missing_target:
            raise RuntimeError(
                "Target schema is not initialized. Run "
                "`alembic upgrade head` first. Missing tables: "
                + ", ".join(missing_target)
            )

        from scripts.db_common import get_script_head_revision, verify_schema

        head = get_script_head_revision()
        diffs = verify_schema(target_url, expect_heads=(head,))
        if diffs:
            raise RuntimeError(
                "Target schema does not match the canonical baseline. "
                "Refusing to transfer. Difference(s): "
                + "; ".join(diffs)
            )

        with engine.connect() as connection:
            validate_target_empty(connection, metadata)

        result = {
            "source": str(source),
            "exported_tables": sorted(exported_tables),
            "skipped_tables": skipped,
            "counts": counts,
            "insert_order": order,
            "deferred_foreign_keys": [
                f"{child}.{','.join(columns)} -> {parent}"
                for child, columns, parent, _ in deferred
            ],
            "evidence": evidence,
            "backup": None,
            "sequences_reset": [],
            "validated": False,
        }

        if not confirm:
            result["status"] = "dry-run"
            return result

        backup_path = backup_source(source, backup_dir)
        result["backup"] = str(backup_path)

        with engine.begin() as connection:
            for table_name in order:
                table = metadata.tables[table_name]
                source_columns_set = set(source_column_map[table_name])
                target_columns = [
                    column
                    for column in table.columns
                    if column.name in source_columns_set
                ]
                deferred_columns = {
                    column
                    for child, columns, _parent, _ref in deferred
                    if child == table_name
                    for column in columns
                }

                payload = []
                for row in rows_by_table[table_name]:
                    item = {}
                    for column in target_columns:
                        value = convert_value(row.get(column.name), column)
                        if column.name in deferred_columns:
                            value = None
                        item[column.name] = value
                    payload.append(item)

                if payload:
                    connection.execute(table.insert(), payload)

            for child_name, columns, parent_name, parent_columns in deferred:
                table = metadata.tables[child_name]
                pk_columns = list(table.primary_key.columns)
                if len(pk_columns) != 1:
                    raise RuntimeError(
                        f"Cannot restore deferred FK for {child_name}: "
                        "composite primary key is not supported"
                    )
                pk = pk_columns[0]
                for row in rows_by_table[child_name]:
                    values = {
                        column: convert_value(
                            row.get(column), table.columns[column]
                        )
                        for column in columns
                    }
                    if any(value is None for value in values.values()):
                        continue
                    connection.execute(
                        table.update()
                        .where(pk == row[pk.name])
                        .values(values)
                    )

            for table_name in sorted(exported_tables):
                actual = connection.execute(
                    text(f'SELECT COUNT(*) FROM "{table_name}"')
                ).scalar_one()
                expected = counts[table_name]
                if actual != expected:
                    raise RuntimeError(
                        f"Row-count validation failed for {table_name}: "
                        f"expected {expected}, found {actual}"
                    )

            fk_problems = validate_target_foreign_keys(
                connection, metadata, exported_tables
            )
            if fk_problems:
                raise RuntimeError(
                    "Target foreign-key validation failed:\n- "
                    + "\n- ".join(fk_problems)
                )

            # Reset sequences before commit so a failure here rolls back the
            # inserted rows instead of leaving a half-finished transfer.
            result["sequences_reset"] = reset_sequences(
                connection, metadata, exported_tables
            )

        result["status"] = "transferred"
        result["validated"] = True
        return result
    finally:
        engine.dispose()


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        type=Path,
        default=DEFAULT_SOURCE,
        help=f"SQLite source (default: {DEFAULT_SOURCE.name}). Opened read-only.",
    )
    parser.add_argument(
        "--target",
        default=None,
        help="Target PostgreSQL URL. Prefer the DATABASE_URL environment variable.",
    )
    parser.add_argument(
        "--backup-dir",
        type=Path,
        default=DEFAULT_BACKUP_DIR,
        help="Directory for the timestamped source backup.",
    )
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Perform the transfer. Without this flag the script only reports.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print the report as JSON (no secrets).",
    )
    return parser.parse_args(argv)


def main(argv=None) -> int:
    args = parse_args(argv)
    target_url = resolve_database_url(args.target)
    os.environ["DATABASE_URL"] = target_url

    metadata = load_metadata()

    try:
        result = export(
            args.source,
            target_url,
            confirm=args.confirm,
            backup_dir=args.backup_dir,
            metadata=metadata,
        )
    except Exception as exc:
        print("Export failed: " + str(exc), file=sys.stderr)
        return 1

    if args.json:
        print(json.dumps(result, indent=2, sort_keys=True))
        return 0

    print("Source: " + result["source"])
    print("Exported tables: " + ", ".join(result["exported_tables"]))
    if result["skipped_tables"]:
        print("Skipped source tables: " + ", ".join(result["skipped_tables"]))
    print("Rows:")
    for table_name, count in result["counts"].items():
        print(f"  {table_name}: {count}")
    if result["deferred_foreign_keys"]:
        print("Deferred nullable foreign keys:")
        for item in result["deferred_foreign_keys"]:
            print("  " + item)

    evidence = result["evidence"]
    print("Evidence references:")
    print(f"  documents: {evidence['documents']}")
    print(f"  local /uploads/evidence keys: {evidence['mapped_keys']}")
    print(f"  already remote keys: {evidence['already_remote']}")
    if evidence["missing_local_files"]:
        print("  legacy evidence files missing locally:")
        for item in evidence["missing_local_files"]:
            print(f"    document {item['document_id']}: {item['path']}")
    if evidence["unmapped_legacy_paths"]:
        print("  legacy paths outside uploads/evidence (manual mapping needed):")
        for item in evidence["unmapped_legacy_paths"]:
            print(f"    document {item['document_id']}: {item['path']}")
    if evidence["other_paths"]:
        print("  unrecognized paths:")
        for item in evidence["other_paths"]:
            print(f"    document {item['document_id']}: {item['path']}")

    if result["status"] == "dry-run":
        print("\nDry run only. Re-run with --confirm to transfer.")
        return 0

    print("\nBackup: " + (result["backup"] or "<none>"))
    print("Sequences reset: " + ", ".join(result["sequences_reset"]))
    print("Validation: " + ("OK" if result["validated"] else "FAILED"))
    print("Transfer complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
