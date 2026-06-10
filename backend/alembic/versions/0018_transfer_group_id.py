"""Add transfer_group_id to transactions

Revision ID: 0018_transfer_group_id
Revises: 0017_tx_user_date_indexes
Create Date: 2026-06-10

Both legs of a transfer share one transfer_group_id (UUID), so deleting
one leg can atomically remove its pair. Legacy transfers created before
this migration keep NULL — they are handled leg-by-leg as before.
"""
import sqlalchemy as sa
from alembic import op

revision = '0018_transfer_group_id'
down_revision = '0017_tx_user_date_indexes'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('transactions', sa.Column('transfer_group_id', sa.String(36), nullable=True))
    op.create_index('ix_transactions_transfer_group_id', 'transactions', ['transfer_group_id'])


def downgrade() -> None:
    op.drop_index('ix_transactions_transfer_group_id', table_name='transactions')
    op.drop_column('transactions', 'transfer_group_id')
