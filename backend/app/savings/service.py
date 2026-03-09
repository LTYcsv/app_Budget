import calendar
from datetime import date, datetime, timedelta, timezone
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


# ─── Interest helpers ──────────────────────────────────────────────────────────

def _compute_next_interest_date(frequency: str, from_date: date) -> date:
    """Вычисляет дату следующего начисления процентов от заданной даты."""
    if frequency == 'monthly':
        month = from_date.month + 1 if from_date.month < 12 else 1
        year = from_date.year + 1 if from_date.month == 12 else from_date.year
        last_day = calendar.monthrange(year, month)[1]
        return from_date.replace(year=year, month=month, day=min(from_date.day, last_day))
    else:  # yearly
        try:
            return from_date.replace(year=from_date.year + 1)
        except ValueError:
            # 29 февраля → 28 февраля в невисокосный год
            return from_date.replace(year=from_date.year + 1, day=28)


def _calc_interest_monthly(current_amount: Decimal, interest_rate: Decimal) -> Decimal:
    """Ежемесячный эквивалент дохода от процентов (годовая ставка / 12)."""
    return (current_amount * interest_rate / Decimal('100') / Decimal('12')).quantize(Decimal('0.01'))


def _accrue_due_interest(db: Session, goal: SavingsGoal) -> bool:
    """
    Начисляет все просроченные проценты на активную цель.
    Итерирует по всем пропущенным периодам (если приложение не запускалось).
    Возвращает True если было хотя бы одно начисление (нужен commit).
    """
    if (
        not goal.interest_rate
        or not goal.interest_frequency
        or not goal.interest_next_date
        or goal.status != 'active'
    ):
        return False

    today = date.today()
    accrued = False

    while goal.interest_next_date <= today:
        if goal.interest_frequency == 'monthly':
            interest_amount = (
                goal.current_amount * goal.interest_rate / Decimal('100') / Decimal('12')
            ).quantize(Decimal('0.01'))
        else:  # yearly
            interest_amount = (
                goal.current_amount * goal.interest_rate / Decimal('100')
            ).quantize(Decimal('0.01'))

        if interest_amount > 0:
            goal.current_amount += interest_amount
            accrued = True

        # Сдвигаем дату на следующий период
        goal.interest_next_date = _compute_next_interest_date(
            goal.interest_frequency, goal.interest_next_date
        )

        # Проверяем завершение цели
        if goal.current_amount >= goal.target_amount:
            goal.status = 'completed'
            break

    return accrued


# ─── Forecast ─────────────────────────────────────────────────────────────────

def _calc_forecast(
    db: Session,
    target_amount: Decimal,
    current_amount: Decimal,
    deadline: date | None,
    interest_rate: Decimal | None = None,
    interest_frequency: str | None = None,
) -> GoalForecast:
    """Считает прогноз достижимости цели на основе транзакций за 90 дней."""

    today = date.today()
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
            interest_monthly=None,
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

    # Ежемесячный доход от процентов (если задана ставка)
    interest_monthly: Decimal | None = None
    if interest_rate and interest_rate > 0 and current_amount > 0:
        interest_monthly = _calc_interest_monthly(current_amount, interest_rate)

    # Нужный ежемесячный взнос (уже за вычетом дохода от процентов)
    if months_to_deadline and months_to_deadline > 0:
        base_required = (remaining / Decimal(months_to_deadline)).quantize(Decimal('0.01'))
        if interest_monthly:
            required_monthly = max(Decimal('0'), base_required - interest_monthly)
        else:
            required_monthly = base_required
    else:
        # Нет дедлайна — показываем сколько месяцев при текущем темпе
        required_monthly = Decimal('0')

    # Feasibility
    feasibility: FeasibilityLabel
    if monthly_avg_balance <= 0:
        feasibility = 'unrealistic'
    elif required_monthly == 0:
        # Нет дедлайна или проценты полностью покрывают — просто показываем данные
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
        interest_monthly=interest_monthly,
    )


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _to_out(db: Session, goal: SavingsGoal) -> GoalOut:
    progress_percent = (
        (goal.current_amount / goal.target_amount * Decimal('100')).quantize(Decimal('0.01'))
        if goal.target_amount > 0 else Decimal('0')
    )
    forecast = _calc_forecast(
        db,
        goal.target_amount,
        goal.current_amount,
        goal.deadline,
        goal.interest_rate,
        goal.interest_frequency,
    )

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
        interest_rate=goal.interest_rate,
        interest_frequency=goal.interest_frequency,
        interest_next_date=goal.interest_next_date,
    )


# ─── Goals CRUD ───────────────────────────────────────────────────────────────

def list_goals(db: Session) -> GoalsListOut:
    goals = list(db.scalars(
        select(SavingsGoal).order_by(SavingsGoal.created_at.desc())
    ))

    # Автоматически начисляем просроченные проценты перед отдачей данных
    needs_commit = any(
        _accrue_due_interest(db, g)
        for g in goals
        if g.status == 'active'
    )
    if needs_commit:
        db.commit()
        for g in goals:
            db.refresh(g)

    active = [_to_out(db, g) for g in goals if g.status == 'active']
    completed = [_to_out(db, g) for g in goals if g.status == 'completed']
    return GoalsListOut(active=active, completed=completed)


def create_goal(db: Session, payload: GoalCreate) -> GoalOut:
    today = date.today()

    # Вычисляем дату первого начисления если задана ставка
    interest_next_date: date | None = None
    if payload.interest_rate and payload.interest_frequency:
        interest_next_date = _compute_next_interest_date(payload.interest_frequency, today)

    goal = SavingsGoal(
        name=payload.name,
        photo_url=payload.photo_url,
        target_amount=payload.target_amount,
        current_amount=Decimal('0'),
        deadline=payload.deadline,
        status='active',
        interest_rate=payload.interest_rate,
        interest_frequency=payload.interest_frequency,
        interest_next_date=interest_next_date,
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

    # Создаём транзакцию-расход и сразу получаем её id через flush,
    # чтобы сохранить ссылку в депозите для возможного отката.
    transaction = Transaction(
        name=f'Копилка: {goal.name}',
        amount=payload.amount,
        account_id=payload.account_id,  # списываем с выбранного счёта (None = без привязки)
        category_id='invest-savings',
        category_group='Инвестиции',
        category=goal.name,
        icon='🐷',
        date=date.today(),
        time=datetime.now().strftime('%H:%M'),
        type='expense',
    )
    db.add(transaction)
    db.flush()  # заполняет transaction.id, не коммитя

    deposit = SavingsDeposit(
        goal_id=goal_id,
        amount=payload.amount,
        note=payload.note,
        transaction_id=transaction.id,  # связываем депозит с транзакцией
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
