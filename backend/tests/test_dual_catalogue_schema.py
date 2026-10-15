import unittest

from sqlalchemy import inspect, text

from app.db.database import SessionLocal, engine
from app.models import AccreditationCycle, Metric, Submission
from app.models.evidence_requirement import EvidenceRequirement
from app.models.metric import CATALOG_KIND_OFFICIAL, CATALOG_KIND_WORKING
from app.models.naac_framework import FrameworkMetric, NaacFramework
from app.services.naac_framework_catalog import (
    CODE_RAF_AFFILIATED,
    CODE_RAF_AUTONOMOUS,
    CODE_RAF_UNIVERSITY,
)


WORKING_SNAPSHOT = [
    (1, "1.1.1", "Curriculum Planning and Implementation", "Quantitative", 10.0),
    (2, "1.1.2", "Curriculum Development and Revision", "Quantitative", 10.0),
    (3, "1.1.3", "Academic Planning and Delivery", "Quantitative", 10.0),
    (4, "1.2.1", "Academic Flexibility and Choice", "Quantitative", 10.0),
    (5, "1.2.2", "Choice Based Learning Opportunities", "Quantitative", 10.0),
    (6, "1.3.1", "Curriculum Enrichment Activities", "Quantitative", 10.0),
    (7, "1.3.2", "Value Added Learning", "Quantitative", 10.0),
    (8, "2.1.1", "Student Admission and Enrolment", "Quantitative", 10.0),
    (9, "2.1.2", "Student Profile Analysis", "Quantitative", 10.0),
    (10, "2.2.1", "Teaching-Learning Practices", "Quantitative", 10.0),
    (11, "2.2.2", "Student Centric Learning", "Quantitative", 10.0),
    (12, "2.3.1", "Continuous Internal Evaluation", "Quantitative", 10.0),
    (13, "2.3.2", "Assessment and Feedback", "Quantitative", 10.0),
    (14, "3.1.1", "Research Publications", "Quantitative", 10.0),
    (15, "3.1.2", "Research Quality and Impact", "Quantitative", 10.0),
    (16, "3.2.1", "Innovation Activities", "Quantitative", 10.0),
    (17, "3.2.2", "Research Collaboration", "Quantitative", 10.0),
    (18, "3.3.1", "Extension Activities", "Quantitative", 10.0),
    (19, "3.3.2", "Community Outreach", "Quantitative", 10.0),
    (20, "4.1.1", "Physical Infrastructure Facilities", "Quantitative", 10.0),
    (21, "4.1.2", "Infrastructure Maintenance", "Quantitative", 10.0),
    (22, "4.2.1", "Library Resources", "Quantitative", 10.0),
    (23, "4.2.2", "Library Utilization", "Quantitative", 10.0),
    (24, "4.3.1", "IT Infrastructure", "Quantitative", 10.0),
    (25, "4.3.2", "Digital Learning Resources", "Quantitative", 10.0),
    (26, "5.1.1", "Student Support Services", "Quantitative", 10.0),
    (27, "5.1.2", "Student Welfare Initiatives", "Quantitative", 10.0),
    (28, "5.2.1", "Student Progression", "Quantitative", 10.0),
    (29, "5.2.2", "Career and Placement Support", "Quantitative", 10.0),
    (30, "5.3.1", "Student Participation", "Quantitative", 10.0),
    (31, "5.3.2", "Student Clubs and Activities", "Quantitative", 10.0),
    (32, "6.1.1", "Institutional Governance", "Quantitative", 10.0),
    (33, "6.1.2", "Participative Decision Making", "Quantitative", 10.0),
    (34, "6.2.1", "Leadership Effectiveness", "Quantitative", 10.0),
    (35, "6.2.2", "Management Practices", "Quantitative", 10.0),
    (36, "6.3.1", "Financial Planning", "Quantitative", 10.0),
    (37, "6.3.2", "Financial Audit and Accountability", "Quantitative", 10.0),
    (38, "7.1.1", "Institutional Values and Ethics", "Quantitative", 10.0),
    (39, "7.1.2", "Environmental and Social Responsibility", "Quantitative", 10.0),
    (40, "7.2.1", "Institutional Best Practices", "Quantitative", 10.0),
    (41, "7.2.2", "Innovative Institutional Practices", "Quantitative", 10.0),
    (42, "8.1.1", "Institutional Outreach", "Quantitative", 10.0),
    (43, "8.1.2", "Outreach Programmes", "Quantitative", 10.0),
    (44, "8.2.1", "Community Engagement", "Quantitative", 10.0),
    (45, "8.2.2", "Social Development Activities", "Quantitative", 10.0),
    (46, "9.1.1", "Health and Wellness Facilities", "Quantitative", 10.0),
    (47, "9.1.2", "Student and Staff Health Initiatives", "Quantitative", 10.0),
    (48, "9.2.1", "Environmental Sustainability", "Quantitative", 10.0),
    (49, "9.2.2", "Green Campus Initiatives", "Quantitative", 10.0),
    (50, "10.1.1", "Overall Institutional Outcomes", "Quantitative", 10.0),
    (51, "10.1.2", "Institutional Performance Review", "Quantitative", 10.0),
]


class DualCatalogueSchemaTests(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_existing_metrics_are_working_catalogue_only(self):
        rows = (
            self.db.query(Metric)
            .filter(Metric.catalog_kind == CATALOG_KIND_WORKING)
            .order_by(Metric.id.asc())
            .all()
        )
        self.assertEqual(len(rows), 51)
        snapshot = [
            (row.id, row.code, row.title, row.metric_type, row.weightage)
            for row in rows
        ]
        self.assertEqual(snapshot, WORKING_SNAPSHOT)
        self.assertTrue(all(row.catalog_kind == CATALOG_KIND_WORKING for row in rows))
        self.assertTrue(all(row.framework_id is None for row in rows))

    def test_submissions_keep_metric_code_and_null_metric_id(self):
        submissions = self.db.query(Submission).all()
        self.assertEqual(len(submissions), 44)
        self.assertTrue(all(item.metric_id is None for item in submissions))
        self.assertTrue(all(item.metric_code for item in submissions))

    def test_framework_mapping_fields_remain_unused(self):
        mapped = (
            self.db.query(FrameworkMetric)
            .filter(FrameworkMetric.maps_to_metric_id.isnot(None))
            .count()
        )
        required = (
            self.db.query(FrameworkMetric)
            .filter(FrameworkMetric.required_default.is_(True))
            .count()
        )
        self.assertEqual(mapped, 0)
        self.assertEqual(required, 0)

    def test_cycles_university_affiliated_and_evidence_preserved(self):
        cycles = (
            self.db.query(AccreditationCycle)
            .filter(AccreditationCycle.id.in_([10, 11]))
            .all()
        )
        self.assertEqual(len(cycles), 2)
        for cycle in cycles:
            self.assertIsNone(cycle.framework_id)
        university = (
            self.db.query(NaacFramework)
            .filter(NaacFramework.code == CODE_RAF_UNIVERSITY)
            .one()
        )
        affiliated = (
            self.db.query(NaacFramework)
            .filter(NaacFramework.code == CODE_RAF_AFFILIATED)
            .one()
        )
        autonomous = (
            self.db.query(NaacFramework)
            .filter(NaacFramework.code == CODE_RAF_AUTONOMOUS)
            .one()
        )
        self.assertEqual(
            self.db.query(FrameworkMetric)
            .filter(FrameworkMetric.framework_id == university.id)
            .count(),
            0,
        )
        self.assertEqual(
            self.db.query(FrameworkMetric)
            .filter(FrameworkMetric.framework_id == affiliated.id)
            .count(),
            0,
        )
        self.assertEqual(
            self.db.query(FrameworkMetric)
            .filter(FrameworkMetric.framework_id == autonomous.id)
            .count(),
            85,
        )
        self.assertFalse(autonomous.allows_production_cycles)
        working_evidence = (
            self.db.query(EvidenceRequirement)
            .join(Metric, Metric.id == EvidenceRequirement.metric_id)
            .filter(Metric.catalog_kind == CATALOG_KIND_WORKING)
            .count()
        )
        self.assertEqual(working_evidence, 51)

    def test_metric_code_is_not_globally_unique(self):
        indexes = inspect(engine).get_indexes("metrics")
        unique_on_code_only = [
            item
            for item in indexes
            if item.get("unique") and item.get("column_names") == ["code"]
        ]
        self.assertEqual(unique_on_code_only, [])
        names = {item["name"] for item in indexes}
        self.assertIn("uq_metrics_official_framework_code", names)
        self.assertIn("ix_metrics_code", names)

    def test_same_display_code_can_exist_across_catalogues(self):
        working = (
            self.db.query(Metric)
            .filter(
                Metric.code == "1.1.1",
                Metric.catalog_kind == CATALOG_KIND_WORKING,
            )
            .one()
        )
        autonomous = (
            self.db.query(NaacFramework)
            .filter(NaacFramework.code == CODE_RAF_AUTONOMOUS)
            .one()
        )
        official = (
            self.db.query(Metric)
            .filter(
                Metric.code == "1.1.1",
                Metric.catalog_kind == CATALOG_KIND_OFFICIAL,
            )
            .first()
        )
        if official:
            self.assertNotEqual(working.id, official.id)
            self.assertEqual(official.framework_id, autonomous.id)
            return
        try:
            self.db.execute(
                text(
                    "INSERT INTO metrics ("
                    "section_id, code, title, metric_type, weightage, max_score, "
                    "requires_evidence, display_order, created_at, updated_at, "
                    "catalog_kind, framework_id"
                    ") VALUES ("
                    ":section_id, '1.1.1', 'Official clone probe', 'Qualitative', "
                    "20, 100, true, 1, NOW(), NOW(), 'OFFICIAL', :framework_id"
                    ")"
                ),
                {
                    "section_id": working.section_id,
                    "framework_id": autonomous.id,
                },
            )
            count = (
                self.db.query(Metric)
                .filter(Metric.code == "1.1.1")
                .count()
            )
            self.assertEqual(count, 2)
        finally:
            self.db.rollback()
        remaining = (
            self.db.query(Metric)
            .filter(
                Metric.code == "1.1.1",
                Metric.catalog_kind == CATALOG_KIND_WORKING,
            )
            .count()
        )
        self.assertEqual(remaining, 1)
        self.assertEqual(
            self.db.query(Metric)
            .filter(Metric.catalog_kind == CATALOG_KIND_WORKING)
            .count(),
            51,
        )


if __name__ == "__main__":
    unittest.main()
