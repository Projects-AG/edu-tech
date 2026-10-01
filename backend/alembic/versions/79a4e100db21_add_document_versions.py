"""add document versions

Revision ID: 79a4e100db21
Revises: 4b050111951c
Create Date: 2026-09-24 05:06:56.473136

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '79a4e100db21'
down_revision: Union[str, Sequence[str], None] = '4b050111951c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
