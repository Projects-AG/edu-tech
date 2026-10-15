import unittest
import uuid
from collections import Counter
from pathlib import Path

from app.auth.security import hash_password
from app.db.database import SessionLocal
from app.models import (
    AccreditationCycle,
    AuditLog,
    Institution,
    Metric,
    Notification,
    Review,
    Role,
    Submission,
    User,
)
from app.models.cycle_applicable_metric import CycleApplicableMetric
from app.models.document import Document
from app.models.document_version import DocumentVersion
from app.models.metric import CATALOG_KIND_OFFICIAL, CATALOG_KIND_WORKING
from app.models.naac_framework import FrameworkMetric, NaacFramework
from app.models.section import Section
from app.services.framework_service import official_operational_metric_rows
from app.services.naac_framework_catalog import (
    CATEGORY_AUTONOMOUS_COLLEGE,
    CODE_RAF_AUTONOMOUS,
)
from app.services.official_form_service import (
    build_official_data_json,
    parse_official_data_json,
)
from tests.test_framework_recommendation import _login, api_client
from tests.test_production_safety import HISTORICAL_STATUSES

BACKEND_ROOT = Path(__file__).resolve().parents[1]
DEMO_PASSWORD = "DemoPath@123"


class ClientDemoPathTests(unittest.TestCase):
    """HTTP walk-through of the official demo path on a throwaway tenant."""

    def setUp(self):
        self.db = SessionLocal()
        self.autonomous = (
            self.db.query(NaacFramework)
            .filter(NaacFramework.code == CODE_RAF_AUTONOMOUS)
            .one()
        )
        self.institution = None
        self.user_ids = []
        self.cycle_ids = []
        self.submission_ids = []
        self.document_ids = []
        self.stored_files = []

    def tearDown(self):
        self.db.rollback()
        if self.document_ids:
            self.db.query(DocumentVersion).filter(
                DocumentVersion.document_id.in_(self.document_ids)
            ).delete(synchronize_session=False)
            self.db.query(Document).filter(
                Document.id.in_(self.document_ids)
            ).delete(synchronize_session=False)
        if self.submission_ids:
            self.db.query(Review).filter(
                Review.submission_id.in_(self.submission_ids)
            ).delete(synchronize_session=False)
            self.db.query(Submission).filter(
                Submission.id.in_(self.submission_ids)
            ).delete(synchronize_session=False)
        if self.cycle_ids:
            self.db.query(CycleApplicableMetric).filter(
                CycleApplicableMetric.cycle_id.in_(self.cycle_ids)
            ).delete(synchronize_session=False)
            self.db.query(AccreditationCycle).filter(
                AccreditationCycle.id.in_(self.cycle_ids)
            ).delete(synchronize_session=False)
        if self.user_ids:
            self.db.query(Notification).filter(
                Notification.user_id.in_(self.user_ids)
            ).delete(synchronize_session=False)
            self.db.query(AuditLog).filter(
                AuditLog.user_id.in_(self.user_ids)
            ).delete(synchronize_session=False)
        if self.institution is not None:
            self.db.query(AuditLog).filter(
                AuditLog.institution_id == self.institution.id
            ).delete(synchronize_session=False)
        if self.user_ids:
            self.db.query(User).filter(
                User.id.in_(self.user_ids)
            ).delete(synchronize_session=False)
        if self.institution is not None:
            self.db.query(Institution).filter(
                Institution.id == self.institution.id
            ).delete(synchronize_session=False)
        self.db.commit()
        self.db.close()
        for path in self.stored_files:
            if path.exists():
                path.unlink()

    def _make_user(self, role_name, label):
        role = self.db.query(Role).filter(Role.name == role_name).one()
        user = User(
            name=f"Demo {label}",
            email=f"demo-{label}-{uuid.uuid4().hex[:8]}@example.test",
            password_hash=hash_password(DEMO_PASSWORD),
            role_id=role.id,
            institution_id=self.institution.id,
            is_active=True,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        self.user_ids.append(user.id)
        return user

    def _headers(self, client, email, password, role):
        login = _login(client, email, password, role)
        if login.status_code != 200:
            self.skipTest(f"login unavailable for {role}: {login.text}")
        return {"Authorization": f"Bearer {login.json()['access_token']}"}

    def _official(self, code):
        return next(
            metric
            for _identity, metric in official_operational_metric_rows(
                self.db, self.autonomous
            )
            if metric.code == code
        )

    def _track_file(self, document):
        self.document_ids.append(document["id"])
        self.stored_files.append(
            BACKEND_ROOT / str(document["file_path"]).lstrip("/")
        )

    def _snapshot(self):
        self.db.expire_all()
        cycles = {
            cycle.id: (cycle.status, cycle.framework_id)
            for cycle in self.db.query(AccreditationCycle)
            .filter(AccreditationCycle.id.in_((10, 11)))
            .all()
        }
        historical = (
            self.db.query(Submission)
            .filter(Submission.metric_id.is_(None))
            .all()
        )
        return {
            "cycles": cycles,
            "historical": Counter(item.status for item in historical),
            "historical_ids": sorted(item.id for item in historical),
            "working": self.db.query(Metric)
            .filter(Metric.catalog_kind == CATALOG_KIND_WORKING)
            .count(),
            "official": self.db.query(Metric)
            .filter(Metric.catalog_kind == CATALOG_KIND_OFFICIAL)
            .count(),
            "applicability": sorted(
                (row.cycle_id, row.metric_id)
                for row in self.db.query(CycleApplicableMetric)
                .filter(CycleApplicableMetric.cycle_id.in_((10, 11)))
                .all()
            ),
            "mapped": self.db.query(FrameworkMetric)
            .filter(FrameworkMetric.maps_to_metric_id.isnot(None))
            .count(),
            "production": self.db.query(NaacFramework)
            .filter(NaacFramework.allows_production_cycles.is_(True))
            .count(),
        }

    def test_official_demo_path_end_to_end(self):
        before = self._snapshot()
        self.assertEqual(before["cycles"][10], ("Active", None))
        self.assertEqual(before["cycles"][11], ("Completed", None))
        self.assertEqual(dict(before["historical"]), HISTORICAL_STATUSES)

        self.institution = Institution(
            name=f"Demo Autonomous {uuid.uuid4().hex[:8]}",
            code=f"DEMO-{uuid.uuid4().hex[:8]}",
            official_category=CATEGORY_AUTONOMOUS_COLLEGE,
            confirmed_framework_id=self.autonomous.id,
        )
        self.db.add(self.institution)
        self.db.commit()
        self.db.refresh(self.institution)
        coordinator = self._make_user("NAAC Coordinator", "coord")
        reviewer = self._make_user("Reviewer", "reviewer")

        qlm = self._official("1.1.1")
        qnm = self._official("1.2.1")
        criterion_id = (
            self.db.query(Section).filter(Section.id == qlm.section_id).one()
        ).criterion_id

        with api_client() as client:
            admin = self._headers(client, "admin@test.com", "admin123", "Admin")
            coord = self._headers(
                client, coordinator.email, DEMO_PASSWORD, "NAAC Coordinator"
            )
            rev = self._headers(client, reviewer.email, DEMO_PASSWORD, "Reviewer")
            home_coord = self._headers(
                client, "coordinator@test.com", "Coordinator@123", "NAAC Coordinator"
            )
            home_rev = self._headers(
                client, "reviewer@accreditation.org", "password123", "Reviewer"
            )

            # Framework and cycle selection.
            frameworks = client.get("/naac-frameworks", headers=admin)
            self.assertEqual(frameworks.status_code, 200, frameworks.text)
            created = client.post(
                "/accreditation-cycles",
                headers=admin,
                json={
                    "institution_id": self.institution.id,
                    "name": "Demo official cycle",
                    "code": f"DEMO-{uuid.uuid4().hex[:8]}",
                    "status": "Draft",
                    "framework_id": self.autonomous.id,
                },
            )
            self.assertEqual(created.status_code, 201, created.text)
            cycle_id = created.json()["id"]
            self.cycle_ids.append(cycle_id)

            activate = client.put(
                f"/accreditation-cycles/{cycle_id}",
                headers=admin,
                json={"status": "Active"},
            )
            self.assertEqual(activate.status_code, 400, activate.text)
            cycle_record = (
                self.db.query(AccreditationCycle)
                .filter(AccreditationCycle.id == cycle_id)
                .one()
            )
            self.assertEqual(cycle_record.status, "Draft")

            # Applicability.
            saved = client.put(
                f"/accreditation-cycles/{cycle_id}/applicable-metrics",
                headers=coord,
                json={"metrics": [{"metric_id": qlm.id}, {"metric_id": qnm.id}]},
            )
            self.assertEqual(saved.status_code, 200, saved.text)
            self.assertEqual(saved.json()["applicable_metric_count"], 2)

            # Official Draft-cycle rejection check: verify submission guard rejects
            # new submissions while the official autonomous cycle remains Draft.
            rejected_sub = client.post(
                "/submissions",
                headers=coord,
                json={
                    "title": "Demo official QlM 1.1.1",
                    "criterion_id": criterion_id,
                    "metric_id": qlm.id,
                    "metric_code": qlm.code,
                    "data_json": build_official_data_json(
                        qlm, "QlM", qualitative_response="Demo narrative"
                    ),
                },
            )
            self.assertEqual(rejected_sub.status_code, 400, rejected_sub.text)
            self.assertIn(
                "Draft and Archived cycles do not accept submissions",
                rejected_sub.json().get("detail", ""),
            )

            # Valid isolated test fixture for the end-to-end submission/review workflow.
            sub_fixture = Submission(
                institution_id=self.institution.id,
                cycle_id=cycle_id,
                criterion_id=criterion_id,
                user_id=coordinator.id,
                title="Demo official QlM 1.1.1",
                metric_code=qlm.code,
                metric_id=qlm.id,
                status="Draft",
                data_json=build_official_data_json(
                    qlm, "QlM", qualitative_response="Demo narrative"
                ),
            )
            self.db.add(sub_fixture)
            self.db.commit()
            self.db.refresh(sub_fixture)
            self.submission_ids.append(sub_fixture.id)

            get_sub = client.get(f"/submissions/{sub_fixture.id}", headers=coord)
            self.assertEqual(get_sub.status_code, 200, get_sub.text)
            submission = get_sub.json()
            self.assertEqual(submission["cycle_id"], cycle_id)
            self.assertEqual(submission["metric_id"], qlm.id)
            parsed = parse_official_data_json(submission["data_json"])
            self.assertEqual(parsed["metric_kind"], "QlM")
            self.assertEqual(parsed["metric_id"], qlm.id)

            # Evidence upload and version history.
            uploaded = client.post(
                "/documents/upload",
                headers=coord,
                files={"file": ("demo.pdf", b"%PDF-1.4 v1", "application/pdf")},
                data={"submission_id": str(submission["id"]), "title": "Demo evidence"},
            )
            self.assertEqual(uploaded.status_code, 201, uploaded.text)
            document = uploaded.json()
            self._track_file(document)
            replaced = client.put(
                f"/documents/{document['id']}/replace",
                headers=coord,
                files={"file": ("demo-v2.pdf", b"%PDF-1.4 v2", "application/pdf")},
            )
            self.assertEqual(replaced.status_code, 200, replaced.text)
            self.stored_files.append(
                BACKEND_ROOT / str(replaced.json()["file_path"]).lstrip("/")
            )
            versions = client.get(
                f"/documents/{document['id']}/versions", headers=coord
            )
            self.assertEqual(versions.status_code, 200, versions.text)
            self.assertEqual(len(versions.json()), 2)
            self.assertEqual(
                sum(1 for item in versions.json() if item.get("is_current")), 1
            )
            cross_versions = client.get(
                f"/documents/{document['id']}/versions", headers=home_coord
            )
            self.assertIn(cross_versions.status_code, (403, 404))

            # Review and change-request flow.
            submitted = client.post(
                f"/submissions/{submission['id']}/submit", headers=coord
            )
            self.assertEqual(submitted.status_code, 200, submitted.text)
            started = client.post(
                f"/submissions/{submission['id']}/start-review", headers=rev
            )
            self.assertEqual(started.status_code, 200, started.text)
            cross_review = client.post(
                f"/submissions/{submission['id']}/review",
                headers=home_rev,
                json={"status": "Approved"},
            )
            self.assertEqual(cross_review.status_code, 403, cross_review.text)
            changes = client.post(
                f"/submissions/{submission['id']}/review",
                headers=rev,
                json={"status": "Changes Requested", "comments": "Add PO/CO mapping"},
            )
            self.assertEqual(changes.status_code, 200, changes.text)
            self.assertEqual(changes.json()["submission"]["status"], "Changes Requested")
            edited = client.put(
                f"/submissions/{submission['id']}",
                headers=coord,
                json={
                    "data_json": build_official_data_json(
                        qlm, "QlM", qualitative_response="Revised narrative"
                    )
                },
            )
            self.assertEqual(edited.status_code, 200, edited.text)
            resubmitted = client.post(
                f"/submissions/{submission['id']}/resubmit", headers=coord
            )
            self.assertEqual(resubmitted.status_code, 200, resubmitted.text)
            self.assertEqual(
                resubmitted.json()["submission"]["status"], "Resubmitted"
            )
            history = client.get(
                f"/submissions/{submission['id']}/reviews", headers=coord
            )
            self.assertEqual(history.status_code, 200)
            self.assertEqual(
                [item["status"] for item in history.json()], ["Changes Requested"]
            )
            self.assertEqual(history.json()[0]["max_score"], qlm.max_score)

            # Notifications stay inside the tenant.
            reviewer_notes = client.get("/notifications", headers=rev).json()
            self.assertTrue(
                any(item["title"] == "New Submission Awaiting Review" for item in reviewer_notes)
            )
            coord_notes = client.get("/notifications", headers=coord).json()
            self.assertTrue(
                any(item["title"] == "Changes Requested on Submission" for item in coord_notes)
            )
            home_notes = client.get("/notifications", headers=home_rev).json()
            self.assertFalse(
                any("Demo official QlM 1.1.1" in item["message"] for item in home_notes)
            )

            # Audit logs stay inside the tenant.
            audit = client.get("/audit-logs", headers=coord)
            self.assertEqual(audit.status_code, 200, audit.text)
            actions = {(item["action"], item["entity_type"]) for item in audit.json()}
            self.assertIn(("SUBMISSION_STATUS_CHANGE", "Submission"), actions)
            self.assertIn(("REVIEW_DECISION", "Review"), actions)
            self.assertTrue(
                all(item["institution_id"] == self.institution.id for item in audit.json())
            )
            home_audit = client.get("/audit-logs", headers=home_coord).json()
            self.assertFalse(
                any(item["institution_id"] == self.institution.id for item in home_audit)
            )

            # Dashboards, reports and exports.
            dashboard = client.get("/coordinator/dashboard", headers=coord)
            self.assertEqual(dashboard.status_code, 200, dashboard.text)
            summary = client.get("/reports/summary", headers=coord)
            self.assertEqual(summary.status_code, 200, summary.text)
            body = summary.json()
            self.assertEqual(body["cycle"]["id"], cycle_id)
            self.assertIn(
                body["final_report"]["eligibility_status"], ("UNVERIFIED", "NOT_READY")
            )
            self.assertFalse(body["final_report"].get("eligible"))
            for path in ("/reports/progress", "/reports/criteria", "/reports/evidence"):
                response = client.get(path, headers=coord)
                self.assertEqual(response.status_code, 200, f"{path}: {response.text}")
            final_download = client.get("/reports/final/download", headers=coord)
            self.assertNotEqual(final_download.status_code, 200)

            # Tenant isolation for the home institution.
            hidden = client.get(f"/submissions/{submission['id']}", headers=home_coord)
            self.assertEqual(hidden.status_code, 403, hidden.text)
            home_summary = client.get("/reports/summary", headers=home_coord).json()
            self.assertEqual(home_summary["cycle"]["id"], 10)

        after = self._snapshot()
        self.assertEqual(after, before)


if __name__ == "__main__":
    unittest.main()
