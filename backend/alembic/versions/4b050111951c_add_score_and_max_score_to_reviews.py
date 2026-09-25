"""add score and max_score to reviews

Revision ID: 4b050111951c
Revises: 86ef671b3d5a
Create Date: 2026-09-15 21:19:22.261204

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4b050111951c'
down_revision: Union[str, Sequence[str], None] = '86ef671b3d5a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "reviews",
        sa.Column("score", sa.Float(), nullable=True)
    )

    op.add_column(
        "reviews",
        sa.Column("max_score", sa.Float(), nullable=True)
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("reviews", "max_score")
    op.drop_column("reviews", "score")