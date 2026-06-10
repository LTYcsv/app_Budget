"""
Tests for account balance calculation and transfer logic.
"""
from decimal import Decimal

import pytest
from fastapi import HTTPException

from app.accounts.service import _calc_balance, create_transfer
from app.accounts.schemas import TransferCreate
from app.models import Transaction

from .conftest import make_user, make_account, make_transaction


# ── Balance calculation ────────────────────────────────────────────────────────

class TestCalcBalance:
    def test_empty_account_returns_initial_balance(self, db):
        user = make_user(db)
        account = make_account(db, user.id, initial_balance=Decimal('1000'))
        assert _calc_balance(db, account) == Decimal('1000.00')

    def test_income_adds_to_balance(self, db):
        user = make_user(db)
        account = make_account(db, user.id, initial_balance=Decimal('500'))
        make_transaction(db, user.id, account.id, 'income', Decimal('200'))
        assert _calc_balance(db, account) == Decimal('700.00')

    def test_expense_subtracts_from_balance(self, db):
        user = make_user(db)
        account = make_account(db, user.id, initial_balance=Decimal('1000'))
        make_transaction(db, user.id, account.id, 'expense', Decimal('300'))
        assert _calc_balance(db, account) == Decimal('700.00')

    def test_multiple_transactions(self, db):
        user = make_user(db)
        account = make_account(db, user.id, initial_balance=Decimal('100'))
        make_transaction(db, user.id, account.id, 'income', Decimal('500'))
        make_transaction(db, user.id, account.id, 'income', Decimal('200'))
        make_transaction(db, user.id, account.id, 'expense', Decimal('150'))
        make_transaction(db, user.id, account.id, 'expense', Decimal('50'))
        # 100 + 700 - 200 = 600
        assert _calc_balance(db, account) == Decimal('600.00')

    def test_balance_can_be_negative(self, db):
        user = make_user(db)
        account = make_account(db, user.id, initial_balance=Decimal('0'))
        make_transaction(db, user.id, account.id, 'expense', Decimal('500'))
        assert _calc_balance(db, account) == Decimal('-500.00')

    def test_transfer_out_reduces_balance(self, db):
        # Since migration 0015, direction is stored in transfer_direction column, not name
        user = make_user(db)
        account = make_account(db, user.id, initial_balance=Decimal('1000'))
        tx = Transaction(
            id='tx-out',
            user_id=user.id,
            account_id=account.id,
            name='Перевод: Наличные',
            amount=Decimal('300'),
            category='Перевод',
            icon='🔄',
            date=__import__('datetime').date.today(),
            time='12:00',
            type='transfer',
            transfer_direction='out',
        )
        db.add(tx)
        db.flush()
        assert _calc_balance(db, account) == Decimal('700.00')

    def test_transfer_in_increases_balance(self, db):
        # Since migration 0015, direction is stored in transfer_direction column, not name
        user = make_user(db)
        account = make_account(db, user.id, initial_balance=Decimal('500'))
        tx = Transaction(
            id='tx-in',
            user_id=user.id,
            account_id=account.id,
            name='Перевод: Карта',
            amount=Decimal('200'),
            category='Перевод',
            icon='🔄',
            date=__import__('datetime').date.today(),
            time='12:00',
            type='transfer',
            transfer_direction='in',
        )
        db.add(tx)
        db.flush()
        assert _calc_balance(db, account) == Decimal('700.00')

    def test_other_users_transactions_do_not_affect_balance(self, db):
        """SECURITY: transactions from another user must not pollute this account's balance."""
        user_a = make_user(db, 'a@example.com')
        user_b = make_user(db, 'b@example.com')
        account = make_account(db, user_a.id, initial_balance=Decimal('1000'))

        # Attacker (user_b) creates a transaction pointing at user_a's account_id
        attacker_tx = Transaction(
            id='attacker-tx',
            user_id=user_b.id,         # different user
            account_id=account.id,     # but pointing at victim's account
            name='Атака',
            amount=Decimal('9999'),
            category='Прочее',
            icon='💀',
            date=__import__('datetime').date.today(),
            time='00:00',
            type='income',
        )
        db.add(attacker_tx)
        db.flush()

        # Balance must remain unchanged
        assert _calc_balance(db, account) == Decimal('1000.00')

    def test_decimal_precision(self, db):
        """Floating-point trap: 0.1 + 0.2 should equal 0.30, not 0.30000000000000004."""
        user = make_user(db)
        account = make_account(db, user.id, initial_balance=Decimal('0'))
        make_transaction(db, user.id, account.id, 'income', Decimal('0.10'))
        make_transaction(db, user.id, account.id, 'income', Decimal('0.20'))
        assert _calc_balance(db, account) == Decimal('0.30')


# ── Transfer logic ─────────────────────────────────────────────────────────────

class TestCreateTransfer:
    def _make_payload(self, from_id, to_id, amount=Decimal('100')):
        return TransferCreate(
            from_account_id=from_id,
            to_account_id=to_id,
            amount=amount,
            date=__import__('datetime').date.today(),
            time='12:00',
        )

    def test_transfer_moves_funds(self, db):
        user = make_user(db)
        src = make_account(db, user.id, 'Источник', initial_balance=Decimal('500'))
        dst = make_account(db, user.id, 'Получатель', initial_balance=Decimal('0'))

        create_transfer(db, user.id, self._make_payload(src.id, dst.id, Decimal('200')))

        assert _calc_balance(db, src) == Decimal('300.00')
        assert _calc_balance(db, dst) == Decimal('200.00')

    def test_transfer_creates_two_transactions(self, db):
        user = make_user(db)
        src = make_account(db, user.id, 'Источник', initial_balance=Decimal('1000'))
        dst = make_account(db, user.id, 'Получатель', initial_balance=Decimal('0'))

        create_transfer(db, user.id, self._make_payload(src.id, dst.id, Decimal('100')))

        txs = db.query(Transaction).filter(Transaction.user_id == user.id).all()
        assert len(txs) == 2
        types = {tx.type for tx in txs}
        assert types == {'transfer'}

    def test_transfer_direction_field_set_correctly(self, db):
        # Since migration 0015, direction is in transfer_direction column (not name arrows)
        user = make_user(db)
        src = make_account(db, user.id, 'Карта', initial_balance=Decimal('500'))
        dst = make_account(db, user.id, 'Наличные', initial_balance=Decimal('0'))

        create_transfer(db, user.id, self._make_payload(src.id, dst.id, Decimal('50')))

        txs = db.query(Transaction).filter(Transaction.user_id == user.id).all()
        directions = {tx.transfer_direction for tx in txs}
        assert 'out' in directions, 'Outgoing tx must have transfer_direction=out'
        assert 'in' in directions, 'Incoming tx must have transfer_direction=in'

    def test_transfer_to_same_account_raises(self, db):
        user = make_user(db)
        account = make_account(db, user.id, initial_balance=Decimal('1000'))

        with pytest.raises(HTTPException) as exc:
            create_transfer(db, user.id, self._make_payload(account.id, account.id))
        assert exc.value.status_code == 400

    def test_transfer_insufficient_funds_raises(self, db):
        user = make_user(db)
        src = make_account(db, user.id, initial_balance=Decimal('50'))
        dst = make_account(db, user.id, initial_balance=Decimal('0'))

        with pytest.raises(HTTPException) as exc:
            create_transfer(db, user.id, self._make_payload(src.id, dst.id, Decimal('100')))
        assert exc.value.status_code == 400

    def test_transfer_exact_balance_succeeds(self, db):
        """Transferring exactly the available balance should work."""
        user = make_user(db)
        src = make_account(db, user.id, initial_balance=Decimal('100'))
        dst = make_account(db, user.id, initial_balance=Decimal('0'))

        create_transfer(db, user.id, self._make_payload(src.id, dst.id, Decimal('100')))

        assert _calc_balance(db, src) == Decimal('0.00')
        assert _calc_balance(db, dst) == Decimal('100.00')

    def test_transfer_unknown_source_account_raises(self, db):
        user = make_user(db)
        dst = make_account(db, user.id, initial_balance=Decimal('0'))

        with pytest.raises(HTTPException) as exc:
            create_transfer(db, user.id, self._make_payload('nonexistent-id', dst.id))
        assert exc.value.status_code == 404

    def test_transfer_unknown_destination_account_raises(self, db):
        user = make_user(db)
        src = make_account(db, user.id, initial_balance=Decimal('500'))

        with pytest.raises(HTTPException) as exc:
            create_transfer(db, user.id, self._make_payload(src.id, 'nonexistent-id'))
        assert exc.value.status_code == 404


# ── Transfer integrity (transfer_group_id, migration 0018) ────────────────────

class TestTransferIntegrity:
    def _make_transfer(self, db, user):
        from datetime import date
        acc_a = make_account(db, user.id, initial_balance=Decimal('1000'))
        acc_b = make_account(db, user.id, initial_balance=Decimal('0'))
        create_transfer(db, user.id, TransferCreate(
            from_account_id=acc_a.id,
            to_account_id=acc_b.id,
            amount=Decimal('100'),
            date=date.today(),
            time='12:00',
        ))
        legs = db.query(Transaction).filter(Transaction.type == 'transfer').all()
        return acc_a, acc_b, legs

    def test_both_legs_share_transfer_group_id(self, db):
        user = make_user(db)
        _, _, legs = self._make_transfer(db, user)
        assert len(legs) == 2
        assert legs[0].transfer_group_id is not None
        assert legs[0].transfer_group_id == legs[1].transfer_group_id

    def test_deleting_one_leg_deletes_the_pair(self, db):
        from app.services import delete_transaction
        user = make_user(db)
        acc_a, acc_b, legs = self._make_transfer(db, user)

        delete_transaction(db, user.id, legs[0].id)

        remaining = db.query(Transaction).filter(Transaction.type == 'transfer').count()
        assert remaining == 0
        # Балансы вернулись к исходным — пара удалена атомарно
        assert _calc_balance(db, acc_a) == Decimal('1000.00')
        assert _calc_balance(db, acc_b) == Decimal('0.00')

    def test_legacy_transfer_without_group_deletes_single_leg(self, db):
        from datetime import date
        from app.services import delete_transaction
        user = make_user(db)
        account = make_account(db, user.id)
        tx = Transaction(
            id='legacy-leg',
            user_id=user.id,
            account_id=account.id,
            name='Перевод: Старый',
            amount=Decimal('50'),
            category='Перевод',
            icon='🔄',
            date=date.today(),
            time='12:00',
            type='transfer',
            transfer_direction='out',
            transfer_group_id=None,
        )
        db.add(tx)
        db.commit()
        delete_transaction(db, user.id, tx.id)
        assert db.query(Transaction).count() == 0

    def test_editing_transfer_leg_is_rejected(self, db):
        from app.schemas import TransactionUpdate
        from app.services import update_transaction
        user = make_user(db)
        _, _, legs = self._make_transfer(db, user)

        with pytest.raises(HTTPException) as exc:
            update_transaction(db, user.id, legs[0].id, TransactionUpdate(
                name='hack',
                amount=Decimal('999'),
                category='Перевод',
                icon='🔄',
                date=legs[0].date,
                time='12:00',
                type='expense',
            ))
        assert exc.value.status_code == 400

    def test_transfer_type_rejected_in_create_schema(self, db):
        from datetime import date
        from pydantic import ValidationError
        from app.schemas import TransactionCreate
        with pytest.raises(ValidationError):
            TransactionCreate(
                name='fake transfer',
                amount=Decimal('10'),
                category='Перевод',
                icon='🔄',
                date=date.today(),
                time='12:00',
                type='transfer',
            )
