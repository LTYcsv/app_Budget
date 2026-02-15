"""Add category grouping and transaction category references

Revision ID: 0002_category_subcategory_flow
Revises: 0001_initial_schema
Create Date: 2026-02-15 21:20:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0002_category_subcategory_flow'
down_revision: Union[str, None] = '0001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('categories', sa.Column('group', sa.String(length=128), nullable=True))
    op.add_column('categories', sa.Column('is_other', sa.Boolean(), nullable=False, server_default=sa.false()))

    op.execute("UPDATE categories SET \"group\" = name WHERE \"group\" IS NULL")
    op.execute("UPDATE categories SET is_other = true WHERE lower(name) = 'другое'")

    op.alter_column('categories', 'group', existing_type=sa.String(length=128), nullable=False)
    op.alter_column('categories', 'is_other', server_default=None)
    op.create_index('ix_categories_type_group_name', 'categories', ['type', 'group', 'name'], unique=False)

    op.add_column('transactions', sa.Column('category_id', sa.String(length=64), nullable=True))
    op.add_column('transactions', sa.Column('category_group', sa.String(length=128), nullable=True))

    op.execute("UPDATE transactions SET category_group = category WHERE category_group IS NULL")


def downgrade() -> None:
    op.drop_column('transactions', 'category_group')
    op.drop_column('transactions', 'category_id')

    op.drop_index('ix_categories_type_group_name', table_name='categories')
    op.drop_column('categories', 'is_other')
    op.drop_column('categories', 'group')
