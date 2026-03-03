from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import SavingsDeposit, SavingsGoal, Transaction

from .schemas import AchievementOut, GamificationOut

# ─── Achievement definitions ──────────────────────────────────────────────────

ACHIEVEMENT_DEFS = [
    {
        'id': 'first_transaction',
        'title': 'Первый шаг',
        'description': 'Добавь первую транзакцию',
        'icon': '🐣',
        'rarity': 'common',
    },
    {
        'id': 'transactions_10',
        'title': 'Входишь во вкус',
        'description': 'Добавь 10 транзакций',
        'icon': '📝',
        'rarity': 'common',
    },
    {
        'id': 'transactions_100',
        'title': 'Сотня',
        'description': 'Добавь 100 транзакций',
        'icon': '🧮',
        'rarity': 'rare',
    },
    {
        'id': 'streak_7',
        'title': 'Неделя подряд',
        'description': 'Веди учёт 7 дней без пропусков',
        'icon': '🔥',
        'rarity': 'common',
    },
    {
        'id': 'streak_30',
        'title': 'Месяц подряд',
        'description': 'Веди учёт 30 дней без пропусков',
        'icon': '🏆',
        'rarity': 'epic',
    },
    {
        'id': 'first_goal',
        'title': 'Мечтатель',
        'description': 'Создай первую копилку',
        'icon': '🎯',
        'rarity': 'common',
    },
    {
        'id': 'first_deposit',
        'title': 'Накопитель',
        'description': 'Пополни копилку первый раз',
        'icon': '🐷',
        'rarity': 'common',
    },
    {
        'id': 'goal_completed',
        'title': 'Цель достигнута',
        'description': 'Выполни первую копилку',
        'icon': '💎',
        'rarity': 'legendary',
    },
]


# ─── Streak calculation ───────────────────────────────────────────────────────

def _calc_streak(db: Session) -> tuple[int, int]:
    """
    Возвращает (текущий streak, лучший streak).
    Streak — количество последовательных дней с хотя бы одной транзакцией,
    считая назад от сегодня (или вчера если сегодня транзакций ещё нет).
    """
    # Получаем все уникальные даты транзакций, сортируем desc
    stmt = (
        select(Transaction.date)
        .distinct()
        .order_by(Transaction.date.desc())
    )
    dates: list[date] = [row for row in db.scalars(stmt).all()]

    if not dates:
        return 0, 0

    today = date.today()
    dates_set = set(dates)

    # Определяем точку отсчёта — сегодня или вчера
    start = today if today in dates_set else today - timedelta(days=1)

    # Считаем текущий streak
    current = 0
    cursor = start
    while cursor in dates_set:
        current += 1
        cursor -= timedelta(days=1)

    # Считаем лучший streak — проходим все даты
    best = 0
    streak = 0
    prev: date | None = None

    for d in sorted(dates):
        if prev is None or (d - prev).days == 1:
            streak += 1
        elif (d - prev).days > 1:
            streak = 1
        best = max(best, streak)
        prev = d

    best = max(best, current)

    return current, best


# ─── Achievement checks ───────────────────────────────────────────────────────

def _check_achievements(db: Session, streak_current: int) -> dict[str, date | None]:
    """
    Проверяет все достижения и возвращает словарь {achievement_id: unlocked_date | None}.
    unlocked_date — дата когда условие было впервые выполнено (приблизительно).
    """
    results: dict[str, date | None] = {}

    # Транзакции
    tx_count = db.scalar(select(func.count()).select_from(Transaction)) or 0
    all_dates = db.scalars(
        select(Transaction.date).order_by(Transaction.date.asc())
    ).all()
    first_tx_date = all_dates[0] if all_dates else None

    results['first_transaction'] = first_tx_date if tx_count >= 1 else None
    results['transactions_10'] = (
        db.scalar(
            select(Transaction.date)
            .order_by(Transaction.date.asc())
            .offset(9).limit(1)
        )
        if tx_count >= 10 else None
    )
    results['transactions_100'] = (
        db.scalar(
            select(Transaction.date)
            .order_by(Transaction.date.asc())
            .offset(99).limit(1)
        )
        if tx_count >= 100 else None
    )

    # Streak — дата разблокировки приблизительно: N дней назад от сегодня
    today = date.today()
    results['streak_7'] = (today - timedelta(days=6)) if streak_current >= 7 else None
    results['streak_30'] = (today - timedelta(days=29)) if streak_current >= 30 else None

    # Копилки
    first_goal = db.scalar(
        select(SavingsGoal.created_at).order_by(SavingsGoal.created_at.asc()).limit(1)
    )
    results['first_goal'] = first_goal.date() if first_goal else None

    first_deposit = db.scalar(
        select(SavingsDeposit.created_at).order_by(SavingsDeposit.created_at.asc()).limit(1)
    )
    results['first_deposit'] = first_deposit.date() if first_deposit else None

    completed_goal = db.scalar(
        select(SavingsGoal.created_at)
        .where(SavingsGoal.status == 'completed')
        .order_by(SavingsGoal.created_at.asc())
        .limit(1)
    )
    results['goal_completed'] = completed_goal.date() if completed_goal else None

    return results


# ─── Main ─────────────────────────────────────────────────────────────────────

def get_gamification(db: Session) -> GamificationOut:
    streak_current, streak_best = _calc_streak(db)
    unlocked_map = _check_achievements(db, streak_current)

    achievements: list[AchievementOut] = []
    for defn in ACHIEVEMENT_DEFS:
        unlocked_at = unlocked_map.get(defn['id'])
        achievements.append(AchievementOut(
            id=defn['id'],
            title=defn['title'],
            description=defn['description'],
            icon=defn['icon'],
            rarity=defn['rarity'],
            unlocked=unlocked_at is not None,
            unlocked_at=unlocked_at,
        ))

    unlocked_count = sum(1 for a in achievements if a.unlocked)

    return GamificationOut(
        streak_current=streak_current,
        streak_best=streak_best,
        achievements=achievements,
        achievements_unlocked=unlocked_count,
        achievements_total=len(achievements),
    )
