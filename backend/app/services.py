import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Category, Transaction
from .schemas import (
    BootstrapOut,
    CategoryCreate,
    CategoryOut,
    TransactionCreate,
    TransactionOut,
    TransactionUpdate,
)

# ─── Default categories ───────────────────────────────────────────────────────

DEFAULT_CATEGORIES: dict[str, list[dict]] = {
    'expense': [
        # Продукты
        {'id': 'food-supermarket',       'group': 'Продукты',          'name': 'Супермаркет',              'icon': '🛒'},
        {'id': 'food-delivery',          'group': 'Продукты',          'name': 'Доставка',                 'icon': '🛵'},
        # Кафе и рестораны
        {'id': 'cafe-coffee',            'group': 'Кафе и рестораны',  'name': 'Кофе с собой',             'icon': '☕'},
        {'id': 'cafe-restaurant',        'group': 'Кафе и рестораны',  'name': 'Ресторан',                 'icon': '🍽️'},
        # Транспорт
        {'id': 'transport-taxi',         'group': 'Транспорт',         'name': 'Такси',                    'icon': '🚕'},
        {'id': 'transport-carsharing',   'group': 'Транспорт',         'name': 'Каршеринг',                'icon': '🚗'},
        {'id': 'transport-public',       'group': 'Транспорт',         'name': 'Общественный транспорт',   'icon': '🚌'},
        {'id': 'transport-fuel',         'group': 'Транспорт',         'name': 'Топливо',                  'icon': '⛽'},
        {'id': 'transport-parking',      'group': 'Транспорт',         'name': 'Парковка',                 'icon': '🅿️'},
        # Жильё
        {'id': 'housing-rent',           'group': 'Жильё',             'name': 'Аренда',                   'icon': '🏠'},
        {'id': 'housing-utilities',      'group': 'Жильё',             'name': 'ЖКХ',                      'icon': '🧾'},
        {'id': 'housing-internet',       'group': 'Жильё',             'name': 'Интернет',                 'icon': '🌐'},
        {'id': 'housing-phone',          'group': 'Жильё',             'name': 'Связь',                    'icon': '📱'},
        # Одежда и обувь
        {'id': 'clothes-clothes',        'group': 'Одежда и обувь',    'name': 'Одежда',                   'icon': '👕'},
        {'id': 'clothes-shoes',          'group': 'Одежда и обувь',    'name': 'Обувь',                    'icon': '👟'},
        {'id': 'clothes-accessories',    'group': 'Одежда и обувь',    'name': 'Аксессуары',               'icon': '👜'},
        # Здоровье
        {'id': 'health-pharmacy',        'group': 'Здоровье',          'name': 'Аптека',                   'icon': '💊'},
        {'id': 'health-doctor',          'group': 'Здоровье',          'name': 'Врач',                     'icon': '🩺'},
        {'id': 'health-fitness',         'group': 'Здоровье',          'name': 'Фитнес',                   'icon': '💪'},
        # Развлечения
        {'id': 'entertainment-cinema',   'group': 'Развлечения',       'name': 'Кино',                     'icon': '🎬'},
        {'id': 'entertainment-games',    'group': 'Развлечения',       'name': 'Игры',                     'icon': '🎮'},
        {'id': 'entertainment-concerts', 'group': 'Развлечения',       'name': 'Концерты',                 'icon': '🎵'},
        # Подписки
        {'id': 'subs-streaming',         'group': 'Подписки',          'name': 'Стриминг',                 'icon': '📺'},
        {'id': 'subs-music',             'group': 'Подписки',          'name': 'Музыка',                   'icon': '🎧'},
        {'id': 'subs-apps',              'group': 'Подписки',          'name': 'Приложения',               'icon': '📲'},
        {'id': 'subs-other',             'group': 'Подписки',          'name': 'Другое',                   'icon': '🔄'},
        # Образование
        {'id': 'edu-courses',            'group': 'Образование',       'name': 'Курсы',                    'icon': '📚'},
        {'id': 'edu-books',              'group': 'Образование',       'name': 'Книги',                    'icon': '📖'},
        {'id': 'edu-stationery',         'group': 'Образование',       'name': 'Канцелярия',               'icon': '✏️'},
        # Путешествия
        {'id': 'travel-flights',         'group': 'Путешествия',       'name': 'Авиабилеты',               'icon': '✈️'},
        {'id': 'travel-hotel',           'group': 'Путешествия',       'name': 'Отель',                    'icon': '🏨'},
        {'id': 'travel-excursions',      'group': 'Путешествия',       'name': 'Экскурсии',                'icon': '🗺️'},
        # Питомцы
        {'id': 'pets-food',              'group': 'Питомцы',           'name': 'Еда',                      'icon': '🐾'},
        {'id': 'pets-vet',               'group': 'Питомцы',           'name': 'Ветеринар',                'icon': '🐶'},
        {'id': 'pets-accessories',       'group': 'Питомцы',           'name': 'Аксессуары',               'icon': '🦴'},
        # Инвестиции
        {'id': 'invest-savings',         'group': 'Инвестиции',        'name': 'Копилка',                  'icon': '🐷'},
        {'id': 'invest-stocks',          'group': 'Инвестиции',        'name': 'Акции',                    'icon': '📈'},
        {'id': 'invest-deposits',        'group': 'Инвестиции',        'name': 'Вклады',                   'icon': '🏦'},
        # Другое
        {'id': 'other-expense',          'group': 'Другое',            'name': 'Другое',                   'icon': '📦', 'is_other': True},
    ],
    'income': [
        # Основной доход
        {'id': 'income-salary',          'group': 'Основной доход',    'name': 'Зарплата',                 'icon': '💰'},
        {'id': 'income-freelance',       'group': 'Основной доход',    'name': 'Фриланс',                  'icon': '💻'},
        {'id': 'income-bonus',           'group': 'Основной доход',    'name': 'Премия',                   'icon': '🎯'},
        # Инвестиции
        {'id': 'income-dividends',       'group': 'Инвестиции',        'name': 'Дивиденды',                'icon': '📊'},
        {'id': 'income-stocks',          'group': 'Инвестиции',        'name': 'Акции',                    'icon': '📈'},
        {'id': 'income-deposits',        'group': 'Инвестиции',        'name': 'Вклады',                   'icon': '🏦'},
        # Разовое
        {'id': 'income-gift',            'group': 'Разовое',           'name': 'Подарок',                  'icon': '🎁'},
        {'id': 'income-sale',            'group': 'Разовое',           'name': 'Продажа',                  'icon': '🤝'},
        {'id': 'income-refund',          'group': 'Разовое',           'name': 'Возврат',                  'icon': '↩️'},
        # Другое
        {'id': 'other-income',           'group': 'Другое',            'name': 'Другое',                   'icon': '📦', 'is_other': True},
    ],
}


def seed_default_categories(db: Session) -> None:
    """Идемпотентный сидинг — вставляет только отсутствующие категории."""
    for cat_type, items in DEFAULT_CATEGORIES.items():
        for item in items:
            existing = db.get(Category, item['id'])
            if not existing:
                db.add(Category(
                    id=item['id'],
                    group=item['group'],
                    name=item['name'],
                    icon=item['icon'],
                    type=cat_type,
                    is_other=item.get('is_other', False),
                ))
    db.commit()


# ─── Categories ───────────────────────────────────────────────────────────────

def get_categories(db: Session) -> dict[str, list[CategoryOut]]:
    categories = db.scalars(select(Category).order_by(Category.type, Category.group, Category.name)).all()
    result: dict[str, list[CategoryOut]] = {'expense': [], 'income': []}
    for cat in categories:
        result[cat.type].append(CategoryOut.model_validate(cat))
    return result


def create_category(db: Session, category_type: str, payload: CategoryCreate) -> CategoryOut:
    if category_type not in ('expense', 'income'):
        raise HTTPException(status_code=422, detail='type must be expense or income')

    category_id = f'cat-{category_type}-{uuid.uuid4().hex[:12]}'
    category = Category(
        id=category_id,
        group=payload.group,
        name=payload.name,
        icon=payload.icon,
        type=category_type,
        is_other=False,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return CategoryOut.model_validate(category)


def delete_category(db: Session, category_type: str, category_id: str) -> None:
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail='Category not found')
    if category.type != category_type:
        raise HTTPException(status_code=404, detail='Category not found')
    if category.is_other:
        raise HTTPException(status_code=400, detail='Cannot delete system category')
    if not category_id.startswith('cat-'):
        raise HTTPException(status_code=400, detail='Cannot delete default category')
    db.delete(category)
    db.commit()


# ─── Transactions ─────────────────────────────────────────────────────────────

def get_transactions(db: Session) -> list[TransactionOut]:
    transactions = db.scalars(
        select(Transaction).order_by(
            Transaction.date.desc(),
            Transaction.time.desc(),
            Transaction.created_at.desc(),
        )
    ).all()
    return [TransactionOut.model_validate(t) for t in transactions]


def create_transaction(db: Session, payload: TransactionCreate) -> TransactionOut:
    transaction = Transaction(
        id=str(uuid.uuid4()),
        name=payload.name,
        amount=payload.amount,
        category_id=payload.category_id,
        subcategory_id=payload.subcategory_id,
        category_group=payload.category_group,
        category=payload.category,
        icon=payload.icon,
        date=payload.date,
        time=payload.time,
        type=payload.type,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return TransactionOut.model_validate(transaction)


def update_transaction(db: Session, transaction_id: str, payload: TransactionUpdate) -> TransactionOut:
    transaction = db.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail='Transaction not found')

    transaction.name = payload.name
    transaction.amount = payload.amount
    transaction.category_id = payload.category_id
    transaction.subcategory_id = payload.subcategory_id
    transaction.category_group = payload.category_group
    transaction.category = payload.category
    transaction.icon = payload.icon
    transaction.date = payload.date
    transaction.time = payload.time
    transaction.type = payload.type

    db.commit()
    db.refresh(transaction)
    return TransactionOut.model_validate(transaction)


def delete_transaction(db: Session, transaction_id: str) -> None:
    transaction = db.get(Transaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail='Transaction not found')
    db.delete(transaction)
    db.commit()


# ─── Bootstrap ────────────────────────────────────────────────────────────────

def get_bootstrap(db: Session) -> BootstrapOut:
    transactions = get_transactions(db)
    categories = get_categories(db)
    return BootstrapOut(transactions=transactions, categories=categories)


# ─── Compatibility aliases for existing routers ──────────────────────────────

def list_transactions(db: Session) -> list[TransactionOut]:
    return get_transactions(db)


def list_categories(db: Session) -> dict[str, list[CategoryOut]]:
    return get_categories(db)
