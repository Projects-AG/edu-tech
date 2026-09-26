"""add document versions

Revision ID: b2b519c42e38
Revises: 4b050111951c
Create Date: 2026-09-21 11:22:56.617963

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b2b519c42e38"
down_revision: Union[str, Sequence[str], None] = "4b050111951c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create document_versions table."""

    op.create_table(
        "document_versions",

        sa.Column(
            "id",
            sa.Integer(),
            nullable=False
        ),

        sa.Column(
            "document_id",
            sa.Integer(),
            nullable=False
        ),

        sa.Column(
            "version_number",
            sa.Integer(),
            nullable=False
        ),

        sa.Column(
            "file_path",
            sa.String(length=500),
            nullable=False
        ),

        sa.Column(
            "file_type",
            sa.String(length=50),
            nullable=True
        ),

        sa.Column(
            "file_size",
            sa.Integer(),
            nullable=True
        ),

        sa.Column(
            "uploaded_by",
            sa.Integer(),
            nullable=False
        ),

        sa.Column(
            "is_current",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true()
        ),

        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False
        ),

        sa.ForeignKeyConstraint(
            ["document_id"],
            ["documents.id"],
            ondelete="CASCADE"
        ),

        sa.ForeignKeyConstraint(
            ["uploaded_by"],
            ["users.id"]
        ),

        sa.PrimaryKeyConstraint("id")
    )

    op.create_index(
        "ix_document_versions_id",
        "document_versions",
        ["id"],
        unique=False
    )

    op.create_index(
        "ix_document_versions_document_id",
        "document_versions",
        ["document_id"],
        unique=False
    )

    op.create_index(
        "ix_document_versions_uploaded_by",
        "document_versions",
        ["uploaded_by"],
        unique=False
    )


def downgrade() -> None:
    """Drop document_versions table."""

    op.drop_index(
        "ix_document_versions_uploaded_by",
        table_name="document_versions"
    )

    op.drop_index(
        "ix_document_versions_document_id",
        table_name="document_versions"
    )

    op.drop_index(
        "ix_document_versions_id",
        table_name="document_versions"
    )

    op.drop_table("document_versions")