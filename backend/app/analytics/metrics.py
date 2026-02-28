from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Category, Transaction

from .schemas import (
    CategorySpendItem,
    CategorySpendOut,
    DashboardOut,
    DashboardPeriod,
    SubcategorySpendItem,
    SummaryOut,
)


# ─── Summary: CF + SR ─────────────────────────────────────────────────────────

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
        numeric_total = Decimal(str(total))
        if row_type == 'income':
            income = numeric_total
        elif row_type == 'expense':
            expense = numeric_total

    # CF
    balance = income - expense

    # SR
    if income > 0:
        savings_rate = ((income - expense) / income * Decimal('100')).quantize(Decimal('0.01'))
        savings_status = 'surplus' if savings_rate >= 0 else 'deficit'
    else:
        savings_rate = None
        savings_status = 'no_income'

    return SummaryOut(
        income=income,
        expense=expense,
        balance=balance,
        savings_rate=savings_rate,
        savings_status=savings_status,
    )


# ─── Category spend с подкатегориями ──────────────────────────────────────────

def category_spend_for_range(db: Session, date_from: date, date_to: date) -> CategorySpendOut:
    if date_from > date_to:
        date_from, date_to = date_to, date_from

    group_icon_subquery = (
        select(
            Category.group.label('group'),
            func.min(Category.icon).label('group_icon'),
        )
        .where(Category.type == 'expense')
        .group_by(Category.group)
        .subquery()
    )

    # Шаг 1: получаем суммы по каждой (группа, подкатегория/категория)
    group_label = func.coalesce(Category.group, Transaction.category_group, Transaction.category).label('group')
    name_label = func.coalesce(Category.name, Transaction.category).label('name')
    subcategory_icon_label = func.coalesce(
        func.min(func.coalesce(Category.icon, Transaction.icon)), '📦'
    ).label('subcategory_icon')
    group_icon_label = func.coalesce(
        group_icon_subquery.c.group_icon,
        subcategory_icon_label,
        '📦',
    ).label('group_icon')
    amount_label = func.coalesce(func.sum(Transaction.amount), 0).label('amount')

    stmt = (
        select(group_label, name_label, subcategory_icon_label, group_icon_label, amount_label)
        .select_from(Transaction)
        .outerjoin(Category, Transaction.category_id == Category.id)
        .outerjoin(group_icon_subquery, group_icon_subquery.c.group == group_label)
        .where(
            Transaction.type == 'expense',
            Transaction.date >= date_from,
            Transaction.date <= date_to,
        )
        .group_by(group_label, name_label, group_icon_subquery.c.group_icon)
        .order_by(amount_label.desc())
    )

    rows = db.execute(stmt).all()

    # Шаг 2: агрегируем по группам, собираем подкатегории
    # group_data: { group_name: { icon, total, subcategories: [...] } }
    group_data: dict[str, dict] = {}

    for row in rows:
        group = row.group
        amount = Decimal(str(row.amount))

        if group not in group_data:
            group_data[group] = {
                'icon': row.group_icon,
                'total': Decimal('0'),
                'subcategories': [],
            }

        group_data[group]['total'] += amount
        group_data[group]['subcategories'].append({
            'name': row.name,
            'icon': row.subcategory_icon,
            'amount': amount,
        })

    # Шаг 3: считаем итог и проценты
    total = sum(g['total'] for g in group_data.values())

    items: list[CategorySpendItem] = []

    for group, data in sorted(group_data.items(), key=lambda x: x[1]['total'], reverse=True):
        group_total = data['total']

        # Доля группы от общих расходов
        percent = (
            (group_total / total * Decimal('100')).quantize(Decimal('0.01'))
            if total > 0 else Decimal('0')
        )

        # Подкатегории — доля от суммы группы
        subcategories: list[SubcategorySpendItem] = []
        for sub in sorted(data['subcategories'], key=lambda x: x['amount'], reverse=True):
            percent_of_group = (
                (sub['amount'] / group_total * Decimal('100')).quantize(Decimal('0.01'))
                if group_total > 0 else Decimal('0')
            )
            subcategories.append(SubcategorySpendItem(
                name=sub['name'],
                icon=sub['icon'],
                amount=sub['amount'],
                percent_of_group=percent_of_group,
            ))

        # Если подкатегория одна и совпадает с группой — не показываем
        if len(subcategories) == 1 and subcategories[0].name == group:
            subcategories = []

        items.append(CategorySpendItem(
            group=group,
            icon=data['icon'],
            amount=group_total,
            percent=percent,
            subcategories=subcategories,
        ))

    return CategorySpendOut(total=total, items=items)


# ─── Period bounds ─────────────────────────────────────────────────────────────

def period_bounds(period: DashboardPeriod) -> tuple[date, date]:
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


# ─── Dashboard ────────────────────────────────────────────────────────────────

def dashboard_for_period(db: Session, period: DashboardPeriod) -> DashboardOut:
    date_from, date_to = period_bounds(period)
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
