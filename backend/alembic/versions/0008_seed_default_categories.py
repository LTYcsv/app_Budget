"""Seed default categories for fresh deployments

Revision ID: 0008_seed_default_categories
Revises: 0007_tx_subcategory_id
Create Date: 2026-02-27 00:00:00
"""

from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert as pg_insert


# revision identifiers, used by Alembic.
revision: str = '0008_seed_default_categories'
down_revision: Union[str, None] = '0007_tx_subcategory_id'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


DEFAULT_CATEGORIES: list[dict[str, object]] = [
    {'id': 'transport-taxi', 'group': 'Транспорт', 'name': 'Такси', 'icon': '🚕', 'type': 'expense', 'is_other': False},
    {'id': 'transport-public', 'group': 'Транспорт', 'name': 'Общественный транспорт', 'icon': '🚌', 'type': 'expense', 'is_other': False},
    {'id': 'transport-carsharing', 'group': 'Транспорт', 'name': 'Каршеринг', 'icon': '🚗', 'type': 'expense', 'is_other': False},
    {'id': 'transport-fuel', 'group': 'Транспорт', 'name': 'Топливо', 'icon': '⛽', 'type': 'expense', 'is_other': False},
    {'id': 'transport-parking', 'group': 'Транспорт', 'name': 'Парковка', 'icon': '🅿️', 'type': 'expense', 'is_other': False},
    {'id': 'food-supermarket', 'group': 'Продукты', 'name': 'Супермаркет', 'icon': '🛒', 'type': 'expense', 'is_other': False},
    {'id': 'food-market', 'group': 'Продукты', 'name': 'Рынок', 'icon': '🥬', 'type': 'expense', 'is_other': False},
    {'id': 'food-delivery', 'group': 'Продукты', 'name': 'Доставка еды', 'icon': '🛵', 'type': 'expense', 'is_other': False},
    {'id': 'housing-rent', 'group': 'Жилье', 'name': 'Аренда', 'icon': '🏠', 'type': 'expense', 'is_other': False},
    {'id': 'housing-utilities', 'group': 'Жилье', 'name': 'Коммунальные', 'icon': '🧾', 'type': 'expense', 'is_other': False},
    {'id': 'housing-internet', 'group': 'Жилье', 'name': 'Интернет', 'icon': '🌐', 'type': 'expense', 'is_other': False},
    {'id': 'health-pharmacy', 'group': 'Здоровье', 'name': 'Аптека', 'icon': '💊', 'type': 'expense', 'is_other': False},
    {'id': 'health-doctor', 'group': 'Здоровье', 'name': 'Врач', 'icon': '🩺', 'type': 'expense', 'is_other': False},
    {'id': 'entertainment-cinema', 'group': 'Развлечения', 'name': 'Кино', 'icon': '🎬', 'type': 'expense', 'is_other': False},
    {'id': 'entertainment-games', 'group': 'Развлечения', 'name': 'Игры', 'icon': '🎮', 'type': 'expense', 'is_other': False},
    {'id': 'other-expense', 'group': 'Другое', 'name': 'Другое', 'icon': '📦', 'type': 'expense', 'is_other': True},
    {'id': 'income-salary', 'group': 'Основной доход', 'name': 'Зарплата', 'icon': '💰', 'type': 'income', 'is_other': False},
    {'id': 'income-freelance', 'group': 'Основной доход', 'name': 'Фриланс', 'icon': '💻', 'type': 'income', 'is_other': False},
    {'id': 'income-gift', 'group': 'Разовое поступление', 'name': 'Подарок', 'icon': '🎁', 'type': 'income', 'is_other': False},
    {'id': 'income-investment', 'group': 'Инвестиции', 'name': 'Инвестиции', 'icon': '📈', 'type': 'income', 'is_other': False},
    {'id': 'other-income', 'group': 'Другое', 'name': 'Другое', 'icon': '📦', 'type': 'income', 'is_other': True},
]


def upgrade() -> None:
    bind = op.get_bind()
    categories = sa.table(
        'categories',
        sa.column('id', sa.String(length=64)),
        sa.column('group', sa.String(length=128)),
        sa.column('name', sa.String(length=128)),
        sa.column('icon', sa.String(length=1024)),
        sa.column('type', sa.String(length=16)),
        sa.column('is_other', sa.Boolean()),
        sa.column('created_at', sa.DateTime(timezone=True)),
    )

    values = [
        {
            'id': item['id'],
            'group': item['group'],
            'name': item['name'],
            'icon': item['icon'],
            'type': item['type'],
            'is_other': item['is_other'],
            'created_at': datetime.now(timezone.utc),
        }
        for item in DEFAULT_CATEGORIES
    ]
    stmt = pg_insert(categories).values(values).on_conflict_do_nothing(index_elements=['id'])
    bind.execute(stmt)


def downgrade() -> None:
    bind = op.get_bind()
    categories = sa.table('categories', sa.column('id', sa.String(length=64)))
    ids = [item['id'] for item in DEFAULT_CATEGORIES]
    bind.execute(sa.delete(categories).where(categories.c.id.in_(ids)))
