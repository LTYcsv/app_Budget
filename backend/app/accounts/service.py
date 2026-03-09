import uuid
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models import Account, Transaction

from .schemas import AccountCreate, AccountOut, TransferCreate, TransferOut


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _calc_balance(db: Session, account: Account) -> Decimal:
    """
    Текущий баланс = начальный + доходы - расходы + входящие переводы - исходящие переводы.

    Переводы хранятся с type='transfer'. Направление определяется по имени транзакции:
      'Перевод →' (содержит '→') — исходящий, уменьшает баланс.
      'Перевод ←' (содержит '←') — входящий, увеличивает баланс.
    """
    # Доходы и расходы
    stmt = (
        select(Transaction.type, func.coalesce(func.sum(Transaction.amount), 0))
        .where(
            Transaction.account_id == account.id,
            Transaction.type.in_(['income', 'expense']),
        )
        .group_by(Transaction.type)
    )
    rows = db.execute(stmt).all()

    income = Decimal('0')
    expense = Decimal('0')
    for tx_type, total in rows:
        val = Decimal(str(total))
        if tx_type == 'income':
            income = val
        elif tx_type == 'expense':
            expense = val

    # Исходящие переводы (→) — уменьшают баланс
    transfer_out = Decimal(str(
        db.scalar(
            select(func.coalesce(func.sum(Transaction.amount), 0))
            .where(
                Transaction.account_id == account.id,
                Transaction.type == 'transfer',
                Transaction.name.contains('→'),
            )
        ) or 0
    ))

    # Входящие переводы (←) — увеличивают баланс
    transfer_in = Decimal(str(
        db.scalar(
            select(func.coalesce(func.sum(Transaction.amount), 0))
            .where(
                Transaction.account_id == account.id,
                Transaction.type == 'transfer',
                Transaction.name.contains('←'),
            )
        ) or 0
    ))

    return (
        account.initial_balance + income - expense + transfer_in - transfer_out
    ).quantize(Decimal('0.01'))


def _to_out(db: Session, account: Account) -> AccountOut:
    return AccountOut(
        id=account.id,
        name=account.name,
        color=account.color,
        initial_balance=account.initial_balance,
        current_balance=_calc_balance(db, account),
        created_at=account.created_at,
    )


# ─── CRUD ─────────────────────────────────────────────────────────────────────

def list_accounts(db: Session) -> list[AccountOut]:
    accounts = db.scalars(select(Account).order_by(Account.created_at.asc())).all()
    return [_to_out(db, a) for a in accounts]


def create_account(db: Session, payload: AccountCreate) -> AccountOut:
    account = Account(
        id=str(uuid.uuid4()),
        name=payload.name,
        color=payload.color,
        initial_balance=payload.initial_balance,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return _to_out(db, account)


def delete_account(db: Session, account_id: str) -> None:
    account = db.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail='Account not found')
    db.delete(account)
    db.commit()


def update_account(db: Session, account_id: str, payload: AccountCreate) -> AccountOut:
    account = db.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail='Account not found')
    account.name = payload.name
    account.color = payload.color
    account.initial_balance = payload.initial_balance
    db.commit()
    db.refresh(account)
    return _to_out(db, account)


# ─── Transfer ─────────────────────────────────────────────────────────────────

def create_transfer(db: Session, payload: TransferCreate) -> TransferOut:
    if payload.from_account_id == payload.to_account_id:
        raise HTTPException(status_code=400, detail='Cannot transfer to the same account')

    from_account = db.get(Account, payload.from_account_id)
    to_account = db.get(Account, payload.to_account_id)

    if not from_account:
        raise HTTPException(status_code=404, detail='Source account not found')
    if not to_account:
        raise HTTPException(status_code=404, detail='Destination account not found')

    # Проверяем достаточность средств на счёте-источнике
    available = _calc_balance(db, from_account)
    if available < Decimal(str(payload.amount)):
        raise HTTPException(
            status_code=400,
            detail=f'Недостаточно средств: доступно {available:.2f} ₽, запрошено {payload.amount:.2f} ₽',
        )

    # Расход с исходного счёта
    tx_out = Transaction(
        id=str(uuid.uuid4()),
        name=f'Перевод → {to_account.name}',
        amount=payload.amount,
        account_id=payload.from_account_id,
        category_id=None,
        category_group='Переводы',
        category='Перевод',
        icon='🔄',
        date=payload.date,
        time=payload.time,
        type='transfer',
    )

    # Приход на целевой счёт
    tx_in = Transaction(
        id=str(uuid.uuid4()),
        name=f'Перевод ← {from_account.name}',
        amount=payload.amount,
        account_id=payload.to_account_id,
        category_id=None,
        category_group='Переводы',
        category='Перевод',
        icon='🔄',
        date=payload.date,
        time=payload.time,
        type='transfer',
    )

    db.add(tx_out)
    db.add(tx_in)
    db.commit()

    return TransferOut(
        from_transaction_id=tx_out.id,
        to_transaction_id=tx_in.id,
        amount=payload.amount,
        date=payload.date,
        time=payload.time,
        note=payload.note,
    )
