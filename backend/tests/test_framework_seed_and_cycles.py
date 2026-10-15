import unittest

from app.db.database import SessionLocal
from app.models import AccreditationCycle, NaacFramework
from app.services.framework_service import ensure_naac_frameworks
from app.models.naac_framework import FrameworkMetric
from app.services.naac_framework_catalog import (
    CODE_BINARY,
    CODE_MBGL,
    CODE_RAF_UNIVERSITY,
    FRAMEWORK_DEFINITIONS,
)


class SeedAndCompatibilityTests(unittest.TestCase):
    def test_seed_is_idempotent(self):
        db = SessionLocal()
        try:
            ensure_naac_frameworks(db)
            db.commit()
            first = db.query(NaacFramework).count()
            ensure_naac_frameworks(db)
            db.commit()
            second = db.query(NaacFramework).count()
            self.assertEqual(first, second)
            self.assertGreaterEqual(first, len(FRAMEWORK_DEFINITIONS))
        finally:
            db.close()

    def test_existing_cycles_keep_null_framework_until_new_create(self):
        db = SessionLocal()
        try:
            rows = (
                db.query(AccreditationCycle)
                .filter(AccreditationCycle.id.in_([10, 11]))
                .all()
            )
            for cycle in rows:
                self.assertIsNone(
                    cycle.framework_id,
                    f"Existing cycle {cycle.id} must keep its original "
                    "framework/version (null until a new cycle is created).",
                )
        finally:
            db.close()

    def test_university_and_affiliated_metrics_are_not_invented(self):
        db = SessionLocal()
        try:
            ensure_naac_frameworks(db)
            db.commit()
            university = (
                db.query(NaacFramework)
                .filter(NaacFramework.code == CODE_RAF_UNIVERSITY)
                .first()
            )
            affiliated = (
                db.query(NaacFramework)
                .filter(NaacFramework.code == "RAF_AFFILIATED_CONSTITUENT_COLLEGE")
                .first()
            )
            self.assertEqual(
                db.query(FrameworkMetric)
                .filter(FrameworkMetric.framework_id == university.id)
                .count(),
                0,
            )
            self.assertEqual(
                db.query(FrameworkMetric)
                .filter(FrameworkMetric.framework_id == affiliated.id)
                .count(),
                0,
            )
        finally:
            db.close()

    def test_raf_university_not_marked_production_in_database(self):
        db = SessionLocal()
        try:
            ensure_naac_frameworks(db)
            db.commit()
            row = (
                db.query(NaacFramework)
                .filter(NaacFramework.code == CODE_RAF_UNIVERSITY)
                .first()
            )
            self.assertIsNotNone(row)
            self.assertFalse(row.allows_production_cycles)
        finally:
            db.close()

    def test_binary_and_mbgl_cannot_be_used_for_production(self):
        db = SessionLocal()
        try:
            ensure_naac_frameworks(db)
            db.commit()
            for code in (CODE_BINARY, CODE_MBGL):
                row = (
                    db.query(NaacFramework)
                    .filter(NaacFramework.code == code)
                    .first()
                )
                self.assertIsNotNone(row)
                self.assertFalse(row.allows_production_cycles)
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
