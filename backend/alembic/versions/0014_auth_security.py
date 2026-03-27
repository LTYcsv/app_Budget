"""Auth security hardening: refresh token revocation, password reset, email verification

Revision ID: 0014_auth_security
Revises: a1be5e9a5f55
Create Date: 2026-03-26

Changes:
- users: add is_verified column
- refresh_tokens: new table for server-side token revocation
- password_reset_tokens: new table for one-time reset tokens (1-hour expiry)
"""
import sqlalchemy as sa
from alembic import op

revision = '0014_auth_security'
down_revision = 'a1be5e9a5f55'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Add email verification flag to users ───────────────────────────────
    op.add_column(
        'users',
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'),
    )

    # ── 2. Refresh token registry (server-side revocation) ───────────────────
    op.create_table(
        'refresh_tokens',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('user_id', sa.String(64), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('jti', sa.String(64), nullable=False, unique=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_refresh_tokens_jti', 'refresh_tokens', ['jti'], unique=True)
    op.create_index('ix_refresh_tokens_user_id', 'refresh_tokens', ['user_id'])

    # ── 3. Password reset tokens (one-time, 1-hour expiry) ───────────────────
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('user_id', sa.String(64), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_hash', sa.String(64), nullable=False, unique=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_password_reset_tokens_token_hash', 'password_reset_tokens', ['token_hash'], unique=True)
    op.create_index('ix_password_reset_tokens_user_id', 'password_reset_tokens', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_password_reset_tokens_user_id', 'password_reset_tokens')
    op.drop_index('ix_password_reset_tokens_token_hash', 'password_reset_tokens')
    op.drop_table('password_reset_tokens')

    op.drop_index('ix_refresh_tokens_user_id', 'refresh_tokens')
    op.drop_index('ix_refresh_tokens_jti', 'refresh_tokens')
    op.drop_table('refresh_tokens')

    op.drop_column('users', 'is_verified')
