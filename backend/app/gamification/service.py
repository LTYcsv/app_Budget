from datetime import date, timedelta

from sqlalchemy import func, select, distinct
from sqlalchemy.orm import Session

from app.models import Account, SavingsDeposit, SavingsGoal, Transaction

from .schemas import AchievementOut, GamificationOut

ACHIEVEMENT_DEFS = [
    # Транзакции
    {'id': 'first_transaction',   'title': 'Первый шаг',      'description': 'Добавь первую транзакцию',    'icon': '🐣', 'rarity': 'common'},
    {'id': 'transactions_10',     'title': 'Входишь во вкус', 'description': 'Добавь 10 транзакций',        'icon': '📝', 'rarity': 'common'},
    {'id': 'transactions_100',    'title': 'Сотня',           'description': 'Добавь 100 транзакций',       'icon': '🧮', 'rarity': 'rare'},
    {'id': 'transactions_500',    'title': 'Машина',          'description': 'Добавь 500 транзакций',       'icon': '⚡', 'rarity': 'epic'},
    {'id': 'transactions_1000',   'title': 'Легенда учёта',   'description': 'Добавь 1000 транзакций',      'icon': '🌌', 'rarity': 'legendary'},
    # Стрик
    {'id': 'streak_7',            'title': 'Неделя подряд',   'description': 'Веди учёт 7 дней подряд',    'icon': '🔥', 'rarity': 'common'},
    {'id': 'streak_30',           'title': 'Месяц подряд',    'description': 'Веди учёт 30 дней подряд',   'icon': '🏆', 'rarity': 'epic'},
    {'id': 'streak_60',           'title': 'Несгибаемый',     'description': 'Веди учёт 60 дней подряд',   'icon': '💀', 'rarity': 'epic'},
    {'id': 'streak_100',          'title': 'Вечный',          'description': 'Веди учёт 100 дней подряд',  'icon': '👁', 'rarity': 'legendary'},
    # Копилки — выполненные
    {'id': 'goal_completed_1',    'title': 'Первая победа',   'description': 'Выполни 1 копилку',          'icon': '💎', 'rarity': 'rare'},
    {'id': 'goal_completed_3',    'title': 'Коллекционер',    'description': 'Выполни 3 копилки',          'icon': '🏅', 'rarity': 'epic'},
    {'id': 'goal_completed_5',    'title': 'Стратег',         'description': 'Выполни 5 копилок',          'icon': '🔱', 'rarity': 'epic'},
    {'id': 'goal_completed_10',   'title': 'Властелин целей', 'description': 'Выполни 10 копилок',         'icon': '👑', 'rarity': 'legendary'},
    # Копилки — пополнения
    {'id': 'first_deposit',       'title': 'Первый вклад',    'description': 'Пополни копилку первый раз', 'icon': '🐷', 'rarity': 'common'},
    {'id': 'deposits_10',         'title': 'Дисциплина',      'description': 'Сделай 10 пополнений',       'icon': '💰', 'rarity': 'rare'},
    {'id': 'deposits_50',         'title': 'Системный игрок', 'description': 'Сделай 50 пополнений',       'icon': '🏦', 'rarity': 'epic'},
    {'id': 'deposits_100',        'title': 'Поток',           'description': 'Сделай 100 пополнений',      'icon': '🌊', 'rarity': 'legendary'},
    # Разнообразие
    {'id': 'categories_5',        'title': 'Исследователь',   'description': 'Используй 5 разных категорий',  'icon': '🗺', 'rarity': 'common'},
    {'id': 'categories_10',       'title': 'Многогранный',    'description': 'Используй 10 разных категорий', 'icon': '🎨', 'rarity': 'rare'},
    # Счета
    {'id': 'first_account',       'title': 'Первый счёт',     'description': 'Создай первый счёт',         'icon': '💳', 'rarity': 'common'},
    {'id': 'accounts_3',          'title': 'Портфель',        'description': 'Создай 3 счёта',             'icon': '🗂', 'rarity': 'rare'},
    # Копилки — создание (оставляем)
    {'id': 'first_goal',          'title': 'Мечтатель',       'description': 'Создай первую копилку',      'icon': '🎯', 'rarity': 'common'},
]


def _calc_streak(db: Session, user_id: str) -> tuple[int, int]:
    stmt = (
        select(Transaction.date)
        .where(Transaction.user_id == user_id)
        .distinct()
        .order_by(Transaction.date.desc())
    )
    dates: list[date] = [row for row in db.scalars(stmt).all()]

    if not dates:
        return 0, 0

    today = date.today()
    dates_set = set(dates)
    start = today if today in dates_set else today - timedelta(days=1)

    current = 0
    cursor = start
    while cursor in dates_set:
        current += 1
        cursor -= timedelta(days=1)

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


def _nth_tx_date(db: Session, user_id: str, n: int) -> date | None:
    return db.scalar(
        select(Transaction.date)
        .where(Transaction.user_id == user_id)
        .order_by(Transaction.date.asc())
        .offset(n - 1).limit(1)
    )


def _nth_deposit_date(db: Session, user_id: str, n: int) -> date | None:
    row = db.scalar(
        select(SavingsDeposit.created_at)
        .join(SavingsGoal, SavingsDeposit.goal_id == SavingsGoal.id)
        .where(SavingsGoal.user_id == user_id)
        .order_by(SavingsDeposit.created_at.asc())
        .offset(n - 1).limit(1)
    )
    return row.date() if row else None


def _check_achievements(db: Session, user_id: str, streak_current: int) -> dict[str, date | None]:
    results: dict[str, date | None] = {}
    today = date.today()

    # ── Транзакции ──────────────────────────────────────────────────────────
    tx_count = db.scalar(
        select(func.count()).select_from(Transaction).where(Transaction.user_id == user_id)
    ) or 0

    results['first_transaction'] = _nth_tx_date(db, user_id, 1)   if tx_count >= 1    else None
    results['transactions_10']   = _nth_tx_date(db, user_id, 10)  if tx_count >= 10   else None
    results['transactions_100']  = _nth_tx_date(db, user_id, 100) if tx_count >= 100  else None
    results['transactions_500']  = _nth_tx_date(db, user_id, 500) if tx_count >= 500  else None
    results['transactions_1000'] = _nth_tx_date(db, user_id, 1000) if tx_count >= 1000 else None

    # ── Стрик ────────────────────────────────────────────────────────────────
    results['streak_7']   = (today - timedelta(days=6))  if streak_current >= 7   else None
    results['streak_30']  = (today - timedelta(days=29)) if streak_current >= 30  else None
    results['streak_60']  = (today - timedelta(days=59)) if streak_current >= 60  else None
    results['streak_100'] = (today - timedelta(days=99)) if streak_current >= 100 else None

    # ── Копилки — выполненные ────────────────────────────────────────────────
    def nth_completed_goal_date(n: int) -> date | None:
        row = db.scalar(
            select(SavingsGoal.created_at)
            .where(SavingsGoal.user_id == user_id, SavingsGoal.status == 'completed')
            .order_by(SavingsGoal.created_at.asc())
            .offset(n - 1).limit(1)
        )
        return row.date() if row else None

    completed_count = db.scalar(
        select(func.count()).select_from(SavingsGoal)
        .where(SavingsGoal.user_id == user_id, SavingsGoal.status == 'completed')
    ) or 0

    results['goal_completed_1']  = nth_completed_goal_date(1)  if completed_count >= 1  else None
    results['goal_completed_3']  = nth_completed_goal_date(3)  if completed_count >= 3  else None
    results['goal_completed_5']  = nth_completed_goal_date(5)  if completed_count >= 5  else None
    results['goal_completed_10'] = nth_completed_goal_date(10) if completed_count >= 10 else None

    # ── Копилки — пополнения ─────────────────────────────────────────────────
    deposit_count = db.scalar(
        select(func.count()).select_from(SavingsDeposit)
        .join(SavingsGoal, SavingsDeposit.goal_id == SavingsGoal.id)
        .where(SavingsGoal.user_id == user_id)
    ) or 0

    results['first_deposit'] = _nth_deposit_date(db, user_id, 1)   if deposit_count >= 1   else None
    results['deposits_10']   = _nth_deposit_date(db, user_id, 10)  if deposit_count >= 10  else None
    results['deposits_50']   = _nth_deposit_date(db, user_id, 50)  if deposit_count >= 50  else None
    results['deposits_100']  = _nth_deposit_date(db, user_id, 100) if deposit_count >= 100 else None

    # ── Разнообразие категорий ───────────────────────────────────────────────
    unique_cats = db.scalar(
        select(func.count(func.distinct(Transaction.category_id)))
        .where(Transaction.user_id == user_id, Transaction.category_id.isnot(None))
    ) or 0

    first_cat_dates = db.scalars(
        select(func.min(Transaction.date))
        .where(Transaction.user_id == user_id, Transaction.category_id.isnot(None))
        .group_by(Transaction.category_id)
        .order_by(func.min(Transaction.date).asc())
    ).all()

    results['categories_5']  = first_cat_dates[4]  if unique_cats >= 5  else None
    results['categories_10'] = first_cat_dates[9]  if unique_cats >= 10 else None

    # ── Счета ────────────────────────────────────────────────────────────────
    account_count = db.scalar(
        select(func.count()).select_from(Account).where(Account.user_id == user_id)
    ) or 0

    def nth_account_date(n: int) -> date | None:
        row = db.scalar(
            select(Account.created_at)
            .where(Account.user_id == user_id)
            .order_by(Account.created_at.asc())
            .offset(n - 1).limit(1)
        )
        return row.date() if row else None

    results['first_account'] = nth_account_date(1) if account_count >= 1 else None
    results['accounts_3']    = nth_account_date(3) if account_count >= 3 else None

    # ── Копилки — создание ───────────────────────────────────────────────────
    first_goal = db.scalar(
        select(SavingsGoal.created_at)
        .where(SavingsGoal.user_id == user_id)
        .order_by(SavingsGoal.created_at.asc()).limit(1)
    )
    results['first_goal'] = first_goal.date() if first_goal else None

    return results


XP_PER_RARITY: dict[str, int] = {
    'common':    100,
    'rare':      250,
    'epic':      500,
    'legendary': 1000,
}


def _calc_xp(
    db: Session,
    user_id: str,
    streak_current: int,
    streak_best: int,
    achievements: list[AchievementOut],
) -> int:
    tx_count = db.scalar(
        select(func.count()).select_from(Transaction).where(Transaction.user_id == user_id)
    ) or 0

    # Регулярность: уникальные дни с транзакциями / дней с первой транзакции
    dates = db.scalars(
        select(distinct(Transaction.date)).where(Transaction.user_id == user_id)
    ).all()
    if dates:
        total_days = max(1, (date.today() - min(dates)).days + 1)
        regularity = len(dates) / total_days
    else:
        regularity = 0.0

    achievement_xp = sum(
        XP_PER_RARITY.get(a.rarity, 0) for a in achievements if a.unlocked
    )

    return (
        tx_count * 5
        + streak_current * 10
        + streak_best * 5
        + round(regularity * 200)
        + achievement_xp
    )


def get_gamification(db: Session, user_id: str) -> GamificationOut:
    streak_current, streak_best = _calc_streak(db, user_id)
    unlocked_map = _check_achievements(db, user_id, streak_current)

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
    xp_total = _calc_xp(db, user_id, streak_current, streak_best, achievements)

    return GamificationOut(
        streak_current=streak_current,
        streak_best=streak_best,
        achievements=achievements,
        achievements_unlocked=unlocked_count,
        achievements_total=len(achievements),
        xp_total=xp_total,
    )
