import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import delete, select, func
from sqlalchemy.orm import Session

from .models import Category, SavingsDeposit, SavingsGoal, Transaction
from .schemas import (
    BootstrapOut,
    CategoryCreate,
    CategoryOut,
    CategoryUpdate,
    TransactionCreate,
    TransactionOut,
    TransactionUpdate,
)


# ─── Categories ───────────────────────────────────────────────────────────────

def _category_to_out(cat: Category) -> CategoryOut:
    return CategoryOut(
        id=cat.id,
        group=cat.group,
        name=cat.name,
        icon=cat.icon,
        type=cat.type,
        is_other=cat.is_other,
        parent_id=cat.parent_id,
        sort_order=cat.sort_order,
        is_hidden=cat.is_hidden,
        is_custom=cat.user_id is not None,
    )


def get_categories(db: Session, user_id: str) -> dict[str, list[CategoryOut]]:
    stmt = (
        select(Category)
        .where(
            (Category.user_id == None) | (Category.user_id == user_id)  # noqa: E711
        )
        .order_by(Category.type, Category.sort_order, Category.group, Category.name)
    )
    categories = db.scalars(stmt).all()
    result: dict[str, list[CategoryOut]] = {'expense': [], 'income': []}
    for cat in categories:
        if cat.type in result:
            result[cat.type].append(_category_to_out(cat))
    return result


def create_category(db: Session, user_id: str, category_type: str, payload: CategoryCreate) -> CategoryOut:
    if category_type not in ('expense', 'income'):
        raise HTTPException(status_code=422, detail='type must be expense or income')

    if payload.parent_id:
        parent = db.scalar(
            select(Category).where(
                Category.id == payload.parent_id,
                (Category.user_id == None) | (Category.user_id == user_id),  # noqa: E711
            )
        )
        if not parent:
            raise HTTPException(status_code=404, detail='Parent category not found')
        group = parent.group
    else:
        group = payload.group

    max_order = db.scalar(
        select(func.coalesce(func.max(Category.sort_order), 0))
        .where(
            Category.type == category_type,
            Category.group == group,
        )
    ) or 0

    category_id = f'cat-{category_type}-{uuid.uuid4().hex[:12]}'
    category = Category(
        id=category_id,
        group=group,
        name=payload.name,
        icon=payload.icon,
        type=category_type,
        is_other=False,
        user_id=user_id,
        parent_id=payload.parent_id,
        sort_order=max_order + 1,
        is_hidden=False,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return _category_to_out(category)


def update_category(db: Session, user_id: str, category_type: str, category_id: str, payload: CategoryUpdate) -> CategoryOut:
    category = db.scalar(
        select(Category).where(
            Category.id == category_id,
            Category.type == category_type,
            Category.user_id == user_id,
        )
    )
    if not category:
        raise HTTPException(status_code=404, detail='Category not found or not editable')

    if payload.name is not None:
        category.name = payload.name
    if payload.icon is not None:
        category.icon = payload.icon
    if payload.is_hidden is not None:
        category.is_hidden = payload.is_hidden
    if payload.sort_order is not None:
        category.sort_order = payload.sort_order

    db.commit()
    db.refresh(category)
    return _category_to_out(category)


def toggle_category_visibility(db: Session, user_id: str, category_type: str, category_id: str) -> CategoryOut:
    category = db.scalar(
        select(Category).where(
            Category.id == category_id,
            Category.type == category_type,
            Category.user_id == user_id,
        )
    )
    if not category:
        raise HTTPException(status_code=404, detail='Category not found or not editable')

    category.is_hidden = not category.is_hidden
    db.commit()
    db.refresh(category)
    return _category_to_out(category)


def delete_category(db: Session, user_id: str, category_type: str, category_id: str) -> None:
    category = db.scalar(
        select(Category).where(
            Category.id == category_id,
            Category.type == category_type,
        )
    )
    if not category:
        raise HTTPException(status_code=404, detail='Category not found')
    # SECURITY FIX: only allow deletion of own custom categories.
    # Previous logic: `if user_id is not None and user_id != user_id` — allowed
    # any authenticated user to delete system categories (user_id=None).
    if category.user_id != user_id:
        raise HTTPException(status_code=403, detail='Forbidden')
    db.delete(category)
    db.commit()


# ─── Transactions ─────────────────────────────────────────────────────────────

_BOOTSTRAP_LIMIT_MAX = 1000

def get_transactions(db: Session, user_id: str, limit: int | None = None) -> list[TransactionOut]:
    stmt = (
        select(Transaction)
        .where(Transaction.user_id == user_id)
        .order_by(
            Transaction.date.desc(),
            Transaction.time.desc(),
            Transaction.created_at.desc(),
        )
    )
    if limit is not None:
        stmt = stmt.limit(limit)
    transactions = db.scalars(stmt).all()
    return [TransactionOut.model_validate(t) for t in transactions]


def create_transaction(db: Session, user_id: str, payload: TransactionCreate) -> TransactionOut:
    # SECURITY: validate that account_id, if provided, belongs to this user.
    # Without this check an attacker can link their transaction to another user's
    # account, corrupting the victim's balance calculation.
    if payload.account_id is not None:
        from .models import Account
        account = db.scalar(
            select(Account).where(Account.id == payload.account_id, Account.user_id == user_id)
        )
        if not account:
            raise HTTPException(status_code=403, detail='Account not found or access denied')

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

    if payload.account_id is not None:
        from .models import Account
        account = db.scalar(
            select(Account).where(Account.id == payload.account_id, Account.user_id == user_id)
        )
        if not account:
            raise HTTPException(status_code=403, detail='Account not found or access denied')

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


def delete_all_transactions(db: Session, user_id: str) -> int:
    tx_ids = select(Transaction.id).where(Transaction.user_id == user_id)

    deposits = db.scalars(
        select(SavingsDeposit).where(SavingsDeposit.transaction_id.in_(tx_ids))
    ).all()
    if deposits:
        refunds: dict[str, Decimal] = {}
        for deposit in deposits:
            refunds[deposit.goal_id] = refunds.get(deposit.goal_id, Decimal('0')) + deposit.amount

        goals = db.scalars(
            select(SavingsGoal).where(SavingsGoal.id.in_(refunds))
        ).all()
        for goal in goals:
            goal.current_amount = max(Decimal('0'), goal.current_amount - refunds[goal.id])
            if goal.status == 'completed' and goal.current_amount < goal.target_amount:
                goal.status = 'active'

        db.execute(
            delete(SavingsDeposit)
            .where(SavingsDeposit.transaction_id.in_(tx_ids))
            .execution_options(synchronize_session=False)
        )

    result = db.execute(
        delete(Transaction)
        .where(Transaction.user_id == user_id)
        .execution_options(synchronize_session=False)
    )
    db.commit()
    return result.rowcount


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

def get_bootstrap(db: Session, user_id: str, limit: int = 500) -> BootstrapOut:
    capped = min(limit, _BOOTSTRAP_LIMIT_MAX)
    transactions = get_transactions(db, user_id, limit=capped)
    total_transactions = db.scalar(
        select(func.count()).where(Transaction.user_id == user_id)
    ) or 0
    categories = get_categories(db, user_id)
    return BootstrapOut(transactions=transactions, categories=categories, total_transactions=total_transactions)


# ─── Compatibility aliases ────────────────────────────────────────────────────

def list_transactions(db: Session, user_id: str, limit: int | None = None) -> list[TransactionOut]:
    return get_transactions(db, user_id, limit=limit)


def list_categories(db: Session, user_id: str) -> dict[str, list[CategoryOut]]:
    return get_categories(db, user_id)
