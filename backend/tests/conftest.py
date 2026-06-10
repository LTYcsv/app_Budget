"""
Shared fixtures for all tests.
Uses an in-memory SQLite database — no Docker, no Postgres required.
Test env vars are set by the root-level conftest.py before this file loads.

Each test gets a FRESH in-memory database so service-level db.commit() calls
don't bleed between tests. SQLite in-memory is fast enough for this.
"""
import uuid
from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import Account, Category, Transaction, User


def _make_engine():
    eng = create_engine(
        'sqlite+pysqlite:///:memory:',
        connect_args={'check_same_thread': False},
    )
    # SQLite doesn't enforce FKs by default
    @event.listens_for(eng, 'connect')
    def set_fk(conn, _):
        conn.execute('PRAGMA foreign_keys=ON')
    return eng


@pytest.fixture
def db():
    """Fresh in-memory DB per test — service-level commits are fully isolated."""
    eng = _make_engine()
    Base.metadata.create_all(eng)

    # Seed the one system category referenced by add_deposit
    Session = sessionmaker(bind=eng)
    session = Session()
    session.add(Category(
        id='invest-savings',
        name='Накопления',
        group='Инвестиции',
        icon='🐷',
        type='expense',
        is_other=False,
    ))
    session.commit()

    yield session
    session.close()
    eng.dispose()


# ── Helpers ────────────────────────────────────────────────────────────────────

def make_user(db, email='test@example.com') -> User:
    user = User(
        id=str(uuid.uuid4()),
        email=email,
        password_hash='$2b$12$placeholder',
    )
    db.add(user)
    db.flush()
    return user


def make_account(db, user_id: str, name='Карта', initial_balance=Decimal('0')) -> Account:
    account = Account(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name=name,
        color='#6366F1',
        initial_balance=initial_balance,
    )
    db.add(account)
    db.flush()
    return account


def make_transaction(
    db,
    user_id: str,
    account_id: str,
    tx_type: str,
    amount: Decimal,
    name: str = 'Тест',
    tx_date: date | None = None,
) -> Transaction:
    tx = Transaction(
        id=str(uuid.uuid4()),
        user_id=user_id,
        account_id=account_id,
        name=name,
        amount=amount,
        category='Прочее',
        icon='📝',
        date=tx_date or date.today(),
        time='12:00',
        type=tx_type,
    )
    db.add(tx)
    db.flush()
    return tx
