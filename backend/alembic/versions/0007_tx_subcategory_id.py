"""Add subcategory_id to transactions

Revision ID: 0007_tx_subcategory_id
Revises: 0006_tx_type_date_group_idx
Create Date: 2026-02-27 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0007_tx_subcategory_id'
down_revision: Union[str, None] = '0006_tx_type_date_group_idx'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('transactions', sa.Column('subcategory_id', sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column('transactions', 'subcategory_id')
