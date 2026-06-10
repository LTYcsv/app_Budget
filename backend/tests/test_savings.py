"""
Tests for savings goals: interest accrual, feasibility calculation, deposits.
"""
import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest
from fastapi import HTTPException

from app.models import SavingsDeposit, SavingsGoal, Transaction
from app.savings.service import (
    _accrue_due_interest,
    _calc_forecast,
    _income_expense_90,
    _compute_next_interest_date,
    add_deposit,
)
from app.savings.schemas import DepositCreate

from .conftest import make_user, make_account, make_transaction


# ── Interest date computation ──────────────────────────────────────────────────

class TestComputeNextInterestDate:
    def test_monthly_advances_one_month(self):
        d = date(2026, 1, 15)
        assert _compute_next_interest_date('monthly', d) == date(2026, 2, 15)

    def test_monthly_wraps_december_to_january(self):
        d = date(2026, 12, 10)
        assert _compute_next_interest_date('monthly', d) == date(2027, 1, 10)

    def test_monthly_clamps_to_last_day_of_month(self):
        d = date(2026, 1, 31)
        result = _compute_next_interest_date('monthly', d)
        # February has 28 days in 2026
        assert result == date(2026, 2, 28)

    def test_yearly_advances_one_year(self):
        d = date(2026, 6, 15)
        assert _compute_next_interest_date('yearly', d) == date(2027, 6, 15)

    def test_yearly_handles_leap_day(self):
        d = date(2024, 2, 29)
        result = _compute_next_interest_date('yearly', d)
        # 2025 is not a leap year — clamp to Feb 28
        assert result == date(2025, 2, 28)


# ── Interest accrual ──────────────────────────────────────────────────────────

def _make_goal(db, user_id, *, current=Decimal('1000'), target=Decimal('10000'),
               rate=Decimal('12'), frequency='monthly', next_date=None) -> SavingsGoal:
    goal = SavingsGoal(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name='Тест цель',
        target_amount=target,
        current_amount=current,
        status='active',
        interest_rate=rate,
        interest_frequency=frequency,
        interest_next_date=next_date or date.today() - timedelta(days=1),
    )
    db.add(goal)
    db.flush()
    return goal


class TestAccrueDueInterest:
    def test_accrues_monthly_interest(self, db):
        user = make_user(db)
        goal = _make_goal(db, user.id, current=Decimal('1200'), rate=Decimal('12'))
        # 1200 * 12% / 12 months = 12.00
        _accrue_due_interest(db, goal)
        assert goal.current_amount == Decimal('1212.00')

    def test_accrues_yearly_interest(self, db):
        user = make_user(db)
        goal = _make_goal(
            db, user.id,
            current=Decimal('1000'),
            rate=Decimal('10'),
            frequency='yearly',
        )
        # 1000 * 10% = 100.00
        _accrue_due_interest(db, goal)
        assert goal.current_amount == Decimal('1100.00')

    def test_no_accrual_when_next_date_is_future(self, db):
        user = make_user(db)
        goal = _make_goal(db, user.id, next_date=date.today() + timedelta(days=30))
        original = goal.current_amount
        accrued = _accrue_due_interest(db, goal)
        assert not accrued
        assert goal.current_amount == original

    def test_goal_completes_when_target_reached_by_interest(self, db):
        user = make_user(db)
        # 9990 + 10% yearly = 9990 + 999 = 10989 > 10000
        goal = _make_goal(
            db, user.id,
            current=Decimal('9990'),
            target=Decimal('10000'),
            rate=Decimal('10'),
            frequency='yearly',
        )
        _accrue_due_interest(db, goal)
        assert goal.status == 'completed'

    def test_no_accrual_on_completed_goal(self, db):
        user = make_user(db)
        goal = _make_goal(db, user.id)
        goal.status = 'completed'
        db.flush()
        original = goal.current_amount
        accrued = _accrue_due_interest(db, goal)
        assert not accrued
        assert goal.current_amount == original

    def test_no_accrual_without_interest_rate(self, db):
        user = make_user(db)
        goal = SavingsGoal(
            id=str(uuid.uuid4()),
            user_id=user.id,
            name='Без процентов',
            target_amount=Decimal('5000'),
            current_amount=Decimal('1000'),
            status='active',
            interest_rate=None,
        )
        db.add(goal)
        db.flush()
        accrued = _accrue_due_interest(db, goal)
        assert not accrued


# ── Feasibility forecast ───────────────────────────────────────────────────────

class TestCalcForecast:
    def _seed_income_expense(self, db, user_id, income, expense):
        """Create transactions in the last 90 days to feed the forecast."""
        from app.models import Transaction as Tx
        for amount, tx_type in [(income, 'income'), (expense, 'expense')]:
            db.add(Tx(
                id=str(uuid.uuid4()),
                user_id=user_id,
                name='seed',
                amount=amount,
                category='Прочее',
                icon='💰',
                date=date.today() - timedelta(days=10),
                time='12:00',
                type=tx_type,
            ))
        db.flush()

    def test_no_data_returns_no_data_feasibility(self, db):
        user = make_user(db)
        forecast = _calc_forecast(*_income_expense_90(db, user.id), Decimal('10000'), Decimal('0'), None)
        assert forecast.feasibility == 'no_data'

    def test_easily_feasible_when_required_is_small(self, db):
        user = make_user(db)
        # 3000/month income, need 100/month (3.3% of monthly avg)
        self._seed_income_expense(db, user.id, income=Decimal('9000'), expense=Decimal('0'))
        deadline = date.today() + timedelta(days=90)
        forecast = _calc_forecast(*_income_expense_90(db, user.id), Decimal('300'), Decimal('0'), deadline)
        assert forecast.feasibility == 'easily'

    def test_unrealistic_when_required_exceeds_balance(self, db):
        user = make_user(db)
        # 300/month net, need 10000/month
        self._seed_income_expense(db, user.id, income=Decimal('1200'), expense=Decimal('300'))
        deadline = date.today() + timedelta(days=30)
        forecast = _calc_forecast(*_income_expense_90(db, user.id), Decimal('100000'), Decimal('0'), deadline)
        assert forecast.feasibility == 'unrealistic'

    def test_no_deadline_returns_feasible(self, db):
        user = make_user(db)
        self._seed_income_expense(db, user.id, income=Decimal('3000'), expense=Decimal('1000'))
        forecast = _calc_forecast(*_income_expense_90(db, user.id), Decimal('50000'), Decimal('0'), deadline=None)
        # No deadline → required_monthly = 0 → feasible
        assert forecast.feasibility == 'feasible'


# ── Deposit creation ──────────────────────────────────────────────────────────

class TestAddDeposit:
    def test_deposit_increases_goal_amount(self, db):
        user = make_user(db)
        goal = _make_goal(db, user.id, current=Decimal('0'), target=Decimal('1000'), rate=None)
        goal.interest_rate = None
        goal.interest_frequency = None
        goal.interest_next_date = None
        db.flush()

        payload = DepositCreate(amount=Decimal('200'), note='первый взнос')
        add_deposit(db, user.id, goal.id, payload)

        db.refresh(goal)
        assert goal.current_amount == Decimal('200.00')

    def test_deposit_creates_expense_transaction(self, db):
        user = make_user(db)
        goal = _make_goal(db, user.id, current=Decimal('0'), target=Decimal('1000'), rate=None)
        goal.interest_rate = None
        goal.interest_frequency = None
        goal.interest_next_date = None
        db.flush()

        payload = DepositCreate(amount=Decimal('150'))
        add_deposit(db, user.id, goal.id, payload)

        tx = db.query(Transaction).filter(Transaction.user_id == user.id).first()
        assert tx is not None
        assert tx.type == 'expense'
        assert tx.category_id == 'invest-savings'

    def test_deposit_completes_goal_when_target_reached(self, db):
        user = make_user(db)
        goal = _make_goal(db, user.id, current=Decimal('900'), target=Decimal('1000'), rate=None)
        goal.interest_rate = None
        goal.interest_frequency = None
        goal.interest_next_date = None
        db.flush()

        payload = DepositCreate(amount=Decimal('100'))
        add_deposit(db, user.id, goal.id, payload)

        db.refresh(goal)
        assert goal.status == 'completed'

    def test_deposit_to_completed_goal_raises(self, db):
        user = make_user(db)
        goal = _make_goal(db, user.id)
        goal.status = 'completed'
        db.flush()

        with pytest.raises(HTTPException) as exc:
            add_deposit(db, user.id, goal.id, DepositCreate(amount=Decimal('100')))
        assert exc.value.status_code == 400

    def test_deposit_to_nonexistent_goal_raises(self, db):
        user = make_user(db)
        with pytest.raises(HTTPException) as exc:
            add_deposit(db, user.id, 'nonexistent-goal-id', DepositCreate(amount=Decimal('100')))
        assert exc.value.status_code == 404
