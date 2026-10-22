
import unittest
import uuid

from fastapi import HTTPException

from app.auth.security import hash_password
from app.db.database import SessionLocal
from app.models import (
    AccreditationCycle,
    Institution,
    Metric,
    Notification,
    Role,
    Submission,
    User,
)
from app.models.audit_log import AuditLog
from app.models.cycle_applicable_metric import CycleApplicableMetric
from app.models.metric import CATALOG_KIND_OFFICIAL, CATALOG_KIND_WORKING
from app.models.naac_framework import NaacFramework
from app.services.cycle_applicability_service import (
    APPLICABILITY_CONFIGURED,
    APPLICABILITY_OFFICIAL_CATALOGUE_INCOMPLETE,
    APPLICABILITY_UNCONFIGURED,
)
from app.services.framework_service import (
    assert_cycle_status_allowed,
    official_operational_metric_rows,
    resolve_submission_metric_for_cycle,
)
from app.services.naac_framework_catalog import (
    CODE_RAF_AUTONOMOUS,
    CODE_RAF_UNIVERSITY,
)
from tests.test_dual_catalogue_schema import WORKING_SNAPSHOT
from tests.test_framework_recommendation import _login, api_client


TEST_PASSWORD = "CycleTest@123"


class OfficialCycleApplicabilityTests(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        self.created_cycle_ids = []
        self.created_institution_ids = []
        self.created_user_ids = []

        self.autonomous = (
            self.db.query(NaacFramework)
            .filter(NaacFramework.code == CODE_RAF_AUTONOMOUS)
            .one()
        )
        self.university = (
            self.db.query(NaacFramework)
            .filter(NaacFramework.code == CODE_RAF_UNIVERSITY)
            .one()
        )

        self.autonomous_institution = self._make_institution(
            "AUTONOMOUS_COLLEGE",
            self.autonomous.id,
            "AUTO",
        )
        self.university_institution = self._make_institution(
            "UNIVERSITY",
            self.university.id,
            "UNIV",
        )

    def _make_institution(self, category, framework_id, suffix):
        institution = Institution(
            name=f"Phase 3 {suffix} {uuid.uuid4().hex[:8]}",
            code=f"P3-{suffix}-{uuid.uuid4().hex[:8]}",
            official_category=category,
            confirmed_framework_id=framework_id,
        )
        self.db.add(institution)
        self.db.commit()
        self.db.refresh(institution)

        self.created_institution_ids.append(institution.id)
        return institution

    def _make_coordinator(self, institution):
        role = (
            self.db.query(Role)
            .filter(Role.name == "NAAC Coordinator")
            .one()
        )

        user = User(
            name="Official Cycle Test Coordinator",
            email=f"cycle-test-{uuid.uuid4().hex[:12]}@example.test",
            password_hash=hash_password(TEST_PASSWORD),
            role_id=role.id,
            institution_id=institution.id,
            is_active=True,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        self.created_user_ids.append(user.id)
        return user

    def tearDown(self):
        try:
            if self.created_cycle_ids:
                self.db.query(CycleApplicableMetric).filter(
                    CycleApplicableMetric.cycle_id.in_(
                        self.created_cycle_ids
                    )
                ).delete(synchronize_session=False)

                self.db.query(AccreditationCycle).filter(
                    AccreditationCycle.id.in_(self.created_cycle_ids)
                ).delete(synchronize_session=False)

                self.db.commit()

            if self.created_user_ids:
                self.db.query(Notification).filter(
                    Notification.user_id.in_(self.created_user_ids)
                ).delete(synchronize_session=False)

                self.db.query(AuditLog).filter(
                    AuditLog.user_id.in_(self.created_user_ids)
                ).delete(synchronize_session=False)

                self.db.query(User).filter(
                    User.id.in_(self.created_user_ids)
                ).delete(synchronize_session=False)

                self.db.commit()

            if self.created_institution_ids:
                self.db.query(AuditLog).filter(
                    AuditLog.institution_id.in_(
                        self.created_institution_ids
                    )
                ).delete(synchronize_session=False)

                self.db.query(Institution).filter(
                    Institution.id.in_(self.created_institution_ids)
                ).delete(synchronize_session=False)

                self.db.commit()
        finally:
            self.db.close()

    def _track(self, cycle_id):
        self.created_cycle_ids.append(cycle_id)
        return cycle_id

    def _admin_headers(self, client, institution):
        """Authenticate a coordinator belonging to the target institution."""
        user = self._make_coordinator(institution)

        login = _login(
            client,
            user.email,
            TEST_PASSWORD,
            "NAAC Coordinator",
        )
        self.assertEqual(login.status_code, 200, login.text)

        return {
            "Authorization": f"Bearer {login.json()['access_token']}"
        }

    def _create_draft(self, client, headers, framework_id, suffix):
        if framework_id == self.autonomous.id:
            institution = self.autonomous_institution
        elif framework_id == self.university.id:
            institution = self.university_institution
        else:
            self.fail(f"Unexpected test framework ID: {framework_id}")

        created = client.post(
            "/accreditation-cycles",
            headers=headers,
            json={
                "institution_id": institution.id,
                "name": f"Phase 3 {suffix}",
                "code": f"PHASE3-{suffix}-{uuid.uuid4().hex[:8]}",
                "status": "Draft",
                "framework_id": framework_id,
            },
        )
        self.assertEqual(created.status_code, 201, created.text)

        return self._track(created.json()["id"])

    def test_official_applicability_is_isolated_and_incomplete_until_saved(
        self,
    ):
        with api_client() as client:
            headers = self._admin_headers(
                client,
                self.autonomous_institution,
            )
            cycle_id = self._create_draft(
                client,
                headers,
                self.autonomous.id,
                "APP",
            )

            listed = client.get(
                f"/accreditation-cycles/{cycle_id}/applicable-metrics",
                headers=headers,
            )
            self.assertEqual(listed.status_code, 200, listed.text)

            body = listed.json()
            self.assertFalse(body["configured"])
            self.assertEqual(
                body["applicability_status"],
                APPLICABILITY_UNCONFIGURED,
            )
            self.assertEqual(body["applicable_metrics"], [])
            self.assertEqual(body["applicable_metric_count"], 0)
            self.assertEqual(body["official_catalog_metric_count"], 85)
            self.assertFalse(body["naac_required_optional_verified"])

            catalog_metrics = client.get(
                f"/accreditation-cycles/{cycle_id}/metrics",
                headers=headers,
            )
            self.assertEqual(
                catalog_metrics.status_code,
                200,
                catalog_metrics.text,
            )
            self.assertEqual(catalog_metrics.json(), [])

            linked = official_operational_metric_rows(
                self.db,
                self.autonomous,
            )
            official_one = next(
                metric
                for _identity, metric in linked
                if metric.code == "1.1.1"
            )
            official_two = next(
                metric
                for _identity, metric in linked
                if metric.code == "1.1.2"
            )

            working_one = (
                self.db.query(Metric)
                .filter(
                    Metric.code == "1.1.1",
                    Metric.catalog_kind == CATALOG_KIND_WORKING,
                )
                .one()
            )
            self.assertNotEqual(official_one.id, working_one.id)

            rejected = client.put(
                f"/accreditation-cycles/{cycle_id}/applicable-metrics",
                headers=headers,
                json={
                    "metrics": [
                        {
                            "metric_id": working_one.id,
                            "required": True,
                        }
                    ]
                },
            )
            self.assertEqual(rejected.status_code, 400, rejected.text)

            payload = {
                "metrics": [
                    {
                        "metric_id": official_one.id,
                        "required": True,
                    },
                    {
                        "metric_id": official_two.id,
                        "required": True,
                    },
                ]
            }

            saved = client.put(
                f"/accreditation-cycles/{cycle_id}/applicable-metrics",
                headers=headers,
                json=payload,
            )
            self.assertEqual(saved.status_code, 200, saved.text)

            saved_body = saved.json()
            self.assertTrue(saved_body["configured"])
            self.assertEqual(
                saved_body["applicability_status"],
                APPLICABILITY_CONFIGURED,
            )
            self.assertEqual(saved_body["applicable_metric_count"], 2)

            self.assertTrue(
                all(
                    item["catalog_kind"] == CATALOG_KIND_OFFICIAL
                    and item["required"] is False
                    for item in saved_body["applicable_metrics"]
                )
            )
            self.assertNotIn(
                working_one.id,
                {
                    item["metric_id"]
                    for item in saved_body["applicable_metrics"]
                },
            )
            self.assertTrue(
                all(
                    item.get("exception_type") in (None, "")
                    for item in saved_body["applicable_metrics"]
                )
            )

            selected = client.get(
                f"/accreditation-cycles/{cycle_id}/metrics",
                headers=headers,
            )
            self.assertEqual(selected.status_code, 200, selected.text)
            self.assertEqual(
                {item["id"] for item in selected.json()},
                {official_one.id, official_two.id},
            )

            again = client.put(
                f"/accreditation-cycles/{cycle_id}/applicable-metrics",
                headers=headers,
                json=payload,
            )
            self.assertEqual(again.status_code, 200, again.text)
            self.assertEqual(
                again.json()["applicable_metric_count"],
                2,
            )

            self.db.expire_all()
            self.assertEqual(
                self.db.query(CycleApplicableMetric)
                .filter(
                    CycleApplicableMetric.cycle_id == cycle_id
                )
                .count(),
                2,
            )

            duplicate = client.post(
                f"/accreditation-cycles/{cycle_id}/applicable-metrics",
                headers=headers,
                json={
                    "metric_id": official_one.id,
                    "required": False,
                },
            )
            self.assertEqual(duplicate.status_code, 400, duplicate.text)

            self.db.expire_all()
            cycle = (
                self.db.query(AccreditationCycle)
                .filter(AccreditationCycle.id == cycle_id)
                .one()
            )

            metric_id, metric_code = resolve_submission_metric_for_cycle(
                self.db,
                cycle,
                official_one.id,
                "1.1.1",
            )
            self.assertEqual(metric_id, official_one.id)
            self.assertEqual(metric_code, "1.1.1")

            with self.assertRaises(HTTPException) as raised:
                resolve_submission_metric_for_cycle(
                    self.db,
                    cycle,
                    working_one.id,
                    "1.1.1",
                )
            self.assertEqual(raised.exception.status_code, 400)

            blocked = client.put(
                f"/accreditation-cycles/{cycle_id}",
                headers=headers,
                json={"status": "Active"},
            )
            self.assertEqual(blocked.status_code, 400, blocked.text)

    def test_unconfigured_official_cycle_does_not_treat_catalogue_as_applicable(
        self,
    ):
        with api_client() as client:
            headers = self._admin_headers(
                client,
                self.autonomous_institution,
            )
            cycle_id = self._create_draft(
                client,
                headers,
                self.autonomous.id,
                "UNC",
            )

            self.db.expire_all()
            cycle = (
                self.db.query(AccreditationCycle)
                .filter(AccreditationCycle.id == cycle_id)
                .one()
            )

            official_one = next(
                metric
                for _identity, metric in official_operational_metric_rows(
                    self.db,
                    self.autonomous,
                )
                if metric.code == "1.1.1"
            )

            with self.assertRaises(HTTPException) as raised:
                resolve_submission_metric_for_cycle(
                    self.db,
                    cycle,
                    official_one.id,
                    "1.1.1",
                )

            self.assertEqual(raised.exception.status_code, 400)
            self.assertIn(
                "not configured",
                raised.exception.detail.lower(),
            )

    def test_incomplete_official_catalogue_cannot_be_configured(self):
        with api_client() as client:
            headers = self._admin_headers(
                client,
                self.university_institution,
            )
            cycle_id = self._create_draft(
                client,
                headers,
                self.university.id,
                "UNI",
            )

            listed = client.get(
                f"/accreditation-cycles/{cycle_id}/applicable-metrics",
                headers=headers,
            )
            self.assertEqual(listed.status_code, 200, listed.text)
            self.assertEqual(
                listed.json()["applicability_status"],
                APPLICABILITY_OFFICIAL_CATALOGUE_INCOMPLETE,
            )

            working_one = (
                self.db.query(Metric)
                .filter(
                    Metric.catalog_kind == CATALOG_KIND_WORKING
                )
                .order_by(Metric.id.asc())
                .first()
            )
            self.assertIsNotNone(working_one)

            rejected = client.put(
                f"/accreditation-cycles/{cycle_id}/applicable-metrics",
                headers=headers,
                json={
                    "metrics": [
                        {"metric_id": working_one.id}
                    ]
                },
            )
            self.assertEqual(rejected.status_code, 400, rejected.text)

    def test_legacy_unbound_cycle_and_preservation(self):
        before = (
            self.db.query(CycleApplicableMetric)
            .filter(
                CycleApplicableMetric.cycle_id.in_([10, 11])
            )
            .count()
        )

        with api_client() as client:
            login = _login(
                client,
                "coordinator@test.com",
                "Coordinator@123",
                "NAAC Coordinator",
            )
            if login.status_code != 200:
                self.skipTest(
                    "Seed coordinator login is not available"
                )

            headers = {
                "Authorization": f"Bearer {login.json()['access_token']}"
            }

            listed = client.get(
                "/accreditation-cycles/10/applicable-metrics",
                headers=headers,
            )
            self.assertEqual(listed.status_code, 200, listed.text)

            body = listed.json()
            self.assertIsNone(body.get("framework_id"))
            self.assertEqual(
                body["applicability_status"],
                APPLICABILITY_CONFIGURED,
            )
            self.assertEqual(body["applicable_metric_count"], 3)
            self.assertTrue(
                all(
                    item.get("catalog_kind") == CATALOG_KIND_WORKING
                    for item in body["applicable_metrics"]
                )
            )

            official_one = next(
                metric
                for _identity, metric in official_operational_metric_rows(
                    self.db,
                    self.autonomous,
                )
                if metric.code == "1.1.1"
            )

            rejected = client.put(
                "/accreditation-cycles/10/applicable-metrics",
                headers=headers,
                json={
                    "metrics": [
                        {"metric_id": official_one.id}
                    ]
                },
            )
            self.assertEqual(rejected.status_code, 400, rejected.text)

        self.assertEqual(
            self.db.query(CycleApplicableMetric)
            .filter(
                CycleApplicableMetric.cycle_id.in_([10, 11])
            )
            .count(),
            before,
        )

        for cycle in (
            self.db.query(AccreditationCycle)
            .filter(AccreditationCycle.id.in_([10, 11]))
        ):
            self.assertIsNone(cycle.framework_id)

        self.assertEqual(self.db.query(Submission).count(), 44)

        working = (
            self.db.query(Metric)
            .filter(Metric.catalog_kind == CATALOG_KIND_WORKING)
            .order_by(Metric.id.asc())
            .all()
        )
        snapshot = [
            (
                row.id,
                row.code,
                row.title,
                row.metric_type,
                row.weightage,
            )
            for row in working
        ]
        self.assertEqual(snapshot, WORKING_SNAPSHOT)

        self.assertEqual(
            self.db.query(Metric)
            .filter(Metric.catalog_kind == CATALOG_KIND_OFFICIAL)
            .count(),
            85,
        )
        self.assertFalse(self.autonomous.allows_production_cycles)

        with self.assertRaises(Exception):
            assert_cycle_status_allowed(
                self.db,
                self.autonomous,
                "Active",
            )


if __name__ == "__main__":
    unittest.main()
