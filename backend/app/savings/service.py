from datetime import date, datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import SavingsDeposit, SavingsGoal, Transaction

from .schemas import (
    DepositCreate,
    DepositOut,
    FeasibilityLabel,
    GoalCreate,
    GoalForecast,
    GoalOut,
    GoalsListOut,
)

# Пороги feasibility (доля нужного взноса от среднего остатка)
_THRESHOLD_EASY = Decimal('0.30')       # ≤ 30% остатка → легко
_THRESHOLD_FEASIBLE = Decimal('0.60')   # ≤ 60% остатка → достижимо
_THRESHOLD_HARD = Decimal('1.00')       # ≤ 100% остатка → с трудом
                                        # > 100% остатка → нереалистично

_FEASIBILITY_LABELS: dict[FeasibilityLabel, str] = {
    'easily': '🟢 Легко достижимо',
    'feasible': '🟡 Достижимо',
    'hard': '🟠 Придётся постараться',
    'unrealistic': '🔴 Нереалистично',
    'no_data': '⚪ Недостаточно данных',
}


# ─── Forecast ─────────────────────────────────────────────────────────────────

def _calc_forecast(
    db: Session,
    target_amount: Decimal,
    current_amount: Decimal,
    deadline: date | None,
) -> GoalForecast:
    """Считает прогноз достижимости цели на основе транзакций за 90 дней."""

    today = date.today()
    ninety_days_ago = today.replace(day=today.day)
    from datetime import timedelta
    ninety_days_ago = today - timedelta(days=90)

    # Суммы доходов и расходов за 90 дней
    stmt = (
        select(Transaction.type, func.coalesce(func.sum(Transaction.amount), 0))
        .where(Transaction.date >= ninety_days_ago, Transaction.date <= today)
        .group_by(Transaction.type)
    )
    rows = db.execute(stmt).all()

    income_90 = Decimal('0')
    expense_90 = Decimal('0')
    for row_type, total in rows:
        val = Decimal(str(total))
        if row_type == 'income':
            income_90 = val
        elif row_type == 'expense':
            expense_90 = val

    # Нет транзакций — нет данных
    if income_90 == 0 and expense_90 == 0:
        return GoalForecast(
            monthly_avg_balance=Decimal('0'),
            required_monthly=Decimal('0'),
            months_to_deadline=None,
            feasibility='no_data',
            feasibility_label_ru=_FEASIBILITY_LABELS['no_data'],
        )

    # Средний месячный остаток за 3 месяца
    monthly_avg_balance = ((income_90 - expense_90) / Decimal('3')).quantize(Decimal('0.01'))

    # Месяцев до дедлайна
    months_to_deadline: int | None = None
    if deadline:
        delta_days = (deadline - today).days
        months_to_deadline = max(1, round(delta_days / 30))

    # Сколько ещё нужно накопить
    remaining = target_amount - current_amount

    # Нужный ежемесячный взнос
    if months_to_deadline and months_to_deadline > 0:
        required_monthly = (remaining / Decimal(months_to_deadline)).quantize(Decimal('0.01'))
    else:
        # Нет дедлайна — показываем сколько месяцев при текущем темпе
        required_monthly = Decimal('0')

    # Feasibility
    feasibility: FeasibilityLabel
    if monthly_avg_balance <= 0:
        feasibility = 'unrealistic'
    elif required_monthly == 0:
        # Нет дедлайна — просто показываем данные без оценки
        feasibility = 'feasible'
    else:
        ratio = required_monthly / monthly_avg_balance
        if ratio <= _THRESHOLD_EASY:
            feasibility = 'easily'
        elif ratio <= _THRESHOLD_FEASIBLE:
            feasibility = 'feasible'
        elif ratio <= _THRESHOLD_HARD:
            feasibility = 'hard'
        else:
            feasibility = 'unrealistic'

    return GoalForecast(
        monthly_avg_balance=monthly_avg_balance,
        required_monthly=required_monthly,
        months_to_deadline=months_to_deadline,
        feasibility=feasibility,
        feasibility_label_ru=_FEASIBILITY_LABELS[feasibility],
    )


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _to_out(db: Session, goal: SavingsGoal) -> GoalOut:
    progress_percent = (
        (goal.current_amount / goal.target_amount * Decimal('100')).quantize(Decimal('0.01'))
        if goal.target_amount > 0 else Decimal('0')
    )
    forecast = _calc_forecast(db, goal.target_amount, goal.current_amount, goal.deadline)

    return GoalOut(
        id=goal.id,
        name=goal.name,
        photo_url=goal.photo_url,
        target_amount=goal.target_amount,
        current_amount=goal.current_amount,
        deadline=goal.deadline,
        status=goal.status,
        created_at=goal.created_at,
        progress_percent=progress_percent,
        forecast=forecast,
    )


# ─── Goals CRUD ───────────────────────────────────────────────────────────────

def list_goals(db: Session) -> GoalsListOut:
    goals = list(db.scalars(
        select(SavingsGoal).order_by(SavingsGoal.created_at.desc())
    ))
    active = [_to_out(db, g) for g in goals if g.status == 'active']
    completed = [_to_out(db, g) for g in goals if g.status == 'completed']
    return GoalsListOut(active=active, completed=completed)


def create_goal(db: Session, payload: GoalCreate) -> GoalOut:
    goal = SavingsGoal(
        name=payload.name,
        photo_url=payload.photo_url,
        target_amount=payload.target_amount,
        current_amount=Decimal('0'),
        deadline=payload.deadline,
        status='active',
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return _to_out(db, goal)


def delete_goal(db: Session, goal_id: str) -> None:
    goal = db.get(SavingsGoal, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail='Goal not found')
    db.delete(goal)
    db.commit()


def complete_goal(db: Session, goal_id: str) -> GoalOut:
    goal = db.get(SavingsGoal, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail='Goal not found')
    goal.status = 'completed'
    db.commit()
    db.refresh(goal)
    return _to_out(db, goal)


# ─── Deposits ─────────────────────────────────────────────────────────────────

def add_deposit(db: Session, goal_id: str, payload: DepositCreate) -> GoalOut:
    goal = db.get(SavingsGoal, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail='Goal not found')
    if goal.status == 'completed':
        raise HTTPException(status_code=400, detail='Cannot deposit to a completed goal')

    deposit = SavingsDeposit(
        goal_id=goal_id,
        amount=payload.amount,
        note=payload.note,
    )
    db.add(deposit)

    goal.current_amount += payload.amount

    # Автоматически помечаем выполненной если достигли цели
    if goal.current_amount >= goal.target_amount:
        goal.status = 'completed'

    db.commit()
    db.refresh(goal)
    return _to_out(db, goal)


def list_deposits(db: Session, goal_id: str) -> list[DepositOut]:
    goal = db.get(SavingsGoal, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail='Goal not found')
    deposits = list(db.scalars(
        select(SavingsDeposit)
        .where(SavingsDeposit.goal_id == goal_id)
        .order_by(SavingsDeposit.created_at.desc())
    ))
    return [DepositOut.model_validate(d) for d in deposits]
