"""Safely stamp a verified existing PostgreSQL database at the baseline.

Never run this against a database until ``verify_schema`` reports an exact
match. The command is a no-op unless ``--confirm`` is supplied.

Usage (from ``backend/``)::

    python -m scripts.verify_schema
    python -m scripts.stamp_existing --confirm

``--purge`` (the default) clears only the ``alembic_version`` bookkeeping
rows before stamping, which is required when the old version references a
revision file that is now archived under ``alembic/legacy_versions/``.
Application data is not touched.
"""

from __future__ import annotations

import argparse
import os
import sys

from scripts.db_common import (
    ALEMBIC_INI,
    get_current_heads,
    get_script_head_revision,
    get_script_heads,
    resolve_database_url,
    verify_schema,
)


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--database-url",
        default=None,
        help="PostgreSQL URL. Prefer the DATABASE_URL environment variable.",
    )
    parser.add_argument(
        "--revision",
        default=None,
        help="Revision to stamp. Defaults to the single current head.",
    )
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Actually write the stamp. Without this flag only a dry run runs.",
    )
    parser.add_argument(
        "--no-purge",
        action="store_true",
        help=(
            "Do not delete existing alembic_version rows before stamping. "
            "Only use this if the current revision is still in the active "
            "migration graph."
        ),
    )
    return parser.parse_args(argv)


def main(argv=None) -> int:
    args = parse_args(argv)
    database_url = resolve_database_url(args.database_url)
    os.environ["DATABASE_URL"] = database_url

    head = get_script_head_revision()
    revision = args.revision or head

    if revision != head and revision not in get_script_heads():
        # A legacy revision is acceptable for a dry run, but do not stamp
        # backwards onto an archived lineage.
        print(
            "Refusing to stamp a revision that is not the current head.",
            file=sys.stderr,
        )
        return 2

    current = get_current_heads(database_url)
    print("Current Alembic revision(s): " + (
        ", ".join(current) if current else "<none>"
    ))
    print("Target revision: " + revision)

    diffs = verify_schema(database_url)
    if diffs:
        print(
            "Refusing to stamp: schema does not match the models "
            f"({len(diffs)} difference(s)).",
            file=sys.stderr,
        )
        for diff in diffs:
            print("  - " + diff, file=sys.stderr)
        print(
            "Migrate the data into a fresh baseline database instead; "
            "see docs/DATABASE_DEPLOYMENT.md.",
            file=sys.stderr,
        )
        return 1

    if not args.confirm:
        print("Dry run only. Re-run with --confirm to stamp this database.")
        return 0

    from alembic import command
    from alembic.config import Config

    config = Config(str(ALEMBIC_INI))
    config.set_main_option("script_location", str(ALEMBIC_INI.parent / "alembic"))

    command.stamp(config, revision, purge=not args.no_purge)
    print("Database stamped at " + revision + ". Application data unchanged.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
