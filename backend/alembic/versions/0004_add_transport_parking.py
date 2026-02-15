"""Add parking transport subcategory

Revision ID: 0004_transport_parking
Revises: 0003_merge_public_transport
Create Date: 2026-02-15 22:05:00
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '0004_transport_parking'
down_revision: Union[str, None] = '0003_merge_public_transport'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO categories (id, name, "group", icon, type, is_other, created_at)
        SELECT 'transport-parking', 'Парковка', 'Транспорт', '🅿️', 'expense', false, NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM categories WHERE id = 'transport-parking'
        )
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM categories
        WHERE id = 'transport-parking'
        """
    )
