"""empty message

Revision ID: 8ab2160fd9d6
Revises: 79a4e100db21, e6b3d9a41c57
Create Date: 2026-10-22 22:48:54.878910

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8ab2160fd9d6'
down_revision: Union[str, Sequence[str], None] = ('79a4e100db21', 'e6b3d9a41c57')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
