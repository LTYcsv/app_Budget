"""merge_heads2

Revision ID: a1be5e9a5f55
Revises: 0013_add_users, a1b2c3d4e5f6
Create Date: 2026-03-14 09:24:38.391784
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1be5e9a5f55'
down_revision: Union[str, None] = ('0013_add_users', 'a1b2c3d4e5f6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
