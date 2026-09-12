"""Phase 2 NAAC accreditation domain

Revision ID: 002_naac_domain
Revises: 001_init_postgresql
Create Date: 2026-09-12

"""
from alembic import op
import sqlalchemy as sa


revision = "002_naac_domain"
down_revision = "001_init_postgresql"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "accreditation_cycles",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("institution_id", sa.String(length=36), sa.ForeignKey("institutions.id"), nullable=False),
        sa.Column("academic_year_id", sa.String(length=36), sa.ForeignKey("academic_years.id"), nullable=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("label", sa.String(), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("ssr_target_percent", sa.Integer(), nullable=False, server_default="85"),
        sa.Column("expected_submission", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "criteria",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("cycle_id", sa.String(length=36), sa.ForeignKey("accreditation_cycles.id"), nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("in_charge_user_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("lead_label", sa.String(), nullable=True),
    )
    op.create_table(
        "key_indicators",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("criterion_id", sa.String(length=36), sa.ForeignKey("criteria.id"), nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_table(
        "metrics",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("key_indicator_id", sa.String(length=36), sa.ForeignKey("key_indicators.id"), nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("weightage", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_table(
        "evidence",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("institution_id", sa.String(length=36), sa.ForeignKey("institutions.id"), nullable=False),
        sa.Column("cycle_id", sa.String(length=36), sa.ForeignKey("accreditation_cycles.id"), nullable=False),
        sa.Column("metric_id", sa.String(length=36), sa.ForeignKey("metrics.id"), nullable=False),
        sa.Column("department_id", sa.String(length=36), sa.ForeignKey("departments.id"), nullable=False),
        sa.Column("file_upload_id", sa.String(length=36), sa.ForeignKey("file_uploads.id"), nullable=False),
        sa.Column("uploaded_by_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("unit", sa.String(), nullable=True),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "submissions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("institution_id", sa.String(length=36), sa.ForeignKey("institutions.id"), nullable=False),
        sa.Column("cycle_id", sa.String(length=36), sa.ForeignKey("accreditation_cycles.id"), nullable=False),
        sa.Column("criterion_id", sa.String(length=36), sa.ForeignKey("criteria.id"), nullable=False),
        sa.Column("department_id", sa.String(length=36), sa.ForeignKey("departments.id"), nullable=False),
        sa.Column("submitted_by_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("ref_code", sa.String(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("correction_note", sa.String(), nullable=True),
        sa.Column("correction_by_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("correction_at", sa.DateTime(), nullable=True),
        sa.Column("assigned_to_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("submitted_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "submission_evidence",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("submission_id", sa.String(length=36), sa.ForeignKey("submissions.id"), nullable=False),
        sa.Column("evidence_id", sa.String(length=36), sa.ForeignKey("evidence.id"), nullable=False),
    )
    op.create_table(
        "review_actions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("submission_id", sa.String(length=36), sa.ForeignKey("submissions.id"), nullable=False),
        sa.Column("stage", sa.String(length=50), nullable=False),
        sa.Column("state", sa.String(length=50), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("assigned_to_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("note", sa.String(), nullable=True),
        sa.Column("acted_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "role_assignments",
        sa.Column("criterion_id", sa.String(length=36), sa.ForeignKey("criteria.id"), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("role_assignments", "criterion_id")
    op.drop_table("review_actions")
    op.drop_table("submission_evidence")
    op.drop_table("submissions")
    op.drop_table("evidence")
    op.drop_table("metrics")
    op.drop_table("key_indicators")
    op.drop_table("criteria")
    op.drop_table("accreditation_cycles")
