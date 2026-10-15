"""Add accreditation_cycles.cycle_mode for internal preparation cycles.

Revision ID: e6b3d9a41c57
Revises: b4e8f17a3c90

Existing rows keep cycle_mode = NULL (official / existing behaviour) and
are not rewritten. The CHECK constraints keep internal preparation cycles
on preparation statuses and keep every other cycle off them, so an
internal preparation cycle can never be promoted to an official status.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e6b3d9a41c57"
down_revision: Union[str, Sequence[str], None] = "b4e8f17a3c90"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PREPARATION_STATUSES_SQL = (
    "('Preparation Draft', 'Preparation Open', "
    "'Preparation Finalized', 'Preparation Archived')"
)

MODE_VALUES_CONSTRAINT = "ck_accreditation_cycles_cycle_mode_values"
MODE_STATUS_CONSTRAINT = "ck_accreditation_cycles_cycle_mode_status"


def upgrade() -> None:
    op.add_column(
        "accreditation_cycles",
        sa.Column("cycle_mode", sa.String(length=40), nullable=True),
    )
    op.create_check_constraint(
        MODE_VALUES_CONSTRAINT,
        "accreditation_cycles",
        "cycle_mode IS NULL OR cycle_mode = 'INTERNAL_PREPARATION'",
    )
    op.create_check_constraint(
        MODE_STATUS_CONSTRAINT,
        "accreditation_cycles",
        (
            "(cycle_mode = 'INTERNAL_PREPARATION' "
            f"AND status IN {PREPARATION_STATUSES_SQL}) "
            "OR (cycle_mode IS NULL "
            f"AND status NOT IN {PREPARATION_STATUSES_SQL})"
        ),
    )


def downgrade() -> None:
    remaining = op.get_bind().execute(
        sa.text(
            "SELECT count(*) FROM accreditation_cycles "
            "WHERE cycle_mode IS NOT NULL"
        )
    ).scalar()
    if remaining:
        raise RuntimeError(
            f"{remaining} internal preparation cycle(s) exist. Dropping "
            "cycle_mode would make them indistinguishable from official "
            "cycles. Remove them (test databases only) before downgrading."
        )
    op.drop_constraint(
        MODE_STATUS_CONSTRAINT,
        "accreditation_cycles",
        type_="check",
    )
    op.drop_constraint(
        MODE_VALUES_CONSTRAINT,
        "accreditation_cycles",
        type_="check",
    )
    op.drop_column("accreditation_cycles", "cycle_mode")
