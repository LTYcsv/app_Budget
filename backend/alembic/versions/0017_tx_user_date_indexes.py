"""Add composite (user_id, date) indexes to transactions

Revision ID: 0017_tx_user_date_indexes
Revises: 0016_user_profile
Create Date: 2026-06-10

All analytics queries filter by user_id + date range, but the existing
indexes are separate (user_id alone, date alone) or lack user_id
(type+date — legacy from the pre-multiuser era). Composite indexes let
Postgres satisfy these filters with a single index scan.
"""
from alembic import op

revision = '0017_tx_user_date_indexes'
down_revision = '0016_user_profile'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index('ix_transactions_user_date', 'transactions', ['user_id', 'date'])
    op.create_index('ix_transactions_user_type_date', 'transactions', ['user_id', 'type', 'date'])


def downgrade() -> None:
    op.drop_index('ix_transactions_user_type_date', table_name='transactions')
    op.drop_index('ix_transactions_user_date', table_name='transactions')
