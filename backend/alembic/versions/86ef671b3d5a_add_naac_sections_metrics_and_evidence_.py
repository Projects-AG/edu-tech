"""Add NAAC sections metrics and evidence requirements

Revision ID: 86ef671b3d5a
Revises: 5bc40fa7f2fe
Create Date: 2026-09-15 17:09:17.486525

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "86ef671b3d5a"
down_revision: Union[str, Sequence[str], None] = "5bc40fa7f2fe"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create NAAC sections, metrics and evidence requirement tables."""

    # ---------------------------------------------------------
    # Sections
    # ---------------------------------------------------------
    op.create_table(
        "sections",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("criterion_id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("weightage", sa.Float(), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["criterion_id"],
            ["criteria.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_sections_id",
        "sections",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_sections_criterion_id",
        "sections",
        ["criterion_id"],
        unique=False,
    )

    op.create_index(
        "ix_sections_code",
        "sections",
        ["code"],
        unique=False,
    )

    # ---------------------------------------------------------
    # Metrics
    # ---------------------------------------------------------
    op.create_table(
        "metrics",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("section_id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("metric_type", sa.String(length=50), nullable=False),
        sa.Column("weightage", sa.Float(), nullable=False),
        sa.Column("max_score", sa.Float(), nullable=False),
        sa.Column("requires_evidence", sa.Boolean(), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["section_id"],
            ["sections.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_metrics_id",
        "metrics",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_metrics_section_id",
        "metrics",
        ["section_id"],
        unique=False,
    )

    op.create_index(
        "ix_metrics_code",
        "metrics",
        ["code"],
        unique=False,
    )

    # ---------------------------------------------------------
    # Evidence Requirements
    # ---------------------------------------------------------
    op.create_table(
        "evidence_requirements",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("metric_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("required", sa.Boolean(), nullable=False),
        sa.Column("allowed_file_types", sa.String(length=300), nullable=True),
        sa.Column("max_files", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["metric_id"],
            ["metrics.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_evidence_requirements_id",
        "evidence_requirements",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_evidence_requirements_metric_id",
        "evidence_requirements",
        ["metric_id"],
        unique=False,
    )


def downgrade() -> None:
    """Remove NAAC sections, metrics and evidence requirement tables."""

    op.drop_index(
        "ix_evidence_requirements_metric_id",
        table_name="evidence_requirements",
    )

    op.drop_index(
        "ix_evidence_requirements_id",
        table_name="evidence_requirements",
    )

    op.drop_table("evidence_requirements")

    op.drop_index(
        "ix_metrics_code",
        table_name="metrics",
    )

    op.drop_index(
        "ix_metrics_section_id",
        table_name="metrics",
    )

    op.drop_index(
        "ix_metrics_id",
        table_name="metrics",
    )

    op.drop_table("metrics")

    op.drop_index(
        "ix_sections_code",
        table_name="sections",
    )

    op.drop_index(
        "ix_sections_criterion_id",
        table_name="sections",
    )

    op.drop_index(
        "ix_sections_id",
        table_name="sections",
    )

    op.drop_table("sections")