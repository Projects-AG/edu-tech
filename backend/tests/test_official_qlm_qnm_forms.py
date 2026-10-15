import json
import unittest
import uuid
from pathlib import Path

from fastapi import HTTPException

from app.db.database import SessionLocal
from app.models import AuditLog, AccreditationCycle, Institution, Metric, Role, Submission
from app.models.cycle_applicable_metric import CycleApplicableMetric
from app.models.document import Document
from app.models.document_version import DocumentVersion
from app.models.evidence_requirement import EvidenceRequirement
from app.models.metric import CATALOG_KIND_OFFICIAL, CATALOG_KIND_WORKING
from app.models.naac_framework import FrameworkMetric, NaacFramework
from app.models.section import Section
from app.models.user import User
from app.auth.security import hash_password
from app.services.framework_service import (
    assert_cycle_status_allowed,
    load_official_qif_rows,
    official_operational_metric_rows,
    resolve_submission_metric_for_cycle,
)
from app.services.naac_framework_catalog import CODE_RAF_AUTONOMOUS
from app.services.official_form_service import (
    QIF_SUPPORTED_FIELDS,
    apply_official_form_payload,
    build_official_data_json,
    official_form_descriptor,
    official_metric_kind,
    parse_official_data_json,
)
from app.services.operational_metric_service import GENERIC_EVIDENCE_TITLE
from tests.test_dual_catalogue_schema import WORKING_SNAPSHOT
from tests.test_framework_recommendation import _login, api_client


class OfficialQlmQnmFormTests(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        self.created_cycle_ids = []
        self.created_submission_ids = []
        self.created_document_ids = []
        self.created_institution_ids = []
        self.created_user_ids = []
        self.autonomous = (
            self.db.query(NaacFramework)
            .filter(NaacFramework.code == CODE_RAF_AUTONOMOUS)
            .one()
        )
        self.test_institution = Institution(
            name=f"Phase 4 test institution {uuid.uuid4().hex[:8]}",
            code=f"PHASE4I-{uuid.uuid4().hex[:8]}",
            official_category="AUTONOMOUS_COLLEGE",
            confirmed_framework_id=self.autonomous.id,
        )
        self.db.add(self.test_institution)
        self.db.commit()
        self.db.refresh(self.test_institution)
        self.created_institution_ids.append(self.test_institution.id)

        coordinator_role = (
            self.db.query(Role).filter(Role.name == "NAAC Coordinator").one()
        )
        self.test_coordinator = User(
            name="Phase 4 Test Coordinator",
            email=f"phase4-coord-{uuid.uuid4().hex[:8]}@example.test",
            password_hash=hash_password("Phase4Test@123"),
            role_id=coordinator_role.id,
            institution_id=self.test_institution.id,
            is_active=True,
        )
        self.db.add(self.test_coordinator)
        self.db.commit()
        self.db.refresh(self.test_coordinator)
        self.created_user_ids.append(self.test_coordinator.id)

    def tearDown(self):
        if self.created_document_ids:
            self.db.query(DocumentVersion).filter(
                DocumentVersion.document_id.in_(self.created_document_ids)
            ).delete(synchronize_session=False)
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
            self.db.query(AuditLog).filter(
                AuditLog.entity_id.in_(self.created_cycle_ids),
                AuditLog.institution_id.in_(self.created_institution_ids or [-1]),
            ).delete(synchronize_session=False)
            self.db.query(AccreditationCycle).filter(
                AccreditationCycle.id.in_(self.created_cycle_ids)
            ).delete(synchronize_session=False)
        if self.created_institution_ids:
            self.db.query(AuditLog).filter(
                AuditLog.institution_id.in_(self.created_institution_ids)
            ).delete(synchronize_session=False)
        if self.created_user_ids:
            self.db.query(User).filter(
                User.id.in_(self.created_user_ids)
            ).delete(synchronize_session=False)
        if self.created_institution_ids:
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

    def _official_coord_headers(self, client):
        login = _login(
            client,
            self.test_coordinator.email,
            "Phase4Test@123",
            "NAAC Coordinator",
        )
        if login.status_code != 200:
            self.fail(f"temporary coordinator login failed: {login.status_code} {login.text}")
        return {"Authorization": f"Bearer {login.json()['access_token']}"}

    def _official_by_code(self, code):
        return next(
            metric
            for _identity, metric in official_operational_metric_rows(
                self.db, self.autonomous
            )
            if metric.code == code
        )

    def _create_configured_draft(self, client, headers, metric_ids):
        created = client.post(
            "/accreditation-cycles",
            headers=headers,
            json={
                "institution_id": self.test_institution.id,
                "name": "Phase 4 official forms",
                "code": f"PHASE4-{uuid.uuid4().hex[:8]}",
                "status": "Draft",
                "framework_id": self.autonomous.id,
            },
        )
        self.assertEqual(created.status_code, 201, created.text)
        cycle_id = self._track_cycle(created.json()["id"])
        saved = client.put(
            f"/accreditation-cycles/{cycle_id}/applicable-metrics",
            headers=headers,
            json={"metrics": [{"metric_id": metric_id} for metric_id in metric_ids]},
        )
        self.assertEqual(saved.status_code, 200, saved.text)
        self.db.expire_all()
        cycle = (
            self.db.query(AccreditationCycle)
            .filter(AccreditationCycle.id == cycle_id)
            .one()
        )
        return cycle, saved.json()

    def test_qif_source_has_no_invented_form_fields(self):
        rows = load_official_qif_rows(CODE_RAF_AUTONOMOUS)
        self.assertEqual(len(rows), 85)
        kinds = {row["metric_kind"] for row in rows}
        self.assertEqual(kinds, {"QlM", "QnM"})
        for row in rows:
            self.assertTrue(set(row.keys()) <= QIF_SUPPORTED_FIELDS)
            self.assertNotIn("word_limit", row)
            self.assertNotIn("option_list", row)
            self.assertNotIn("formula", row)
            self.assertNotIn("evidence_documents", row)

    def test_qlm_and_qnm_payloads_use_catalogue_kind_without_sop_rules(self):
        qlm = self._official_by_code("1.1.1")
        qnm = self._official_by_code("1.2.1")
        working = (
            self.db.query(Metric)
            .filter(
                Metric.code == "1.1.1",
                Metric.catalog_kind == CATALOG_KIND_WORKING,
            )
            .one()
        )
        self.assertEqual(official_metric_kind(self.db, qlm), "QlM")
        self.assertEqual(official_metric_kind(self.db, qnm), "QnM")
        self.assertIsNone(official_metric_kind(self.db, working))
        self.assertNotEqual(qlm.id, working.id)

        qlm_desc = official_form_descriptor(qlm, "QlM")
        self.assertEqual(qlm_desc["response_field"], "qualitative_response")
        self.assertIsNone(qlm_desc["word_limit"])
        self.assertIsNone(qlm_desc["option_list"])

        long_narrative = " ".join(["word"] * 600)
        qlm_payload = json.loads(
            build_official_data_json(
                qlm,
                "QlM",
                qualitative_response=long_narrative,
            )
        )
        self.assertEqual(qlm_payload["form_kind"], "OFFICIAL")
        self.assertEqual(qlm_payload["metric_id"], qlm.id)
        self.assertEqual(qlm_payload["metric_kind"], "QlM")
        self.assertEqual(qlm_payload["qualitative_response"], long_narrative)
        self.assertIsNone(qlm_payload["word_limit"])
        self.assertNotIn("dvv_options", qlm_payload)

        qnm_payload = json.loads(
            build_official_data_json(
                qnm,
                "QnM",
                quantitative_response="42.5 percent of new courses",
            )
        )
        self.assertEqual(qnm_payload["metric_kind"], "QnM")
        self.assertEqual(
            qnm_payload["quantitative_response"],
            "42.5 percent of new courses",
        )
        self.assertIsNone(qnm_payload["formula"])
        self.assertIsNone(qnm_payload["option_list"])

    def test_official_identity_validation_rejects_code_only_and_mismatched_ids(self):
        qlm = self._official_by_code("1.1.1")
        qnm = self._official_by_code("1.2.1")
        working = (
            self.db.query(Metric)
            .filter(
                Metric.code == "1.1.1",
                Metric.catalog_kind == CATALOG_KIND_WORKING,
            )
            .one()
        )
        with api_client() as client:
            headers = self._admin_headers(client)
            cycle, body = self._create_configured_draft(
                client,
                headers,
                [qlm.id, qnm.id],
            )
            kinds = {
                item["metric_id"]: item.get("metric_kind")
                for item in body["applicable_metrics"]
            }
            self.assertEqual(kinds[qlm.id], "QlM")
            self.assertEqual(kinds[qnm.id], "QnM")
            self.assertEqual(body["applicable_metric_count"], 2)
            self.assertNotIn(
                working.id,
                {item["metric_id"] for item in body["applicable_metrics"]},
            )

            unconfigured = client.post(
                "/accreditation-cycles",
                headers=headers,
                json={
                    "institution_id": 1,
                    "name": "Phase 4 unconfigured",
                    "code": f"PHASE4U-{uuid.uuid4().hex[:8]}",
                    "status": "Draft",
                    "framework_id": self.autonomous.id,
                },
            )
            self.assertEqual(unconfigured.status_code, 400, unconfigured.text)
            self.assertEqual(
                unconfigured.json()["detail"],
                "Set the institution's official NAAC category before "
                "creating an official accreditation cycle. A framework is "
                "not selected without it.",
            )

            resolved_id, resolved_code = resolve_submission_metric_for_cycle(
                self.db,
                cycle,
                qlm.id,
                working.code,
            )
            self.assertEqual(resolved_id, qlm.id)
            self.assertEqual(resolved_code, "1.1.1")

            with self.assertRaises(HTTPException) as code_only:
                resolve_submission_metric_for_cycle(
                    self.db,
                    cycle,
                    None,
                    "1.1.1",
                )
            self.assertEqual(code_only.exception.status_code, 400)

            with self.assertRaises(HTTPException) as working_id:
                resolve_submission_metric_for_cycle(
                    self.db,
                    cycle,
                    working.id,
                    working.code,
                )
            self.assertEqual(working_id.exception.status_code, 400)

            with self.assertRaises(HTTPException) as mismatched:
                apply_official_form_payload(
                    self.db,
                    qlm.id,
                    json.dumps({"metric_id": qnm.id, "metric_kind": "QlM"}),
                )
            self.assertEqual(mismatched.exception.status_code, 400)

        self.assertEqual(cycle.status, "Draft")
        with self.assertRaises(Exception):
            assert_cycle_status_allowed(self.autonomous, "Active")

    def test_official_evidence_attaches_by_operational_metric_id(self):
        qlm = self._official_by_code("1.1.1")
        qnm = self._official_by_code("1.2.1")
        coordinator = self.test_coordinator
        section = (
            self.db.query(Section)
            .filter(Section.id == qlm.section_id)
            .one()
        )
        with api_client() as client:
            headers = self._admin_headers(client)
            cycle, _body = self._create_configured_draft(
                client,
                headers,
                [qlm.id, qnm.id],
            )
            qlm_req = client.get(
                "/evidence-requirements",
                headers=headers,
                params={"metric_id": qlm.id},
            )
            self.assertEqual(qlm_req.status_code, 200, qlm_req.text)
            qlm_rows = qlm_req.json()
            self.assertTrue(qlm_rows)
            self.assertEqual(qlm_rows[0]["title"], GENERIC_EVIDENCE_TITLE)
            self.assertEqual(qlm_rows[0]["metric_id"], qlm.id)

            qnm_req = client.get(
                "/evidence-requirements",
                headers=headers,
                params={"metric_id": qnm.id},
            )
            self.assertEqual(qnm_req.status_code, 200)
            self.assertEqual(qnm_req.json()[0]["metric_id"], qnm.id)

            working_list = client.get("/evidence-requirements", headers=headers)
            self.assertEqual(working_list.status_code, 200)
            self.assertEqual(len(working_list.json()), 51)

            payload = build_official_data_json(
                qlm,
                "QlM",
                qualitative_response="Official QlM narrative",
            )
            submission = Submission(
                institution_id=self.test_institution.id,
                cycle_id=cycle.id,
                criterion_id=section.criterion_id,
                user_id=coordinator.id,
                title="Phase 4 official QlM",
                metric_code=qlm.code,
                metric_id=qlm.id,
                status="Draft",
                data_json=payload,
            )
            self.db.add(submission)
            self.db.commit()
            self.db.refresh(submission)
            self.created_submission_ids.append(submission.id)

            parsed = parse_official_data_json(submission.data_json)
            self.assertEqual(parsed["metric_kind"], "QlM")
            self.assertEqual(parsed["metric_id"], qlm.id)

            coord_headers = self._official_coord_headers(client)
            uploaded = client.post(
                "/documents/upload",
                headers=coord_headers,
                files={
                    "file": (
                        "supporting.pdf",
                        b"%PDF-1.4 official evidence",
                        "application/pdf",
                    )
                },
                data={
                    "submission_id": str(submission.id),
                    "title": "QlM supporting document",
                },
            )
            self.assertEqual(uploaded.status_code, 201, uploaded.text)
            document = uploaded.json()
            self.created_document_ids.append(document["id"])
            self.assertEqual(document["submission_id"], submission.id)
            versions = (
                self.db.query(DocumentVersion)
                .filter(DocumentVersion.document_id == document["id"])
                .all()
            )
            self.assertEqual(len(versions), 1)
            self.assertTrue(versions[0].is_current)
            stored = Path(__file__).resolve().parents[1] / document["file_path"].lstrip(
                "/"
            )
            if stored.exists():
                stored.unlink()

        official_evidence = (
            self.db.query(EvidenceRequirement)
            .join(Metric, Metric.id == EvidenceRequirement.metric_id)
            .filter(Metric.catalog_kind == CATALOG_KIND_OFFICIAL)
            .count()
        )
        self.assertEqual(official_evidence, 85)

    def test_official_response_survives_edit_and_identity_stays_on_metric_id(self):
        from app.services.operational_metric_service import (
            resolve_metric_for_submission,
        )
        from app.services.report_service import _submissions_for_applicable_metric

        qlm = self._official_by_code("1.1.1")
        working = (
            self.db.query(Metric)
            .filter(
                Metric.code == "1.1.1",
                Metric.catalog_kind == CATALOG_KIND_WORKING,
            )
            .one()
        )
        coordinator = self.test_coordinator
        section = (
            self.db.query(Section)
            .filter(Section.id == qlm.section_id)
            .one()
        )
        with api_client() as client:
            headers = self._admin_headers(client)
            cycle, _body = self._create_configured_draft(
                client,
                headers,
                [qlm.id],
            )
            submission = Submission(
                institution_id=self.test_institution.id,
                cycle_id=cycle.id,
                criterion_id=section.criterion_id,
                user_id=coordinator.id,
                title="Phase 4.1 official edit",
                metric_code=qlm.code,
                metric_id=qlm.id,
                status="Draft",
                data_json=build_official_data_json(
                    qlm,
                    "QlM",
                    qualitative_response="original narrative",
                ),
            )
            self.db.add(submission)
            self.db.commit()
            self.db.refresh(submission)
            self.created_submission_ids.append(submission.id)

            resolved = resolve_metric_for_submission(self.db, submission)
            self.assertEqual(resolved.id, qlm.id)
            self.assertNotEqual(resolved.id, working.id)
            self.assertEqual(resolved.max_score, qlm.max_score)

            matched = _submissions_for_applicable_metric(
                [submission],
                {
                    "catalog_kind": CATALOG_KIND_OFFICIAL,
                    "metric_id": qlm.id,
                    "metric_code": "1.1.1",
                },
            )
            self.assertEqual([item.id for item in matched], [submission.id])
            code_only_decoy = Submission(
                institution_id=self.test_institution.id,
                cycle_id=cycle.id,
                criterion_id=section.criterion_id,
                user_id=coordinator.id,
                title="code-only decoy",
                metric_code="1.1.1",
                metric_id=None,
                status="Draft",
                data_json='{"notes":"working code match"}',
            )
            ignored = _submissions_for_applicable_metric(
                [submission, code_only_decoy],
                {
                    "catalog_kind": CATALOG_KIND_OFFICIAL,
                    "metric_id": qlm.id,
                    "metric_code": "1.1.1",
                },
            )
            self.assertEqual([item.id for item in ignored], [submission.id])

            coord_headers = self._official_coord_headers(client)
            updated = client.put(
                f"/submissions/{submission.id}",
                headers=coord_headers,
                json={
                    "data_json": build_official_data_json(
                        qlm,
                        "QlM",
                        qualitative_response="edited narrative that must persist",
                    )
                },
            )
            self.assertEqual(updated.status_code, 200, updated.text)
            fetched = client.get(
                f"/submissions/{submission.id}",
                headers=coord_headers,
            )
            self.assertEqual(fetched.status_code, 200, fetched.text)
            persisted = parse_official_data_json(fetched.json()["data_json"])
            self.assertEqual(
                persisted["qualitative_response"],
                "edited narrative that must persist",
            )
            self.assertEqual(persisted["metric_id"], qlm.id)
            self.assertEqual(persisted["metric_kind"], "QlM")
            self.assertEqual(fetched.json()["metric_id"], qlm.id)

    def test_legacy_working_submission_and_preservation(self):
        before_submissions = self.db.query(Submission).count()
        self.assertEqual(before_submissions, 44)
        working_one = (
            self.db.query(Metric)
            .filter(
                Metric.code == "1.1.1",
                Metric.catalog_kind == CATALOG_KIND_WORKING,
            )
            .one()
        )
        working_section = (
            self.db.query(Section)
            .filter(Section.id == working_one.section_id)
            .one()
        )
        with api_client() as client:
            headers = self._coord_headers(client)
            created = client.post(
                "/submissions",
                headers=headers,
                json={
                    "title": "Phase 4 legacy working notes",
                    "criterion_id": working_section.criterion_id,
                    "metric_code": working_one.code,
                    "metric_id": working_one.id,
                    "data_json": json.dumps(
                        {
                            "notes": "working catalogue notes",
                            "metric_code": "1.1.1",
                            "metric_id": 1,
                        }
                    ),
                },
            )
            self.assertEqual(created.status_code, 201, created.text)
            body = created.json()
            self.created_submission_ids.append(body["id"])
            self.assertEqual(body["cycle_id"], 10)
            self.assertIsNone(body["metric_id"])
            self.assertEqual(body["metric_code"], "1.1.1")
            stored = json.loads(body["data_json"])
            self.assertEqual(stored.get("notes"), "working catalogue notes")
            self.assertNotEqual(stored.get("form_kind"), "OFFICIAL")

        cycle_10 = (
            self.db.query(AccreditationCycle)
            .filter(AccreditationCycle.id == 10)
            .one()
        )
        cycle_11 = (
            self.db.query(AccreditationCycle)
            .filter(AccreditationCycle.id == 11)
            .one()
        )
        self.assertIsNone(cycle_10.framework_id)
        self.assertIsNone(cycle_11.framework_id)
        self.assertEqual(cycle_10.status, "Active")
        self.assertEqual(cycle_11.status, "Completed")
        historical = (
            self.db.query(Submission)
            .filter(~Submission.id.in_(self.created_submission_ids or [0]))
            .all()
        )
        self.assertEqual(len(historical), 44)
        self.assertTrue(all(item.metric_id is None for item in historical))
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
            self.db.query(Metric)
            .filter(Metric.catalog_kind == CATALOG_KIND_OFFICIAL)
            .count(),
            85,
        )
        self.assertEqual(
            self.db.query(FrameworkMetric)
            .filter(FrameworkMetric.maps_to_metric_id.isnot(None))
            .count(),
            0,
        )
        applicability = (
            self.db.query(CycleApplicableMetric)
            .filter(CycleApplicableMetric.cycle_id.in_([10, 11]))
            .count()
        )
        self.assertEqual(applicability, 6)
        self.assertFalse(self.autonomous.allows_production_cycles)
        with self.assertRaises(Exception):
            assert_cycle_status_allowed(self.autonomous, "Active")
