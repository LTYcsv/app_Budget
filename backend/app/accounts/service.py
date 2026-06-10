import uuid
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models import Account, Transaction

from .schemas import AccountCreate, AccountOut, TransferCreate, TransferOut


def _calc_balances(db: Session, user_id: str, accounts: list[Account]) -> dict[str, Decimal]:
    # SECURITY: always filter by user_id to prevent cross-user transaction
    # contamination. Without this, an attacker could point their transaction at
    # a victim's account_id and distort the victim's displayed balance.
    balances = {a.id: a.initial_balance for a in accounts}
    if not balances:
        return {}

    stmt = (
        select(
            Transaction.account_id,
            Transaction.type,
            Transaction.transfer_direction,
            func.coalesce(func.sum(Transaction.amount), 0),
        )
        .where(
            Transaction.account_id.in_(list(balances)),
            Transaction.user_id == user_id,
            Transaction.type.in_(['income', 'expense', 'transfer']),
        )
        .group_by(Transaction.account_id, Transaction.type, Transaction.transfer_direction)
    )
    for account_id, tx_type, direction, total in db.execute(stmt):
        val = Decimal(str(total))
        if tx_type == 'income':
            balances[account_id] += val
        elif tx_type == 'expense':
            balances[account_id] -= val
        elif tx_type == 'transfer':
            if direction == 'in':
                balances[account_id] += val
            elif direction == 'out':
                balances[account_id] -= val

    return {aid: bal.quantize(Decimal('0.01')) for aid, bal in balances.items()}


def _calc_balance(db: Session, account: Account) -> Decimal:
    return _calc_balances(db, account.user_id, [account])[account.id]


def _to_out(db: Session, account: Account, balance: Decimal | None = None) -> AccountOut:
    return AccountOut(
        id=account.id,
        name=account.name,
        color=account.color,
        initial_balance=account.initial_balance,
        current_balance=balance if balance is not None else _calc_balance(db, account),
        created_at=account.created_at,
    )


def list_accounts(db: Session, user_id: str) -> list[AccountOut]:
    accounts = db.scalars(
        select(Account)
        .where(Account.user_id == user_id)
        .order_by(Account.created_at.asc())
    ).all()
    balances = _calc_balances(db, user_id, list(accounts))
    return [_to_out(db, a, balances[a.id]) for a in accounts]


def create_account(db: Session, user_id: str, payload: AccountCreate) -> AccountOut:
    account = Account(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name=payload.name,
        color=payload.color,
        initial_balance=payload.initial_balance,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return _to_out(db, account)


def delete_account(db: Session, user_id: str, account_id: str) -> None:
    account = db.scalar(
        select(Account).where(Account.id == account_id, Account.user_id == user_id)
    )
    if not account:
        raise HTTPException(status_code=404, detail='Account not found')
    db.delete(account)
    db.commit()


def update_account(db: Session, user_id: str, account_id: str, payload: AccountCreate) -> AccountOut:
    account = db.scalar(
        select(Account).where(Account.id == account_id, Account.user_id == user_id)
    )
    if not account:
        raise HTTPException(status_code=404, detail='Account not found')
    account.name = payload.name
    account.color = payload.color
    account.initial_balance = payload.initial_balance
    db.commit()
    db.refresh(account)
    return _to_out(db, account)


def create_transfer(db: Session, user_id: str, payload: TransferCreate) -> TransferOut:
    if payload.from_account_id == payload.to_account_id:
        raise HTTPException(status_code=400, detail='Cannot transfer to the same account')

    # SECURITY: with_for_update() acquires a row-level lock before reading
    # balance. Without it, two concurrent transfers from the same account
    # can both pass the balance check and overdraw (TOCTOU race condition).
    from_account = db.scalar(
        select(Account)
        .where(Account.id == payload.from_account_id, Account.user_id == user_id)
        .with_for_update()
    )
    to_account = db.scalar(
        select(Account)
        .where(Account.id == payload.to_account_id, Account.user_id == user_id)
        .with_for_update()
    )

    if not from_account:
        raise HTTPException(status_code=404, detail='Source account not found')
    if not to_account:
        raise HTTPException(status_code=404, detail='Destination account not found')

    available = _calc_balance(db, from_account)
    if available < Decimal(str(payload.amount)):
        raise HTTPException(
            status_code=400,
            detail=f'Недостаточно средств: доступно {available:.2f} ₽, запрошено {payload.amount:.2f} ₽',
        )

    tx_out = Transaction(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name=f'Перевод: {to_account.name}',
        amount=payload.amount,
        account_id=payload.from_account_id,
        category_id=None,
        category_group='Переводы',
        category='Перевод',
        icon='🔄',
        date=payload.date,
        time=payload.time,
        type='transfer',
        transfer_direction='out',
    )

    tx_in = Transaction(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name=f'Перевод: {from_account.name}',
        amount=payload.amount,
        account_id=payload.to_account_id,
        category_id=None,
        category_group='Переводы',
        category='Перевод',
        icon='🔄',
        date=payload.date,
        time=payload.time,
        type='transfer',
        transfer_direction='in',
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
