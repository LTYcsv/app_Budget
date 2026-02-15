from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from .models import Category, Transaction
from .schemas import CategoryCreate, DashboardOut, SummaryOut, TransactionCreate, TransactionUpdate

# TODO: вынести в файл подкачки
DEFAULT_CATEGORIES = {
    'expense': [
        {'id': 'food', 'name': 'Продукты', 'icon': '🛒'},
        {'id': 'transport', 'name': 'Транспорт', 'icon': '🚕'},
        {'id': 'entertainment', 'name': 'Развлечения', 'icon': '🎮'},
        {'id': 'subscriptions', 'name': 'Подписки', 'icon': '📱'},
        {'id': 'cafe', 'name': 'Кафе', 'icon': '☕'},
        {'id': 'health', 'name': 'Здоровье', 'icon': '💊'},
        {'id': 'shopping', 'name': 'Покупки', 'icon': '🛍️'},
        {'id': 'other-expense', 'name': 'Другое', 'icon': '📦'},
    ],
    'income': [
        {'id': 'salary', 'name': 'Зарплата', 'icon': '💰'},
        {'id': 'freelance', 'name': 'Фриланс', 'icon': '💻'},
        {'id': 'gift', 'name': 'Подарок', 'icon': '🎁'},
        {'id': 'investment', 'name': 'Инвестиции', 'icon': '📈'},
        {'id': 'other-income', 'name': 'Другое', 'icon': '📦'},
    ],
}


VALID_TYPES = {'income', 'expense'}


def seed_default_categories(db: Session) -> None:
    existing = db.scalar(select(func.count()).select_from(Category)) or 0
    if existing > 0:
        return

    for category_type, items in DEFAULT_CATEGORIES.items():
        for item in items:
            db.add(
                Category(
                    id=item['id'],
                    name=item['name'],
                    icon=item['icon'],
                    type=category_type,
                )
            )
    db.commit()


def _validate_type(item_type: str) -> None:
    if item_type not in VALID_TYPES:
        raise HTTPException(status_code=422, detail='type must be income or expense')


def list_transactions(db: Session) -> list[Transaction]:
    stmt = select(Transaction).order_by(Transaction.date.desc(), Transaction.time.desc(), Transaction.created_at.desc())
    return list(db.scalars(stmt))


def list_categories(db: Session) -> dict[str, list[Category]]:
    items = list(db.scalars(select(Category).order_by(Category.type, Category.name)))
    grouped: dict[str, list[Category]] = defaultdict(list)
    for item in items:
        grouped[item.type].append(item)
    grouped.setdefault('income', [])
    grouped.setdefault('expense', [])
    return grouped


def create_transaction(db: Session, payload: TransactionCreate) -> Transaction:
    _validate_type(payload.type)
    entity = Transaction(**payload.model_dump())
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def update_transaction(db: Session, tx_id: str, payload: TransactionUpdate) -> Transaction:
    _validate_type(payload.type)
    entity = db.get(Transaction, tx_id)
    if not entity:
        raise HTTPException(status_code=404, detail='Transaction not found')

    for key, value in payload.model_dump().items():
        setattr(entity, key, value)

    db.commit()
    db.refresh(entity)
    return entity


def delete_transaction(db: Session, tx_id: str) -> None:
    result = db.execute(delete(Transaction).where(Transaction.id == tx_id))
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail='Transaction not found')
    db.commit()


def create_category(db: Session, category_type: str, payload: CategoryCreate) -> Category:
    _validate_type(category_type)
    category_id = f'cat-{category_type}-{uuid4().hex[:12]}'

    entity = Category(id=category_id, type=category_type, **payload.model_dump())
    db.add(entity)
    db.commit()
    db.refresh(entity)
    return entity


def delete_category(db: Session, category_type: str, category_id: str) -> None:
    _validate_type(category_type)

    category = db.get(Category, category_id)
    if not category or category.type != category_type:
        raise HTTPException(status_code=404, detail='Category not found')

    count_same_type = db.scalar(select(func.count()).select_from(Category).where(Category.type == category_type)) or 0
    if count_same_type <= 1:
        raise HTTPException(status_code=400, detail='Cannot delete last category of this type')

    db.delete(category)
    db.commit()


def summary_for_range(db: Session, date_from: date, date_to: date) -> SummaryOut:
    if date_from > date_to:
        date_from, date_to = date_to, date_from

    stmt = (
        select(
            Transaction.type,
            func.coalesce(func.sum(Transaction.amount), 0),
        )
        .where(Transaction.date >= date_from, Transaction.date <= date_to)
        .group_by(Transaction.type)
    )

    rows = db.execute(stmt).all()
    income = Decimal('0')
    expense = Decimal('0')

    for row_type, total in rows:
        numeric_total = Decimal(total)
        if row_type == 'income':
            income = numeric_total
        elif row_type == 'expense':
            expense = numeric_total

    return SummaryOut(income=income, expense=expense, balance=income - expense)


def _period_bounds(period: str) -> tuple[date, date]:
    today = date.today()
    if period == 'day':
        return today, today
    if period == 'week':
        return today - timedelta(days=6), today
    if period == 'month':
        return today - timedelta(days=29), today
    if period == 'year':
        return today - timedelta(days=364), today
    raise HTTPException(status_code=422, detail='period must be one of day, week, month, year')


def dashboard_for_period(db: Session, period: str) -> DashboardOut:
    date_from, date_to = _period_bounds(period)
    summary = summary_for_range(db, date_from, date_to)
    recent_stmt = (
        select(Transaction)
        .order_by(Transaction.date.desc(), Transaction.time.desc(), Transaction.created_at.desc())
        .limit(5)
    )
    recent = list(db.scalars(recent_stmt))
    return DashboardOut(
        period=period,
        date_from=date_from,
        date_to=date_to,
        summary=summary,
        recent_transactions=recent,
    )
