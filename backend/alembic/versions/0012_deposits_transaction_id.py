"""savings_deposits: add transaction_id FK

Revision ID: 0012_deposits_transaction_id
Revises: 0011_accounts
Create Date: 2026-03-09
"""
from alembic import op
import sqlalchemy as sa

revision = '0012_deposits_transaction_id'
down_revision = '0011_accounts'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Добавляем ссылку на транзакцию, чтобы при удалении транзакции
    # можно было найти связанный депозит и откатить его.
    op.add_column(
        'savings_deposits',
        sa.Column('transaction_id', sa.String(64), nullable=True),
    )
    op.create_foreign_key(
        'fk_savings_deposits_transaction_id',
        'savings_deposits', 'transactions',
        ['transaction_id'], ['id'],
        onupdate='CASCADE', ondelete='SET NULL',
    )
    op.create_index('ix_savings_deposits_transaction_id', 'savings_deposits', ['transaction_id'])


def downgrade() -> None:
    op.drop_index('ix_savings_deposits_transaction_id', 'savings_deposits')
    op.drop_constraint('fk_savings_deposits_transaction_id', 'savings_deposits', type_='foreignkey')
    op.drop_column('savings_deposits', 'transaction_id')
