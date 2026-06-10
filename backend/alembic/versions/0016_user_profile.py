"""Add display_name and avatar columns to users

Revision ID: 0016_user_profile
Revises: 0015_transfer_direction
Create Date: 2026-06-10

Moves the profile (name + emoji avatar) from frontend localStorage into
the database so it syncs across devices.
"""
import sqlalchemy as sa
from alembic import op

revision = '0016_user_profile'
down_revision = '0015_transfer_direction'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('display_name', sa.String(64), nullable=True))
    op.add_column('users', sa.Column('avatar', sa.String(16), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'avatar')
    op.drop_column('users', 'display_name')
