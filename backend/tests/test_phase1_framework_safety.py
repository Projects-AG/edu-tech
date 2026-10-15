"""Database-free Phase 1 safety tests.

No test here opens a database session: every session is a stand-in that
fails on any query or write, and framework lookups are patched.
"""

import asyncio
import inspect
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import httpx
from fastapi import HTTPException
from pydantic import ValidationError

from app.auth.dependencies import get_db
from app.institution_request import routes as institution_request_routes
from app.main import app
from app.models.accreditation_cycle import AccreditationCycle
from app.naac_framework import routes as naac_framework_routes
from app.report import routes as report_routes
from app.schemas.institution_request import InstitutionRequestCreate
from app.schemas.naac_framework import FrameworkRecommendationRequest
from app.services import framework_service
from app.services import report_service
from app.services.framework_service import (
    INSTITUTION_FRAMEWORK_MISMATCH_MESSAGE,
    assert_cycle_institution_reassignment,
    assert_framework_matches_institution,
    assert_institution_update_consistent,
    eligible_cycle_framework_id,
    recommend_framework,
    resolve_cycle_framework,
    resolve_recommendation,
    sanitize_profile_for_category,
)
from app.services.naac_framework_catalog import (
    ANNOUNCED_NOT_OPERATIVE,
    CODE_BINARY,
    CODE_INTERNAL,
    CODE_MBGL,
    CODE_RAF_AFFILIATED,
    CODE_RAF_AUTONOMOUS,
    CODE_RAF_UNIVERSITY,
    OFFICIAL_CATEGORY_CODES,
    PENDING_FRAMEWORK_VERIFICATION,
    RECOMMENDATION_VERIFIED,
    VERIFIED,
    normalize_official_category,
)
from app.submission import routes as submission_routes


RECOMMENDATION_KEYS = {
    "recommendation_status",
    "recommended_framework_id",
    "recommended_framework",
    "recommendation_reason",
    "allows_production_cycles",
    "criterion_structure_verified",
    "metric_catalogue_complete",
    "metric_rules_verified",
    "catalogue_status",
}


class NoDatabaseSession:
    """Session stand-in that fails on any query or write."""

    def __init__(self):
        self.rollbacks = 0
        self.closed = False

    def _forbidden(self, *args, **kwargs):
        raise AssertionError("Database access is not allowed in this test")

    query = add = add_all = flush = commit = delete = merge = refresh = _forbidden
    execute = _forbidden

    def rollback(self):
        self.rollbacks += 1

    def close(self):
        self.closed = True


def framework(
    framework_id,
    code,
    verification_status=VERIFIED,
    uses_seven_criteria=True,
):
    return SimpleNamespace(
        id=framework_id,
        code=code,
        version=framework_service.catalogue_version(code),
        verification_status=verification_status,
        uses_seven_criteria=uses_seven_criteria,
    )


AUTONOMOUS = framework(3, CODE_RAF_AUTONOMOUS)
UNIVERSITY = framework(2, CODE_RAF_UNIVERSITY)
INTERNAL = framework(1, CODE_INTERNAL)
BINARY = framework(6, CODE_BINARY, verification_status=ANNOUNCED_NOT_OPERATIVE)


def serialized(fw):
    return {
        "id": fw.id,
        "code": fw.code,
        "name": f"Framework {fw.code}",
        "version": "2023-07-11",
        "pathway_type": "RAF",
        "institution_category": "AUTONOMOUS_COLLEGE",
        "verification_status": fw.verification_status,
        "status": "ACTIVE",
        "allows_production_cycles": False,
        "criterion_structure_verified": True,
        "metric_catalogue_complete": True,
        "metric_row_count": 85,
        "metric_rules_verified": False,
        "confirmable": True,
        "catalogue_status": "CATALOGUE_INCOMPLETE",
        "uses_seven_criteria": True,
        "official_metric_count": 85,
        "criteria": [],
    }


def seeding_forbidden(*args, **kwargs):
    raise AssertionError("Framework seeding is not allowed on this path")


def lookup_patches(found=AUTONOMOUS):
    return (
        patch.object(
            framework_service,
            "get_framework_by_code",
            side_effect=lambda db, code: found if found and found.code == code else None,
        ),
        patch.object(
            framework_service,
            "serialize_framework_with_criteria",
            side_effect=lambda db, fw: serialized(fw),
        ),
        patch.object(
            framework_service,
            "ensure_naac_frameworks",
            side_effect=seeding_forbidden,
        ),
    )


class ReadOnlyRecommendationTests(unittest.TestCase):
    def test_recommend_framework_does_not_seed(self):
        lookup, serialize, ensure = lookup_patches()
        with lookup, serialize, ensure as ensure_mock:
            recommend_framework(
                NoDatabaseSession(),
                {"official_category": "AUTONOMOUS_COLLEGE"},
            )
        ensure_mock.assert_not_called()

    def test_recommend_framework_never_writes(self):
        session = NoDatabaseSession()
        lookup, serialize, ensure = lookup_patches()
        with lookup, serialize, ensure:
            result = recommend_framework(
                session,
                {"official_category": "AUTONOMOUS_COLLEGE"},
            )
        self.assertEqual(result["recommendation_status"], RECOMMENDATION_VERIFIED)
        self.assertEqual(result["recommended_framework_id"], AUTONOMOUS.id)
        self.assertFalse(result["metric_rules_verified"])
        self.assertEqual(set(result), RECOMMENDATION_KEYS)

    def test_public_recommendation_route_does_not_commit(self):
        session = NoDatabaseSession()
        lookup, serialize, ensure = lookup_patches()
        with lookup, serialize, ensure:
            result = naac_framework_routes.public_framework_recommendation(
                FrameworkRecommendationRequest(
                    official_category="AUTONOMOUS_COLLEGE"
                ),
                db=session,
            )
        self.assertEqual(result["recommended_framework_id"], AUTONOMOUS.id)
        self.assertEqual(session.rollbacks, 1)
        source = inspect.getsource(
            naac_framework_routes.public_framework_recommendation
        )
        self.assertNotIn("ensure_naac_frameworks", source)
        self.assertNotIn("commit", source)

    def test_public_recommendation_http_contract_unchanged(self):
        session = NoDatabaseSession()

        def override_get_db():
            yield session

        async def post(payload):
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(
                transport=transport,
                base_url="http://test",
            ) as client:
                return await client.post(
                    "/public/framework-recommendation",
                    json=payload,
                )

        lookup, serialize, ensure = lookup_patches()
        app.dependency_overrides[get_db] = override_get_db
        try:
            with lookup, serialize, ensure:
                ok = asyncio.run(post({"official_category": "AUTONOMOUS_COLLEGE"}))
                pending = asyncio.run(post({"official_category": "OTHER"}))
                invalid = asyncio.run(post({"official_category": "BINARY"}))
        finally:
            app.dependency_overrides.pop(get_db, None)

        self.assertEqual(ok.status_code, 200)
        body = ok.json()
        self.assertEqual(set(body), RECOMMENDATION_KEYS)
        self.assertEqual(body["recommendation_status"], RECOMMENDATION_VERIFIED)
        self.assertEqual(body["recommended_framework"]["code"], CODE_RAF_AUTONOMOUS)
        self.assertFalse(body["metric_rules_verified"])
        self.assertEqual(pending.status_code, 200)
        self.assertEqual(
            pending.json()["recommendation_status"],
            PENDING_FRAMEWORK_VERIFICATION,
        )
        self.assertEqual(invalid.status_code, 422)
        self.assertGreaterEqual(session.rollbacks, 2)

    def test_missing_framework_returns_pending_not_seed(self):
        lookup, serialize, ensure = lookup_patches(found=None)
        with lookup, serialize, ensure as ensure_mock:
            result = recommend_framework(
                NoDatabaseSession(),
                {"official_category": "UNIVERSITY"},
            )
        ensure_mock.assert_not_called()
        self.assertEqual(
            result["recommendation_status"],
            PENDING_FRAMEWORK_VERIFICATION,
        )
        self.assertIsNone(result["recommended_framework_id"])
        self.assertEqual(set(result), RECOMMENDATION_KEYS)

    def test_institution_request_create_does_not_seed(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        request = InstitutionRequestCreate(
            requester_name="Phase One",
            requester_email="phase1@example.com",
            institution_name="Phase One Autonomous College",
            official_category="autonomous_college",
            parent_institution_name="Stale Parent",
            is_constituent_unit=True,
            autonomous_status="autonomous",
        )
        lookup, serialize, ensure = lookup_patches()
        with lookup, serialize, ensure as ensure_mock, patch.object(
            institution_request_routes,
            "ensure_naac_frameworks",
            side_effect=seeding_forbidden,
        ) as route_ensure, patch.object(
            institution_request_routes,
            "serialize_institution_request",
            side_effect=lambda db, item: item,
        ):
            created = institution_request_routes.create_institution_request(
                request,
                db=db,
            )
        ensure_mock.assert_not_called()
        route_ensure.assert_not_called()
        db.add.assert_called_once()
        self.assertEqual(created.official_category, "AUTONOMOUS_COLLEGE")
        self.assertIsNone(created.parent_institution_name)
        self.assertIsNone(created.is_constituent_unit)
        self.assertIsNone(created.autonomous_status)
        self.assertEqual(created.recommended_framework_id, AUTONOMOUS.id)


class CategoryValidationTests(unittest.TestCase):
    def test_normalises_supported_codes(self):
        self.assertEqual(normalize_official_category(" university "), "UNIVERSITY")
        self.assertIsNone(normalize_official_category(None))
        self.assertIsNone(normalize_official_category("  "))

    def test_rejects_unsupported_or_missing_codes(self):
        for value in ("BINARY", "MBGL", "COLLEGE", "INTERNAL"):
            with self.assertRaises(ValueError):
                normalize_official_category(value)
        with self.assertRaises(ValueError):
            normalize_official_category("", required=True)
        with self.assertRaises(ValueError):
            normalize_official_category(5)

    def test_institution_request_requires_category(self):
        base = {
            "requester_name": "Phase One",
            "requester_email": "phase1@example.com",
            "institution_name": "Phase One College",
        }
        with self.assertRaises(ValidationError):
            InstitutionRequestCreate(**base)
        with self.assertRaises(ValidationError):
            InstitutionRequestCreate(**base, official_category="")
        with self.assertRaises(ValidationError):
            InstitutionRequestCreate(**base, official_category="BINARY")
        ok = InstitutionRequestCreate(**base, official_category="open_university")
        self.assertEqual(ok.official_category, "OPEN_UNIVERSITY")

    def test_recommendation_request_rejects_unsupported_category(self):
        with self.assertRaises(ValidationError):
            FrameworkRecommendationRequest(official_category="NOT_A_CATEGORY")
        self.assertIsNone(FrameworkRecommendationRequest().official_category)


class CategoryMappingTests(unittest.TestCase):
    def test_stale_constituent_fields_do_not_change_other_categories(self):
        result = resolve_recommendation({
            "official_category": "UNIVERSITY",
            "parent_institution_name": "Stale Parent",
            "is_constituent_unit": True,
            "autonomous_status": "autonomous",
        })
        self.assertEqual(result["code"], CODE_RAF_UNIVERSITY)

    def test_constituent_flag_alone_does_not_make_affiliated_constituent(self):
        result = resolve_recommendation({
            "official_category": "AFFILIATED_COLLEGE",
            "parent_institution_name": "Stale Parent",
            "is_constituent_unit": True,
        })
        self.assertEqual(result["status"], PENDING_FRAMEWORK_VERIFICATION)

    def test_stale_autonomy_does_not_affect_constituent(self):
        result = resolve_recommendation({
            "official_category": "CONSTITUENT_COLLEGE",
            "parent_institution_name": "Parent University",
            "autonomous_status": "autonomous",
        })
        self.assertEqual(result["code"], CODE_RAF_AFFILIATED)

    def test_sanitize_clears_non_applicable_fields(self):
        cleaned = sanitize_profile_for_category({
            "official_category": "autonomous_college",
            "affiliated_university": "Old University",
            "parent_institution_name": "Old Parent",
            "is_constituent_unit": True,
            "programme_level": "UG",
        })
        self.assertEqual(cleaned["official_category"], "AUTONOMOUS_COLLEGE")
        for field in (
            "affiliated_university",
            "parent_institution_name",
            "is_constituent_unit",
            "programme_level",
        ):
            self.assertIsNone(cleaned[field], field)

    def test_no_category_maps_to_internal_or_announced_frameworks(self):
        extras = [
            {},
            {"affiliated_university": "U", "parent_institution_name": "P"},
            {"autonomous_status": "autonomous", "affiliated_university": "U"},
        ]
        for category in sorted(OFFICIAL_CATEGORY_CODES):
            for extra in extras:
                code = resolve_recommendation(
                    {"official_category": category, **extra}
                )["code"]
                self.assertNotIn(code, {CODE_INTERNAL, CODE_BINARY, CODE_MBGL})


def institution(**fields):
    return SimpleNamespace(**fields)


class FrameworkMatchTests(unittest.TestCase):
    def assert_rejected(self, inst, fw):
        with self.assertRaises(HTTPException) as caught:
            assert_framework_matches_institution(inst, fw)
        self.assertEqual(caught.exception.status_code, 400)

    def test_confirmed_framework_must_match(self):
        inst = institution(
            confirmed_framework_id=AUTONOMOUS.id,
            official_category="AUTONOMOUS_COLLEGE",
        )
        assert_framework_matches_institution(inst, AUTONOMOUS)
        self.assert_rejected(inst, UNIVERSITY)

    def test_confirmed_framework_cannot_contradict_category(self):
        inst = institution(
            confirmed_framework_id=AUTONOMOUS.id,
            official_category="UNIVERSITY",
        )
        self.assert_rejected(inst, AUTONOMOUS)

    def test_category_only_institution_uses_mapping(self):
        inst = institution(official_category="UNIVERSITY")
        assert_framework_matches_institution(inst, UNIVERSITY)
        self.assert_rejected(inst, AUTONOMOUS)

    def test_pending_category_rejects_every_framework(self):
        inst = institution(official_category="AFFILIATED_COLLEGE")
        self.assert_rejected(inst, AUTONOMOUS)
        self.assert_rejected(inst, framework(4, CODE_RAF_AFFILIATED))

    def test_institution_without_category_rejects_every_framework(self):
        inst = institution()
        self.assert_rejected(inst, AUTONOMOUS)
        self.assert_rejected(inst, UNIVERSITY)

    def test_eligible_cycle_framework_follows_category(self):
        with patch.object(
            framework_service,
            "get_framework_by_code",
            side_effect=lambda db, code: UNIVERSITY if code == CODE_RAF_UNIVERSITY else None,
        ):
            db = NoDatabaseSession()
            self.assertEqual(
                eligible_cycle_framework_id(
                    db, institution(official_category="UNIVERSITY")
                ),
                UNIVERSITY.id,
            )
            self.assertIsNone(eligible_cycle_framework_id(db, institution()))
            self.assertIsNone(
                eligible_cycle_framework_id(
                    db, institution(official_category="OTHER")
                )
            )


class ResolveCycleFrameworkTests(unittest.TestCase):
    def resolve(self, inst, requested_id, found):
        with patch.object(
            framework_service, "ensure_naac_frameworks", return_value=[]
        ), patch.object(
            framework_service, "get_framework_or_404", return_value=found
        ):
            return resolve_cycle_framework(NoDatabaseSession(), inst, requested_id)

    def test_missing_framework_is_rejected(self):
        for requested in (None, 0):
            with self.assertRaises(HTTPException) as caught:
                self.resolve(institution(official_category="UNIVERSITY"), requested, UNIVERSITY)
            self.assertEqual(caught.exception.status_code, 400)

    def test_mismatched_framework_is_rejected(self):
        with self.assertRaises(HTTPException):
            self.resolve(
                institution(official_category="UNIVERSITY"),
                AUTONOMOUS.id,
                AUTONOMOUS,
            )

    def test_internal_and_announced_frameworks_are_rejected(self):
        for fw in (INTERNAL, BINARY):
            with self.assertRaises(HTTPException):
                self.resolve(
                    institution(official_category="UNIVERSITY"),
                    fw.id,
                    fw,
                )

    def test_matching_framework_is_returned(self):
        self.assertIs(
            self.resolve(
                institution(official_category="UNIVERSITY"),
                UNIVERSITY.id,
                UNIVERSITY,
            ),
            UNIVERSITY,
        )


FRAMEWORKS_BY_ID = {
    fw.id: fw for fw in (INTERNAL, UNIVERSITY, AUTONOMOUS, BINARY)
}


def patched_framework_lookup():
    def lookup(db, framework_id):
        if framework_id not in FRAMEWORKS_BY_ID:
            raise HTTPException(status_code=404, detail="NAAC framework not found")
        return FRAMEWORKS_BY_ID[framework_id]

    return patch.object(framework_service, "get_framework_or_404", side_effect=lookup)


class CycleReassignmentTests(unittest.TestCase):
    def check(self, cycle, destination):
        with patched_framework_lookup() as lookup:
            assert_cycle_institution_reassignment(
                NoDatabaseSession(), cycle, destination
            )
        return lookup

    def assert_rejected(self, cycle, destination):
        with self.assertRaises(HTTPException) as caught:
            self.check(cycle, destination)
        self.assertEqual(caught.exception.status_code, 400)

    def test_same_institution_is_a_no_op(self):
        legacy = SimpleNamespace(institution_id=1, framework_id=None)
        lookup = self.check(legacy, institution(id=1))
        lookup.assert_not_called()

    def test_legacy_cycle_without_framework_cannot_move(self):
        legacy = SimpleNamespace(institution_id=1, framework_id=None)
        self.assert_rejected(
            legacy, institution(id=2, official_category="UNIVERSITY")
        )

    def test_internal_and_announced_cycles_cannot_move(self):
        for fw in (INTERNAL, BINARY):
            cycle = SimpleNamespace(institution_id=1, framework_id=fw.id)
            self.assert_rejected(
                cycle, institution(id=2, official_category="UNIVERSITY")
            )

    def test_destination_category_mismatch_is_rejected(self):
        cycle = SimpleNamespace(institution_id=1, framework_id=AUTONOMOUS.id)
        self.assert_rejected(
            cycle, institution(id=2, official_category="UNIVERSITY")
        )

    def test_destination_confirmed_framework_mismatch_is_rejected(self):
        cycle = SimpleNamespace(institution_id=1, framework_id=AUTONOMOUS.id)
        self.assert_rejected(
            cycle,
            institution(
                id=2,
                official_category="AUTONOMOUS_COLLEGE",
                confirmed_framework_id=UNIVERSITY.id,
            ),
        )

    def test_destination_without_category_is_rejected(self):
        cycle = SimpleNamespace(institution_id=1, framework_id=AUTONOMOUS.id)
        self.assert_rejected(cycle, institution(id=2))

    def test_matching_destination_is_allowed(self):
        cycle = SimpleNamespace(institution_id=1, framework_id=AUTONOMOUS.id)
        self.check(
            cycle,
            institution(
                id=2,
                official_category="AUTONOMOUS_COLLEGE",
                confirmed_framework_id=AUTONOMOUS.id,
            ),
        )
        self.check(cycle, institution(id=3, official_category="AUTONOMOUS_COLLEGE"))


class InstitutionUpdateConsistencyTests(unittest.TestCase):
    def check(self, inst, update_data):
        with patched_framework_lookup() as lookup:
            assert_institution_update_consistent(
                NoDatabaseSession(), inst, update_data
            )
        return lookup

    def assert_rejected(self, inst, update_data):
        with self.assertRaises(HTTPException) as caught:
            self.check(inst, update_data)
        self.assertEqual(caught.exception.status_code, 400)
        return caught.exception

    def confirmed_autonomous(self):
        return institution(
            id=5,
            official_category="AUTONOMOUS_COLLEGE",
            confirmed_framework_id=AUTONOMOUS.id,
        )

    def test_unchanged_values_skip_the_check(self):
        inst = self.confirmed_autonomous()
        lookup = self.check(
            inst,
            {
                "official_category": "AUTONOMOUS_COLLEGE",
                "confirmed_framework_id": AUTONOMOUS.id,
                "city": "Pune",
            },
        )
        lookup.assert_not_called()

    def test_category_change_contradicting_confirmed_framework_is_rejected(self):
        error = self.assert_rejected(
            self.confirmed_autonomous(),
            {"official_category": "UNIVERSITY"},
        )
        self.assertEqual(error.detail, INSTITUTION_FRAMEWORK_MISMATCH_MESSAGE)

    def test_category_change_to_pending_mapping_is_rejected(self):
        self.assert_rejected(
            self.confirmed_autonomous(),
            {"official_category": "OTHER"},
        )

    def test_category_and_framework_changed_together_is_allowed(self):
        self.check(
            self.confirmed_autonomous(),
            {
                "official_category": "UNIVERSITY",
                "confirmed_framework_id": UNIVERSITY.id,
            },
        )

    def test_non_profile_edit_without_category_is_allowed(self):
        legacy = institution(id=1)
        lookup = self.check(legacy, {"address": "New address", "website": "x"})
        lookup.assert_not_called()

    def test_category_change_without_confirmed_framework_is_allowed(self):
        lookup = self.check(
            institution(id=7, official_category="UNIVERSITY"),
            {"official_category": "AUTONOMOUS_COLLEGE"},
        )
        lookup.assert_not_called()

    def test_new_mismatched_framework_is_rejected(self):
        self.assert_rejected(
            institution(id=8, official_category="UNIVERSITY"),
            {"confirmed_framework_id": AUTONOMOUS.id},
        )

    def test_internal_and_announced_frameworks_are_rejected(self):
        for fw in (INTERNAL, BINARY):
            self.assert_rejected(
                institution(id=9, official_category="UNIVERSITY"),
                {"confirmed_framework_id": fw.id},
            )

    def test_existing_framework_cannot_survive_institution_without_category(self):
        self.assert_rejected(
            institution(
                id=10,
                official_category="AUTONOMOUS_COLLEGE",
                confirmed_framework_id=AUTONOMOUS.id,
            ),
            {"official_category": None},
        )


class RecordingQuery:
    def __init__(self):
        self.clauses = []

    def filter(self, *clauses):
        self.clauses.extend(clauses)
        return self

    def order_by(self, *args):
        return self

    def first(self):
        return None


class LiveCycleTests(unittest.TestCase):
    def test_live_statuses_exclude_draft_and_archived(self):
        self.assertEqual(
            report_service.ACTIVE_CYCLE_STATUSES,
            {"Active", "In Progress"},
        )

    def test_get_live_cycle_filters_on_live_statuses_only(self):
        query = RecordingQuery()
        session = MagicMock()
        session.query.return_value = query
        self.assertIsNone(report_service.get_live_cycle(session, 7))
        session.query.assert_called_once_with(AccreditationCycle)
        compiled = " ".join(
            str(clause.compile(compile_kwargs={"literal_binds": True}))
            for clause in query.clauses
        )
        self.assertIn("'Active'", compiled)
        self.assertIn("'In Progress'", compiled)
        self.assertNotIn("Draft", compiled)
        self.assertNotIn("Archived", compiled)
        self.assertNotIn("Completed", compiled)

    def test_get_live_cycle_without_institution_does_not_query(self):
        self.assertIsNone(
            report_service.get_live_cycle(NoDatabaseSession(), None)
        )

    def test_submission_create_uses_live_cycle(self):
        self.assertIs(submission_routes.get_live_cycle, report_service.get_live_cycle)
        self.assertFalse(hasattr(submission_routes, "get_active_cycle"))
        self.assertIn("Draft and Archived", submission_routes.NO_LIVE_CYCLE_MESSAGE)


class InternalReportWordingTests(unittest.TestCase):
    def test_report_title_and_disclaimer(self):
        self.assertNotIn("NAAC", report_service.INTERNAL_REPORT_TITLE)
        self.assertIn(
            "not an official NAAC AQAR, SSR, or accreditation outcome",
            report_service.INTERNAL_REPORT_DISCLAIMER,
        )

    def test_routes_do_not_claim_official_documents(self):
        for module in (report_routes, submission_routes):
            source = inspect.getsource(module)
            self.assertNotIn("Final NAAC Report", source)
            self.assertNotIn("Final NAAC Submission", source)
            self.assertNotIn("AQAR (Annual Quality Assurance Report)", source)
            self.assertNotIn("SSR (Self Study Report)", source)
        self.assertIn(
            '"official_naac_document": False',
            inspect.getsource(report_routes),
        )


if __name__ == "__main__":
    unittest.main()
