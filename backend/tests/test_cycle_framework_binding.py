import unittest
import uuid

from app.db.database import SessionLocal
from app.models import (
    AccreditationCycle,
    Criterion,
    Document,
    Institution,
    Metric,
    Section,
    Submission,
    User,
)
from app.models.cycle_applicable_metric import CycleApplicableMetric
from app.models.metric import CATALOG_KIND_OFFICIAL, CATALOG_KIND_WORKING
from app.models.naac_framework import FrameworkMetric, NaacFramework
from fastapi import HTTPException

from app.services.framework_service import (
    assert_cycle_status_allowed,
    cycle_metric_catalog,
    official_mapped_metric_rows,
    official_operational_metric_rows,
    resolve_submission_metric_for_cycle,
)
from app.services.naac_framework_catalog import (
    CODE_BINARY,
    CODE_INTERNAL,
    CODE_RAF_AFFILIATED,
    CODE_RAF_AUTONOMOUS,
    CODE_RAF_UNIVERSITY,
)
from tests.test_dual_catalogue_schema import WORKING_SNAPSHOT
from tests.test_framework_recommendation import _login, api_client


class CycleFrameworkBindingTests(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        self.created_cycle_ids = []
        self.created_institution_ids = []
        self.created_submission_ids = []
        self.created_document_ids = []
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
        self.binary = (
            self.db.query(NaacFramework)
            .filter(NaacFramework.code == CODE_BINARY)
            .one()
        )
        self.internal = (
            self.db.query(NaacFramework)
            .filter(NaacFramework.code == CODE_INTERNAL)
            .one()
        )

    def tearDown(self):
        if self.created_document_ids:
            self.db.query(Document).filter(
                Document.id.in_(self.created_document_ids)
            ).delete(synchronize_session=False)
        if self.created_submission_ids:
            self.db.query(Submission).filter(
                Submission.id.in_(self.created_submission_ids)
            ).delete(synchronize_session=False)
        if self.created_cycle_ids:
            self.db.query(CycleApplicableMetric).filter(
                CycleApplicableMetric.cycle_id.in_(self.created_cycle_ids)
            ).delete(synchronize_session=False)
            self.db.query(AccreditationCycle).filter(
                AccreditationCycle.id.in_(self.created_cycle_ids)
            ).delete(synchronize_session=False)
        if self.created_institution_ids:
            from app.models.audit_log import AuditLog
            self.db.query(AuditLog).filter(
                AuditLog.institution_id.in_(self.created_institution_ids)
            ).delete(synchronize_session=False)
            self.db.query(Institution).filter(
                Institution.id.in_(self.created_institution_ids)
            ).delete(synchronize_session=False)
        self.db.commit()
        self.db.close()

    def _make_institution(self, category, framework):
        institution = Institution(
            name=f"Framework test {uuid.uuid4().hex[:8]}",
            code=f"FB-{uuid.uuid4().hex[:10]}",
            official_category=category,
            confirmed_framework_id=framework.id if framework else None,
        )
        self.db.add(institution)
        self.db.commit()
        self.db.refresh(institution)
        self.created_institution_ids.append(institution.id)
        return institution

    def _track(self, cycle_id):
        self.created_cycle_ids.append(cycle_id)
        return cycle_id

    def _make_cycle(self, institution, framework):
        cycle = AccreditationCycle(
            institution_id=institution.id,
            name=f"Criteria scope {uuid.uuid4().hex[:8]}",
            code=f"CRIT-{uuid.uuid4().hex[:10]}",
            status="Draft",
            framework_id=framework.id,
        )
        self.db.add(cycle)
        self.db.commit()
        self.db.refresh(cycle)
        self._track(cycle.id)
        return cycle

    def test_new_cycle_can_bind_autonomous_and_retrieve_official_metrics(self):
        code = f"PHASE2-{uuid.uuid4().hex[:10]}"
        with api_client() as client:
            login = _login(client, "admin@test.com", "admin123", "Admin")
            if login.status_code != 200:
                self.skipTest("seed admin login is not available")
            headers = {
                "Authorization": f"Bearer {login.json()['access_token']}"
            }
            created = client.post(
                "/accreditation-cycles",
                headers=headers,
                json={
                    "institution_id": self._make_institution("AUTONOMOUS_COLLEGE", self.autonomous).id,
                    "name": "Phase 2 Autonomous Bind",
                    "code": code,
                    "status": "Draft",
                    "framework_id": self.autonomous.id,
                },
            )
            self.assertEqual(created.status_code, 201, created.text)
            payload = created.json()
            cycle_id = self._track(payload["id"])
            self.assertEqual(payload["framework_id"], self.autonomous.id)
            self.assertEqual(payload["framework_code"], CODE_RAF_AUTONOMOUS)
            self.assertEqual(payload["catalog_kind"], CATALOG_KIND_OFFICIAL)
            self.assertEqual(payload["official_operational_metric_count"], 85)
            self.assertFalse(payload["allows_production_cycles"])

            metrics = client.get(
                f"/accreditation-cycles/{cycle_id}/metrics",
                headers=headers,
            )
            self.assertEqual(metrics.status_code, 200)
            rows = metrics.json()
            self.assertEqual(rows, [])

            by_query = client.get(
                "/metrics",
                headers=headers,
                params={"cycle_id": cycle_id},
            )
            self.assertEqual(by_query.status_code, 200)
            self.assertEqual(by_query.json(), [])

            working = client.get("/metrics", headers=headers)
            self.assertEqual(working.status_code, 200)
            self.assertEqual(len(working.json()), 51)
            self.assertTrue(
                all(item["catalog_kind"] == CATALOG_KIND_WORKING for item in working.json())
            )

            applicability = client.get(
                f"/accreditation-cycles/{cycle_id}/applicable-metrics",
                headers=headers,
            )
            self.assertEqual(applicability.status_code, 200)
            body = applicability.json()
            self.assertFalse(body["configured"])
            self.assertFalse(body["uses_catalog_fallback"])
            self.assertEqual(body["applicability_status"], "UNCONFIGURED")
            self.assertEqual(body["applicable_metrics"], [])
            self.assertEqual(len(body["official_operational_metrics"]), 85)
            official_one = next(
                item for item in body["official_operational_metrics"]
                if item["metric_code"] == "1.1.1"
            )
            working_one = (
                self.db.query(Metric)
                .filter(
                    Metric.code == "1.1.1",
                    Metric.catalog_kind == CATALOG_KIND_WORKING,
                )
                .one()
            )
            self.assertNotEqual(official_one["metric_id"], working_one.id)

            blocked = client.put(
                f"/accreditation-cycles/{cycle_id}",
                headers=headers,
                json={"status": "Active"},
            )
            self.assertEqual(blocked.status_code, 400)

    def test_criteria_use_selected_framework_cycle_and_institution_scope(self):
        internal_institution = self._make_institution("OTHER", self.internal)
        autonomous_institution = self._make_institution(
            "AUTONOMOUS_COLLEGE",
            self.autonomous,
        )
        internal_cycle = self._make_cycle(internal_institution, self.internal)
        autonomous_cycle = self._make_cycle(
            autonomous_institution,
            self.autonomous,
        )

        with api_client() as client:
            login = _login(client, "admin@test.com", "admin123", "Admin")
            if login.status_code != 200:
                self.skipTest("seed admin login is not available")
            headers = {
                "Authorization": "Bearer " + login.json()["access_token"],
            }

            internal_response = client.get(
                "/criteria",
                headers=headers,
                params={"cycle_id": internal_cycle.id},
            )
            autonomous_response = client.get(
                "/criteria",
                headers=headers,
                params={"cycle_id": autonomous_cycle.id},
            )
            self.assertEqual(internal_response.status_code, 200)
            self.assertEqual(autonomous_response.status_code, 200)
            internal_rows = internal_response.json()
            autonomous_rows = autonomous_response.json()
            self.assertEqual(
                [item["number"] for item in internal_rows],
                [f"C{number}" for number in range(1, 8)],
            )
            self.assertEqual(
                [item["number"] for item in autonomous_rows],
                [f"C{number}" for number in range(1, 8)],
            )
            self.assertTrue(
                all(item["cycle_id"] == internal_cycle.id for item in internal_rows)
            )
            self.assertTrue(
                all(
                    item["cycle_id"] == autonomous_cycle.id
                    for item in autonomous_rows
                )
            )
            self.assertEqual(
                sum(item["total_metrics"] for item in autonomous_rows),
                0,
            )

            mapped_metric = next(
                metric
                for _identity, metric in official_operational_metric_rows(
                    self.db,
                    self.autonomous,
                )
                if metric.code == "1.1.1"
            )
            self.db.add(
                CycleApplicableMetric(
                    cycle_id=autonomous_cycle.id,
                    metric_id=mapped_metric.id,
                    required=True,
                )
            )
            self.db.commit()
            mapped_response = client.get(
                "/criteria",
                headers=headers,
                params={"cycle_id": autonomous_cycle.id},
            )
            self.assertEqual(mapped_response.status_code, 200)
            self.assertEqual(
                sum(item["total_metrics"] for item in mapped_response.json()),
                1,
            )
            operational_section = (
                self.db.query(Section)
                .filter(Section.id == mapped_metric.section_id)
                .one()
            )
            operational_criterion = (
                self.db.query(Criterion)
                .filter(Criterion.id == operational_section.criterion_id)
                .one()
            )
            admin_user = (
                self.db.query(User)
                .filter(User.email == "admin@test.com")
                .one()
            )
            submission = Submission(
                institution_id=autonomous_institution.id,
                cycle_id=autonomous_cycle.id,
                criterion_id=operational_criterion.id,
                user_id=admin_user.id,
                title="Selected-cycle criterion progress test",
                metric_code=mapped_metric.code,
                metric_id=mapped_metric.id,
                status="Final Submitted",
            )
            self.db.add(submission)
            self.db.commit()
            self.db.refresh(submission)
            self.created_submission_ids.append(submission.id)
            document = Document(
                institution_id=autonomous_institution.id,
                submission_id=submission.id,
                uploaded_by=admin_user.id,
                title="Selected-cycle evidence test",
                file_path="test/selected-cycle-evidence.pdf",
                file_type="application/pdf",
                file_size=1,
                status="Uploaded",
            )
            self.db.add(document)
            self.db.commit()
            self.db.refresh(document)
            self.created_document_ids.append(document.id)
            populated_response = client.get(
                "/criteria",
                headers=headers,
                params={"cycle_id": autonomous_cycle.id},
            )
            self.assertEqual(populated_response.status_code, 200)
            populated_criterion = next(
                item
                for item in populated_response.json()
                if item["number"] == operational_criterion.number
            )
            self.assertEqual(populated_criterion["total_submissions"], 1)
            self.assertEqual(populated_criterion["total_evidence"], 1)
            self.assertEqual(populated_criterion["completion_percentage"], 100)

            foreign_institution = self._make_institution(
                "AUTONOMOUS_COLLEGE",
                self.autonomous,
            )
            foreign_cycle = self._make_cycle(
                foreign_institution,
                self.autonomous,
            )
            coordinator_login = _login(
                client,
                "coordinator@test.com",
                "Coordinator@123",
                "NAAC Coordinator",
            )
            if coordinator_login.status_code != 200:
                self.skipTest("seed coordinator login is not available")
            coordinator_headers = {
                "Authorization": (
                    "Bearer " + coordinator_login.json()["access_token"]
                ),
            }
            forbidden = client.get(
                "/criteria",
                headers=coordinator_headers,
                params={"cycle_id": foreign_cycle.id},
            )
            self.assertEqual(forbidden.status_code, 403)

    def test_invalid_and_ineligible_frameworks_are_rejected(self):
        with api_client() as client:
            login = _login(client, "admin@test.com", "admin123", "Admin")
            if login.status_code != 200:
                self.skipTest("seed admin login is not available")
            headers = {
                "Authorization": f"Bearer {login.json()['access_token']}"
            }
            listed = client.get("/naac-frameworks", headers=headers)
            self.assertEqual(listed.status_code, 200)
            confirmable_ids = {
                item["id"] for item in listed.json() if item.get("confirmable")
            }
            self.assertIn(self.autonomous.id, confirmable_ids)
            self.assertNotIn(self.internal.id, confirmable_ids)
            self.assertNotIn(self.binary.id, confirmable_ids)
            missing = client.post(
                "/accreditation-cycles",
                headers=headers,
                json={
                    "institution_id": 1,
                    "name": "Missing framework",
                    "code": f"PHASE2-MISS-{uuid.uuid4().hex[:8]}",
                    "status": "Draft",
                    "framework_id": 999999,
                },
            )
            self.assertEqual(missing.status_code, 404)

            binary = client.post(
                "/accreditation-cycles",
                headers=headers,
                json={
                    "institution_id": 1,
                    "name": "Binary framework",
                    "code": f"PHASE2-BIN-{uuid.uuid4().hex[:8]}",
                    "status": "Draft",
                    "framework_id": self.binary.id,
                },
            )
            self.assertEqual(binary.status_code, 400)

            internal = client.post(
                "/accreditation-cycles",
                headers=headers,
                json={
                    "institution_id": 1,
                    "name": "Internal framework",
                    "code": f"PHASE2-INT-{uuid.uuid4().hex[:8]}",
                    "status": "Draft",
                    "framework_id": self.internal.id,
                },
            )
            self.assertEqual(internal.status_code, 400)

            omitted = client.post(
                "/accreditation-cycles",
                headers=headers,
                json={
                    "institution_id": 1,
                    "name": "Missing framework selection",
                    "code": f"PHASE2-OMIT-{uuid.uuid4().hex[:8]}",
                    "status": "Draft",
                },
            )
            self.assertEqual(omitted.status_code, 400)
            self.assertIn("select a naac framework", omitted.json()["detail"].lower())

            university_institution = self._make_institution(
                "UNIVERSITY", self.university
            )
            university = client.post(
                "/accreditation-cycles",
                headers=headers,
                json={
                    "institution_id": university_institution.id,
                    "name": "University incomplete",
                    "code": f"PHASE2-UNI-{uuid.uuid4().hex[:8]}",
                    "status": "Draft",
                    "framework_id": self.university.id,
                },
            )
            self.assertEqual(university.status_code, 201, university.text)
            cycle_id = self._track(university.json()["id"])
            self.assertEqual(university.json()["catalog_kind"], "OFFICIAL_INCOMPLETE")
            self.assertEqual(university.json()["official_operational_metric_count"], 0)
            metrics = client.get(
                f"/accreditation-cycles/{cycle_id}/metrics",
                headers=headers,
            )
            self.assertEqual(metrics.status_code, 200)
            self.assertEqual(metrics.json(), [])
            working_codes = {row[1] for row in WORKING_SNAPSHOT}
            returned_codes = {item["code"] for item in metrics.json()}
            self.assertTrue(working_codes.isdisjoint(returned_codes))

    def test_official_metric_resolution_rejects_working_ids_without_activating(self):
        code = f"PHASE2-RES-{uuid.uuid4().hex[:10]}"
        with api_client() as client:
            login = _login(client, "admin@test.com", "admin123", "Admin")
            if login.status_code != 200:
                self.skipTest("seed admin login is not available")
            headers = {
                "Authorization": f"Bearer {login.json()['access_token']}"
            }
            created = client.post(
                "/accreditation-cycles",
                headers=headers,
                json={
                    "institution_id": self._make_institution("AUTONOMOUS_COLLEGE", self.autonomous).id,
                    "name": "Phase 2 resolution",
                    "code": code,
                    "status": "Draft",
                    "framework_id": self.autonomous.id,
                },
            )
            self.assertEqual(created.status_code, 201, created.text)
            cycle_id = self._track(created.json()["id"])
            self.assertEqual(created.json()["status"], "Draft")

            self.db.expire_all()
            cycle = (
                self.db.query(AccreditationCycle)
                .filter(AccreditationCycle.id == cycle_id)
                .one()
            )
            self.assertEqual(cycle.status, "Draft")
            linked = official_operational_metric_rows(self.db, self.autonomous)
            official_one = next(
                metric for _identity, metric in linked if metric.code == "1.1.1"
            )
            working_one = (
                self.db.query(Metric)
                .filter(
                    Metric.code == "1.1.1",
                    Metric.catalog_kind == CATALOG_KIND_WORKING,
                )
                .one()
            )
            with self.assertRaises(HTTPException) as unconfigured:
                resolve_submission_metric_for_cycle(
                    self.db,
                    cycle,
                    official_one.id,
                    working_one.code,
                )
            self.assertEqual(unconfigured.exception.status_code, 400)
            self.assertIn("not configured", unconfigured.exception.detail.lower())

            saved = client.put(
                f"/accreditation-cycles/{cycle_id}/applicable-metrics",
                headers=headers,
                json={"metrics": [{"metric_id": official_one.id}]},
            )
            self.assertEqual(saved.status_code, 200, saved.text)
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
                working_one.code,
            )
            self.assertEqual(metric_id, official_one.id)
            self.assertEqual(metric_code, "1.1.1")
            self.assertNotEqual(metric_id, working_one.id)

            with self.assertRaises(HTTPException) as code_only:
                resolve_submission_metric_for_cycle(
                    self.db,
                    cycle,
                    None,
                    official_one.code,
                )
            self.assertEqual(code_only.exception.status_code, 400)
            self.assertIn("by id", code_only.exception.detail.lower())

            with self.assertRaises(HTTPException) as raised:
                resolve_submission_metric_for_cycle(
                    self.db,
                    cycle,
                    working_one.id,
                    working_one.code,
                )
            self.assertEqual(raised.exception.status_code, 400)
            self.assertIn("working-catalogue", raised.exception.detail.lower())

            blocked = client.put(
                f"/accreditation-cycles/{cycle_id}",
                headers=headers,
                json={"status": "Active"},
            )
            self.assertEqual(blocked.status_code, 400)
            self.db.expire_all()
            cycle = (
                self.db.query(AccreditationCycle)
                .filter(AccreditationCycle.id == cycle_id)
                .one()
            )
            self.assertEqual(cycle.status, "Draft")

    def test_legacy_unbound_cycles_keep_working_catalogue(self):
        cycle = (
            self.db.query(AccreditationCycle)
            .filter(AccreditationCycle.id == 10)
            .one()
        )
        kind, metrics = cycle_metric_catalog(self.db, cycle)
        self.assertEqual(kind, CATALOG_KIND_WORKING)
        self.assertGreaterEqual(len(metrics), 1)
        self.assertTrue(all(item.catalog_kind == CATALOG_KIND_WORKING for item in metrics))
        self.assertNotIn("OFFICIAL", {item.catalog_kind for item in metrics})

        with api_client() as client:
            login = _login(
                client,
                "coordinator@test.com",
                "Coordinator@123",
                "NAAC Coordinator",
            )
            if login.status_code != 200:
                self.skipTest("seed coordinator login is not available")
            headers = {
                "Authorization": f"Bearer {login.json()['access_token']}"
            }
            metrics = client.get("/metrics", headers=headers, params={"cycle_id": 10})
            self.assertEqual(metrics.status_code, 200)
            self.assertTrue(len(metrics.json()) >= 1)
            self.assertTrue(
                all(item["catalog_kind"] == CATALOG_KIND_WORKING for item in metrics.json())
            )
            applicability = client.get(
                "/accreditation-cycles/10/applicable-metrics",
                headers=headers,
            )
            self.assertEqual(applicability.status_code, 200)
            body = applicability.json()
            self.assertIsNone(body.get("framework_id"))
            self.assertEqual(body.get("catalog_kind"), CATALOG_KIND_WORKING)
            self.assertEqual(body["official_operational_metrics"], [])
            self.assertFalse(body.get("has_official_operational_metrics"))

        cycle = (
            self.db.query(AccreditationCycle)
            .filter(AccreditationCycle.id == 10)
            .one()
        )
        metric_id, metric_code = resolve_submission_metric_for_cycle(
            self.db,
            cycle,
            None,
            "1.1.1",
        )
        self.assertIsNone(metric_id)
        self.assertEqual(metric_code, "1.1.1")

    def test_preservation_and_no_code_based_mapping(self):
        cycles = (
            self.db.query(AccreditationCycle)
            .filter(AccreditationCycle.id.in_([10, 11]))
            .all()
        )
        self.assertEqual(len(cycles), 2)
        for cycle in cycles:
            self.assertIsNone(cycle.framework_id)
        self.assertEqual(self.db.query(Submission).count(), 44)
        self.assertTrue(
            all(item.metric_id is None for item in self.db.query(Submission).all())
        )
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
        self.assertEqual(
            official_mapped_metric_rows(self.db, self.autonomous),
            [],
        )
        linked = official_operational_metric_rows(self.db, self.autonomous)
        self.assertEqual(len(linked), 85)
        official_ids = {metric.id for _identity, metric in linked}
        working_one = (
            self.db.query(Metric)
            .filter(
                Metric.code == "1.1.1",
                Metric.catalog_kind == CATALOG_KIND_WORKING,
            )
            .one()
        )
        official_one = next(
            metric for _identity, metric in linked if metric.code == "1.1.1"
        )
        self.assertEqual(working_one.code, official_one.code)
        self.assertNotEqual(working_one.id, official_one.id)
        self.assertNotIn(working_one.id, official_ids)
        affiliated = (
            self.db.query(NaacFramework)
            .filter(NaacFramework.code == CODE_RAF_AFFILIATED)
            .one()
        )
        self.assertEqual(
            self.db.query(FrameworkMetric)
            .filter(FrameworkMetric.framework_id == affiliated.id)
            .count(),
            0,
        )
        self.assertFalse(self.autonomous.allows_production_cycles)
        with self.assertRaises(Exception):
            assert_cycle_status_allowed(self.db, self.autonomous, "Active")


if __name__ == "__main__":
    unittest.main()
