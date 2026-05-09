"""Add transfer_direction column to transactions

Revision ID: 0015_transfer_direction
Revises: 0014_auth_security
Create Date: 2026-05-09

Backfills existing transfer rows using the name-embedded arrows that
_calc_balance previously relied on. After this migration the name field
is no longer load-bearing for direction detection.
"""
import sqlalchemy as sa
from alembic import op

revision = '0015_transfer_direction'
down_revision = '0014_auth_security'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'transactions',
        sa.Column('transfer_direction', sa.String(3), nullable=True),
    )

    op.execute("""
        UPDATE transactions
        SET transfer_direction = 'out'
        WHERE type = 'transfer' AND name LIKE '%→%'
    """)
    op.execute("""
        UPDATE transactions
        SET transfer_direction = 'in'
        WHERE type = 'transfer' AND name LIKE '%←%'
    """)

    op.create_index('ix_transactions_transfer_direction', 'transactions', ['transfer_direction'])


def downgrade() -> None:
    op.drop_index('ix_transactions_transfer_direction', table_name='transactions')
    op.drop_column('transactions', 'transfer_direction')
