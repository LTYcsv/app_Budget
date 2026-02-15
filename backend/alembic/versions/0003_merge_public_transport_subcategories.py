"""Merge metro and bus into public transport subcategory

Revision ID: 0003_merge_public_transport
Revises: 0002_category_subcategory_flow
Create Date: 2026-02-15 21:50:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0003_merge_public_transport'
down_revision: Union[str, None] = '0002_category_subcategory_flow'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE transactions
        SET category_id = 'transport-public',
            category_group = 'Транспорт',
            category = 'Общественный транспорт',
            icon = '🚌'
        WHERE category_id IN ('transport-bus', 'transport-metro')
           OR (category_group = 'Транспорт' AND category IN ('Автобус', 'Метро'))
        """
    )

    op.execute(
        """
        DELETE FROM categories
        WHERE id IN ('transport-bus', 'transport-metro')
        """
    )

    op.execute(
        """
        INSERT INTO categories (id, name, "group", icon, type, is_other, created_at)
        SELECT 'transport-public', 'Общественный транспорт', 'Транспорт', '🚌', 'expense', false, NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM categories WHERE id = 'transport-public'
        )
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM categories
        WHERE id = 'transport-public'
        """
    )

    op.execute(
        """
        INSERT INTO categories (id, name, "group", icon, type, is_other, created_at)
        SELECT 'transport-metro', 'Метро', 'Транспорт', '🚇', 'expense', false, NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM categories WHERE id = 'transport-metro'
        )
        """
    )

    op.execute(
        """
        INSERT INTO categories (id, name, "group", icon, type, is_other, created_at)
        SELECT 'transport-bus', 'Автобус', 'Транспорт', '🚌', 'expense', false, NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM categories WHERE id = 'transport-bus'
        )
        """
    )
