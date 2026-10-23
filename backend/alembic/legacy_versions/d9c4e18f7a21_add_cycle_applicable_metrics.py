"""Add cycle_applicable_metrics junction table.

Revision ID: d9c4e18f7a21
Revises: b8e2c41a9f10
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d9c4e18f7a21"
down_revision: Union[str, Sequence[str], None] = "b8e2c41a9f10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cycle_applicable_metrics",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("cycle_id", sa.Integer(), nullable=False),
        sa.Column("metric_id", sa.Integer(), nullable=False),
        sa.Column(
            "required",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["cycle_id"],
            ["accreditation_cycles.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["metric_id"],
            ["metrics.id"],
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "cycle_id",
            "metric_id",
            name="uq_cycle_applicable_metric",
        ),
    )
    op.create_index(
        "ix_cycle_applicable_metrics_id",
        "cycle_applicable_metrics",
        ["id"],
        unique=False,
    )
    op.create_index(
        "ix_cycle_applicable_metrics_cycle_id",
        "cycle_applicable_metrics",
        ["cycle_id"],
        unique=False,
    )
    op.create_index(
        "ix_cycle_applicable_metrics_metric_id",
        "cycle_applicable_metrics",
        ["metric_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_cycle_applicable_metrics_metric_id",
        table_name="cycle_applicable_metrics",
    )
    op.drop_index(
        "ix_cycle_applicable_metrics_cycle_id",
        table_name="cycle_applicable_metrics",
    )
    op.drop_index(
        "ix_cycle_applicable_metrics_id",
        table_name="cycle_applicable_metrics",
    )
    op.drop_table("cycle_applicable_metrics")
