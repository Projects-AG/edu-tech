"""Verify that a PostgreSQL database matches the SQLAlchemy models.

Usage (from ``backend/``)::

    python -m scripts.verify_schema
    python -m scripts.verify_schema --expect-head
    python -m scripts.verify_schema --database-url "postgresql://..."

The script is read-only: it never creates, alters, or drops objects and
never prints the database URL or credentials.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

from scripts.db_common import (
    get_current_heads,
    get_script_head_revision,
    resolve_database_url,
    verify_schema,
)


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--database-url",
        default=None,
        help=(
            "PostgreSQL URL. Prefer the DATABASE_URL environment variable. "
            "The value is never echoed."
        ),
    )
    parser.add_argument(
        "--expect-head",
        action="store_true",
        help="Also require Alembic to be stamped at the current head.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit a machine-readable result (no secrets).",
    )
    return parser.parse_args(argv)


def main(argv=None) -> int:
    args = parse_args(argv)
    database_url = resolve_database_url(args.database_url)
    os.environ["DATABASE_URL"] = database_url

    expected_heads = None
    if args.expect_head:
        expected_heads = (get_script_head_revision(),)

    diffs = verify_schema(database_url, expect_heads=expected_heads)
    current_heads = list(get_current_heads(database_url))

    result = {
        "status": "ok" if not diffs else "mismatch",
        "difference_count": len(diffs),
        "differences": diffs,
        "current_revisions": current_heads,
        "expected_revision": expected_heads[0] if expected_heads else None,
    }

    if args.json:
        print(json.dumps(result, indent=2, sort_keys=True))
    else:
        print("Current Alembic revision(s): " + (
            ", ".join(current_heads) if current_heads else "<none>"
        ))
        if diffs:
            print(f"Schema verification FAILED: {len(diffs)} difference(s).")
            for diff in diffs:
                print("  - " + diff)
        else:
            print("Schema verification OK: database matches the models.")

    return 0 if not diffs else 1


if __name__ == "__main__":
    sys.exit(main())
