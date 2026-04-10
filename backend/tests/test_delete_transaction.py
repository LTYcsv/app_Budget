"""
Tests for delete_transaction — the non-trivial cascade logic:
  - deletes linked SavingsDeposit
  - reduces goal.current_amount
  - reverts goal status from 'completed' back to 'active' if balance drops below target
"""
import uuid
from decimal import Decimal

import pytest
from fastapi import HTTPException

from app.services import delete_transaction
from app.models import SavingsDeposit, SavingsGoal, Transaction

from .conftest import make_user, make_transaction


def make_goal(db, user_id, current=Decimal('0'), target=Decimal('1000'),
              status='active') -> SavingsGoal:
    goal = SavingsGoal(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name='Тест цель',
        target_amount=target,
        current_amount=current,
        status=status,
    )
    db.add(goal)
    db.flush()
    return goal


def make_deposit(db, goal_id, transaction_id, amount) -> SavingsDeposit:
    deposit = SavingsDeposit(
        id=str(uuid.uuid4()),
        goal_id=goal_id,
        transaction_id=transaction_id,
        amount=amount,
    )
    db.add(deposit)
    db.flush()
    return deposit


class TestDeleteTransaction:
    def test_simple_transaction_deleted(self, db):
        user = make_user(db)
        tx = make_transaction(db, user.id, None, 'expense', Decimal('100'))
        delete_transaction(db, user.id, tx.id)
        assert db.get(Transaction, tx.id) is None

    def test_nonexistent_transaction_raises_404(self, db):
        user = make_user(db)
        with pytest.raises(HTTPException) as exc:
            delete_transaction(db, user.id, 'no-such-id')
        assert exc.value.status_code == 404

    def test_other_users_transaction_raises_404(self, db):
        user_a = make_user(db, 'a@example.com')
        user_b = make_user(db, 'b@example.com')
        tx = make_transaction(db, user_a.id, None, 'expense', Decimal('100'))
        with pytest.raises(HTTPException) as exc:
            delete_transaction(db, user_b.id, tx.id)
        assert exc.value.status_code == 404

    def test_deletes_linked_deposit(self, db):
        user = make_user(db)
        goal = make_goal(db, user.id, current=Decimal('200'), target=Decimal('1000'))
        tx = make_transaction(db, user.id, None, 'expense', Decimal('200'))
        deposit = make_deposit(db, goal.id, tx.id, Decimal('200'))

        delete_transaction(db, user.id, tx.id)

        assert db.get(Transaction, tx.id) is None
        assert db.get(SavingsDeposit, deposit.id) is None

    def test_reduces_goal_current_amount(self, db):
        user = make_user(db)
        goal = make_goal(db, user.id, current=Decimal('500'), target=Decimal('1000'))
        tx = make_transaction(db, user.id, None, 'expense', Decimal('300'))
        make_deposit(db, goal.id, tx.id, Decimal('300'))

        delete_transaction(db, user.id, tx.id)

        db.refresh(goal)
        assert goal.current_amount == Decimal('200')

    def test_goal_amount_never_goes_below_zero(self, db):
        """Deposit amount larger than current_amount — clamp to 0."""
        user = make_user(db)
        goal = make_goal(db, user.id, current=Decimal('50'), target=Decimal('1000'))
        tx = make_transaction(db, user.id, None, 'expense', Decimal('200'))
        make_deposit(db, goal.id, tx.id, Decimal('200'))

        delete_transaction(db, user.id, tx.id)

        db.refresh(goal)
        assert goal.current_amount == Decimal('0')

    def test_completed_goal_reverts_to_active(self, db):
        """Deleting the deposit that pushed goal to 'completed' must revert it to 'active'."""
        user = make_user(db)
        goal = make_goal(db, user.id, current=Decimal('1000'), target=Decimal('1000'),
                         status='completed')
        tx = make_transaction(db, user.id, None, 'expense', Decimal('500'))
        make_deposit(db, goal.id, tx.id, Decimal('500'))

        delete_transaction(db, user.id, tx.id)

        db.refresh(goal)
        assert goal.status == 'active'
        assert goal.current_amount == Decimal('500')

    def test_completed_goal_stays_completed_if_still_above_target(self, db):
        """If goal remains >= target after deletion, it stays 'completed'."""
        user = make_user(db)
        goal = make_goal(db, user.id, current=Decimal('1200'), target=Decimal('1000'),
                         status='completed')
        tx = make_transaction(db, user.id, None, 'expense', Decimal('100'))
        make_deposit(db, goal.id, tx.id, Decimal('100'))

        delete_transaction(db, user.id, tx.id)

        db.refresh(goal)
        assert goal.status == 'completed'
        assert goal.current_amount == Decimal('1100')

    def test_transaction_without_deposit_deleted_cleanly(self, db):
        """Regular expense with no savings link — no deposit logic runs."""
        user = make_user(db)
        goal = make_goal(db, user.id, current=Decimal('500'), target=Decimal('1000'))
        tx = make_transaction(db, user.id, None, 'expense', Decimal('100'))
        # No deposit linked to this transaction

        delete_transaction(db, user.id, tx.id)

        db.refresh(goal)
        assert goal.current_amount == Decimal('500')  # unchanged
