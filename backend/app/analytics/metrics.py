import calendar
from datetime import date, timedelta
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Category, Transaction

from .schemas import (
    CategorySpendItem,
    CategorySpendOut,
    CategoryTrendItem,
    CategoryTrendsOut,
    DashboardOut,
    DashboardPeriod,
    SubcategorySpendItem,
    SummaryOut,
)

_TREND_UP_THRESHOLD = Decimal('15')
_TREND_DOWN_THRESHOLD = Decimal('-10')


# ─── Summary: CF + SR ─────────────────────────────────────────────────────────

def summary_for_range(db: Session, date_from: date, date_to: date) -> SummaryOut:
    if date_from > date_to:
        date_from, date_to = date_to, date_from

    stmt = (
        select(Transaction.type, func.coalesce(func.sum(Transaction.amount), 0))
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

    balance = income - expense

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

    group_label = func.coalesce(Category.group, Transaction.category_group, Transaction.category).label('group')
    name_label = func.coalesce(Category.name, Transaction.category).label('name')
    icon_label = func.coalesce(func.min(func.coalesce(Category.icon, Transaction.icon)), '📦').label('icon')
    amount_label = func.coalesce(func.sum(Transaction.amount), 0).label('amount')

    stmt = (
        select(group_label, name_label, icon_label, amount_label)
        .select_from(Transaction)
        .outerjoin(Category, Transaction.category_id == Category.id)
        .where(
            Transaction.type == 'expense',
            Transaction.date >= date_from,
            Transaction.date <= date_to,
        )
        .group_by(group_label, name_label)
        .order_by(amount_label.desc())
    )

    rows = db.execute(stmt).all()
    group_data: dict[str, dict] = {}

    for row in rows:
        group = row.group
        amount = Decimal(str(row.amount))
        if group not in group_data:
            group_data[group] = {'icon': row.icon, 'total': Decimal('0'), 'subcategories': []}
        group_data[group]['total'] += amount
        group_data[group]['subcategories'].append({'name': row.name, 'icon': row.icon, 'amount': amount})

    total = sum(g['total'] for g in group_data.values())
    items: list[CategorySpendItem] = []

    for group, data in sorted(group_data.items(), key=lambda x: x[1]['total'], reverse=True):
        group_total = data['total']
        percent = (
            (group_total / total * Decimal('100')).quantize(Decimal('0.01'))
            if total > 0 else Decimal('0')
        )

        subcategories: list[SubcategorySpendItem] = []
        for sub in sorted(data['subcategories'], key=lambda x: x['amount'], reverse=True):
            percent_of_group = (
                (sub['amount'] / group_total * Decimal('100')).quantize(Decimal('0.01'))
                if group_total > 0 else Decimal('0')
            )
            subcategories.append(SubcategorySpendItem(
                name=sub['name'], icon=sub['icon'],
                amount=sub['amount'], percent_of_group=percent_of_group,
            ))

        if len(subcategories) == 1 and subcategories[0].name == group:
            subcategories = []

        items.append(CategorySpendItem(
            group=group, icon=data['icon'],
            amount=group_total, percent=percent, subcategories=subcategories,
        ))

    return CategorySpendOut(total=total, items=items)


# ─── Category trends ──────────────────────────────────────────────────────────

def _calc_prev_period(date_from: date, date_to: date) -> tuple[date, date]:
    """Целый месяц → предыдущий месяц. Иначе → сдвиг на N дней."""
    last_day = calendar.monthrange(date_from.year, date_from.month)[1]
    is_full_month = date_from.day == 1 and date_to == date(date_from.year, date_from.month, last_day)

    if is_full_month:
        prev_to = date_from - timedelta(days=1)
        prev_from = prev_to.replace(day=1)
    else:
        delta = date_to - date_from
        prev_to = date_from - timedelta(days=1)
        prev_from = prev_to - delta

    return prev_from, prev_to


def _fetch_group_amounts(db: Session, date_from: date, date_to: date) -> dict[str, dict]:
    """Возвращает {group: {icon, amount}} за период."""
    group_label = func.coalesce(
        Category.group, Transaction.category_group, Transaction.category
    ).label('group')
    icon_label = func.coalesce(
        func.min(func.coalesce(Category.icon, Transaction.icon)), '📦'
    ).label('icon')
    amount_label = func.coalesce(func.sum(Transaction.amount), 0).label('amount')

    stmt = (
        select(group_label, icon_label, amount_label)
        .select_from(Transaction)
        .outerjoin(Category, Transaction.category_id == Category.id)
        .where(
            Transaction.type == 'expense',
            Transaction.date >= date_from,
            Transaction.date <= date_to,
        )
        .group_by(group_label)
    )

    return {
        row.group: {'icon': row.icon, 'amount': Decimal(str(row.amount))}
        for row in db.execute(stmt).all()
    }


def _direction(trend_percent: Decimal | None) -> str:
    if trend_percent is None:
        return 'new'
    if trend_percent > _TREND_UP_THRESHOLD:
        return 'up'
    if trend_percent < _TREND_DOWN_THRESHOLD:
        return 'down'
    return 'stable'


def category_trends_for_range(
    db: Session,
    date_from: date,
    date_to: date,
    prev_date_from: date | None = None,
    prev_date_to: date | None = None,
) -> CategoryTrendsOut:
    if date_from > date_to:
        date_from, date_to = date_to, date_from

    if prev_date_from is None or prev_date_to is None:
        prev_date_from, prev_date_to = _calc_prev_period(date_from, date_to)

    current = _fetch_group_amounts(db, date_from, date_to)
    prev = _fetch_group_amounts(db, prev_date_from, prev_date_to)

    items: list[CategoryTrendItem] = []

    for group, current_data in current.items():
        current_amount = current_data['amount']
        prev_data = prev.get(group)
        prev_amount = prev_data['amount'] if prev_data else Decimal('0')
        icon = current_data['icon']

        trend_percent = (
            ((current_amount - prev_amount) / prev_amount * Decimal('100')).quantize(Decimal('0.01'))
            if prev_amount > Decimal('0') else None
        )

        items.append(CategoryTrendItem(
            group=group,
            icon=icon,
            current_amount=current_amount,
            prev_amount=prev_amount,
            trend_percent=trend_percent,
            direction=_direction(trend_percent),
        ))

    items.sort(key=lambda x: x.current_amount, reverse=True)

    return CategoryTrendsOut(
        date_from=date_from,
        date_to=date_to,
        prev_date_from=prev_date_from,
        prev_date_to=prev_date_to,
        items=items,
    )


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
        period=period, date_from=date_from, date_to=date_to,
        summary=summary, recent_transactions=recent,
    )
