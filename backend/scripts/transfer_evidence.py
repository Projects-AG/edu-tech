"""Upload local evidence files to the private Supabase Storage bucket.

The local evidence directory is read-only. Files keep their relative path,
prefixed with ``evidence/``, which matches the key format used by the live
upload endpoint (``evidence/<folder>/<stored-name>``).

Usage (from ``backend/``)::

    python -m scripts.transfer_evidence                       # dry run
    python -m scripts.transfer_evidence --confirm             # upload
    python -m scripts.transfer_evidence --confirm --update-database

``--update-database`` rewrites ``documents.file_path`` from the legacy
``/uploads/evidence/...`` form to the bucket-relative key. It is a separate,
explicit opt-in and requires ``--confirm``. Database rows whose local file is
missing are reported and left unchanged. Nothing is ever deleted.
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

from scripts.db_common import BACKEND_DIR, resolve_database_url

DEFAULT_SOURCE_DIR = BACKEND_DIR / "uploads" / "evidence"
DEFAULT_BUCKET = "naac-evidence"

load_dotenv(BACKEND_DIR / ".env")


def storage_settings() -> dict:
    return {
        "endpoint": os.getenv("STORAGE_ENDPOINT", "").strip(),
        "bucket": os.getenv("STORAGE_BUCKET", DEFAULT_BUCKET).strip()
        or DEFAULT_BUCKET,
        "access_key": os.getenv("STORAGE_ACCESS_KEY", "").strip(),
        "secret_key": os.getenv("STORAGE_SECRET_KEY", "").strip(),
    }


def missing_storage_settings(settings: dict) -> list[str]:
    mapping = {
        "STORAGE_ENDPOINT": settings["endpoint"],
        "STORAGE_BUCKET": settings["bucket"],
        "STORAGE_ACCESS_KEY": settings["access_key"],
        "STORAGE_SECRET_KEY": settings["secret_key"],
    }
    return [name for name, value in mapping.items() if not value]


def legacy_path_to_key(stored_path: str) -> str | None:
    """Convert a legacy local evidence path into a bucket key.

    Returns None for paths outside ``uploads/evidence`` so callers can leave
    them untouched instead of inventing a broken reference.
    """
    normalized = (stored_path or "").replace("\\", "/").strip()

    if normalized.startswith("/uploads/evidence/"):
        return "evidence/" + normalized[len("/uploads/evidence/"):]
    if normalized.startswith("uploads/evidence/"):
        return "evidence/" + normalized[len("uploads/evidence/"):]
    if normalized.startswith("evidence/"):
        return normalized
    return None


def build_manifest(source_dir: Path) -> list[dict]:
    if not source_dir.is_dir():
        raise RuntimeError(f"Evidence directory not found: {source_dir}")

    manifest = []
    for path in sorted(source_dir.rglob("*")):
        if not path.is_file():
            continue
        relative = path.relative_to(source_dir).as_posix()
        manifest.append(
            {
                "path": path,
                "relative": relative,
                "key": "evidence/" + relative,
                "size": path.stat().st_size,
                "content_type": mimetypes.guess_type(path.name)[0]
                or "application/octet-stream",
            }
        )
    return manifest


def database_updates(database_url: str, manifest: list[dict]) -> tuple[list[dict], list[dict]]:
    """Return (updates, skipped) for legacy document paths.

    Read-only: this function never modifies the database.
    """
    from sqlalchemy import create_engine, text
    from sqlalchemy.pool import NullPool

    local_keys = {item["key"]: item for item in manifest}
    engine = create_engine(database_url, poolclass=NullPool)
    try:
        with engine.connect() as connection:
            rows = connection.execute(
                text(
                    "SELECT id, file_path FROM documents "
                    "WHERE file_path LIKE '/uploads/evidence/%' "
                    "ORDER BY id"
                )
            ).fetchall()
    finally:
        engine.dispose()

    updates = []
    skipped = []
    for row in rows:
        key = legacy_path_to_key(row.file_path)
        if key and key in local_keys:
            updates.append(
                {
                    "document_id": row.id,
                    "old_path": row.file_path,
                    "new_path": key,
                }
            )
        else:
            skipped.append(
                {
                    "document_id": row.id,
                    "path": row.file_path,
                    "reason": "local file not found",
                }
            )

    return updates, skipped


def apply_database_updates(database_url: str, updates: list[dict]) -> int:
    from sqlalchemy import create_engine, text
    from sqlalchemy.pool import NullPool

    if not updates:
        return 0

    engine = create_engine(database_url, poolclass=NullPool)
    try:
        with engine.begin() as connection:
            updated = 0
            for update in updates:
                result = connection.execute(
                    text(
                        "UPDATE documents SET file_path = :new_path "
                        "WHERE id = :document_id "
                        "AND file_path = :old_path"
                    ),
                    {
                        "new_path": update["new_path"],
                        "document_id": update["document_id"],
                        "old_path": update["old_path"],
                    },
                )
                updated += max(result.rowcount or 0, 0)

            if updated != len(updates):
                raise RuntimeError(
                    "Database path update count mismatch: expected "
                    f"{len(updates)}, updated {updated}. Rolling back."
                )
    finally:
        engine.dispose()

    return updated


def create_client(settings: dict):
    try:
        import boto3
    except ImportError as exc:
        raise RuntimeError(
            "boto3 is not installed; cannot upload evidence"
        ) from exc

    return boto3.client(
        "s3",
        endpoint_url=settings["endpoint"],
        aws_access_key_id=settings["access_key"],
        aws_secret_access_key=settings["secret_key"],
    )


def existing_object_size(client, bucket: str, key: str) -> int | None:
    try:
        response = client.head_object(Bucket=bucket, Key=key)
    except Exception:
        return None
    return int(response.get("ContentLength", -1))


def upload_manifest(
    client,
    bucket: str,
    manifest: list[dict],
    *,
    overwrite: bool,
) -> tuple[list[dict], list[dict]]:
    uploaded = []
    skipped = []

    for item in manifest:
        existing = existing_object_size(client, bucket, item["key"])
        if existing == item["size"] and not overwrite:
            skipped.append({"key": item["key"], "reason": "already present"})
            continue

        client.upload_file(
            str(item["path"]),
            bucket,
            item["key"],
            ExtraArgs={"ContentType": item["content_type"]},
        )
        uploaded_size = existing_object_size(client, bucket, item["key"])
        if uploaded_size != item["size"]:
            raise RuntimeError(
                f"Upload validation failed for {item['key']}: "
                f"expected {item['size']} bytes, found {uploaded_size}"
            )
        uploaded.append({"key": item["key"], "size": item["size"]})

    return uploaded, skipped


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source-dir",
        type=Path,
        default=DEFAULT_SOURCE_DIR,
        help=f"Local evidence directory (default: {DEFAULT_SOURCE_DIR}).",
    )
    parser.add_argument(
        "--bucket",
        default=None,
        help="Target bucket. Defaults to STORAGE_BUCKET or naac-evidence.",
    )
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Actually upload files. Without this flag only a report runs.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Re-upload objects even when the size already matches.",
    )
    parser.add_argument(
        "--update-database",
        action="store_true",
        help=(
            "With --confirm, rewrite /uploads/evidence/... document paths "
            "to bucket-relative keys after successful uploads."
        ),
    )
    parser.add_argument(
        "--database-url",
        default=None,
        help="PostgreSQL URL for --update-database. Prefer DATABASE_URL.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print the report as JSON (no secrets).",
    )
    return parser.parse_args(argv)


def main(argv=None) -> int:
    args = parse_args(argv)
    settings = storage_settings()
    if args.bucket:
        settings["bucket"] = args.bucket.strip() or settings["bucket"]

    try:
        manifest = build_manifest(args.source_dir)
    except Exception as exc:
        print("Evidence transfer failed: " + str(exc), file=sys.stderr)
        return 1

    missing = missing_storage_settings(settings)
    report = {
        "status": "dry-run" if not args.confirm else "transferred",
        "source_dir": str(args.source_dir),
        "bucket": settings["bucket"],
        "file_count": len(manifest),
        "total_bytes": sum(item["size"] for item in manifest),
        "missing_settings": missing,
        "uploaded": [],
        "skipped_uploads": [],
        "database_updates": [],
        "database_skipped": [],
    }

    database_url = None
    if args.update_database:
        database_url = resolve_database_url(args.database_url)
        updates, skipped = database_updates(database_url, manifest)
        report["database_updates"] = updates
        report["database_skipped"] = skipped

    if missing:
        message = (
            "Supabase Storage is not configured. Missing setting(s): "
            + ", ".join(missing)
        )
        if args.confirm:
            print("Evidence transfer failed: " + message, file=sys.stderr)
            return 1
        report["storage_warning"] = message

    if args.confirm:
        if missing:
            return 1

        try:
            client = create_client(settings)
            uploaded, skipped = upload_manifest(
                client,
                settings["bucket"],
                manifest,
                overwrite=args.overwrite,
            )
        except Exception as exc:
            print("Evidence transfer failed: " + str(exc), file=sys.stderr)
            return 1

        report["uploaded"] = uploaded
        report["skipped_uploads"] = skipped

        if args.update_database:
            try:
                applied = apply_database_updates(
                    database_url,
                    report["database_updates"],
                )
            except Exception as exc:
                print(
                    "Uploads succeeded, but database path update failed: "
                    + str(exc),
                    file=sys.stderr,
                )
                return 1
            report["database_updates_applied"] = applied
    else:
        report["storage_warning"] = report.get(
            "storage_warning", "Dry run only; no files uploaded."
        )

    if args.json:
        printable = dict(report)
        printable.pop("database_updates", None)
        printable["database_update_count"] = len(report["database_updates"])
        print(json.dumps(printable, indent=2, sort_keys=True))
        return 0

    print("Source: " + report["source_dir"])
    print("Bucket: " + report["bucket"])
    print(f"Files: {report['file_count']} ({report['total_bytes']} bytes)")
    if missing:
        print("Storage warning: " + report["storage_warning"])
    else:
        print("Storage configuration: OK")

    if args.update_database:
        print(
            f"Database path updates: {len(report['database_updates'])}"
        )
        for item in report["database_skipped"]:
            print(
                f"  skipped document {item['document_id']}: "
                f"{item['path']} ({item['reason']})"
            )

    if not args.confirm:
        print("\nDry run only. Re-run with --confirm to upload.")
        return 0

    print(f"Uploaded: {len(report['uploaded'])}")
    print(f"Skipped (already present): {len(report['skipped_uploads'])}")
    if args.update_database:
        print(
            "Database path updates applied: "
            + str(report.get("database_updates_applied", 0))
        )
    print("Evidence transfer complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
