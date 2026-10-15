"""Widen metrics.title so official QIF titles can be stored in full.

Revision ID: b4e8f17a3c90
Revises: a7d4e81c6b20

Working-catalogue titles are shorter than 300 characters and are not
rewritten. Downgrade truncates only if a later official title exceeds 300.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b4e8f17a3c90"
down_revision: Union[str, Sequence[str], None] = "a7d4e81c6b20"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "metrics",
        "title",
        existing_type=sa.String(length=300),
        type_=sa.Text(),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "metrics",
        "title",
        existing_type=sa.Text(),
        type_=sa.String(length=300),
        existing_nullable=False,
    )
