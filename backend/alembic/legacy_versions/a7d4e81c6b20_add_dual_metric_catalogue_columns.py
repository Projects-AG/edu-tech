"""Add dual working/official metric catalogue columns.

Revision ID: a7d4e81c6b20
Revises: f3c9d02b7a11

Additive only. Does not populate official operational metrics, bind
frameworks, change applicability, or enable production cycles.
Downgrade drops the new columns and indexes; it does not delete or
rewrite existing metric, submission, cycle, or framework rows.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a7d4e81c6b20"
down_revision: Union[str, Sequence[str], None] = "f3c9d02b7a11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "metrics",
        sa.Column(
            "catalog_kind",
            sa.String(length=20),
            nullable=False,
            server_default="WORKING",
        ),
    )
    op.add_column(
        "metrics",
        sa.Column("framework_id", sa.Integer(), nullable=True),
    )
    op.execute(
        sa.text(
            "UPDATE metrics SET catalog_kind = 'WORKING' "
            "WHERE catalog_kind IS NULL"
        )
    )
    op.execute(
        sa.text(
            "UPDATE metrics SET framework_id = NULL "
            "WHERE catalog_kind = 'WORKING' AND framework_id IS NOT NULL"
        )
    )
    op.create_index(
        "ix_metrics_catalog_kind",
        "metrics",
        ["catalog_kind"],
        unique=False,
    )
    op.create_index(
        "ix_metrics_framework_id",
        "metrics",
        ["framework_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_metrics_framework_id",
        "metrics",
        "naac_frameworks",
        ["framework_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_check_constraint(
        "ck_metrics_catalog_kind",
        "metrics",
        "catalog_kind IN ('WORKING', 'OFFICIAL')",
    )
    op.create_check_constraint(
        "ck_metrics_catalog_framework_alignment",
        "metrics",
        "(catalog_kind = 'WORKING' AND framework_id IS NULL) "
        "OR (catalog_kind = 'OFFICIAL' AND framework_id IS NOT NULL)",
    )
    # Display codes such as 1.1.1 may exist in both catalogues.
    # Do not add a global unique constraint on metrics.code.
    op.create_index(
        "uq_metrics_official_framework_code",
        "metrics",
        ["framework_id", "code"],
        unique=True,
        postgresql_where=sa.text(
            "catalog_kind = 'OFFICIAL' AND framework_id IS NOT NULL"
        ),
    )

    op.add_column(
        "submissions",
        sa.Column("metric_id", sa.Integer(), nullable=True),
    )
    op.create_index(
        "ix_submissions_metric_id",
        "submissions",
        ["metric_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_submissions_metric_id",
        "submissions",
        "metrics",
        ["metric_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.add_column(
        "framework_metrics",
        sa.Column("operational_metric_id", sa.Integer(), nullable=True),
    )
    op.create_index(
        "ix_framework_metrics_operational_metric_id",
        "framework_metrics",
        ["operational_metric_id"],
        unique=False,
    )
    # Partial unique: multiple NULLs must remain valid until Phase 1 clones exist.
    op.create_index(
        "uq_framework_metric_operational_metric_id",
        "framework_metrics",
        ["operational_metric_id"],
        unique=True,
        postgresql_where=sa.text("operational_metric_id IS NOT NULL"),
    )
    op.create_foreign_key(
        "fk_framework_metrics_operational_metric_id",
        "framework_metrics",
        "metrics",
        ["operational_metric_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_framework_metrics_operational_metric_id",
        "framework_metrics",
        type_="foreignkey",
    )
    op.drop_index(
        "uq_framework_metric_operational_metric_id",
        table_name="framework_metrics",
    )
    op.drop_index(
        "ix_framework_metrics_operational_metric_id",
        table_name="framework_metrics",
    )
    op.drop_column("framework_metrics", "operational_metric_id")

    op.drop_constraint(
        "fk_submissions_metric_id",
        "submissions",
        type_="foreignkey",
    )
    op.drop_index("ix_submissions_metric_id", table_name="submissions")
    op.drop_column("submissions", "metric_id")

    op.drop_index(
        "uq_metrics_official_framework_code",
        table_name="metrics",
    )
    op.drop_constraint(
        "ck_metrics_catalog_framework_alignment",
        "metrics",
        type_="check",
    )
    op.drop_constraint(
        "ck_metrics_catalog_kind",
        "metrics",
        type_="check",
    )
    op.drop_constraint(
        "fk_metrics_framework_id",
        "metrics",
        type_="foreignkey",
    )
    op.drop_index("ix_metrics_framework_id", table_name="metrics")
    op.drop_index("ix_metrics_catalog_kind", table_name="metrics")
    op.drop_column("metrics", "framework_id")
    op.drop_column("metrics", "catalog_kind")
