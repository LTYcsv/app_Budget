"""Initial schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-02-15 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'categories',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('icon', sa.String(length=1024), nullable=False),
        sa.Column('type', sa.String(length=16), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_categories_type_name', 'categories', ['type', 'name'], unique=False)

    op.create_table(
        'transactions',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('amount', sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column('category', sa.String(length=128), nullable=False),
        sa.Column('icon', sa.String(length=1024), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('time', sa.String(length=5), nullable=False),
        sa.Column('type', sa.String(length=16), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_transactions_date', 'transactions', ['date'], unique=False)
    op.create_index('ix_transactions_type_date', 'transactions', ['type', 'date'], unique=False)
    op.create_index('ix_transactions_created_at', 'transactions', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_transactions_created_at', table_name='transactions')
    op.drop_index('ix_transactions_type_date', table_name='transactions')
    op.drop_index('ix_transactions_date', table_name='transactions')
    op.drop_table('transactions')

    op.drop_index('ix_categories_type_name', table_name='categories')
    op.drop_table('categories')
