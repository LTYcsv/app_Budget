"""
Tests for gamification: streak calculation and achievement unlocking.
"""
import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest

from app.gamification.service import _calc_streak, _check_achievements
from app.models import SavingsDeposit, SavingsGoal, Transaction

from .conftest import make_user, make_transaction

TODAY = date.today()


def add_tx_on(db, user_id, tx_date):
    """Add a single transaction on a given date."""
    db.add(Transaction(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name='тест',
        amount=Decimal('1'),
        category='Прочее',
        icon='📝',
        date=tx_date,
        time='12:00',
        type='expense',
    ))
    db.flush()


# ── Streak calculation ─────────────────────────────────────────────────────────

class TestCalcStreak:
    def test_no_transactions_returns_zero(self, db):
        user = make_user(db)
        current, best = _calc_streak(db, user.id)
        assert current == 0
        assert best == 0

    def test_single_transaction_today_is_streak_of_1(self, db):
        user = make_user(db)
        add_tx_on(db, user.id, TODAY)
        current, best = _calc_streak(db, user.id)
        assert current == 1
        assert best == 1

    def test_consecutive_days_count_correctly(self, db):
        user = make_user(db)
        for i in range(5):
            add_tx_on(db, user.id, TODAY - timedelta(days=i))
        current, best = _calc_streak(db, user.id)
        assert current == 5
        assert best == 5

    def test_gap_resets_current_streak(self, db):
        user = make_user(db)
        add_tx_on(db, user.id, TODAY)
        add_tx_on(db, user.id, TODAY - timedelta(days=1))
        # Gap at day -2
        add_tx_on(db, user.id, TODAY - timedelta(days=3))
        add_tx_on(db, user.id, TODAY - timedelta(days=4))
        current, best = _calc_streak(db, user.id)
        assert current == 2

    def test_best_streak_is_remembered_after_gap(self, db):
        user = make_user(db)
        # 5-day streak in the past
        for i in range(10, 5, -1):
            add_tx_on(db, user.id, TODAY - timedelta(days=i))
        # 2-day current streak
        add_tx_on(db, user.id, TODAY)
        add_tx_on(db, user.id, TODAY - timedelta(days=1))
        current, best = _calc_streak(db, user.id)
        assert current == 2
        assert best == 5

    def test_yesterday_only_counts_as_current_streak_1(self, db):
        """Transaction only yesterday (not today) still counts as current streak."""
        user = make_user(db)
        add_tx_on(db, user.id, TODAY - timedelta(days=1))
        current, best = _calc_streak(db, user.id)
        assert current == 1

    def test_two_days_ago_breaks_current_streak(self, db):
        """Only today or yesterday keeps the streak alive."""
        user = make_user(db)
        add_tx_on(db, user.id, TODAY - timedelta(days=2))
        current, best = _calc_streak(db, user.id)
        assert current == 0
        assert best == 1

    def test_multiple_transactions_same_day_count_once(self, db):
        user = make_user(db)
        add_tx_on(db, user.id, TODAY)
        add_tx_on(db, user.id, TODAY)
        add_tx_on(db, user.id, TODAY)
        current, best = _calc_streak(db, user.id)
        assert current == 1

    def test_other_users_transactions_not_counted(self, db):
        user_a = make_user(db, 'a@example.com')
        user_b = make_user(db, 'b@example.com')
        for i in range(10):
            add_tx_on(db, user_b.id, TODAY - timedelta(days=i))
        current, best = _calc_streak(db, user_a.id)
        assert current == 0


# ── Achievements ───────────────────────────────────────────────────────────────

class TestCheckAchievements:
    def test_no_transactions_no_achievements(self, db):
        user = make_user(db)
        result = _check_achievements(db, user.id, streak_current=0)
        assert result['first_transaction'] is None
        assert result['transactions_10'] is None
        assert result['transactions_100'] is None
        assert result['streak_7'] is None
        assert result['streak_30'] is None

    def test_first_transaction_unlocked_on_first_tx(self, db):
        user = make_user(db)
        add_tx_on(db, user.id, TODAY)
        result = _check_achievements(db, user.id, streak_current=1)
        assert result['first_transaction'] is not None

    def test_transactions_10_unlocked_at_10(self, db):
        user = make_user(db)
        for i in range(10):
            add_tx_on(db, user.id, TODAY - timedelta(days=i))
        result = _check_achievements(db, user.id, streak_current=1)
        assert result['transactions_10'] is not None
        assert result['transactions_100'] is None

    def test_transactions_100_unlocked_at_100(self, db):
        user = make_user(db)
        # Add 100 transactions on different dates (use same date for simplicity)
        for i in range(100):
            db.add(Transaction(
                id=str(uuid.uuid4()),
                user_id=user.id,
                name=f'tx-{i}',
                amount=Decimal('1'),
                category='Прочее',
                icon='📝',
                date=TODAY,
                time='12:00',
                type='expense',
            ))
        db.flush()
        result = _check_achievements(db, user.id, streak_current=1)
        assert result['transactions_100'] is not None

    def test_streak_7_unlocked_when_streak_gte_7(self, db):
        user = make_user(db)
        result = _check_achievements(db, user.id, streak_current=7)
        assert result['streak_7'] is not None

    def test_streak_7_not_unlocked_below_7(self, db):
        user = make_user(db)
        result = _check_achievements(db, user.id, streak_current=6)
        assert result['streak_7'] is None

    def test_streak_30_unlocked_when_streak_gte_30(self, db):
        user = make_user(db)
        result = _check_achievements(db, user.id, streak_current=30)
        assert result['streak_30'] is not None

    def test_first_goal_unlocked_when_goal_exists(self, db):
        user = make_user(db)
        db.add(SavingsGoal(
            id=str(uuid.uuid4()),
            user_id=user.id,
            name='Машина',
            target_amount=Decimal('500000'),
            current_amount=Decimal('0'),
            status='active',
        ))
        db.flush()
        result = _check_achievements(db, user.id, streak_current=0)
        assert result['first_goal'] is not None

    def test_first_deposit_unlocked_when_deposit_exists(self, db):
        user = make_user(db)
        goal = SavingsGoal(
            id=str(uuid.uuid4()),
            user_id=user.id,
            name='Машина',
            target_amount=Decimal('500000'),
            current_amount=Decimal('100'),
            status='active',
        )
        db.add(goal)
        db.flush()
        deposit = SavingsDeposit(
            id=str(uuid.uuid4()),
            goal_id=goal.id,
            amount=Decimal('100'),
        )
        db.add(deposit)
        db.flush()
        result = _check_achievements(db, user.id, streak_current=0)
        assert result['first_deposit'] is not None

    def test_goal_completed_unlocked_when_goal_is_done(self, db):
        user = make_user(db)
        db.add(SavingsGoal(
            id=str(uuid.uuid4()),
            user_id=user.id,
            name='Машина',
            target_amount=Decimal('1000'),
            current_amount=Decimal('1000'),
            status='completed',
        ))
        db.flush()
        result = _check_achievements(db, user.id, streak_current=0)
        assert result['goal_completed'] is not None

    def test_goal_completed_not_unlocked_for_active_goal(self, db):
        user = make_user(db)
        db.add(SavingsGoal(
            id=str(uuid.uuid4()),
            user_id=user.id,
            name='Машина',
            target_amount=Decimal('1000'),
            current_amount=Decimal('500'),
            status='active',
        ))
        db.flush()
        result = _check_achievements(db, user.id, streak_current=0)
        assert result['goal_completed'] is None
