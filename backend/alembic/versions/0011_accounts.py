"""accounts and savings interest

Revision ID: 0011_accounts
Revises: 0010_reseed_categories
Create Date: 2026-03-06
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = '0011_accounts'
down_revision = '0010_reseed_categories'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Создаём таблицу accounts ──────────────────────────────────────────
    op.create_table(
        'accounts',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('name', sa.String(128), nullable=False),
        sa.Column('color', sa.String(32), nullable=False, server_default='#6366F1'),
        sa.Column('initial_balance', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_accounts_created_at', 'accounts', ['created_at'])

    # ── 2. Добавляем account_id в transactions ────────────────────────────────
    op.add_column('transactions', sa.Column('account_id', sa.String(64), nullable=True))
    op.create_foreign_key(
        'fk_transactions_account_id',
        'transactions', 'accounts',
        ['account_id'], ['id'],
        onupdate='CASCADE', ondelete='SET NULL',
    )
    op.create_index('ix_transactions_account_id', 'transactions', ['account_id'])

    # ── 3. Добавляем поля процентов в savings_goals ───────────────────────────
    op.add_column('savings_goals', sa.Column('interest_rate', sa.Numeric(5, 2), nullable=True))
    op.add_column('savings_goals', sa.Column('interest_frequency', sa.String(16), nullable=True))
    op.add_column('savings_goals', sa.Column('interest_next_date', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('savings_goals', 'interest_next_date')
    op.drop_column('savings_goals', 'interest_frequency')
    op.drop_column('savings_goals', 'interest_rate')

    op.drop_index('ix_transactions_account_id', 'transactions')
    op.drop_constraint('fk_transactions_account_id', 'transactions', type_='foreignkey')
    op.drop_column('transactions', 'account_id')

    op.drop_index('ix_accounts_created_at', 'accounts')
    op.drop_table('accounts')
