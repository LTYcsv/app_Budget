"""Add users table and user_id FK to all user-owned tables

Revision ID: 0013_add_users
Revises: 0012_deposits_transaction_id
Create Date: 2026-03-11
"""
from alembic import op
import sqlalchemy as sa

revision = '0013_add_users'
down_revision = '0012_deposits_transaction_id'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Создаём таблицу users ─────────────────────────────────────────────
    op.create_table(
        'users',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # ── 2. accounts: добавляем user_id ───────────────────────────────────────
    op.add_column('accounts', sa.Column('user_id', sa.String(64), nullable=True))
    op.create_foreign_key(
        'fk_accounts_user_id',
        'accounts', 'users',
        ['user_id'], ['id'],
        onupdate='CASCADE', ondelete='CASCADE',
    )
    op.create_index('ix_accounts_user_id', 'accounts', ['user_id'])

    # ── 3. transactions: добавляем user_id ───────────────────────────────────
    op.add_column('transactions', sa.Column('user_id', sa.String(64), nullable=True))
    op.create_foreign_key(
        'fk_transactions_user_id',
        'transactions', 'users',
        ['user_id'], ['id'],
        onupdate='CASCADE', ondelete='CASCADE',
    )
    op.create_index('ix_transactions_user_id', 'transactions', ['user_id'])

    # ── 4. savings_goals: добавляем user_id ──────────────────────────────────
    op.add_column('savings_goals', sa.Column('user_id', sa.String(64), nullable=True))
    op.create_foreign_key(
        'fk_savings_goals_user_id',
        'savings_goals', 'users',
        ['user_id'], ['id'],
        onupdate='CASCADE', ondelete='CASCADE',
    )
    op.create_index('ix_savings_goals_user_id', 'savings_goals', ['user_id'])

    # Примечание: существующие строки получат user_id = NULL.
    # Это нормально для dev-среды — данные тестовые.
    # В продакшне нужно было бы сначала создать дефолтного пользователя.


def downgrade() -> None:
    op.drop_index('ix_savings_goals_user_id', 'savings_goals')
    op.drop_constraint('fk_savings_goals_user_id', 'savings_goals', type_='foreignkey')
    op.drop_column('savings_goals', 'user_id')

    op.drop_index('ix_transactions_user_id', 'transactions')
    op.drop_constraint('fk_transactions_user_id', 'transactions', type_='foreignkey')
    op.drop_column('transactions', 'user_id')

    op.drop_index('ix_accounts_user_id', 'accounts')
    op.drop_constraint('fk_accounts_user_id', 'accounts', type_='foreignkey')
    op.drop_column('accounts', 'user_id')

    op.drop_index('ix_users_email', 'users')
    op.drop_table('users')
