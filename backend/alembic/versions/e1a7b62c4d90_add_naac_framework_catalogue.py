"""Add versioned NAAC framework catalogue and institution profile fields.

Revision ID: e1a7b62c4d90
Revises: d9c4e18f7a21
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e1a7b62c4d90"
down_revision: Union[str, Sequence[str], None] = "d9c4e18f7a21"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "naac_frameworks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=250), nullable=False),
        sa.Column("version", sa.String(length=80), nullable=False),
        sa.Column("pathway_type", sa.String(length=40), nullable=False),
        sa.Column("institution_category", sa.String(length=80), nullable=False),
        sa.Column("programme_level", sa.String(length=30), nullable=True),
        sa.Column("source_title", sa.String(length=300), nullable=True),
        sa.Column("source_url", sa.String(length=500), nullable=True),
        sa.Column("issuing_authority", sa.String(length=200), nullable=True),
        sa.Column("publication_date", sa.Date(), nullable=True),
        sa.Column("effective_from", sa.Date(), nullable=True),
        sa.Column("effective_to", sa.Date(), nullable=True),
        sa.Column("verification_status", sa.String(length=60), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("allows_production_cycles", sa.Boolean(), nullable=False),
        sa.Column("uses_seven_criteria", sa.Boolean(), nullable=False),
        sa.Column("official_criterion_count", sa.Integer(), nullable=True),
        sa.Column("official_metric_count", sa.Integer(), nullable=True),
        sa.Column("official_metric_count_note", sa.String(length=500), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code", "version", name="uq_naac_framework_code_version"),
    )
    op.create_index(
        op.f("ix_naac_frameworks_id"),
        "naac_frameworks",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_naac_frameworks_code"),
        "naac_frameworks",
        ["code"],
        unique=False,
    )
    op.create_index(
        op.f("ix_naac_frameworks_pathway_type"),
        "naac_frameworks",
        ["pathway_type"],
        unique=False,
    )
    op.create_index(
        op.f("ix_naac_frameworks_institution_category"),
        "naac_frameworks",
        ["institution_category"],
        unique=False,
    )
    op.create_index(
        op.f("ix_naac_frameworks_verification_status"),
        "naac_frameworks",
        ["verification_status"],
        unique=False,
    )

    op.create_table(
        "framework_criteria",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("framework_id", sa.Integer(), nullable=False),
        sa.Column("number", sa.String(length=10), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["framework_id"],
            ["naac_frameworks.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "framework_id",
            "number",
            name="uq_framework_criterion_number",
        ),
    )
    op.create_index(
        op.f("ix_framework_criteria_id"),
        "framework_criteria",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_framework_criteria_framework_id"),
        "framework_criteria",
        ["framework_id"],
        unique=False,
    )

    op.create_table(
        "framework_metrics",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("framework_id", sa.Integer(), nullable=False),
        sa.Column("framework_criterion_id", sa.Integer(), nullable=True),
        sa.Column("official_code", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("required_default", sa.Boolean(), nullable=False),
        sa.Column("metric_kind", sa.String(length=20), nullable=True),
        sa.Column("verification_status", sa.String(length=60), nullable=False),
        sa.Column("maps_to_metric_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["framework_id"],
            ["naac_frameworks.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["framework_criterion_id"],
            ["framework_criteria.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["maps_to_metric_id"],
            ["metrics.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "framework_id",
            "official_code",
            name="uq_framework_metric_code",
        ),
    )
    op.create_index(
        op.f("ix_framework_metrics_id"),
        "framework_metrics",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_framework_metrics_framework_id"),
        "framework_metrics",
        ["framework_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_framework_metrics_framework_criterion_id"),
        "framework_metrics",
        ["framework_criterion_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_framework_metrics_maps_to_metric_id"),
        "framework_metrics",
        ["maps_to_metric_id"],
        unique=False,
    )

    op.add_column(
        "institutions",
        sa.Column("official_category", sa.String(length=80), nullable=True),
    )
    op.add_column(
        "institutions",
        sa.Column("affiliation_status", sa.String(length=80), nullable=True),
    )
    op.add_column(
        "institutions",
        sa.Column("affiliated_university", sa.String(length=200), nullable=True),
    )
    op.add_column(
        "institutions",
        sa.Column("autonomous_status", sa.String(length=40), nullable=True),
    )
    op.add_column(
        "institutions",
        sa.Column("is_constituent_unit", sa.Boolean(), nullable=True),
    )
    op.add_column(
        "institutions",
        sa.Column("parent_institution_name", sa.String(length=200), nullable=True),
    )
    op.add_column(
        "institutions",
        sa.Column("programme_level", sa.String(length=30), nullable=True),
    )
    op.add_column(
        "institutions",
        sa.Column("existing_naac_status", sa.String(length=80), nullable=True),
    )
    op.add_column(
        "institutions",
        sa.Column("previous_cycle_number", sa.String(length=40), nullable=True),
    )
    op.add_column(
        "institutions",
        sa.Column("application_pathway", sa.String(length=80), nullable=True),
    )
    op.add_column(
        "institutions",
        sa.Column("confirmed_framework_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "institutions",
        sa.Column("framework_confirmed_by", sa.Integer(), nullable=True),
    )
    op.add_column(
        "institutions",
        sa.Column("framework_confirmed_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "institutions",
        sa.Column("framework_confirmation_note", sa.String(length=500), nullable=True),
    )
    op.create_index(
        op.f("ix_institutions_official_category"),
        "institutions",
        ["official_category"],
        unique=False,
    )
    op.create_index(
        op.f("ix_institutions_confirmed_framework_id"),
        "institutions",
        ["confirmed_framework_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_institutions_confirmed_framework_id",
        "institutions",
        "naac_frameworks",
        ["confirmed_framework_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_institutions_framework_confirmed_by",
        "institutions",
        "users",
        ["framework_confirmed_by"],
        ["id"],
    )

    op.add_column(
        "institution_requests",
        sa.Column("official_category", sa.String(length=80), nullable=True),
    )
    op.add_column(
        "institution_requests",
        sa.Column("affiliation_status", sa.String(length=80), nullable=True),
    )
    op.add_column(
        "institution_requests",
        sa.Column("affiliated_university", sa.String(length=200), nullable=True),
    )
    op.add_column(
        "institution_requests",
        sa.Column("autonomous_status", sa.String(length=40), nullable=True),
    )
    op.add_column(
        "institution_requests",
        sa.Column("is_constituent_unit", sa.Boolean(), nullable=True),
    )
    op.add_column(
        "institution_requests",
        sa.Column("parent_institution_name", sa.String(length=200), nullable=True),
    )
    op.add_column(
        "institution_requests",
        sa.Column("programme_level", sa.String(length=30), nullable=True),
    )
    op.add_column(
        "institution_requests",
        sa.Column("existing_naac_status", sa.String(length=80), nullable=True),
    )
    op.add_column(
        "institution_requests",
        sa.Column("previous_cycle_number", sa.String(length=40), nullable=True),
    )
    op.add_column(
        "institution_requests",
        sa.Column("application_pathway", sa.String(length=80), nullable=True),
    )
    op.add_column(
        "institution_requests",
        sa.Column("recommended_framework_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "institution_requests",
        sa.Column("recommendation_status", sa.String(length=60), nullable=True),
    )
    op.add_column(
        "institution_requests",
        sa.Column("recommendation_reason", sa.Text(), nullable=True),
    )
    op.add_column(
        "institution_requests",
        sa.Column("confirmed_framework_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "institution_requests",
        sa.Column("framework_override_reason", sa.Text(), nullable=True),
    )
    op.create_index(
        op.f("ix_institution_requests_official_category"),
        "institution_requests",
        ["official_category"],
        unique=False,
    )
    op.create_index(
        op.f("ix_institution_requests_recommended_framework_id"),
        "institution_requests",
        ["recommended_framework_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_institution_requests_recommendation_status"),
        "institution_requests",
        ["recommendation_status"],
        unique=False,
    )
    op.create_index(
        op.f("ix_institution_requests_confirmed_framework_id"),
        "institution_requests",
        ["confirmed_framework_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_institution_requests_recommended_framework_id",
        "institution_requests",
        "naac_frameworks",
        ["recommended_framework_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_institution_requests_confirmed_framework_id",
        "institution_requests",
        "naac_frameworks",
        ["confirmed_framework_id"],
        ["id"],
    )

    op.add_column(
        "accreditation_cycles",
        sa.Column("framework_id", sa.Integer(), nullable=True),
    )
    op.create_index(
        op.f("ix_accreditation_cycles_framework_id"),
        "accreditation_cycles",
        ["framework_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_accreditation_cycles_framework_id",
        "accreditation_cycles",
        "naac_frameworks",
        ["framework_id"],
        ["id"],
    )

    op.add_column(
        "cycle_applicable_metrics",
        sa.Column("exception_type", sa.String(length=40), nullable=True),
    )
    op.add_column(
        "cycle_applicable_metrics",
        sa.Column("justification", sa.Text(), nullable=True),
    )
    op.add_column(
        "cycle_applicable_metrics",
        sa.Column("approved_by", sa.Integer(), nullable=True),
    )
    op.add_column(
        "cycle_applicable_metrics",
        sa.Column("approved_at", sa.DateTime(), nullable=True),
    )
    op.create_foreign_key(
        "fk_cycle_applicable_metrics_approved_by",
        "cycle_applicable_metrics",
        "users",
        ["approved_by"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_cycle_applicable_metrics_approved_by",
        "cycle_applicable_metrics",
        type_="foreignkey",
    )
    op.drop_column("cycle_applicable_metrics", "approved_at")
    op.drop_column("cycle_applicable_metrics", "approved_by")
    op.drop_column("cycle_applicable_metrics", "justification")
    op.drop_column("cycle_applicable_metrics", "exception_type")

    op.drop_constraint(
        "fk_accreditation_cycles_framework_id",
        "accreditation_cycles",
        type_="foreignkey",
    )
    op.drop_index(
        op.f("ix_accreditation_cycles_framework_id"),
        table_name="accreditation_cycles",
    )
    op.drop_column("accreditation_cycles", "framework_id")

    op.drop_constraint(
        "fk_institution_requests_confirmed_framework_id",
        "institution_requests",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_institution_requests_recommended_framework_id",
        "institution_requests",
        type_="foreignkey",
    )
    op.drop_index(
        op.f("ix_institution_requests_confirmed_framework_id"),
        table_name="institution_requests",
    )
    op.drop_index(
        op.f("ix_institution_requests_recommendation_status"),
        table_name="institution_requests",
    )
    op.drop_index(
        op.f("ix_institution_requests_recommended_framework_id"),
        table_name="institution_requests",
    )
    op.drop_index(
        op.f("ix_institution_requests_official_category"),
        table_name="institution_requests",
    )
    for column in (
        "framework_override_reason",
        "confirmed_framework_id",
        "recommendation_reason",
        "recommendation_status",
        "recommended_framework_id",
        "application_pathway",
        "previous_cycle_number",
        "existing_naac_status",
        "programme_level",
        "parent_institution_name",
        "is_constituent_unit",
        "autonomous_status",
        "affiliated_university",
        "affiliation_status",
        "official_category",
    ):
        op.drop_column("institution_requests", column)

    op.drop_constraint(
        "fk_institutions_framework_confirmed_by",
        "institutions",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_institutions_confirmed_framework_id",
        "institutions",
        type_="foreignkey",
    )
    op.drop_index(
        op.f("ix_institutions_confirmed_framework_id"),
        table_name="institutions",
    )
    op.drop_index(
        op.f("ix_institutions_official_category"),
        table_name="institutions",
    )
    for column in (
        "framework_confirmation_note",
        "framework_confirmed_at",
        "framework_confirmed_by",
        "confirmed_framework_id",
        "application_pathway",
        "previous_cycle_number",
        "existing_naac_status",
        "programme_level",
        "parent_institution_name",
        "is_constituent_unit",
        "autonomous_status",
        "affiliated_university",
        "affiliation_status",
        "official_category",
    ):
        op.drop_column("institutions", column)

    op.drop_index(op.f("ix_framework_metrics_maps_to_metric_id"), table_name="framework_metrics")
    op.drop_index(op.f("ix_framework_metrics_framework_criterion_id"), table_name="framework_metrics")
    op.drop_index(op.f("ix_framework_metrics_framework_id"), table_name="framework_metrics")
    op.drop_index(op.f("ix_framework_metrics_id"), table_name="framework_metrics")
    op.drop_table("framework_metrics")

    op.drop_index(op.f("ix_framework_criteria_framework_id"), table_name="framework_criteria")
    op.drop_index(op.f("ix_framework_criteria_id"), table_name="framework_criteria")
    op.drop_table("framework_criteria")

    op.drop_index(op.f("ix_naac_frameworks_verification_status"), table_name="naac_frameworks")
    op.drop_index(op.f("ix_naac_frameworks_institution_category"), table_name="naac_frameworks")
    op.drop_index(op.f("ix_naac_frameworks_pathway_type"), table_name="naac_frameworks")
    op.drop_index(op.f("ix_naac_frameworks_code"), table_name="naac_frameworks")
    op.drop_index(op.f("ix_naac_frameworks_id"), table_name="naac_frameworks")
    op.drop_table("naac_frameworks")
