"""
Tests for analytics: summary, category spend, trend direction logic.
"""
import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest

from app.analytics.metrics import (
    _direction,
    category_spend_for_range,
    category_trends_for_range,
    summary_for_range,
)
from app.models import Category, Transaction

from .conftest import make_user, make_transaction

TODAY = date.today()
WEEK_AGO = TODAY - timedelta(days=6)


# ── Helpers ────────────────────────────────────────────────────────────────────

def make_expense(db, user_id, amount, group='Еда', name='Продукты', tx_date=None):
    cat_id = f'cat-{group}-{uuid.uuid4().hex[:6]}'
    if not db.get(Category, cat_id):
        db.add(Category(id=cat_id, name=name, group=group, icon='🍕', type='expense'))
        db.flush()
    tx = Transaction(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name=name,
        amount=amount,
        category_id=cat_id,
        category_group=group,
        category=name,
        icon='🍕',
        date=tx_date or TODAY,
        time='12:00',
        type='expense',
    )
    db.add(tx)
    db.flush()
    return tx


def make_income(db, user_id, amount, tx_date=None):
    db.add(Transaction(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name='Зарплата',
        amount=amount,
        category='Зарплата',
        icon='💰',
        date=tx_date or TODAY,
        time='12:00',
        type='income',
    ))
    db.flush()


# ── Summary ────────────────────────────────────────────────────────────────────

class TestSummaryForRange:
    def test_empty_range_returns_zeros(self, db):
        user = make_user(db)
        result = summary_for_range(db, user.id, TODAY, TODAY)
        assert result.income == Decimal('0')
        assert result.expense == Decimal('0')
        assert result.balance == Decimal('0')
        assert result.savings_status == 'no_income'
        assert result.savings_rate is None

    def test_income_only(self, db):
        user = make_user(db)
        make_income(db, user.id, Decimal('5000'))
        result = summary_for_range(db, user.id, TODAY, TODAY)
        assert result.income == Decimal('5000')
        assert result.expense == Decimal('0')
        assert result.balance == Decimal('5000')
        assert result.savings_status == 'surplus'
        assert result.savings_rate == Decimal('100.00')

    def test_expense_only_is_no_income(self, db):
        user = make_user(db)
        make_expense(db, user.id, Decimal('1000'))
        result = summary_for_range(db, user.id, TODAY, TODAY)
        assert result.expense == Decimal('1000')
        assert result.savings_status == 'no_income'

    def test_surplus_savings_rate(self, db):
        user = make_user(db)
        make_income(db, user.id, Decimal('10000'))
        make_expense(db, user.id, Decimal('6000'))
        result = summary_for_range(db, user.id, TODAY, TODAY)
        # savings_rate = (10000 - 6000) / 10000 * 100 = 40%
        assert result.savings_rate == Decimal('40.00')
        assert result.savings_status == 'surplus'

    def test_deficit_when_expense_exceeds_income(self, db):
        user = make_user(db)
        make_income(db, user.id, Decimal('1000'))
        make_expense(db, user.id, Decimal('2000'))
        result = summary_for_range(db, user.id, TODAY, TODAY)
        assert result.balance == Decimal('-1000')
        # savings_rate = (1000-2000)/1000*100 = -100%
        assert result.savings_rate == Decimal('-100.00')
        assert result.savings_status == 'deficit'

    def test_swapped_dates_are_normalised(self, db):
        user = make_user(db)
        make_income(db, user.id, Decimal('3000'))
        # Passing date_to < date_from — should still work
        result = summary_for_range(db, user.id, TODAY, WEEK_AGO)
        assert result.income == Decimal('3000')

    def test_transfers_are_excluded(self, db):
        """Transfer transactions must not appear in income or expense totals."""
        user = make_user(db)
        make_income(db, user.id, Decimal('5000'))
        db.add(Transaction(
            id=str(uuid.uuid4()),
            user_id=user.id,
            name='Перевод → Наличные',
            amount=Decimal('1000'),
            category='Перевод',
            icon='🔄',
            date=TODAY,
            time='12:00',
            type='transfer',
        ))
        db.flush()
        result = summary_for_range(db, user.id, TODAY, TODAY)
        assert result.income == Decimal('5000')
        assert result.expense == Decimal('0')

    def test_date_range_filters_correctly(self, db):
        user = make_user(db)
        make_income(db, user.id, Decimal('1000'), tx_date=WEEK_AGO)
        make_income(db, user.id, Decimal('2000'), tx_date=TODAY)
        # Only query yesterday — should see neither
        yesterday = TODAY - timedelta(days=1)
        result = summary_for_range(db, user.id, yesterday, yesterday)
        assert result.income == Decimal('0')

    def test_other_users_excluded(self, db):
        user_a = make_user(db, 'a@example.com')
        user_b = make_user(db, 'b@example.com')
        make_income(db, user_b.id, Decimal('9999'))
        result = summary_for_range(db, user_a.id, WEEK_AGO, TODAY)
        assert result.income == Decimal('0')


# ── Category spend ─────────────────────────────────────────────────────────────

class TestCategorySpendForRange:
    def test_empty_returns_zero_total(self, db):
        user = make_user(db)
        result = category_spend_for_range(db, user.id, TODAY, TODAY)
        assert result.total == Decimal('0')
        assert result.items == []

    def test_groups_transactions_by_category_group(self, db):
        user = make_user(db)
        make_expense(db, user.id, Decimal('500'), group='Еда')
        make_expense(db, user.id, Decimal('300'), group='Еда')
        make_expense(db, user.id, Decimal('200'), group='Транспорт')
        result = category_spend_for_range(db, user.id, TODAY, TODAY)
        groups = {item.group: item.amount for item in result.items}
        assert groups['Еда'] == Decimal('800')
        assert groups['Транспорт'] == Decimal('200')
        assert result.total == Decimal('1000')

    def test_percents_sum_to_100(self, db):
        user = make_user(db)
        make_expense(db, user.id, Decimal('750'), group='Еда')
        make_expense(db, user.id, Decimal('250'), group='Транспорт')
        result = category_spend_for_range(db, user.id, TODAY, TODAY)
        total_pct = sum(item.percent for item in result.items)
        assert total_pct == Decimal('100.00')

    def test_sorted_by_amount_descending(self, db):
        user = make_user(db)
        make_expense(db, user.id, Decimal('100'), group='Транспорт')
        make_expense(db, user.id, Decimal('900'), group='Еда')
        result = category_spend_for_range(db, user.id, TODAY, TODAY)
        assert result.items[0].group == 'Еда'
        assert result.items[1].group == 'Транспорт'

    def test_income_excluded_from_spend(self, db):
        user = make_user(db)
        make_income(db, user.id, Decimal('5000'))
        make_expense(db, user.id, Decimal('200'), group='Еда')
        result = category_spend_for_range(db, user.id, TODAY, TODAY)
        assert result.total == Decimal('200')

    def test_single_subcategory_matching_group_is_flattened(self, db):
        """When there's only one subcategory and its name == group, subcategories list is emptied."""
        user = make_user(db)
        # One expense where category name == category_group
        cat_id = f'cat-flat-{uuid.uuid4().hex[:6]}'
        db.add(Category(id=cat_id, name='Транспорт', group='Транспорт', icon='🚗', type='expense'))
        db.flush()
        db.add(Transaction(
            id=str(uuid.uuid4()),
            user_id=user.id,
            name='Метро',
            amount=Decimal('100'),
            category_id=cat_id,
            category_group='Транспорт',
            category='Транспорт',
            icon='🚇',
            date=TODAY,
            time='12:00',
            type='expense',
        ))
        db.flush()
        result = category_spend_for_range(db, user.id, TODAY, TODAY)
        assert result.items[0].subcategories == []


# ── Trend direction ────────────────────────────────────────────────────────────

class TestDirection:
    """_direction is a pure function — test it in isolation."""

    def test_none_trend_is_new(self):
        assert _direction(None) == 'new'

    def test_above_threshold_is_up(self):
        assert _direction(Decimal('15.01')) == 'up'
        assert _direction(Decimal('100')) == 'up'

    def test_exactly_at_up_threshold_is_stable(self):
        assert _direction(Decimal('15')) == 'stable'

    def test_below_threshold_is_down(self):
        assert _direction(Decimal('-10.01')) == 'down'
        assert _direction(Decimal('-50')) == 'down'

    def test_exactly_at_down_threshold_is_stable(self):
        assert _direction(Decimal('-10')) == 'stable'

    def test_zero_is_stable(self):
        assert _direction(Decimal('0')) == 'stable'

    def test_small_positive_is_stable(self):
        assert _direction(Decimal('5')) == 'stable'

    def test_small_negative_is_stable(self):
        assert _direction(Decimal('-5')) == 'stable'


# ── Category trends ────────────────────────────────────────────────────────────

class TestCategoryTrends:
    def test_new_category_direction_is_new(self, db):
        user = make_user(db)
        # Expense only in current period, nothing in previous
        make_expense(db, user.id, Decimal('500'), group='Еда', tx_date=TODAY)
        prev_from = TODAY - timedelta(days=60)
        prev_to = TODAY - timedelta(days=31)
        result = category_trends_for_range(db, user.id, TODAY, TODAY, prev_from, prev_to)
        item = next(i for i in result.items if i.group == 'Еда')
        assert item.direction == 'new'

    def test_increased_spend_direction_is_up(self, db):
        user = make_user(db)
        prev_from = TODAY - timedelta(days=60)
        prev_to = TODAY - timedelta(days=31)
        mid = TODAY - timedelta(days=40)
        make_expense(db, user.id, Decimal('100'), group='Еда', tx_date=mid)   # prev
        make_expense(db, user.id, Decimal('200'), group='Еда', tx_date=TODAY)  # current (+100%)
        result = category_trends_for_range(db, user.id, TODAY, TODAY, prev_from, prev_to)
        item = next(i for i in result.items if i.group == 'Еда')
        assert item.direction == 'up'

    def test_decreased_spend_direction_is_down(self, db):
        user = make_user(db)
        prev_from = TODAY - timedelta(days=60)
        prev_to = TODAY - timedelta(days=31)
        mid = TODAY - timedelta(days=40)
        make_expense(db, user.id, Decimal('500'), group='Еда', tx_date=mid)   # prev
        make_expense(db, user.id, Decimal('100'), group='Еда', tx_date=TODAY)  # current (-80%)
        result = category_trends_for_range(db, user.id, TODAY, TODAY, prev_from, prev_to)
        item = next(i for i in result.items if i.group == 'Еда')
        assert item.direction == 'down'

    def test_stable_spend_direction_is_stable(self, db):
        user = make_user(db)
        prev_from = TODAY - timedelta(days=60)
        prev_to = TODAY - timedelta(days=31)
        mid = TODAY - timedelta(days=40)
        make_expense(db, user.id, Decimal('100'), group='Еда', tx_date=mid)
        make_expense(db, user.id, Decimal('105'), group='Еда', tx_date=TODAY)  # +5%
        result = category_trends_for_range(db, user.id, TODAY, TODAY, prev_from, prev_to)
        item = next(i for i in result.items if i.group == 'Еда')
        assert item.direction == 'stable'
