from app.db.database import SessionLocal
from app.models import EvidenceRequirement, Metric


def seed_evidence_requirements():
    db = SessionLocal()

    try:
        metrics = db.query(Metric).order_by(Metric.id).all()

        if not metrics:
            print("No metrics found. Please seed metrics first.")
            return

        inserted = 0
        skipped = 0

        for metric in metrics:

            # Check whether evidence already exists for this metric
            existing = (
                db.query(EvidenceRequirement)
                .filter(EvidenceRequirement.metric_id == metric.id)
                .first()
            )

            if existing:
                skipped += 1
                continue

            evidence = EvidenceRequirement(
                metric_id=metric.id,
                title=f"{metric.title} - Supporting Evidence",
                description=(
                    f"Supporting documents and records for "
                    f"{metric.title.lower()}."
                ),
                required=metric.requires_evidence,
                allowed_file_types="pdf,doc,docx,xls,xlsx,jpg,jpeg,png",
                max_files=5,
            )

            db.add(evidence)
            inserted += 1

        db.commit()

        print()
        print("===================================")
        print("NAAC EVIDENCE REQUIREMENT SEED COMPLETE")
        print("===================================")
        print(f"Inserted : {inserted}")
        print(f"Skipped  : {skipped}")
        print("===================================")

    except Exception as e:
        db.rollback()
        print("ERROR:", e)

    finally:
        db.close()


if __name__ == "__main__":
    seed_evidence_requirements()