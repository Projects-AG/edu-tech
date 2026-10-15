import json
import threading
import unittest
import uuid

from fastapi import HTTPException
from sqlalchemy import text

from app.db.database import SessionLocal, engine
from app.models import (
    AccreditationCycle,
    AuditLog,
    Institution,
    Metric,
    Submission,
    User,
)
from app.models.cycle_applicable_metric import CycleApplicableMetric
from app.models.metric import CATALOG_KIND_OFFICIAL, CATALOG_KIND_WORKING
from app.models.naac_framework import FrameworkMetric, NaacFramework
from app.services.framework_service import (
    assert_single_live_cycle_per_institution,
    official_operational_metric_rows,
    resolve_submission_metric_for_cycle,
)
from app.services.naac_framework_catalog import (
    CODE_RAF_AFFILIATED,
    CODE_RAF_AUTONOMOUS,
    CODE_RAF_UNIVERSITY,
)
from app.services.report_service import (
    build_progress,
    get_active_cycle,
    get_final_report_eligibility,
)
from tests.test_dual_catalogue_schema import WORKING_SNAPSHOT
from tests.test_framework_recommendation import _login, api_client


HISTORICAL_STATUSES = {
    "Draft": 15,
    "Final Submitted": 10,
    "Approved": 4,
    "Changes Requested": 4,
    "Under Review": 4,
    "Rejected": 3,
    "Resubmitted": 3,
    "Final Approval": 1,
}


class ProductionSafetyTests(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        self.created_cycle_ids = []
        self.created_institution_ids = []
        self.created_user_ids = []
        self.created_submission_ids = []
        self.autonomous = (
            self.db.query(NaacFramework)
            .filter(NaacFramework.code == CODE_RAF_AUTONOMOUS)
            .one()
        )

    def tearDown(self):
        if self.created_submission_ids:
            self.db.query(Submission).filter(
                Submission.id.in_(self.created_submission_ids)
            ).delete(synchronize_session=False)
        if self.created_cycle_ids:
            self.db.query(CycleApplicableMetric).filter(
                CycleApplicableMetric.cycle_id.in_(self.created_cycle_ids)
            ).delete(synchronize_session=False)
            self.db.query(AuditLog).filter(
                AuditLog.entity_type == "AccreditationCycle",
                AuditLog.entity_id.in_(self.created_cycle_ids),
            ).delete(synchronize_session=False)
            self.db.query(AccreditationCycle).filter(
                AccreditationCycle.id.in_(self.created_cycle_ids)
            ).delete(synchronize_session=False)
        if self.created_user_ids:
            self.db.query(User).filter(
                User.id.in_(self.created_user_ids)
            ).delete(synchronize_session=False)
        if self.created_institution_ids:
            self.db.query(AuditLog).filter(
                AuditLog.institution_id.in_(self.created_institution_ids)
            ).delete(synchronize_session=False)
            self.db.query(Institution).filter(
                Institution.id.in_(self.created_institution_ids)
            ).delete(synchronize_session=False)
        self.db.commit()
        self.db.close()

    def _track_cycle(self, cycle_id):
        self.created_cycle_ids.append(cycle_id)
        return cycle_id

    def _admin_headers(self, client):
        login = _login(client, "admin@test.com", "admin123", "Admin")
        if login.status_code != 200:
            self.skipTest("seed admin login is not available")
        return {"Authorization": f"Bearer {login.json()['access_token']}"}

    def _coord_headers(self, client):
        login = _login(
            client,
            "coordinator@test.com",
            "Coordinator@123",
            "NAAC Coordinator",
        )
        if login.status_code != 200:
            self.skipTest("seed coordinator login is not available")
        return {"Authorization": f"Bearer {login.json()['access_token']}"}

    def _reviewer_headers(self, client):
        login = _login(
            client,
            "reviewer@accreditation.org",
            "password123",
            "Reviewer",
        )
        if login.status_code != 200:
            self.skipTest("seed reviewer login is not available")
        return {"Authorization": f"Bearer {login.json()['access_token']}"}

    def _cycle(self, cycle_id):
        return (
            self.db.query(AccreditationCycle)
            .filter(AccreditationCycle.id == cycle_id)
            .one()
        )

    def _make_institution(self):
        institution = Institution(
            name=f"Phase 5.1 Tenant {uuid.uuid4().hex[:8]}",
            code=f"P51-{uuid.uuid4().hex[:8]}",
        )
        self.db.add(institution)
        self.db.commit()
        self.db.refresh(institution)
        self.created_institution_ids.append(institution.id)
        return institution

    def _make_configured_institution(self):
        institution = self._make_institution()
        institution.official_category = "AUTONOMOUS_COLLEGE"
        institution.confirmed_framework_id = self.autonomous.id
        self.db.commit()
        self.db.refresh(institution)
        return institution

    def _insert_cycle(
        self,
        institution_id,
        status="Draft",
        framework_id=None,
        suffix="C",
    ):
        cycle = AccreditationCycle(
            institution_id=institution_id,
            name=f"Phase51 {suffix}",
            code=f"P51-{suffix}-{uuid.uuid4().hex[:8]}",
            status=status,
            framework_id=framework_id,
        )
        self.db.add(cycle)
        self.db.flush()
        self.db.commit()
        self.db.refresh(cycle)
        return self._track_cycle(cycle.id)

    def _create_official_draft(self, client, headers, institution_id, suffix):
        created = client.post(
            "/accreditation-cycles",
            headers=headers,
            json={
                "institution_id": institution_id,
                "name": f"Phase51 official {suffix}",
                "code": f"P51-OFF-{suffix}-{uuid.uuid4().hex[:8]}",
                "status": "Draft",
                "framework_id": self.autonomous.id,
            },
        )
        self.assertEqual(created.status_code, 201, created.text)
        return self._track_cycle(created.json()["id"])

    def _official_metric(self, code="1.1.1"):
        return next(
            metric
            for _identity, metric in official_operational_metric_rows(
                self.db, self.autonomous
            )
            if metric.code == code
        )

    def test_preservation_snapshot_is_unchanged(self):
        cycle_10 = self._cycle(10)
        cycle_11 = self._cycle(11)
        self.assertEqual(cycle_10.status, "Active")
        self.assertIsNone(cycle_10.framework_id)
        self.assertEqual(cycle_11.status, "Completed")
        self.assertIsNone(cycle_11.framework_id)

        submissions = self.db.query(Submission).order_by(Submission.id).all()
        self.assertEqual(len(submissions), 44)
        self.assertTrue(all(item.metric_id is None for item in submissions))
        counts = {}
        for item in submissions:
            counts[item.status] = counts.get(item.status, 0) + 1
        self.assertEqual(counts, HISTORICAL_STATUSES)

        working = (
            self.db.query(Metric)
            .filter(Metric.catalog_kind == CATALOG_KIND_WORKING)
            .count()
        )
        official = (
            self.db.query(Metric)
            .filter(Metric.catalog_kind == CATALOG_KIND_OFFICIAL)
            .count()
        )
        self.assertEqual(working, 51)
        self.assertEqual(official, 85)

        cam_count = self.db.query(CycleApplicableMetric).count()
        self.assertEqual(cam_count, 6)
        mapped = (
            self.db.query(FrameworkMetric)
            .filter(FrameworkMetric.maps_to_metric_id.isnot(None))
            .count()
        )
        self.assertEqual(mapped, 0)

        autonomous = (
            self.db.query(NaacFramework)
            .filter(NaacFramework.code == CODE_RAF_AUTONOMOUS)
            .one()
        )
        self.assertFalse(autonomous.allows_production_cycles)
        for code in (CODE_RAF_UNIVERSITY, CODE_RAF_AFFILIATED):
            framework = (
                self.db.query(NaacFramework)
                .filter(NaacFramework.code == code)
                .one()
            )
            self.assertEqual(
                len(official_operational_metric_rows(self.db, framework)),
                0,
            )

        live_official = (
            self.db.query(AccreditationCycle)
            .filter(
                AccreditationCycle.framework_id.isnot(None),
                AccreditationCycle.status.in_(("Active", "In Progress")),
            )
            .count()
        )
        self.assertEqual(live_official, 0)

        snapshot = [
            (row.id, row.code, row.title, row.metric_type, row.weightage)
            for row in self.db.query(Metric)
            .filter(Metric.catalog_kind == CATALOG_KIND_WORKING)
            .order_by(Metric.id)
            .all()
        ]
        self.assertEqual(snapshot, WORKING_SNAPSHOT)

    def test_second_live_cycle_is_rejected_without_rewriting_10_or_11(self):
        with api_client() as client:
            headers = self._admin_headers(client)
            draft_id = self._insert_cycle(1, status="Draft", suffix="DUP")
            response = client.put(
                f"/accreditation-cycles/{draft_id}",
                headers=headers,
                json={"status": "Active"},
            )
            self.assertEqual(response.status_code, 400, response.text)
            self.assertIn("already has a live", response.json()["detail"])

            create_live = client.post(
                "/accreditation-cycles",
                headers=headers,
                json={
                    "institution_id": 1,
                    "name": "Phase51 create live",
                    "code": f"P51-CREATE-{uuid.uuid4().hex[:8]}",
                    "status": "Active",
                    "framework_id": self.autonomous.id,
                },
            )
            self.assertEqual(create_live.status_code, 400, create_live.text)

        self.db.expire_all()
        self.assertEqual(self._cycle(10).status, "Active")
        self.assertIsNone(self._cycle(10).framework_id)
        self.assertEqual(self._cycle(11).status, "Completed")
        self.assertIsNone(self._cycle(11).framework_id)
        self.assertEqual(self._cycle(draft_id).status, "Draft")

    def test_institutions_can_have_independent_live_cycles(self):
        other = self._make_institution()
        other_cycle_id = self._insert_cycle(
            other.id,
            status="Active",
            suffix="IND",
        )
        self.assertEqual(get_active_cycle(self.db, 1).id, 10)
        self.assertEqual(get_active_cycle(self.db, other.id).id, other_cycle_id)
        self.assertEqual(self._cycle(10).status, "Active")

        with api_client() as client:
            headers = self._admin_headers(client)
            updated = client.put(
                f"/accreditation-cycles/{other_cycle_id}",
                headers=headers,
                json={"status": "In Progress"},
            )
            self.assertEqual(updated.status_code, 200, updated.text)
            self.assertEqual(updated.json()["status"], "In Progress")

        self.db.expire_all()
        self.assertEqual(self._cycle(10).status, "Active")
        self.assertEqual(self._cycle(other_cycle_id).status, "In Progress")

    def test_concurrent_activation_allows_only_one_live_cycle(self):
        other = self._make_institution()
        first_id = self._insert_cycle(other.id, status="Draft", suffix="C1")
        second_id = self._insert_cycle(other.id, status="Draft", suffix="C2")
        results = [None, None]
        barrier = threading.Barrier(2)

        def activate(cycle_id, index):
            db = SessionLocal()
            try:
                barrier.wait(timeout=10)
                cycle = (
                    db.query(AccreditationCycle)
                    .filter(AccreditationCycle.id == cycle_id)
                    .one()
                )
                try:
                    assert_single_live_cycle_per_institution(
                        db,
                        cycle.institution_id,
                        "Active",
                        exclude_cycle_id=cycle.id,
                    )
                    cycle.status = "Active"
                    db.commit()
                    results[index] = "ok"
                except HTTPException:
                    db.rollback()
                    results[index] = "blocked"
            finally:
                db.close()

        threads = [
            threading.Thread(target=activate, args=(first_id, 0)),
            threading.Thread(target=activate, args=(second_id, 1)),
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=15)

        self.assertCountEqual(results, ["ok", "blocked"])
        self.db.expire_all()
        live = (
            self.db.query(AccreditationCycle)
            .filter(
                AccreditationCycle.institution_id == other.id,
                AccreditationCycle.status.in_(("Active", "In Progress")),
            )
            .all()
        )
        self.assertEqual(len(live), 1)
        self.assertEqual(self._cycle(10).status, "Active")
        self.assertEqual(self._cycle(11).status, "Completed")

    def test_official_eligibility_fails_closed_and_legacy_working_is_preserved(self):
        other = self._make_institution()
        with api_client() as client:
            headers = self._admin_headers(client)
            rejected = client.post(
                "/accreditation-cycles",
                headers=headers,
                json={
                    "institution_id": other.id,
                    "name": "Unconfigured official cycle",
                    "code": f"P51-OFF-UNC-{uuid.uuid4().hex[:8]}",
                    "status": "Draft",
                    "framework_id": self.autonomous.id,
                },
            )
            self.assertEqual(rejected.status_code, 400, rejected.text)
            self.assertIn("official naac category", rejected.text.lower())

            empty = get_final_report_eligibility(self.db, other.id)
            self.assertFalse(empty["eligible"])
            self.assertFalse(empty["applicability_configured"])
            self.assertIsNone(empty.get("cycle_id"))

        legacy = get_final_report_eligibility(self.db, 1)
        self.assertEqual(legacy["cycle_id"], 10)
        self.assertNotEqual(legacy["eligibility_status"], "UNVERIFIED")
        self.assertIsNone(legacy.get("naac_required_optional_verified"))
        self.assertTrue(legacy["applicability_configured"])

    def test_unscoped_admin_reports_do_not_pick_an_arbitrary_cycle(self):
        self.assertIsNone(get_active_cycle(self.db, None))
        eligibility = get_final_report_eligibility(self.db, None)
        self.assertFalse(eligibility["eligible"])
        self.assertEqual(eligibility["eligibility_status"], "ADMIN_UNSCOPED")
        self.assertIsNone(eligibility["cycle_id"])
        self.assertIn("explicit institution", eligibility["reason"].lower())

        with api_client() as client:
            headers = self._admin_headers(client)
            summary = client.get("/reports/summary", headers=headers)
            self.assertEqual(summary.status_code, 200, summary.text)
            body = summary.json()
            admin = (
                self.db.query(User)
                .filter(User.email == "admin@test.com")
                .first()
            )
            if admin and admin.institution_id is None:
                self.assertIsNone(body.get("cycle"))
                self.assertEqual(
                    body["final_report"]["eligibility_status"],
                    "ADMIN_UNSCOPED",
                )
            else:
                self.assertEqual(
                    body.get("cycle", {}).get("id")
                    or body.get("final_report", {}).get("cycle_id"),
                    10,
                )

    def test_legacy_metric_endpoints_reject_official_mix(self):
        official = self._official_metric("1.1.1")
        working = (
            self.db.query(Metric)
            .filter(
                Metric.code == "1.1.1",
                Metric.catalog_kind == CATALOG_KIND_WORKING,
            )
            .one()
        )
        cycle_10 = self._cycle(10)
        with self.assertRaises(HTTPException) as raised:
            resolve_submission_metric_for_cycle(
                self.db,
                cycle_10,
                official.id,
                official.code,
            )
        self.assertEqual(raised.exception.status_code, 400)

        assigned_id, assigned_code = resolve_submission_metric_for_cycle(
            self.db,
            cycle_10,
            None,
            working.code,
        )
        self.assertIsNone(assigned_id)
        self.assertEqual(assigned_code, working.code)

        with api_client() as client:
            headers = self._coord_headers(client)
            listed = client.get("/metrics", headers=headers)
            self.assertEqual(listed.status_code, 200)
            kinds = {item["catalog_kind"] for item in listed.json()}
            self.assertEqual(kinds, {CATALOG_KIND_WORKING})
            self.assertEqual(len(listed.json()), 51)

            official_get = client.get(
                f"/metrics/{official.id}",
                headers=headers,
            )
            self.assertEqual(official_get.status_code, 400, official_get.text)

            working_get = client.get(
                f"/metrics/{working.id}",
                headers=headers,
            )
            self.assertEqual(working_get.status_code, 200, working_get.text)

            evidence = client.get("/evidence-requirements", headers=headers)
            self.assertEqual(evidence.status_code, 200)
            evidence_metric_ids = {
                item["metric_id"] for item in evidence.json()
            }
            official_ids = {
                metric.id
                for _identity, metric in official_operational_metric_rows(
                    self.db, self.autonomous
                )
            }
            self.assertTrue(evidence_metric_ids.isdisjoint(official_ids))

            create = client.post(
                "/submissions",
                headers=headers,
                json={
                    "title": "Phase51 official mix",
                    "metric_code": official.code,
                    "metric_id": official.id,
                    "data_json": json.dumps({"value": 10, "unit": "percentage"}),
                },
            )
            self.assertEqual(create.status_code, 400, create.text)

    def test_cycle_status_and_applicability_are_audited(self):
        other = self._make_configured_institution()
        cycle_id = self._insert_cycle(other.id, status="Draft", suffix="AUD")
        with api_client() as client:
            headers = self._admin_headers(client)
            status_change = client.put(
                f"/accreditation-cycles/{cycle_id}",
                headers=headers,
                json={"status": "Archived"},
            )
            self.assertEqual(status_change.status_code, 200, status_change.text)

            official = self._create_official_draft(
                client, headers, other.id, "AUDM"
            )
            metric = self._official_metric("1.1.2")
            replaced = client.put(
                f"/accreditation-cycles/{official}/applicable-metrics",
                headers=headers,
                json={"metrics": [{"metric_id": metric.id, "required": False}]},
            )
            self.assertEqual(replaced.status_code, 200, replaced.text)

        status_audit = (
            self.db.query(AuditLog)
            .filter(
                AuditLog.action == "CYCLE_STATUS_CHANGE",
                AuditLog.entity_id == cycle_id,
            )
            .order_by(AuditLog.id.desc())
            .first()
        )
        self.assertIsNotNone(status_audit)
        self.assertEqual(status_audit.institution_id, other.id)
        self.assertEqual(status_audit.old_values["status"], "Draft")
        self.assertEqual(status_audit.new_values["status"], "Archived")
        self.assertIsNotNone(status_audit.timestamp)
        self.assertNotIn("data_json", status_audit.new_values or {})

        apply_audit = (
            self.db.query(AuditLog)
            .filter(
                AuditLog.action == "CYCLE_APPLICABILITY_REPLACE",
                AuditLog.entity_id == official,
            )
            .order_by(AuditLog.id.desc())
            .first()
        )
        self.assertIsNotNone(apply_audit)
        self.assertEqual(apply_audit.institution_id, other.id)
        self.assertEqual(apply_audit.new_values["metrics"][0]["metric_id"], metric.id)

    def test_tenant_isolation_for_cycle_applicability_submission_evidence_and_review(self):
        other = self._make_configured_institution()
        with api_client() as client:
            headers_admin = self._admin_headers(client)
            other_cycle = self._create_official_draft(
                client, headers_admin, other.id, "TEN"
            )
            official = self._official_metric("1.1.1")
            client.put(
                f"/accreditation-cycles/{other_cycle}/applicable-metrics",
                headers=headers_admin,
                json={"metrics": [{"metric_id": official.id, "required": False}]},
            )

            coord = (
                self.db.query(User)
                .filter(User.email == "coordinator@test.com")
                .one()
            )
            other_submission = Submission(
                institution_id=other.id,
                cycle_id=other_cycle,
                user_id=coord.id,
                title="Phase51 other submission",
                metric_code=official.code,
                metric_id=official.id,
                status="Draft",
                data_json="{}",
            )
            self.db.add(other_submission)
            self.db.flush()
            self.db.commit()
            self.created_submission_ids.append(other_submission.id)

            coord_headers = self._coord_headers(client)
            cycle_get = client.get(
                f"/accreditation-cycles/{other_cycle}",
                headers=coord_headers,
            )
            self.assertEqual(cycle_get.status_code, 403, cycle_get.text)

            applicability = client.put(
                f"/accreditation-cycles/{other_cycle}/applicable-metrics",
                headers=coord_headers,
                json={"metrics": [{"metric_id": official.id, "required": False}]},
            )
            self.assertEqual(applicability.status_code, 403, applicability.text)

            listed = client.get("/accreditation-cycles", headers=coord_headers)
            self.assertEqual(listed.status_code, 200)
            self.assertFalse(
                any(item["id"] == other_cycle for item in listed.json())
            )

            submit = client.post(
                "/submissions",
                headers=coord_headers,
                json={
                    "title": "Phase51 cross-tenant official",
                    "metric_id": official.id,
                    "metric_code": official.code,
                    "data_json": json.dumps({"qualitative_response": "nope"}),
                },
            )
            self.assertEqual(submit.status_code, 400, submit.text)

            evidence = client.post(
                "/documents",
                headers=coord_headers,
                json={
                    "title": "cross-tenant evidence",
                    "file_path": "/tmp/phase51.txt",
                    "file_type": "txt",
                    "submission_id": other_submission.id,
                },
            )
            self.assertIn(evidence.status_code, (403, 404), evidence.text)
            if evidence.status_code == 403:
                self.assertIn(
                    "another institution",
                    str(evidence.json().get("detail", "")).lower(),
                )

            submissions = client.get("/submissions", headers=coord_headers)
            self.assertEqual(submissions.status_code, 200)
            self.assertFalse(
                any(
                    item["id"] == other_submission.id
                    for item in submissions.json()
                )
            )

            reports = client.get("/reports/summary", headers=coord_headers)
            self.assertEqual(reports.status_code, 200)
            self.assertEqual(reports.json().get("cycle", {}).get("id"), 10)

            reviewer_headers = self._reviewer_headers(client)
            other_detail = client.get(
                f"/submissions/{other_submission.id}",
                headers=reviewer_headers,
            )
            self.assertEqual(other_detail.status_code, 403, other_detail.text)

            reviews = client.get("/reviews", headers=reviewer_headers)
            self.assertEqual(reviews.status_code, 200)
            self.assertFalse(
                any(
                    item.get("submission_id") == other_submission.id
                    for item in reviews.json()
                )
            )

        self.db.expire_all()
        self.assertEqual(self._cycle(10).status, "Active")
        self.assertEqual(self._cycle(11).status, "Completed")
        self.assertEqual(
            self.db.query(Submission).filter(Submission.metric_id.is_(None)).count(),
            44,
        )

    def test_http_concurrent_activation_serializes_on_postgresql(self):
        with engine.connect() as connection:
            isolation = connection.execute(
                text("SHOW transaction_isolation")
            ).scalar()
        self.assertEqual(str(isolation).replace(" ", "_").lower(), "read_committed")

        other = self._make_institution()
        first_id = self._insert_cycle(other.id, status="Draft", suffix="H1")
        second_id = self._insert_cycle(other.id, status="Draft", suffix="H2")
        barrier = threading.Barrier(2)
        results = [None, None]

        with api_client() as setup_client:
            headers = self._admin_headers(setup_client)

        def activate(cycle_id, index):
            with api_client() as client:
                barrier.wait(timeout=10)
                results[index] = client.put(
                    f"/accreditation-cycles/{cycle_id}",
                    headers=headers,
                    json={"status": "Active"},
                )

        threads = [
            threading.Thread(target=activate, args=(first_id, 0)),
            threading.Thread(target=activate, args=(second_id, 1)),
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=20)

        statuses = [item.status_code for item in results if item is not None]
        self.assertEqual(len(statuses), 2)
        self.assertIn(200, statuses)
        self.assertIn(400, statuses)

        self.db.expire_all()
        live = (
            self.db.query(AccreditationCycle)
            .filter(
                AccreditationCycle.institution_id == other.id,
                AccreditationCycle.status.in_(("Active", "In Progress")),
            )
            .all()
        )
        self.assertEqual(len(live), 1)
        self.assertEqual(self._cycle(10).status, "Active")
        self.assertEqual(self._cycle(11).status, "Completed")

        other_b = self._make_institution()
        independent = self._insert_cycle(other_b.id, status="Active", suffix="H3")
        self.assertEqual(get_active_cycle(self.db, other.id).id, live[0].id)
        self.assertEqual(get_active_cycle(self.db, other_b.id).id, independent)

    def test_admin_reports_require_explicit_institution_scope(self):
        other = self._make_institution()
        other_cycle = self._insert_cycle(other.id, status="Active", suffix="RPT")
        with api_client() as client:
            admin_headers = self._admin_headers(client)
            scoped = client.get(
                f"/reports/summary?institution_id={other.id}",
                headers=admin_headers,
            )
            self.assertEqual(scoped.status_code, 200, scoped.text)
            self.assertEqual(scoped.json().get("cycle", {}).get("id"), other_cycle)

            missing = client.get(
                "/reports/summary?institution_id=999999",
                headers=admin_headers,
            )
            self.assertEqual(missing.status_code, 404)

            coord_headers = self._coord_headers(client)
            forbidden = client.get(
                f"/reports/summary?institution_id={other.id}",
                headers=coord_headers,
            )
            self.assertEqual(forbidden.status_code, 403, forbidden.text)

            own = client.get(
                "/reports/summary?institution_id=1",
                headers=coord_headers,
            )
            self.assertEqual(own.status_code, 200, own.text)
            self.assertEqual(own.json().get("cycle", {}).get("id"), 10)

            unscoped = get_final_report_eligibility(self.db, None)
            self.assertEqual(unscoped["eligibility_status"], "ADMIN_UNSCOPED")
            self.assertIsNone(get_active_cycle(self.db, None))

    def test_official_progress_and_criteria_do_not_treat_required_default_false_as_optional(self):
        other = self._make_configured_institution()
        with api_client() as client:
            headers = self._admin_headers(client)
            cycle_id = self._create_official_draft(
                client, headers, other.id, "PRG"
            )
            empty_progress = build_progress(self.db, other.id)
            self.assertEqual(
                empty_progress["cycle_progress"].get("eligibility_status"),
                "NOT_READY",
            )
            self.assertEqual(
                empty_progress["cycle_progress"]["optional_metric_count"],
                0,
            )
            self.assertEqual(empty_progress["criteria"], [])

            official = self._official_metric("1.1.1")
            saved = client.put(
                f"/accreditation-cycles/{cycle_id}/applicable-metrics",
                headers=headers,
                json={"metrics": [{"metric_id": official.id, "required": False}]},
            )
            self.assertEqual(saved.status_code, 200, saved.text)

            metrics = client.get(
                f"/metrics?cycle_id={cycle_id}",
                headers=headers,
            )
            self.assertEqual(metrics.status_code, 200)
            self.assertEqual(
                [item["id"] for item in metrics.json()],
                [official.id],
            )
            self.assertEqual(metrics.json()[0]["catalog_kind"], CATALOG_KIND_OFFICIAL)

            working_list = client.get("/metrics", headers=headers)
            self.assertEqual(working_list.status_code, 200)
            self.assertTrue(
                all(
                    item["catalog_kind"] == CATALOG_KIND_WORKING
                    for item in working_list.json()
                )
            )

            coord = (
                self.db.query(User)
                .filter(User.email == "coordinator@test.com")
                .one()
            )
            finalized = Submission(
                institution_id=other.id,
                cycle_id=cycle_id,
                user_id=coord.id,
                title="Phase52 finalized official",
                metric_code=official.code,
                metric_id=official.id,
                status="Final Submitted",
                data_json="{}",
            )
            unfinalized = Submission(
                institution_id=other.id,
                cycle_id=cycle_id,
                user_id=coord.id,
                title="Phase52 draft official",
                metric_code=official.code,
                metric_id=official.id,
                status="Draft",
                data_json="{}",
            )
            self.db.add_all([finalized, unfinalized])
            self.db.commit()
            self.created_submission_ids.extend([finalized.id, unfinalized.id])

            configured = get_final_report_eligibility(self.db, other.id)
            self.assertFalse(configured["eligible"])
            self.assertEqual(configured["eligibility_status"], "UNVERIFIED")
            self.assertEqual(configured["optional_metric_count"], 0)
            self.assertEqual(configured["required_metric_count"], 0)

            progress = build_progress(self.db, other.id)
            self.assertEqual(
                progress["cycle_progress"]["eligibility_status"],
                "UNVERIFIED",
            )
            self.assertEqual(progress["cycle_progress"]["optional_metric_count"], 0)
            self.assertFalse(
                progress["cycle_progress"]["required_metrics_complete"]
            )
            for item in progress["criteria"]:
                self.assertEqual(item.get("optional_metric_count"), 0)
                self.assertEqual(item.get("eligibility_status"), "UNVERIFIED")

            criteria = client.get("/criteria", headers=headers)
            self.assertEqual(criteria.status_code, 200)

        legacy = get_final_report_eligibility(self.db, 1)
        self.assertEqual(legacy["cycle_id"], 10)
        self.assertNotEqual(legacy["eligibility_status"], "UNVERIFIED")
        self.assertGreater(legacy["required_metric_count"], 0)

    def test_cycle_delete_is_audited_and_logs_stay_tenant_scoped(self):
        other = self._make_institution()
        cycle_id = self._insert_cycle(other.id, status="Draft", suffix="DEL")
        with api_client() as client:
            admin_headers = self._admin_headers(client)
            deleted = client.delete(
                f"/accreditation-cycles/{cycle_id}",
                headers=admin_headers,
            )
            self.assertEqual(deleted.status_code, 200, deleted.text)
            self.created_cycle_ids.remove(cycle_id)

            audit = (
                self.db.query(AuditLog)
                .filter(
                    AuditLog.action == "CYCLE_DELETE",
                    AuditLog.entity_id == cycle_id,
                )
                .order_by(AuditLog.id.desc())
                .first()
            )
            self.assertIsNotNone(audit)
            self.assertEqual(audit.institution_id, other.id)
            self.assertEqual(audit.old_values["status"], "Draft")
            self.assertNotIn("data_json", audit.old_values or {})

            coord_headers = self._coord_headers(client)
            logs = client.get("/audit-logs", headers=coord_headers)
            self.assertEqual(logs.status_code, 200)
            self.assertFalse(
                any(
                    item["id"] == audit.id
                    for item in logs.json()
                )
            )
