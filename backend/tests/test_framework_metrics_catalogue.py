import unittest

from app.db.database import SessionLocal
from app.models import AccreditationCycle, Submission
from app.models.naac_framework import FrameworkCriterion, FrameworkMetric, NaacFramework
from app.services.framework_service import (
    assert_cycle_status_allowed,
    ensure_naac_frameworks,
    framework_readiness,
    load_official_qif_rows,
    official_mapped_metric_rows,
    validate_official_qif_row,
)
from app.services.naac_framework_catalog import (
    CODE_INTERNAL,
    CODE_RAF_AFFILIATED,
    CODE_RAF_AUTONOMOUS,
    CODE_RAF_UNIVERSITY,
    INTERNAL_WORKING_CATALOG,
    REQUIRES_OFFICIAL_VERIFICATION,
    VERIFIED,
)


class OfficialMetricCatalogueTests(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        ensure_naac_frameworks(self.db)
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def _framework(self, code):
        return (
            self.db.query(NaacFramework)
            .filter(NaacFramework.code == code)
            .first()
        )

    def test_autonomous_qif_source_has_unique_codes_and_expected_count(self):
        rows = load_official_qif_rows(CODE_RAF_AUTONOMOUS)
        codes = [item["official_code"] for item in rows]
        self.assertEqual(len(rows), 85)
        self.assertEqual(len(codes), len(set(codes)))
        self.assertEqual(sum(1 for item in rows if item["metric_kind"] == "QlM"), 35)
        self.assertEqual(sum(1 for item in rows if item["metric_kind"] == "QnM"), 50)
        self.assertEqual(sum(item["weightage"] or 0 for item in rows), 1000)
        self.assertTrue(all(item["required_default"] is False for item in rows))

    def test_autonomous_seed_is_idempotent_and_linked_to_criteria(self):
        framework = self._framework(CODE_RAF_AUTONOMOUS)
        first = (
            self.db.query(FrameworkMetric)
            .filter(FrameworkMetric.framework_id == framework.id)
            .count()
        )
        ensure_naac_frameworks(self.db)
        self.db.commit()
        second = (
            self.db.query(FrameworkMetric)
            .filter(FrameworkMetric.framework_id == framework.id)
            .count()
        )
        self.assertEqual(first, 85)
        self.assertEqual(second, 85)
        unlinked = (
            self.db.query(FrameworkMetric)
            .filter(
                FrameworkMetric.framework_id == framework.id,
                FrameworkMetric.framework_criterion_id.is_(None),
            )
            .count()
        )
        self.assertEqual(unlinked, 0)
        criterion_count = (
            self.db.query(FrameworkCriterion)
            .filter(FrameworkCriterion.framework_id == framework.id)
            .count()
        )
        self.assertEqual(criterion_count, 7)

    def test_autonomous_metrics_are_not_mapped_or_marked_required(self):
        framework = self._framework(CODE_RAF_AUTONOMOUS)
        self.assertEqual(official_mapped_metric_rows(self.db, framework), [])
        required = (
            self.db.query(FrameworkMetric)
            .filter(
                FrameworkMetric.framework_id == framework.id,
                FrameworkMetric.required_default.is_(True),
            )
            .count()
        )
        self.assertEqual(required, 0)

    def test_autonomous_id_catalogue_is_not_a_production_cycle(self):
        framework = self._framework(CODE_RAF_AUTONOMOUS)
        readiness = framework_readiness(self.db, framework)
        self.assertEqual(readiness["metric_row_count"], 85)
        self.assertTrue(readiness["metric_catalogue_complete"])
        self.assertFalse(readiness["allows_production_cycles"])
        with self.assertRaises(Exception):
            assert_cycle_status_allowed(self.db, framework, "Active")
        assert_cycle_status_allowed(self.db, framework, "Draft")

    def test_university_and_affiliated_remain_incomplete(self):
        for code in (CODE_RAF_UNIVERSITY, CODE_RAF_AFFILIATED):
            framework = self._framework(code)
            readiness = framework_readiness(self.db, framework)
            self.assertEqual(readiness["metric_row_count"], 0)
            self.assertFalse(readiness["metric_catalogue_complete"])
            self.assertFalse(readiness["allows_production_cycles"])
            with self.assertRaises(Exception):
                assert_cycle_status_allowed(self.db, framework, "Active")

    def test_existing_cycles_and_submissions_are_unchanged(self):
        cycles = (
            self.db.query(AccreditationCycle)
            .filter(AccreditationCycle.id.in_([10, 11]))
            .all()
        )
        self.assertEqual(len(cycles), 2)
        for cycle in cycles:
            self.assertIsNone(cycle.framework_id)
        self.assertEqual(self.db.query(Submission).count(), 44)

    def test_internal_working_catalogue_readiness_is_preparation_only(self):
        """Regression test: internal working catalogue is unverified and preparation-only."""
        framework = self._framework(CODE_INTERNAL)
        self.assertIsNotNone(framework)
        readiness = framework_readiness(self.db, framework)
        self.assertFalse(readiness["confirmable"])
        self.assertFalse(readiness["criterion_structure_verified"])
        self.assertFalse(readiness["metric_catalogue_complete"])
        self.assertFalse(readiness["allows_production_cycles"])
        self.assertEqual(readiness["catalogue_status"], INTERNAL_WORKING_CATALOG)


class CatalogueRowValidationTests(unittest.TestCase):
    """Focused tests for invalid catalogue rows (Point 4)."""

    def _valid_row(self):
        return {
            "official_code": "1.1.1",
            "criterion_number": "C1",
            "title": "Curricula developed and implemented have relevance",
            "metric_kind": "QlM",
            "weightage": 20,
            "required_default": False,
            "verification_status": VERIFIED,
            "required_status": REQUIRES_OFFICIAL_VERIFICATION,
        }

    def test_valid_row_passes_validation(self):
        row = self._valid_row()
        validated = validate_official_qif_row(row)
        self.assertEqual(validated["official_code"], "1.1.1")
        self.assertEqual(validated["verification_status"], VERIFIED)

    def test_rejects_missing_or_blank_code(self):
        for bad_code in (None, "", "   "):
            row = self._valid_row()
            row["official_code"] = bad_code
            with self.assertRaises(ValueError) as ctx:
                validate_official_qif_row(row)
            self.assertIn("code", str(ctx.exception).lower())

        row = self._valid_row()
        del row["official_code"]
        with self.assertRaises(ValueError) as ctx:
            validate_official_qif_row(row)
        self.assertIn("code", str(ctx.exception).lower())

    def test_rejects_missing_or_blank_title(self):
        for bad_title in (None, "", "   "):
            row = self._valid_row()
            row["title"] = bad_title
            with self.assertRaises(ValueError) as ctx:
                validate_official_qif_row(row)
            self.assertIn("title", str(ctx.exception).lower())

        row = self._valid_row()
        del row["title"]
        with self.assertRaises(ValueError) as ctx:
            validate_official_qif_row(row)
        self.assertIn("title", str(ctx.exception).lower())

    def test_rejects_missing_or_invalid_criterion_mapping(self):
        for bad_criterion in (None, "", "   ", "C0", "C8", "C99", "CRITERION_1"):
            row = self._valid_row()
            row["criterion_number"] = bad_criterion
            with self.assertRaises(ValueError) as ctx:
                validate_official_qif_row(row)
            self.assertIn("criterion", str(ctx.exception).lower())

        row = self._valid_row()
        del row["criterion_number"]
        with self.assertRaises(ValueError) as ctx:
            validate_official_qif_row(row)
        self.assertIn("criterion", str(ctx.exception).lower())

    def test_rejects_missing_or_unverified_metadata(self):
        for bad_status in (None, "", "   "):
            row = self._valid_row()
            row["verification_status"] = bad_status
            with self.assertRaises(ValueError) as ctx:
                validate_official_qif_row(row)
            self.assertIn("verification", str(ctx.exception).lower())

        row = self._valid_row()
        del row["verification_status"]
        with self.assertRaises(ValueError) as ctx:
            validate_official_qif_row(row)
        self.assertIn("verification", str(ctx.exception).lower())

        # Unverified data must not be silently accepted as verified
        row = self._valid_row()
        row["verification_status"] = REQUIRES_OFFICIAL_VERIFICATION
        with self.assertRaises(ValueError) as ctx:
            validate_official_qif_row(row, require_verified=True)
        self.assertIn("verified", str(ctx.exception).lower())

    def test_rejects_non_dict_row(self):
        for bad_row in ("not a dict", [1, 2, 3], None):
            with self.assertRaises(ValueError) as ctx:
                validate_official_qif_row(bad_row)
            self.assertIn("expected dict", str(ctx.exception).lower())

    def test_load_official_qif_rows_rejects_duplicate_codes(self):
        from unittest.mock import patch
        duplicate_payload = [
            self._valid_row(),
            self._valid_row(),  # duplicate 1.1.1
        ]
        with patch("pathlib.Path.read_text", return_value=__import__("json").dumps(duplicate_payload)):
            with self.assertRaises(ValueError) as ctx:
                load_official_qif_rows(CODE_RAF_AUTONOMOUS)
            self.assertIn("duplicate", str(ctx.exception).lower())

    def test_load_official_qif_rows_rejects_invalid_rows_without_silently_skipping(self):
        from unittest.mock import patch
        invalid_payload = [
            {"official_code": "1.1.1", "title": "No criterion or status"}
        ]
        with patch("pathlib.Path.read_text", return_value=__import__("json").dumps(invalid_payload)):
            with self.assertRaises(ValueError) as ctx:
                load_official_qif_rows(CODE_RAF_AUTONOMOUS)
            self.assertIn("criterion", str(ctx.exception).lower())


if __name__ == "__main__":
    unittest.main()
