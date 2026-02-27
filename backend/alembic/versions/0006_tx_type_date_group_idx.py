"""Add composite index for expense grouping analytics

Revision ID: 0006_tx_type_date_group_idx
Revises: 0005_transactions_category_fk
Create Date: 2026-02-27 00:00:00
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '0006_tx_type_date_group_idx'
down_revision: Union[str, None] = '0005_transactions_category_fk'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        'ix_transactions_type_date_group',
        'transactions',
        ['type', 'date', 'category_group'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index('ix_transactions_type_date_group', table_name='transactions')
