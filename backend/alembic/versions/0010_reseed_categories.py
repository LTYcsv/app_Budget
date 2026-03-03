"""reseed categories full restructure

Revision ID: 0010_reseed_categories
Revises: 0009_savings_goals
Create Date: 2026-03-02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = '0010_reseed_categories'
down_revision = '0009_savings_goals'
branch_labels = None
depends_on = None

# Полный список финальных категорий
CATEGORIES = [
    # expense
    ('food-supermarket',       'Продукты',         'Супермаркет',            '🛒',  'expense', False),
    ('food-delivery',          'Продукты',         'Доставка',               '🛵',  'expense', False),
    ('cafe-coffee',            'Кафе и рестораны', 'Кофе с собой',           '☕',  'expense', False),
    ('cafe-restaurant',        'Кафе и рестораны', 'Ресторан',               '🍽️', 'expense', False),
    ('transport-taxi',         'Транспорт',        'Такси',                  '🚕',  'expense', False),
    ('transport-carsharing',   'Транспорт',        'Каршеринг',              '🚗',  'expense', False),
    ('transport-public',       'Транспорт',        'Общественный транспорт', '🚌',  'expense', False),
    ('transport-fuel',         'Транспорт',        'Топливо',                '⛽',  'expense', False),
    ('transport-parking',      'Транспорт',        'Парковка',               '🅿️', 'expense', False),
    ('housing-rent',           'Жильё',            'Аренда',                 '🏠',  'expense', False),
    ('housing-utilities',      'Жильё',            'ЖКХ',                    '🧾',  'expense', False),
    ('housing-internet',       'Жильё',            'Интернет',               '🌐',  'expense', False),
    ('housing-phone',          'Жильё',            'Связь',                  '📱',  'expense', False),
    ('clothes-clothes',        'Одежда и обувь',   'Одежда',                 '👕',  'expense', False),
    ('clothes-shoes',          'Одежда и обувь',   'Обувь',                  '👟',  'expense', False),
    ('clothes-accessories',    'Одежда и обувь',   'Аксессуары',             '👜',  'expense', False),
    ('health-pharmacy',        'Здоровье',         'Аптека',                 '💊',  'expense', False),
    ('health-doctor',          'Здоровье',         'Врач',                   '🩺',  'expense', False),
    ('health-fitness',         'Здоровье',         'Фитнес',                 '💪',  'expense', False),
    ('entertainment-cinema',   'Развлечения',      'Кино',                   '🎬',  'expense', False),
    ('entertainment-games',    'Развлечения',      'Игры',                   '🎮',  'expense', False),
    ('entertainment-concerts', 'Развлечения',      'Концерты',               '🎵',  'expense', False),
    ('subs-streaming',         'Подписки',         'Стриминг',               '📺',  'expense', False),
    ('subs-music',             'Подписки',         'Музыка',                 '🎧',  'expense', False),
    ('subs-apps',              'Подписки',         'Приложения',             '📲',  'expense', False),
    ('subs-other',             'Подписки',         'Другое',                 '🔄',  'expense', False),
    ('edu-courses',            'Образование',      'Курсы',                  '📚',  'expense', False),
    ('edu-books',              'Образование',      'Книги',                  '📖',  'expense', False),
    ('edu-stationery',         'Образование',      'Канцелярия',             '✏️', 'expense', False),
    ('travel-flights',         'Путешествия',      'Авиабилеты',             '✈️', 'expense', False),
    ('travel-hotel',           'Путешествия',      'Отель',                  '🏨',  'expense', False),
    ('travel-excursions',      'Путешествия',      'Экскурсии',              '🗺️', 'expense', False),
    ('pets-food',              'Питомцы',          'Еда',                    '🐾',  'expense', False),
    ('pets-vet',               'Питомцы',          'Ветеринар',              '🐶',  'expense', False),
    ('pets-accessories',       'Питомцы',          'Аксессуары',             '🦴',  'expense', False),
    ('invest-savings',         'Инвестиции',       'Копилка',                '🐷',  'expense', False),
    ('invest-stocks',          'Инвестиции',       'Акции',                  '📈',  'expense', False),
    ('invest-deposits',        'Инвестиции',       'Вклады',                 '🏦',  'expense', False),
    ('other-expense',          'Другое',           'Другое',                 '📦',  'expense', True),
    # income
    ('income-salary',          'Основной доход',   'Зарплата',               '💰',  'income',  False),
    ('income-freelance',       'Основной доход',   'Фриланс',                '💻',  'income',  False),
    ('income-bonus',           'Основной доход',   'Премия',                 '🎯',  'income',  False),
    ('income-dividends',       'Инвестиции',       'Дивиденды',              '📊',  'income',  False),
    ('income-stocks',          'Инвестиции',       'Акции',                  '📈',  'income',  False),
    ('income-deposits',        'Инвестиции',       'Вклады',                 '🏦',  'income',  False),
    ('income-gift',            'Разовое',          'Подарок',                '🎁',  'income',  False),
    ('income-sale',            'Разовое',          'Продажа',                '🤝',  'income',  False),
    ('income-refund',          'Разовое',          'Возврат',                '↩️', 'income',  False),
    ('other-income',           'Другое',           'Другое',                 '📦',  'income',  True),
]

# Старые id которые нужно удалить (переименованные/удалённые)
REMOVED_IDS = [
    'food-market',           # рынок удалён
    'cafe-breakfast',        # завтраки → ресторан
    'cafe-lunch',            # обеды → ресторан
    'cafe-dinner',           # ужины → ресторан
    'cafe-bars',             # бары удалены
    'housing-phone-old',     # телефон → связь (старый id если был)
    'housing-communal',      # коммунальные → ЖКХ (старый id если был)
    'invest-crypto',         # крипто удалено
    'invest-other',          # другое инвестиции удалено
]


def upgrade() -> None:
    conn = op.get_bind()

    # Upsert всех финальных категорий
    for (cat_id, group, name, icon, cat_type, is_other) in CATEGORIES:
        conn.execute(text("""
            INSERT INTO categories (id, "group", name, icon, type, is_other, created_at)
            VALUES (:id, :group, :name, :icon, :type, :is_other, now())
            ON CONFLICT (id) DO UPDATE SET
                "group" = EXCLUDED."group",
                name    = EXCLUDED.name,
                icon    = EXCLUDED.icon,
                type    = EXCLUDED.type,
                is_other = EXCLUDED.is_other
        """), {'id': cat_id, 'group': group, 'name': name, 'icon': icon, 'type': cat_type, 'is_other': is_other})

    # Удаляем устаревшие системные категории (только если нет транзакций)
    for old_id in REMOVED_IDS:
        conn.execute(text("""
            DELETE FROM categories
            WHERE id = :id
            AND NOT EXISTS (SELECT 1 FROM transactions WHERE category_id = :id)
        """), {'id': old_id})


def downgrade() -> None:
    # Откат не реализован — слишком деструктивно
    pass
