"""Add weightage and text title on official framework metrics.

Revision ID: f3c9d02b7a11
Revises: e1a7b62c4d90
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f3c9d02b7a11"
down_revision: Union[str, Sequence[str], None] = "e1a7b62c4d90"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "framework_metrics",
        "title",
        existing_type=sa.String(length=300),
        type_=sa.Text(),
        existing_nullable=False,
    )
    op.add_column(
        "framework_metrics",
        sa.Column("weightage", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("framework_metrics", "weightage")
    op.alter_column(
        "framework_metrics",
        "title",
        existing_type=sa.Text(),
        type_=sa.String(length=300),
        existing_nullable=False,
    )
