"""Idempotent seed for versioned NAAC framework catalogue."""

from app.db.database import SessionLocal
from app.services.framework_service import ensure_naac_frameworks


def main():
    db = SessionLocal()
    try:
        created = ensure_naac_frameworks(db)
        db.commit()
        print(
            f"NAAC framework catalogue ready. "
            f"Newly inserted: {len(created)}"
        )
        for item in created:
            print(f"  + {item.code} {item.version}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
