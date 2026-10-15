"""Baseline of the existing PostgreSQL schema.

Revision ID: c4f8a91d2e70
Revises: None

This revision represents the current populated EduVerse PostgreSQL
database as the Alembic head.

The 22 live application tables already exist and contain development
data. This file is a stamp-only baseline:

- upgrade() does not create, alter, or drop any objects
- downgrade() does not create, alter, or drop any objects
- do not run alembic upgrade against this existing database
- stamp this revision to replace the orphan alembic_version value
  b2b519c42e38, whose revision file does not exist

Future schema changes must be incremental revisions with this
revision as down_revision.
"""

from typing import Sequence, Union

revision: str = "c4f8a91d2e70"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Existing PostgreSQL schema is already in place.
    # Do not recreate or drop application tables here.
    pass


def downgrade() -> None:
    # Do not drop the existing populated schema.
    pass
