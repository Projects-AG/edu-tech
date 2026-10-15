"""Database-free tests for category-based framework loading and role access.

Sessions are either a stand-in that fails on any query or write, or a
MagicMock that never reaches a database. Framework lookups are patched.
"""

import unittest
from contextlib import ExitStack
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi import HTTPException

from app.accreditation import routes as accreditation_routes
from app.document import routes as document_routes
from app.institution import routes as institution_routes
from app.report import routes as report_routes
from app.schemas.institution import InstitutionCreate, InstitutionUpdate
from app.services import framework_service
from app.services.framework_service import (
    CATEGORY_FRAMEWORK_NOT_SEEDED_MESSAGE,
    CONFIRMED_FRAMEWORK_MISSING_MESSAGE,
    NO_OFFICIAL_CATEGORY_MESSAGE,
    category_framework_to_confirm,
    cycle_framework_eligibility,
)
from app.services.naac_framework_catalog import (
    ANNOUNCED_NOT_OPERATIVE,
    CODE_INTERNAL,
    CODE_RAF_AFFILIATED,
    CODE_RAF_AUTONOMOUS,
    CODE_RAF_UNIVERSITY,
    VERIFIED,
)
from app.submission import routes as submission_routes


class NoDatabaseSession:
    def _forbidden(self, *args, **kwargs):
        raise AssertionError("Database access is not allowed in this test")

    query = add = flush = commit = delete = refresh = execute = _forbidden


def framework(framework_id, code, verification_status=VERIFIED, seven=True):
    return SimpleNamespace(
        id=framework_id,
        code=code,
        verification_status=verification_status,
        uses_seven_criteria=seven,
        name=f"Framework {code}",
        version="2023-07-11",
    )


AUTONOMOUS = framework(3, CODE_RAF_AUTONOMOUS)
UNIVERSITY = framework(2, CODE_RAF_UNIVERSITY)
AFFILIATED = framework(4, CODE_RAF_AFFILIATED)
SEEDED = {fw.code: fw for fw in (AUTONOMOUS, UNIVERSITY, AFFILIATED)}


def seeded_lookup(frameworks=None):
    table = SEEDED if frameworks is None else frameworks
    return patch.object(
        framework_service,
        "get_framework_by_code",
        side_effect=lambda db, code: table.get(code),
    )


def institution(**overrides):
    values = {
        "id": 501,
        "name": "Test College",
        "code": "TST",
        "official_category": None,
        "affiliation_status": None,
        "affiliated_university": None,
        "autonomous_status": None,
        "is_constituent_unit": None,
        "parent_institution_name": None,
        "programme_level": None,
        "existing_naac_status": None,
        "previous_cycle_number": None,
        "application_pathway": None,
        "confirmed_framework_id": None,
        "framework_confirmed_by": None,
        "framework_confirmed_at": None,
        "framework_confirmation_note": None,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def user(user_id=10, institution_id=501, department_id=None, role_id=1):
    return SimpleNamespace(
        id=user_id,
        institution_id=institution_id,
        department_id=department_id,
        role_id=role_id,
    )


def assert_forbidden(test, call):
    with test.assertRaises(HTTPException) as ctx:
        call()
    test.assertEqual(ctx.exception.status_code, 403, ctx.exception.detail)
    return ctx.exception


# ------------------------------------------------------------------
# Framework loading by official category
# ------------------------------------------------------------------

class CategoryFrameworkLoadingTests(unittest.TestCase):
    def test_autonomous_category_loads_autonomous_framework(self):
        with seeded_lookup():
            fw = category_framework_to_confirm(
                NoDatabaseSession(),
                {"official_category": "AUTONOMOUS_COLLEGE"},
            )
        self.assertIs(fw, AUTONOMOUS)

    def test_affiliated_with_autonomy_loads_autonomous_framework(self):
        with seeded_lookup():
            fw = category_framework_to_confirm(
                NoDatabaseSession(),
                {
                    "official_category": "AFFILIATED_COLLEGE",
                    "affiliated_university": "Pune University",
                    "autonomous_status": "autonomous",
                },
            )
        self.assertIs(fw, AUTONOMOUS)

    def test_university_and_affiliated_load_their_own_frameworks(self):
        with seeded_lookup():
            uni = category_framework_to_confirm(
                NoDatabaseSession(), {"official_category": "UNIVERSITY"}
            )
            aff = category_framework_to_confirm(
                NoDatabaseSession(),
                {
                    "official_category": "AFFILIATED_COLLEGE",
                    "affiliated_university": "Pune University",
                },
            )
        self.assertIs(uni, UNIVERSITY)
        self.assertIs(aff, AFFILIATED)

    def test_unmapped_or_incomplete_category_loads_nothing(self):
        with seeded_lookup():
            for profile in (
                {},
                {"official_category": "OTHER"},
                {"official_category": "AFFILIATED_COLLEGE"},
                {"official_category": "CONSTITUENT_COLLEGE"},
            ):
                self.assertIsNone(
                    category_framework_to_confirm(NoDatabaseSession(), profile),
                    profile,
                )

    def test_unverified_or_announced_mapped_framework_is_not_loaded(self):
        for bad in (
            framework(3, CODE_RAF_AUTONOMOUS, verification_status="REQUIRES_OFFICIAL_VERIFICATION"),
            framework(3, CODE_RAF_AUTONOMOUS, verification_status=ANNOUNCED_NOT_OPERATIVE),
            framework(3, CODE_RAF_AUTONOMOUS, seven=False),
        ):
            with seeded_lookup({CODE_RAF_AUTONOMOUS: bad}):
                self.assertIsNone(
                    category_framework_to_confirm(
                        NoDatabaseSession(),
                        {"official_category": "AUTONOMOUS_COLLEGE"},
                    )
                )

    def test_internal_is_never_loaded_as_fallback(self):
        internal = framework(1, CODE_INTERNAL)
        with seeded_lookup({CODE_INTERNAL: internal}):
            self.assertIsNone(
                category_framework_to_confirm(
                    NoDatabaseSession(),
                    {"official_category": "AUTONOMOUS_COLLEGE"},
                )
            )


# ------------------------------------------------------------------
# Cycle eligibility with a reason
# ------------------------------------------------------------------

class CycleEligibilityTests(unittest.TestCase):
    def test_missing_category_gives_clear_reason(self):
        result = cycle_framework_eligibility(NoDatabaseSession(), institution())
        self.assertIsNone(result["framework_id"])
        self.assertEqual(result["reason"], NO_OFFICIAL_CATEGORY_MESSAGE)

    def test_free_text_type_is_not_used(self):
        legacy = institution(institution_type="Autonomous College")
        result = cycle_framework_eligibility(NoDatabaseSession(), legacy)
        self.assertIsNone(result["framework_id"])

    def test_autonomous_category_is_eligible_for_autonomous(self):
        with seeded_lookup():
            result = cycle_framework_eligibility(
                NoDatabaseSession(),
                institution(official_category="AUTONOMOUS_COLLEGE"),
            )
        self.assertEqual(result, {"framework_id": AUTONOMOUS.id, "reason": None})

    def test_pending_category_reports_mapping_reason(self):
        result = cycle_framework_eligibility(
            NoDatabaseSession(),
            institution(official_category="AFFILIATED_COLLEGE"),
        )
        self.assertIsNone(result["framework_id"])
        self.assertIn("affiliating university", result["reason"])

    def test_unseeded_framework_reports_reason(self):
        with seeded_lookup({}):
            result = cycle_framework_eligibility(
                NoDatabaseSession(),
                institution(official_category="AUTONOMOUS_COLLEGE"),
            )
        self.assertIsNone(result["framework_id"])
        self.assertEqual(
            result["reason"],
            CATEGORY_FRAMEWORK_NOT_SEEDED_MESSAGE.format(code=CODE_RAF_AUTONOMOUS),
        )

    def test_confirmed_framework_missing_reports_reason(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        result = cycle_framework_eligibility(
            db,
            institution(
                official_category="AUTONOMOUS_COLLEGE",
                confirmed_framework_id=99,
            ),
        )
        self.assertIsNone(result["framework_id"])
        self.assertEqual(result["reason"], CONFIRMED_FRAMEWORK_MISSING_MESSAGE)

    def test_confirmed_framework_mismatching_category_is_not_eligible(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = UNIVERSITY
        result = cycle_framework_eligibility(
            db,
            institution(
                official_category="AUTONOMOUS_COLLEGE",
                confirmed_framework_id=UNIVERSITY.id,
            ),
        )
        self.assertIsNone(result["framework_id"])
        self.assertIn("does not match", result["reason"])

    def test_eligibility_does_not_grant_production_readiness(self):
        # Eligibility selects a framework only; production statuses stay
        # gated by assert_cycle_status_allowed.
        with seeded_lookup():
            result = cycle_framework_eligibility(
                NoDatabaseSession(),
                institution(official_category="AUTONOMOUS_COLLEGE"),
            )
        self.assertEqual(set(result), {"framework_id", "reason"})


# ------------------------------------------------------------------
# Institution create / update load the framework from the category
# ------------------------------------------------------------------

def institution_route_patches(stack, admin=True):
    stack.enter_context(seeded_lookup())
    stack.enter_context(
        patch.object(institution_routes, "is_platform_admin", return_value=admin)
    )
    stack.enter_context(
        patch.object(institution_routes, "ensure_default_faculty_and_department")
    )
    stack.enter_context(
        patch.object(institution_routes, "assert_institution_access")
    )
    audit = stack.enter_context(patch.object(institution_routes, "record_audit"))
    stack.enter_context(
        patch.object(
            institution_routes,
            "serialize_institution",
            side_effect=lambda db, item: item,
        )
    )
    return audit


def mock_db(first=None):
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = first
    return db


class InstitutionCreateLoadsFrameworkTests(unittest.TestCase):
    def create(self, **fields):
        payload = InstitutionCreate(name="New College", code="NEW", **fields)
        db = mock_db()
        with ExitStack() as stack:
            audit = institution_route_patches(stack)
            created = institution_routes.create_institution(
                institution_data=payload,
                current_user=user(user_id=1, institution_id=None),
                db=db,
            )
        return created, audit

    def test_autonomous_institution_gets_autonomous_framework(self):
        created, audit = self.create(official_category="AUTONOMOUS_COLLEGE")
        self.assertEqual(created.confirmed_framework_id, AUTONOMOUS.id)
        self.assertEqual(created.framework_confirmed_by, 1)
        self.assertIsNotNone(created.framework_confirmed_at)
        self.assertEqual(
            created.framework_confirmation_note,
            institution_routes.CATEGORY_CONFIRMATION_NOTE,
        )
        new_values = audit.call_args.kwargs["new_values"]
        self.assertEqual(new_values["confirmed_framework_id"], AUTONOMOUS.id)
        self.assertEqual(new_values["official_category"], "AUTONOMOUS_COLLEGE")

    def test_university_institution_gets_university_framework(self):
        created, _ = self.create(official_category="UNIVERSITY")
        self.assertEqual(created.confirmed_framework_id, UNIVERSITY.id)

    def test_no_category_leaves_framework_unconfirmed(self):
        created, _ = self.create(institution_type="Engineering College")
        self.assertIsNone(created.confirmed_framework_id)
        self.assertIsNone(created.framework_confirmed_by)

    def test_incomplete_category_leaves_framework_unconfirmed(self):
        created, _ = self.create(official_category="AFFILIATED_COLLEGE")
        self.assertIsNone(created.confirmed_framework_id)

    def test_non_admin_cannot_create_institution(self):
        payload = InstitutionCreate(name="X", code="X")
        with ExitStack() as stack:
            institution_route_patches(stack, admin=False)
            assert_forbidden(
                self,
                lambda: institution_routes.create_institution(
                    institution_data=payload,
                    current_user=user(),
                    db=NoDatabaseSession(),
                ),
            )


class InstitutionUpdateLoadsFrameworkTests(unittest.TestCase):
    def update(self, existing, admin=True, **fields):
        db = mock_db(first=existing)
        with ExitStack() as stack:
            institution_route_patches(stack, admin=admin)
            return institution_routes.update_institution(
                institution_id=existing.id,
                institution_data=InstitutionUpdate(**fields),
                current_user=user(user_id=1),
                db=db,
            )

    def test_admin_setting_category_on_legacy_institution_loads_framework(self):
        updated = self.update(
            institution(), official_category="AUTONOMOUS_COLLEGE"
        )
        self.assertEqual(updated.confirmed_framework_id, AUTONOMOUS.id)
        self.assertEqual(updated.framework_confirmed_by, 1)

    def test_non_admin_category_edit_does_not_confirm_framework(self):
        updated = self.update(
            institution(), admin=False, official_category="AUTONOMOUS_COLLEGE"
        )
        self.assertIsNone(updated.confirmed_framework_id)

    def test_existing_confirmed_framework_is_not_switched(self):
        existing = institution(
            official_category="AUTONOMOUS_COLLEGE",
            confirmed_framework_id=AUTONOMOUS.id,
        )
        db = mock_db(first=existing)
        db.query.return_value.filter.return_value.first.side_effect = [
            existing,
            AUTONOMOUS,
        ]
        with ExitStack() as stack:
            institution_route_patches(stack)
            stack.enter_context(
                patch.object(
                    framework_service,
                    "get_framework_or_404",
                    return_value=AUTONOMOUS,
                )
            )
            with self.assertRaises(HTTPException) as ctx:
                institution_routes.update_institution(
                    institution_id=existing.id,
                    institution_data=InstitutionUpdate(
                        official_category="UNIVERSITY"
                    ),
                    current_user=user(user_id=1),
                    db=db,
                )
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(existing.confirmed_framework_id, AUTONOMOUS.id)


# ------------------------------------------------------------------
# Cross-institution cycle access
# ------------------------------------------------------------------

class CycleInstitutionScopeTests(unittest.TestCase):
    def test_unassigned_non_admin_cannot_create_cycle_for_any_institution(self):
        db = mock_db(first=institution(id=71))
        cycle_data = SimpleNamespace(institution_id=71)
        with patch.object(
            accreditation_routes, "get_role_name", return_value="NAAC Coordinator"
        ):
            assert_forbidden(
                self,
                lambda: accreditation_routes.create_accreditation_cycle(
                    cycle_data=cycle_data,
                    current_user=user(institution_id=None),
                    db=db,
                ),
            )

    def test_coordinator_cannot_create_cycle_for_other_institution(self):
        db = mock_db(first=institution(id=71))
        with patch.object(
            accreditation_routes, "get_role_name", return_value="NAAC Coordinator"
        ):
            assert_forbidden(
                self,
                lambda: accreditation_routes.create_accreditation_cycle(
                    cycle_data=SimpleNamespace(institution_id=71),
                    current_user=user(institution_id=5),
                    db=db,
                ),
            )

    def test_unassigned_non_admin_cannot_read_other_cycle(self):
        db = mock_db(first=SimpleNamespace(id=9, institution_id=71))
        with patch.object(
            accreditation_routes, "get_role_name", return_value="Reviewer"
        ):
            assert_forbidden(
                self,
                lambda: accreditation_routes.get_accreditation_cycle(
                    cycle_id=9,
                    current_user=user(institution_id=None),
                    db=db,
                ),
            )


# ------------------------------------------------------------------
# Evidence write access (institution + department)
# ------------------------------------------------------------------

def submission(institution_id=501, department_id=7):
    return SimpleNamespace(
        id=900, institution_id=institution_id, department_id=department_id
    )


class EvidenceWriteAccessTests(unittest.TestCase):
    def check(self, role, current_user, target):
        with patch.object(document_routes, "get_role_name", return_value=role):
            document_routes.assert_evidence_write_access(
                NoDatabaseSession(), current_user, target
            )

    def test_platform_admin_cannot_write_evidence(self):
        assert_forbidden(
            self,
            lambda: self.check("Admin", user(institution_id=None), submission()),
        )
        assert_forbidden(
            self, lambda: self.check("Admin", user(institution_id=None), None)
        )

    def test_department_coordinator_own_department_allowed(self):
        self.check("Dept. Coordinator", user(department_id=7), submission())

    def test_department_coordinator_other_department_forbidden(self):
        assert_forbidden(
            self,
            lambda: self.check(
                "Dept. Coordinator", user(department_id=8), submission()
            ),
        )

    def test_department_coordinator_without_submission_forbidden(self):
        assert_forbidden(
            self,
            lambda: self.check("Dept. Coordinator", user(department_id=7), None),
        )

    def test_department_coordinator_without_department_forbidden(self):
        assert_forbidden(
            self,
            lambda: self.check("Dept. Coordinator", user(), submission()),
        )

    def test_committee_member_other_department_forbidden(self):
        assert_forbidden(
            self,
            lambda: self.check(
                "Committee Member", user(department_id=8), submission()
            ),
        )

    def test_cross_institution_forbidden(self):
        assert_forbidden(
            self,
            lambda: self.check(
                "NAAC Coordinator", user(institution_id=502), submission()
            ),
        )

    def test_unassigned_user_forbidden(self):
        assert_forbidden(
            self,
            lambda: self.check(
                "NAAC Coordinator", user(institution_id=None), submission()
            ),
        )

    def test_naac_coordinator_institution_scope_allowed(self):
        self.check("NAAC Coordinator", user(), submission(department_id=None))
        self.check("NAAC Coordinator", user(), None)


# ------------------------------------------------------------------
# Submission stage role gates and scope
# ------------------------------------------------------------------

class SubmissionWorkflowRoleTests(unittest.TestCase):
    def call_as(self, role, handler, **kwargs):
        with patch.object(
            submission_routes, "require_rbac_permission", return_value=role
        ):
            return handler(
                current_user=user(),
                db=NoDatabaseSession(),
                **kwargs,
            )

    def test_only_data_entry_roles_create_submissions(self):
        for role in (
            "Admin",
            "Institution Admin",
            "Reviewer",
            "Data Approver",
            "Principal / Director",
        ):
            assert_forbidden(
                self,
                lambda role=role: self.call_as(
                    role,
                    submission_routes.create_submission,
                    sub_data=MagicMock(),
                ),
            )

    def test_only_data_approver_performs_data_approval(self):
        for role in ("Admin", "NAAC Coordinator", "Principal / Director", "Reviewer"):
            assert_forbidden(
                self,
                lambda role=role: self.call_as(
                    role,
                    submission_routes.data_approve_submission,
                    sub_id=1,
                    approval_data=MagicMock(),
                ),
            )

    def test_only_principal_performs_final_approval_and_submission(self):
        for role in ("Admin", "NAAC Coordinator", "Data Approver", "Reviewer"):
            assert_forbidden(
                self,
                lambda role=role: self.call_as(
                    role,
                    submission_routes.final_approve_submission,
                    sub_id=1,
                    final_data=MagicMock(),
                ),
            )
            assert_forbidden(
                self,
                lambda role=role: self.call_as(
                    role,
                    submission_routes.final_submit_submission,
                    sub_id=1,
                ),
            )

    def test_final_approval_requires_own_institution(self):
        with patch.object(
            submission_routes, "get_user_role", return_value="Principal / Director"
        ):
            assert_forbidden(
                self,
                lambda: submission_routes.verify_institution_access(
                    submission(institution_id=502),
                    user(),
                    NoDatabaseSession(),
                    require_assigned_institution=True,
                ),
            )

    def test_admin_cannot_act_on_assigned_institution_paths(self):
        with patch.object(submission_routes, "get_user_role", return_value="Admin"):
            assert_forbidden(
                self,
                lambda: submission_routes.verify_institution_access(
                    submission(),
                    user(institution_id=None),
                    NoDatabaseSession(),
                    require_assigned_institution=True,
                ),
            )

    def test_department_scope_on_submissions(self):
        assert_forbidden(
            self,
            lambda: submission_routes.verify_department_access(
                submission(department_id=7),
                user(department_id=8),
                "Dept. Coordinator",
            ),
        )
        submission_routes.verify_department_access(
            submission(department_id=7),
            user(department_id=7),
            "Dept. Coordinator",
        )


# ------------------------------------------------------------------
# Final report download
# ------------------------------------------------------------------

class FinalReportDownloadTests(unittest.TestCase):
    def can_download(self, role, current_user, approve=True):
        with patch.object(report_routes, "get_role_name", return_value=role), patch.object(
            report_routes, "has_reports_approve", return_value=approve
        ):
            return report_routes.can_download_final_report(
                NoDatabaseSession(), current_user
            )

    def test_principal_of_institution_can_download(self):
        self.assertTrue(self.can_download("Principal / Director", user()))

    def test_principal_without_institution_or_permission_cannot(self):
        self.assertFalse(
            self.can_download("Principal / Director", user(institution_id=None))
        )
        self.assertFalse(
            self.can_download("Principal / Director", user(), approve=False)
        )

    def test_other_roles_cannot_download_even_with_reports_approve(self):
        for role in ("Admin", "NAAC Coordinator", "Data Approver", "Reviewer"):
            self.assertFalse(self.can_download(role, user()), role)

    def test_download_endpoint_rejects_coordinator_before_reading(self):
        with patch.object(
            report_routes, "get_role_name", return_value="NAAC Coordinator"
        ):
            exc = assert_forbidden(
                self,
                lambda: report_routes.download_final_report(
                    institution_id=None,
                    current_user=user(),
                    db=NoDatabaseSession(),
                ),
            )
        self.assertEqual(exc.detail, report_routes.FINAL_REPORT_DOWNLOAD_FORBIDDEN)

    def test_principal_cannot_download_other_institution(self):
        db = mock_db(first=institution(id=502))
        with patch.object(
            report_routes, "get_role_name", return_value="Principal / Director"
        ), patch.object(report_routes, "has_reports_approve", return_value=True):
            assert_forbidden(
                self,
                lambda: report_routes.download_final_report(
                    institution_id=502,
                    current_user=user(),
                    db=db,
                ),
            )


if __name__ == "__main__":
    unittest.main()
