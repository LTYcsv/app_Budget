"""add savings goals and deposits

Revision ID: 0009_savings_goals
Revises: 0008_seed_default_categories
Create Date: 2026-03-01
"""
from alembic import op
import sqlalchemy as sa

revision = '0009_savings_goals'
down_revision = '0008_seed_default_categories'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'savings_goals',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('photo_url', sa.String(1024), nullable=True),
        sa.Column('target_amount', sa.Numeric(14, 2), nullable=False),
        sa.Column('current_amount', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('deadline', sa.Date, nullable=True),
        sa.Column('status', sa.String(16), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('now()')),
    )
    op.create_index('ix_savings_goals_status', 'savings_goals', ['status'])
    op.create_index('ix_savings_goals_created_at', 'savings_goals', ['created_at'])

    op.create_table(
        'savings_deposits',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('goal_id', sa.String(64),
                  sa.ForeignKey('savings_goals.id', onupdate='CASCADE', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('amount', sa.Numeric(14, 2), nullable=False),
        sa.Column('note', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('now()')),
    )
    op.create_index('ix_savings_deposits_goal_id', 'savings_deposits', ['goal_id'])
    op.create_index('ix_savings_deposits_created_at', 'savings_deposits', ['created_at'])


def downgrade() -> None:
    op.drop_table('savings_deposits')
    op.drop_table('savings_goals')
