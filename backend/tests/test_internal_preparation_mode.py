"""Database-free tests for internal preparation cycle mode (Phase 2)."""

import importlib.util
import os
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException

from app.services import cycle_mode
from app.services.cycle_mode import (
    CYCLE_MODE_INTERNAL_PREPARATION,
    INTERNAL_PREPARATION_LABEL,
    PREP_ARCHIVED,
    PREP_DRAFT,
    PREP_FINALIZED,
    PREP_OPEN,
    PREPARATION_STATUSES,
    assert_create_status_for_mode,
    assert_cycle_accepts_changes,
    assert_status_change_allowed,
    is_internal_preparation,
    label_title,
    mode_payload,
    normalize_cycle_mode,
)
from app.services.naac_framework_catalog import PRODUCTION_CYCLE_STATUSES
from tests import db_test_guard

OFFICIAL_STATUSES = ("Draft", "Active", "In Progress", "Completed", "Archived")
MIGRATION_PATH = (
    Path(__file__).resolve().parents[1]
    / "alembic"
    / "versions"
    / "e6b3d9a41c57_add_cycle_mode_internal_preparation.py"
)


def prep_cycle(status=PREP_DRAFT):
    return SimpleNamespace(cycle_mode=CYCLE_MODE_INTERNAL_PREPARATION, status=status)


def official_cycle(status="Draft"):
    return SimpleNamespace(cycle_mode=None, status=status)


class ModeValueTests(unittest.TestCase):
    def test_normalize_cycle_mode(self):
        self.assertIsNone(normalize_cycle_mode(None))
        self.assertIsNone(normalize_cycle_mode("  "))
        self.assertEqual(
            normalize_cycle_mode(" internal_preparation "),
            CYCLE_MODE_INTERNAL_PREPARATION,
        )
        for value in ("OFFICIAL", "DEMO", 1):
            with self.assertRaises(ValueError):
                normalize_cycle_mode(value)

    def test_preparation_statuses_never_overlap_official_statuses(self):
        self.assertFalse(set(PREPARATION_STATUSES) & set(OFFICIAL_STATUSES))
        self.assertFalse(set(PREPARATION_STATUSES) & PRODUCTION_CYCLE_STATUSES)

    def test_mode_payload_and_label(self):
        self.assertEqual(
            mode_payload(prep_cycle()),
            {
                "cycle_mode": CYCLE_MODE_INTERNAL_PREPARATION,
                "mode_label": INTERNAL_PREPARATION_LABEL,
                "is_official_cycle": False,
            },
        )
        self.assertEqual(
            mode_payload(official_cycle()),
            {"cycle_mode": None, "mode_label": None, "is_official_cycle": True},
        )
        self.assertTrue(is_internal_preparation(prep_cycle()))
        self.assertFalse(is_internal_preparation(SimpleNamespace(status="Active")))
        self.assertIn("Not an Official NAAC Accreditation Cycle", INTERNAL_PREPARATION_LABEL)

    def test_label_title(self):
        self.assertEqual(
            label_title(prep_cycle(), "Submission approved"),
            "[Internal Preparation] Submission approved",
        )
        self.assertEqual(
            label_title(official_cycle(), "Submission approved"),
            "Submission approved",
        )


class CreateStatusTests(unittest.TestCase):
    def test_preparation_cycles_start_in_preparation_draft(self):
        mode = CYCLE_MODE_INTERNAL_PREPARATION
        self.assertEqual(assert_create_status_for_mode(mode, None), PREP_DRAFT)
        self.assertEqual(assert_create_status_for_mode(mode, ""), PREP_DRAFT)
        self.assertEqual(assert_create_status_for_mode(mode, PREP_DRAFT), PREP_DRAFT)
        for status in (*OFFICIAL_STATUSES, PREP_OPEN, PREP_FINALIZED):
            with self.assertRaises(HTTPException):
                assert_create_status_for_mode(mode, status)

    def test_official_cycles_cannot_start_in_preparation_status(self):
        self.assertEqual(assert_create_status_for_mode(None, "Draft"), "Draft")
        for status in PREPARATION_STATUSES:
            with self.assertRaises(HTTPException):
                assert_create_status_for_mode(None, status)


class StatusTransitionTests(unittest.TestCase):
    def assert_rejected(self, cycle, new_status):
        with self.assertRaises(HTTPException) as caught:
            assert_status_change_allowed(cycle, new_status)
        self.assertEqual(caught.exception.status_code, 400)

    def test_preparation_cycle_never_takes_an_official_status(self):
        for current in PREPARATION_STATUSES:
            for target in OFFICIAL_STATUSES:
                self.assert_rejected(prep_cycle(current), target)

    def test_official_cycle_never_takes_a_preparation_status(self):
        for current in OFFICIAL_STATUSES:
            for target in PREPARATION_STATUSES:
                self.assert_rejected(official_cycle(current), target)

    def test_allowed_preparation_transitions(self):
        assert_status_change_allowed(prep_cycle(PREP_DRAFT), PREP_OPEN)
        assert_status_change_allowed(prep_cycle(PREP_DRAFT), PREP_ARCHIVED)
        assert_status_change_allowed(prep_cycle(PREP_OPEN), PREP_ARCHIVED)
        assert_status_change_allowed(prep_cycle(PREP_FINALIZED), PREP_ARCHIVED)

    def test_rejected_preparation_transitions(self):
        self.assert_rejected(prep_cycle(PREP_OPEN), PREP_DRAFT)
        self.assert_rejected(prep_cycle(PREP_FINALIZED), PREP_OPEN)
        self.assert_rejected(prep_cycle(PREP_ARCHIVED), PREP_OPEN)
        self.assert_rejected(prep_cycle(PREP_ARCHIVED), PREP_DRAFT)

    def test_finalize_only_through_dedicated_action(self):
        self.assert_rejected(prep_cycle(PREP_OPEN), PREP_FINALIZED)
        self.assert_rejected(prep_cycle(PREP_DRAFT), PREP_FINALIZED)

    def test_unchanged_or_missing_status_is_a_no_op(self):
        assert_status_change_allowed(prep_cycle(PREP_OPEN), PREP_OPEN)
        assert_status_change_allowed(prep_cycle(PREP_OPEN), None)
        assert_status_change_allowed(official_cycle("Active"), "Completed")


class ReadOnlyGuardTests(unittest.TestCase):
    def test_only_open_preparation_cycles_accept_changes(self):
        assert_cycle_accepts_changes(prep_cycle(PREP_OPEN))
        for status in (PREP_DRAFT, PREP_FINALIZED, PREP_ARCHIVED):
            with self.assertRaises(HTTPException):
                assert_cycle_accepts_changes(prep_cycle(status))

    def test_official_and_missing_cycles_are_not_affected(self):
        assert_cycle_accepts_changes(None)
        for status in OFFICIAL_STATUSES:
            assert_cycle_accepts_changes(official_cycle(status))


def load_migration():
    spec = importlib.util.spec_from_file_location("cycle_mode_migration", MIGRATION_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class MigrationDefinitionTests(unittest.TestCase):
    def test_revision_chain(self):
        migration = load_migration()
        self.assertEqual(migration.revision, "e6b3d9a41c57")
        self.assertEqual(migration.down_revision, "b4e8f17a3c90")

    def test_constraint_statuses_match_mode_module(self):
        migration = load_migration()
        for status in PREPARATION_STATUSES:
            self.assertIn(f"'{status}'", migration.PREPARATION_STATUSES_SQL)
        self.assertEqual(
            migration.PREPARATION_STATUSES_SQL.count("'") // 2,
            len(PREPARATION_STATUSES),
        )

    def test_upgrade_adds_nullable_column_without_backfill(self):
        migration = load_migration()
        calls = []
        fake_op = SimpleNamespace(
            add_column=lambda table, column: calls.append(("add_column", table, column)),
            create_check_constraint=lambda name, table, condition: calls.append(
                ("check", name, table, condition)
            ),
            execute=lambda *args, **kwargs: calls.append(("execute",)),
        )
        with patch.object(migration, "op", fake_op):
            migration.upgrade()
        self.assertNotIn(("execute",), calls)
        added = [call for call in calls if call[0] == "add_column"]
        self.assertEqual(len(added), 1)
        _kind, table, column = added[0]
        self.assertEqual(table, "accreditation_cycles")
        self.assertEqual(column.name, "cycle_mode")
        self.assertTrue(column.nullable)
        self.assertIsNone(column.server_default)
        checks = [call for call in calls if call[0] == "check"]
        self.assertEqual(len(checks), 2)
        status_check = next(c for c in checks if c[1] == migration.MODE_STATUS_CONSTRAINT)
        self.assertIn("cycle_mode IS NULL", status_check[3])
        self.assertIn("NOT IN", status_check[3])

    def test_downgrade_refuses_when_preparation_cycles_exist(self):
        migration = load_migration()
        dropped = []
        bind = SimpleNamespace(
            execute=lambda statement: SimpleNamespace(scalar=lambda: 2)
        )
        fake_op = SimpleNamespace(
            get_bind=lambda: bind,
            drop_constraint=lambda *args, **kwargs: dropped.append(args),
            drop_column=lambda *args, **kwargs: dropped.append(args),
        )
        with patch.object(migration, "op", fake_op):
            with self.assertRaises(RuntimeError):
                migration.downgrade()
        self.assertEqual(dropped, [])

    def test_downgrade_drops_constraints_then_column_when_empty(self):
        migration = load_migration()
        dropped = []
        bind = SimpleNamespace(
            execute=lambda statement: SimpleNamespace(scalar=lambda: 0)
        )
        fake_op = SimpleNamespace(
            get_bind=lambda: bind,
            drop_constraint=lambda name, table, type_: dropped.append(("constraint", name)),
            drop_column=lambda table, column: dropped.append(("column", column)),
        )
        with patch.object(migration, "op", fake_op):
            migration.downgrade()
        self.assertEqual(dropped[-1], ("column", "cycle_mode"))
        self.assertEqual(
            {name for kind, name in dropped if kind == "constraint"},
            {migration.MODE_STATUS_CONSTRAINT, migration.MODE_VALUES_CONSTRAINT},
        )


DEV_URL = "postgresql://dev_user:dev_pw@localhost:5432/eduverse_naac"


class DatabaseGuardTests(unittest.TestCase):
    def guard_env(self, test_url):
        env = {key: value for key, value in os.environ.items() if key != db_test_guard.TEST_URL_ENV}
        if test_url is not None:
            env[db_test_guard.TEST_URL_ENV] = test_url
        return patch.dict(os.environ, env, clear=True)

    def dev_env_file(self):
        return patch.object(
            db_test_guard, "dotenv_values", return_value={"DATABASE_URL": DEV_URL}
        )

    def test_missing_url_is_refused(self):
        with self.guard_env(None), self.dev_env_file():
            with self.assertRaises(db_test_guard.DatabaseGuardError):
                db_test_guard.require_test_database_url()

    def test_name_must_end_with_test(self):
        with self.guard_env("postgresql://u:p@localhost:5432/eduverse_naac_copy"), self.dev_env_file():
            with self.assertRaises(db_test_guard.DatabaseGuardError):
                db_test_guard.require_test_database_url()

    def test_non_postgresql_is_refused(self):
        with self.guard_env("sqlite:///eduverse_test"), self.dev_env_file():
            with self.assertRaises(db_test_guard.DatabaseGuardError):
                db_test_guard.require_test_database_url()

    def test_development_database_is_refused(self):
        same = "postgresql://other:pw@LOCALHOST:5432/eduverse_naac_test"
        with self.guard_env(same), patch.object(
            db_test_guard,
            "dotenv_values",
            return_value={"DATABASE_URL": "postgresql://dev:pw@localhost/eduverse_naac_test"},
        ):
            with self.assertRaises(db_test_guard.DatabaseGuardError):
                db_test_guard.require_test_database_url()

    def test_separate_test_database_is_accepted(self):
        url = "postgresql://u:p@localhost:5432/eduverse_naac_test"
        with self.guard_env(url), self.dev_env_file():
            self.assertEqual(db_test_guard.require_test_database_url(), url)
            self.assertEqual(db_test_guard.guarded_database_name(), "eduverse_naac_test")

    def test_activation_refuses_after_app_database_import(self):
        url = "postgresql://u:p@localhost:5432/eduverse_naac_test"
        with self.guard_env(url), self.dev_env_file(), patch.dict(
            sys.modules, {"app.db.database": object()}
        ):
            with self.assertRaises(db_test_guard.DatabaseGuardError):
                db_test_guard.activate_test_database()


if __name__ == "__main__":
    unittest.main()
