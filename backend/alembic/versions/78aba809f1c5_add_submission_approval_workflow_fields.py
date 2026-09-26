"""add submission approval workflow fields

Revision ID: 78aba809f1c5
Revises: b2b519c42e38
Create Date: 2026-09-26 12:11:54.623251

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '78aba809f1c5'
down_revision: Union[str, Sequence[str], None] = 'b2b519c42e38'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add review and approval tracking fields to submissions."""

    op.add_column(
        "submissions",
        sa.Column("reviewed_by", sa.Integer(), nullable=True)
    )

    op.add_column(
        "submissions",
        sa.Column("reviewed_at", sa.DateTime(), nullable=True)
    )

    op.add_column(
        "submissions",
        sa.Column("approved_by", sa.Integer(), nullable=True)
    )

    op.add_column(
        "submissions",
        sa.Column("approved_at", sa.DateTime(), nullable=True)
    )

    op.add_column(
        "submissions",
        sa.Column("final_approved_by", sa.Integer(), nullable=True)
    )

    op.add_column(
        "submissions",
        sa.Column("final_approved_at", sa.DateTime(), nullable=True)
    )

    op.add_column(
        "submissions",
        sa.Column("change_request_reason", sa.Text(), nullable=True)
    )

    op.add_column(
        "submissions",
        sa.Column("rejection_reason", sa.Text(), nullable=True)
    )

    op.add_column(
        "submissions",
        sa.Column("final_submitted_at", sa.DateTime(), nullable=True)
    )


def downgrade() -> None:
    """Remove review and approval tracking fields from submissions."""

    op.drop_column("submissions", "final_submitted_at")
    op.drop_column("submissions", "rejection_reason")
    op.drop_column("submissions", "change_request_reason")
    op.drop_column("submissions", "final_approved_at")
    op.drop_column("submissions", "final_approved_by")
    op.drop_column("submissions", "approved_at")
    op.drop_column("submissions", "approved_by")
    op.drop_column("submissions", "reviewed_at")
    op.drop_column("submissions", "reviewed_by")