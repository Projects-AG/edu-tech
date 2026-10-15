import asyncio
import unittest
from contextlib import contextmanager
from types import SimpleNamespace

import httpx

from app.db.database import SessionLocal
from app.main import app
from app.models import NaacFramework
from app.services.framework_service import (
    assert_confirmable_framework,
    assert_cycle_framework_not_rewritten,
    assert_cycle_status_allowed,
    assert_production_framework,
    ensure_naac_frameworks,
    framework_readiness,
    official_mapped_metric_rows,
    resolve_recommendation,
)
from app.services.naac_framework_catalog import (
    ANNOUNCED_NOT_OPERATIVE,
    CATALOGUE_INCOMPLETE,
    CODE_BINARY,
    CODE_INTERNAL,
    CODE_MBGL,
    CODE_RAF_AFFILIATED,
    CODE_RAF_AUTONOMOUS,
    CODE_RAF_OPEN_UNIVERSITY,
    CODE_RAF_UNIVERSITY,
    FRAMEWORK_DEFINITIONS,
    PENDING_FRAMEWORK_VERIFICATION,
    RECOMMENDATION_VERIFIED,
    SEVEN_CRITERIA,
)


class _SyncASGIClient:
    """Sync wrapper around httpx.AsyncClient + ASGITransport.

    Starlette TestClient is unused: this environment's Starlette wants httpx2,
    which is not a project dependency. httpx 0.28.1 ASGITransport is async-only.
    """

    def request(self, method, url, **kwargs):
        async def _send():
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(
                transport=transport,
                base_url="http://test",
            ) as client:
                return await client.request(method, url, **kwargs)

        return asyncio.run(_send())

    def get(self, url, **kwargs):
        return self.request("GET", url, **kwargs)

    def post(self, url, **kwargs):
        return self.request("POST", url, **kwargs)

    def put(self, url, **kwargs):
        return self.request("PUT", url, **kwargs)

    def delete(self, url, **kwargs):
        return self.request("DELETE", url, **kwargs)


@contextmanager
def api_client():
    yield _SyncASGIClient()


class RecommendationRulesTests(unittest.TestCase):
    def test_university_maps_to_raf_university(self):
        result = resolve_recommendation({"official_category": "UNIVERSITY"})
        self.assertEqual(result["status"], RECOMMENDATION_VERIFIED)
        self.assertEqual(result["code"], CODE_RAF_UNIVERSITY)

    def test_autonomous_college_maps_to_autonomous_manual(self):
        result = resolve_recommendation(
            {"official_category": "AUTONOMOUS_COLLEGE"}
        )
        self.assertEqual(result["code"], CODE_RAF_AUTONOMOUS)

    def test_affiliated_without_university_is_pending(self):
        result = resolve_recommendation(
            {"official_category": "AFFILIATED_COLLEGE"}
        )
        self.assertEqual(result["status"], PENDING_FRAMEWORK_VERIFICATION)
        self.assertIsNone(result["code"])

    def test_affiliated_with_university_is_verified_family(self):
        result = resolve_recommendation({
            "official_category": "AFFILIATED_COLLEGE",
            "affiliated_university": "Savitribai Phule Pune University",
            "programme_level": "UG",
        })
        self.assertEqual(result["code"], CODE_RAF_AFFILIATED)

    def test_affiliated_with_autonomy_uses_autonomous_manual(self):
        result = resolve_recommendation({
            "official_category": "AFFILIATED_COLLEGE",
            "affiliated_university": "SPPU",
            "autonomous_status": "autonomous",
        })
        self.assertEqual(result["code"], CODE_RAF_AUTONOMOUS)

    def test_constituent_without_parent_is_pending(self):
        result = resolve_recommendation({
            "official_category": "CONSTITUENT_COLLEGE",
        })
        self.assertEqual(result["status"], PENDING_FRAMEWORK_VERIFICATION)

    def test_constituent_with_parent_uses_affiliated_family(self):
        result = resolve_recommendation({
            "official_category": "CONSTITUENT_COLLEGE",
            "parent_institution_name": "Example University",
            "is_constituent_unit": True,
        })
        self.assertEqual(result["code"], CODE_RAF_AFFILIATED)

    def test_open_university_uses_odl_manual(self):
        result = resolve_recommendation({
            "official_category": "OPEN_UNIVERSITY",
        })
        self.assertEqual(result["code"], CODE_RAF_OPEN_UNIVERSITY)

    def test_other_and_blank_are_pending(self):
        self.assertEqual(
            resolve_recommendation({"official_category": "OTHER"})["status"],
            PENDING_FRAMEWORK_VERIFICATION,
        )
        self.assertEqual(
            resolve_recommendation({})["status"],
            PENDING_FRAMEWORK_VERIFICATION,
        )


class CatalogueSafetyTests(unittest.TestCase):
    def test_binary_and_mbgl_are_not_production(self):
        by_code = {item["code"]: item for item in FRAMEWORK_DEFINITIONS}
        self.assertFalse(by_code[CODE_BINARY]["allows_production_cycles"])
        self.assertFalse(by_code[CODE_MBGL]["allows_production_cycles"])
        self.assertEqual(
            by_code[CODE_BINARY]["verification_status"],
            ANNOUNCED_NOT_OPERATIVE,
        )

    def test_official_raf_is_not_production_without_metrics(self):
        by_code = {item["code"]: item for item in FRAMEWORK_DEFINITIONS}
        for code in (
            CODE_RAF_UNIVERSITY,
            CODE_RAF_AUTONOMOUS,
            CODE_RAF_AFFILIATED,
            CODE_RAF_OPEN_UNIVERSITY,
        ):
            self.assertFalse(by_code[code]["allows_production_cycles"])

    def test_seven_criteria_names_are_official(self):
        titles = [item[1] for item in SEVEN_CRITERIA]
        self.assertEqual(titles[0], "Curricular Aspects")
        self.assertEqual(len(titles), 7)

    def test_no_invented_official_metric_rows_in_definitions(self):
        for item in FRAMEWORK_DEFINITIONS:
            self.assertNotIn("metrics", item)


class PublicApiTests(unittest.TestCase):
    def test_public_categories_do_not_require_login(self):
        with api_client() as client:
            response = client.get("/public/institution-categories")
        self.assertEqual(response.status_code, 200)
        codes = {item["code"] for item in response.json()}
        self.assertIn("UNIVERSITY", codes)

    def test_public_recommendation_university_is_criteria_only(self):
        with api_client() as client:
            response = client.post(
                "/public/framework-recommendation",
                json={"official_category": "UNIVERSITY"},
            )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["recommendation_status"], "VERIFIED")
        self.assertEqual(data["recommended_framework"]["code"], CODE_RAF_UNIVERSITY)
        self.assertTrue(data["criterion_structure_verified"])
        self.assertFalse(data["metric_catalogue_complete"])
        self.assertFalse(data["allows_production_cycles"])
        self.assertEqual(data["catalogue_status"], CATALOGUE_INCOMPLETE)

    def test_public_recommendation_other_is_pending(self):
        with api_client() as client:
            response = client.post(
                "/public/framework-recommendation",
                json={"official_category": "OTHER"},
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["recommendation_status"],
            PENDING_FRAMEWORK_VERIFICATION,
        )

    def test_public_affiliated_autonomous_uses_autonomous_family(self):
        with api_client() as client:
            response = client.post(
                "/public/framework-recommendation",
                json={
                    "official_category": "AFFILIATED_COLLEGE",
                    "affiliated_university": "SPPU",
                    "autonomous_status": "autonomous",
                },
            )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["recommendation_status"], "VERIFIED")
        self.assertEqual(
            data["recommended_framework"]["code"],
            CODE_RAF_AUTONOMOUS,
        )
        self.assertTrue(data["metric_catalogue_complete"])
        self.assertFalse(data["allows_production_cycles"])

    def test_public_constituent_without_parent_is_pending(self):
        with api_client() as client:
            response = client.post(
                "/public/framework-recommendation",
                json={"official_category": "CONSTITUENT_COLLEGE"},
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["recommendation_status"],
            PENDING_FRAMEWORK_VERIFICATION,
        )

    def test_privileged_endpoints_require_auth(self):
        with api_client() as client:
            frameworks = client.get("/naac-frameworks")
            requests = client.get("/institution-requests")
            cycles = client.post(
                "/accreditation-cycles",
                json={
                    "institution_id": 1,
                    "name": "Should Fail",
                    "code": "SHOULD-FAIL",
                },
            )
            reports = client.get("/reports/summary")
        self.assertIn(frameworks.status_code, {401, 403})
        self.assertIn(requests.status_code, {401, 403})
        self.assertIn(cycles.status_code, {401, 403})
        self.assertIn(reports.status_code, {401, 403})


class ProductionReadinessTests(unittest.TestCase):
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

    def test_raf_university_is_confirmable_but_not_production(self):
        framework = self._framework(CODE_RAF_UNIVERSITY)
        readiness = framework_readiness(self.db, framework)
        self.assertTrue(readiness["criterion_structure_verified"])
        self.assertFalse(readiness["metric_catalogue_complete"])
        self.assertEqual(readiness["metric_row_count"], 0)
        self.assertFalse(readiness["allows_production_cycles"])
        assert_confirmable_framework(framework)
        with self.assertRaises(Exception) as raised:
            assert_production_framework(self.db, framework)
        self.assertIn("incomplete", str(raised.exception.detail).lower())

    def test_no_official_metrics_are_mapped(self):
        framework = self._framework(CODE_RAF_UNIVERSITY)
        self.assertEqual(official_mapped_metric_rows(self.db, framework), [])

    def test_incomplete_framework_cannot_go_active(self):
        framework = self._framework(CODE_RAF_UNIVERSITY)
        with self.assertRaises(Exception):
            assert_cycle_status_allowed(self.db, framework, "Active")
        assert_cycle_status_allowed(self.db, framework, "Draft")

    def test_binary_is_not_confirmable(self):
        framework = self._framework(CODE_BINARY)
        with self.assertRaises(Exception):
            assert_confirmable_framework(framework)

    def test_internal_catalogue_is_not_confirmable(self):
        framework = self._framework(CODE_INTERNAL)
        with self.assertRaises(Exception):
            assert_confirmable_framework(framework)
        readiness = framework_readiness(self.db, framework)
        self.assertFalse(readiness["confirmable"])
        self.assertFalse(readiness["metric_catalogue_complete"])
        self.assertFalse(readiness["allows_production_cycles"])
        with self.assertRaises(Exception):
            assert_production_framework(self.db, framework)

    def test_historical_cycle_framework_cannot_be_backfilled(self):
        cycle = SimpleNamespace(framework_id=None)
        with self.assertRaises(Exception) as raised:
            assert_cycle_framework_not_rewritten(cycle, 1)
        self.assertIn("backfill", str(raised.exception.detail).lower())
        assert_cycle_framework_not_rewritten(cycle, None)


def _login(client, email, password, role):
    return client.post(
        "/auth/login",
        json={"email": email, "password": password, "role": role},
    )


class ExistingWorkflowReadTests(unittest.TestCase):
    def test_coordinator_can_read_institution_scoped_cycle_and_report(self):
        with api_client() as client:
            login = _login(
                client,
                "coordinator@test.com",
                "Coordinator@123",
                "NAAC Coordinator",
            )
            if login.status_code != 200:
                self.skipTest("seed coordinator login is not available")
            token = login.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            cycles = client.get("/accreditation-cycles", headers=headers)
            reports = client.get("/reports/summary", headers=headers)
            submissions = client.get("/submissions", headers=headers)
            profile = client.get("/institutions/me", headers=headers)
            frameworks = client.get("/naac-frameworks", headers=headers)
            applicable = client.get(
                "/accreditation-cycles/10/applicable-metrics",
                headers=headers,
            )
        self.assertEqual(cycles.status_code, 200)
        self.assertEqual(reports.status_code, 200)
        self.assertEqual(submissions.status_code, 200)
        self.assertEqual(profile.status_code, 200)
        self.assertEqual(frameworks.status_code, 200)
        self.assertEqual(applicable.status_code, 200)
        self.assertIsNone(applicable.json().get("framework_id"))
        self.assertIn("uses_catalog_fallback", applicable.json())
        for cycle in cycles.json():
            if cycle["id"] in (10, 11):
                self.assertIsNone(cycle.get("framework_id"))
        summary = reports.json()
        self.assertIn("institution_funnel", summary)
        self.assertIn("cycle_funnel", summary)
        for item in frameworks.json():
            if item["code"] in {
                CODE_RAF_UNIVERSITY,
                CODE_RAF_AUTONOMOUS,
                CODE_RAF_AFFILIATED,
                CODE_RAF_OPEN_UNIVERSITY,
            }:
                self.assertFalse(item["allows_production_cycles"])
                self.assertTrue(item["confirmable"])
                self.assertEqual(len(item.get("criteria") or []), 7)
                if item["code"] == CODE_RAF_AUTONOMOUS:
                    self.assertTrue(item["metric_catalogue_complete"])
                    self.assertEqual(item["metric_row_count"], 85)
                else:
                    self.assertFalse(item["metric_catalogue_complete"])

    def test_reviewer_and_principal_read_own_institution_only(self):
        with api_client() as client:
            reviewer_login = _login(
                client,
                "reviewer@accreditation.org",
                "password123",
                "Reviewer",
            )
            director_login = _login(
                client,
                "director@university.edu",
                "password123",
                "Principal / Director",
            )
            approver_login = _login(
                client,
                "approver@university.edu",
                "password123",
                "Data Approver",
            )
            if reviewer_login.status_code != 200:
                self.skipTest("seed reviewer login is not available")
            if director_login.status_code != 200:
                self.skipTest("seed principal login is not available")
            if approver_login.status_code != 200:
                self.skipTest("seed data-approver login is not available")
            reviewer_headers = {
                "Authorization": f"Bearer {reviewer_login.json()['access_token']}"
            }
            director_headers = {
                "Authorization": f"Bearer {director_login.json()['access_token']}"
            }
            reviewer_dash = client.get(
                "/reviewer/dashboard",
                headers=reviewer_headers,
            )
            director_dash = client.get(
                "/principal/dashboard",
                headers=director_headers,
            )
            approver_headers = {
                "Authorization": f"Bearer {approver_login.json()['access_token']}"
            }
            approver_subs = client.get(
                "/submissions",
                headers=approver_headers,
            )
            reviewer_requests = client.get(
                "/institution-requests",
                headers=reviewer_headers,
            )
            public_override = client.post(
                "/institution-requests/1/approve",
                json={"confirmed_framework_id": 1, "override_reason": "no"},
            )
        self.assertEqual(reviewer_dash.status_code, 200)
        self.assertEqual(director_dash.status_code, 200)
        self.assertEqual(approver_subs.status_code, 200)
        self.assertIn(reviewer_requests.status_code, {401, 403})
        self.assertIn(public_override.status_code, {401, 403, 404, 405})


if __name__ == "__main__":
    unittest.main()
