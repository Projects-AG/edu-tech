"""add committee criterion assignments

Revision ID: 09c06cde96b7
Revises: d3abe2e4b81a
Create Date: 2026-10-02 03:34:57.429696
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "09c06cde96b7"
down_revision: Union[str, Sequence[str], None] = "d3abe2e4b81a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "committee_criterion_assignments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("committee_id", sa.Integer(), nullable=False),
        sa.Column("committee_member_id", sa.Integer(), nullable=False),
        sa.Column("criterion_id", sa.Integer(), nullable=False),
        sa.Column("responsibility", sa.String(length=200), nullable=True),
        sa.Column("assigned_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["committee_id"],
            ["committees.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["committee_member_id"],
            ["committee_members.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["criterion_id"],
            ["criteria.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "committee_member_id",
            "criterion_id",
            name="uq_committee_member_criterion",
        ),
    )

    op.create_index(
        "ix_committee_criterion_assignments_id",
        "committee_criterion_assignments",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_committee_criterion_assignments_committee_id",
        "committee_criterion_assignments",
        ["committee_id"],
        unique=False,
    )

    op.create_index(
        "ix_committee_criterion_assignments_committee_member_id",
        "committee_criterion_assignments",
        ["committee_member_id"],
        unique=False,
    )

    op.create_index(
        "ix_committee_criterion_assignments_criterion_id",
        "committee_criterion_assignments",
        ["criterion_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_committee_criterion_assignments_criterion_id",
        table_name="committee_criterion_assignments",
    )

    op.drop_index(
        "ix_committee_criterion_assignments_committee_member_id",
        table_name="committee_criterion_assignments",
    )

    op.drop_index(
        "ix_committee_criterion_assignments_committee_id",
        table_name="committee_criterion_assignments",
    )

    op.drop_index(
        "ix_committee_criterion_assignments_id",
        table_name="committee_criterion_assignments",
    )

    op.drop_table("committee_criterion_assignments")