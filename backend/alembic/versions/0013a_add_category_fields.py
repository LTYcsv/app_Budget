"""Add user_id, parent_id, sort_order, is_hidden to categories

Revision ID: a1b2c3d4e5f6
Revises: 0013_add_users
Create Date: 2026-03-14
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = 'a1b2c3d4e5f6'
down_revision = '0013_add_users'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Добавляем новые колонки в categories
    op.add_column('categories',
        sa.Column('user_id', sa.String(64), nullable=True)
    )
    op.add_column('categories',
        sa.Column('parent_id', sa.String(64), nullable=True)
    )
    op.add_column('categories',
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0')
    )
    op.add_column('categories',
        sa.Column('is_hidden', sa.Boolean(), nullable=False, server_default='false')
    )

    # Внешние ключи
    op.create_foreign_key(
        'fk_categories_user_id',
        'categories', 'users',
        ['user_id'], ['id'],
        onupdate='CASCADE', ondelete='CASCADE',
    )
    op.create_foreign_key(
        'fk_categories_parent_id',
        'categories', 'categories',
        ['parent_id'], ['id'],
        onupdate='CASCADE', ondelete='CASCADE',
    )

    # Индексы
    op.create_index('ix_categories_user_id', 'categories', ['user_id'])
    op.create_index('ix_categories_parent_id', 'categories', ['parent_id'])


def downgrade() -> None:
    op.drop_index('ix_categories_parent_id', table_name='categories')
    op.drop_index('ix_categories_user_id', table_name='categories')
    op.drop_constraint('fk_categories_parent_id', 'categories', type_='foreignkey')
    op.drop_constraint('fk_categories_user_id', 'categories', type_='foreignkey')
    op.drop_column('categories', 'is_hidden')
    op.drop_column('categories', 'sort_order')
    op.drop_column('categories', 'parent_id')
    op.drop_column('categories', 'user_id')
