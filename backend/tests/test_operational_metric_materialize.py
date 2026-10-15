import unittest

from fastapi import HTTPException

from app.db.database import SessionLocal
from app.models import AccreditationCycle, Metric, Submission
from app.models.evidence_requirement import EvidenceRequirement
from app.models.metric import CATALOG_KIND_OFFICIAL, CATALOG_KIND_WORKING
from app.models.naac_framework import FrameworkMetric, NaacFramework
from app.services.framework_service import (
    assert_cycle_status_allowed,
    framework_readiness,
    official_mapped_metric_rows,
)
from app.services.naac_framework_catalog import (
    CODE_RAF_AFFILIATED,
    CODE_RAF_AUTONOMOUS,
    CODE_RAF_UNIVERSITY,
)
from app.services.operational_metric_service import (
    GENERIC_EVIDENCE_TITLE,
    materialize_autonomous_operational_metrics,
    materialize_framework_operational_metrics,
)
from tests.test_dual_catalogue_schema import WORKING_SNAPSHOT
from tests.test_framework_recommendation import _login, api_client


class AutonomousOperationalMaterializeTests(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        self.framework = (
            self.db.query(NaacFramework)
            .filter(NaacFramework.code == CODE_RAF_AUTONOMOUS)
            .one()
        )

    def tearDown(self):
        self.db.close()

    def test_materialize_creates_eighty_five_official_metrics(self):
        first = materialize_autonomous_operational_metrics(
            self.db,
            self.framework,
        )
        self.db.commit()
        second = materialize_autonomous_operational_metrics(
            self.db,
            self.framework,
        )
        self.db.commit()

        official = (
            self.db.query(Metric)
            .filter(
                Metric.catalog_kind == CATALOG_KIND_OFFICIAL,
                Metric.framework_id == self.framework.id,
            )
            .all()
        )
        identity = (
            self.db.query(FrameworkMetric)
            .filter(FrameworkMetric.framework_id == self.framework.id)
            .all()
        )
        official_ids = {row.id for row in official}
        linked_ids = {row.operational_metric_id for row in identity}

        self.assertEqual(first["operational_metrics_linked"], 85)
        self.assertEqual(second["operational_metrics_created"], 0)
        self.assertEqual(second["operational_metrics_linked"], 85)
        self.assertEqual(len(official), 85)
        self.assertEqual(len(set(row.code for row in official)), 85)
        self.assertEqual(official_ids, linked_ids)
        self.assertTrue(all(row.maps_to_metric_id is None for row in identity))
        self.assertTrue(all(row.required_default is False for row in identity))
        self.assertFalse(self.framework.allows_production_cycles)

        working = (
            self.db.query(Metric)
            .filter(Metric.catalog_kind == CATALOG_KIND_WORKING)
            .order_by(Metric.id.asc())
            .all()
        )
        snapshot = [
            (row.id, row.code, row.title, row.metric_type, row.weightage)
            for row in working
        ]
        self.assertEqual(snapshot, WORKING_SNAPSHOT)

        shared = (
            self.db.query(Metric)
            .filter(Metric.code == "1.1.1")
            .all()
        )
        kinds = {row.catalog_kind for row in shared}
        self.assertEqual(kinds, {CATALOG_KIND_WORKING, CATALOG_KIND_OFFICIAL})
        self.assertEqual(len({row.id for row in shared}), 2)

        official_evidence = (
            self.db.query(EvidenceRequirement)
            .filter(EvidenceRequirement.metric_id.in_(official_ids))
            .all()
        )
        self.assertEqual(len(official_evidence), 85)
        self.assertTrue(
            all(item.title == GENERIC_EVIDENCE_TITLE for item in official_evidence)
        )

    def test_university_and_affiliated_cannot_materialize(self):
        for code in (CODE_RAF_UNIVERSITY, CODE_RAF_AFFILIATED):
            framework = (
                self.db.query(NaacFramework)
                .filter(NaacFramework.code == code)
                .one()
            )
            with self.assertRaises(HTTPException):
                materialize_framework_operational_metrics(self.db, framework.id)
            self.assertEqual(
                self.db.query(FrameworkMetric)
                .filter(FrameworkMetric.framework_id == framework.id)
                .count(),
                0,
            )
        self.db.rollback()

    def test_cycles_submissions_and_production_gates_unchanged(self):
        materialize_autonomous_operational_metrics(self.db, self.framework)
        self.db.commit()
        cycles = (
            self.db.query(AccreditationCycle)
            .filter(AccreditationCycle.id.in_([10, 11]))
            .all()
        )
        self.assertEqual(len(cycles), 2)
        for cycle in cycles:
            self.assertIsNone(cycle.framework_id)
        submissions = self.db.query(Submission).all()
        self.assertEqual(len(submissions), 44)
        self.assertTrue(all(item.metric_id is None for item in submissions))
        self.assertEqual(
            official_mapped_metric_rows(self.db, self.framework),
            [],
        )
        readiness = framework_readiness(self.db, self.framework)
        self.assertFalse(readiness["allows_production_cycles"])
        with self.assertRaises(Exception):
            assert_cycle_status_allowed(self.db, self.framework, "Active")
        university = (
            self.db.query(NaacFramework)
            .filter(NaacFramework.code == CODE_RAF_UNIVERSITY)
            .one()
        )
        with self.assertRaises(Exception):
            assert_cycle_status_allowed(self.db, university, "Active")


class AutonomousMaterializeApiTests(unittest.TestCase):
    def test_admin_can_materialize_and_coordinator_cannot(self):
        with api_client() as client:
            admin_login = _login(
                client,
                "admin@test.com",
                "admin123",
                "Admin",
            )
            coordinator_login = _login(
                client,
                "coordinator@test.com",
                "Coordinator@123",
                "NAAC Coordinator",
            )
            if admin_login.status_code != 200:
                self.skipTest("seed admin login is not available")
            db = SessionLocal()
            try:
                framework = (
                    db.query(NaacFramework)
                    .filter(NaacFramework.code == CODE_RAF_AUTONOMOUS)
                    .one()
                )
                framework_id = framework.id
            finally:
                db.close()

            if coordinator_login.status_code == 200:
                forbidden = client.post(
                    f"/admin/naac-frameworks/{framework_id}/materialize-operational-metrics",
                    headers={
                        "Authorization": (
                            "Bearer "
                            f"{coordinator_login.json()['access_token']}"
                        )
                    },
                )
                self.assertEqual(forbidden.status_code, 403)

            allowed = client.post(
                f"/admin/naac-frameworks/{framework_id}/materialize-operational-metrics",
                headers={
                    "Authorization": (
                        f"Bearer {admin_login.json()['access_token']}"
                    )
                },
            )
            self.assertEqual(allowed.status_code, 200)
            payload = allowed.json()
            self.assertEqual(payload["operational_metrics_linked"], 85)
            self.assertFalse(payload["allows_production_cycles"])
            self.assertEqual(payload["maps_to_metric_id_set"], 0)

            metrics = client.get(
                "/metrics",
                headers={
                    "Authorization": (
                        f"Bearer {admin_login.json()['access_token']}"
                    )
                },
            )
            self.assertEqual(metrics.status_code, 200)
            self.assertEqual(len(metrics.json()), 51)
            self.assertTrue(
                all(item["catalog_kind"] == CATALOG_KIND_WORKING for item in metrics.json())
            )


if __name__ == "__main__":
    unittest.main()
