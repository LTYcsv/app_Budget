"""Add FK from transactions.category_id to categories.id

Revision ID: 0005_transactions_category_fk
Revises: 0004_transport_parking
Create Date: 2026-02-27 00:00:00
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '0005_transactions_category_fk'
down_revision: Union[str, None] = '0004_transport_parking'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Null out orphan references before adding FK constraint.
    op.execute(
        """
        UPDATE transactions t
        SET category_id = NULL
        WHERE category_id IS NOT NULL
          AND NOT EXISTS (
              SELECT 1
              FROM categories c
              WHERE c.id = t.category_id
          )
        """
    )

    op.create_index('ix_transactions_category_id', 'transactions', ['category_id'], unique=False)
    op.create_foreign_key(
        'fk_transactions_category_id_categories',
        'transactions',
        'categories',
        ['category_id'],
        ['id'],
        onupdate='CASCADE',
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('fk_transactions_category_id_categories', 'transactions', type_='foreignkey')
    op.drop_index('ix_transactions_category_id', table_name='transactions')
