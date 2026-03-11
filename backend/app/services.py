import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Category, SavingsDeposit, SavingsGoal, Transaction
from .schemas import (
    BootstrapOut,
    CategoryCreate,
    CategoryOut,
    TransactionCreate,
    TransactionOut,
    TransactionUpdate,
)


# ─── Categories ───────────────────────────────────────────────────────────────

def get_categories(db: Session) -> dict[str, list[CategoryOut]]:
    categories = db.scalars(select(Category).order_by(Category.type, Category.group, Category.name)).all()
    result: dict[str, list[CategoryOut]] = {'expense': [], 'income': []}
    for cat in categories:
        result[cat.type].append(CategoryOut.model_validate(cat))
    return result


def create_category(db: Session, category_type: str, payload: CategoryCreate) -> CategoryOut:
    if category_type not in ('expense', 'income'):
        raise HTTPException(status_code=422, detail='type must be expense or income')

    category_id = f'cat-{category_type}-{uuid.uuid4().hex[:12]}'
    category = Category(
        id=category_id,
        group=payload.group,
        name=payload.name,
        icon=payload.icon,
        type=category_type,
        is_other=False,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return CategoryOut.model_validate(category)


def delete_category(db: Session, category_type: str, category_id: str) -> None:
    category = db.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail='Category not found')
    if category.type != category_type:
        raise HTTPException(status_code=404, detail='Category not found')
    if category.is_other:
        raise HTTPException(status_code=400, detail='Cannot delete system category')
    if not category_id.startswith('cat-'):
        raise HTTPException(status_code=400, detail='Cannot delete default category')
    db.delete(category)
    db.commit()


# ─── Transactions ─────────────────────────────────────────────────────────────

def get_transactions(db: Session, user_id: str) -> list[TransactionOut]:
    transactions = db.scalars(
        select(Transaction)
        .where(Transaction.user_id == user_id)
        .order_by(
            Transaction.date.desc(),
            Transaction.time.desc(),
            Transaction.created_at.desc(),
        )
    ).all()
    return [TransactionOut.model_validate(t) for t in transactions]


def create_transaction(db: Session, user_id: str, payload: TransactionCreate) -> TransactionOut:
    transaction = Transaction(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name=payload.name,
        amount=payload.amount,
        account_id=payload.account_id,
        category_id=payload.category_id,
        subcategory_id=payload.subcategory_id,
        category_group=payload.category_group,
        category=payload.category,
        icon=payload.icon,
        date=payload.date,
        time=payload.time,
        type=payload.type,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    return TransactionOut.model_validate(transaction)


def update_transaction(db: Session, user_id: str, transaction_id: str, payload: TransactionUpdate) -> TransactionOut:
    transaction = db.scalar(
        select(Transaction).where(Transaction.id == transaction_id, Transaction.user_id == user_id)
    )
    if not transaction:
        raise HTTPException(status_code=404, detail='Transaction not found')

    transaction.name = payload.name
    transaction.amount = payload.amount
    transaction.account_id = payload.account_id
    transaction.category_id = payload.category_id
    transaction.subcategory_id = payload.subcategory_id
    transaction.category_group = payload.category_group
    transaction.category = payload.category
    transaction.icon = payload.icon
    transaction.date = payload.date
    transaction.time = payload.time
    transaction.type = payload.type

    db.commit()
    db.refresh(transaction)
    return TransactionOut.model_validate(transaction)


def delete_transaction(db: Session, user_id: str, transaction_id: str) -> None:
    transaction = db.scalar(
        select(Transaction).where(Transaction.id == transaction_id, Transaction.user_id == user_id)
    )
    if not transaction:
        raise HTTPException(status_code=404, detail='Transaction not found')

    deposit = db.scalar(
        select(SavingsDeposit).where(SavingsDeposit.transaction_id == transaction_id)
    )
    if deposit:
        goal = db.get(SavingsGoal, deposit.goal_id)
        if goal:
            goal.current_amount = max(Decimal('0'), goal.current_amount - deposit.amount)
            if goal.status == 'completed' and goal.current_amount < goal.target_amount:
                goal.status = 'active'
        db.delete(deposit)

    db.delete(transaction)
    db.commit()


# ─── Bootstrap ────────────────────────────────────────────────────────────────

def get_bootstrap(db: Session, user_id: str) -> BootstrapOut:
    transactions = get_transactions(db, user_id)
    categories = get_categories(db)
    return BootstrapOut(transactions=transactions, categories=categories)


# ─── Compatibility aliases ────────────────────────────────────────────────────

def list_transactions(db: Session, user_id: str) -> list[TransactionOut]:
    return get_transactions(db, user_id)


def list_categories(db: Session) -> dict[str, list[CategoryOut]]:
    return get_categories(db)
