from datetime import date
from typing import Literal

from pydantic import BaseModel


AchievementId = Literal[
    'first_transaction',   # Первая транзакция
    'streak_7',            # Streak 7 дней
    'streak_30',           # Streak 30 дней
    'first_goal',          # Создал первую копилку
    'first_deposit',       # Пополнил копилку
    'goal_completed',      # Выполнил копилку
    'transactions_10',     # 10 транзакций
    'transactions_100',    # 100 транзакций
]


class AchievementOut(BaseModel):
    id: AchievementId
    title: str
    description: str
    icon: str
    rarity: Literal['common', 'rare', 'epic', 'legendary']
    unlocked: bool
    unlocked_at: date | None   # дата первого выполнения условия


class GamificationOut(BaseModel):
    streak_current: int        # текущий streak в днях
    streak_best: int           # лучший streak за всё время
    achievements: list[AchievementOut]
    achievements_unlocked: int
    achievements_total: int
