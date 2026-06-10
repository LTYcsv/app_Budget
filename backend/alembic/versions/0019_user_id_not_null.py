"""Enforce NOT NULL on user_id for user-owned tables

Revision ID: 0019_user_id_not_null
Revises: 0018_transfer_group_id
Create Date: 2026-06-10

Migration 0013 added user_id as nullable to backfill existing rows, but
models.py declares it NOT NULL — schema drift. Rows with NULL user_id are
unreachable through the API (every query filters by user_id), so they are
deleted before tightening the constraint.
"""
import sqlalchemy as sa
from alembic import op

revision = '0019_user_id_not_null'
down_revision = '0018_transfer_group_id'
branch_labels = None
depends_on = None

_TABLES = ('transactions', 'accounts', 'savings_goals')


def upgrade() -> None:
    for table in _TABLES:
        op.execute(f'DELETE FROM {table} WHERE user_id IS NULL')
        op.alter_column(table, 'user_id', existing_type=sa.String(64), nullable=False)


def downgrade() -> None:
    for table in _TABLES:
        op.alter_column(table, 'user_id', existing_type=sa.String(64), nullable=True)
