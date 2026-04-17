from datetime import date
from typing import Literal

from pydantic import BaseModel


AchievementId = Literal[
    # Транзакции
    'first_transaction', 'transactions_10', 'transactions_100', 'transactions_500', 'transactions_1000',
    # Стрик
    'streak_7', 'streak_30', 'streak_60', 'streak_100',
    # Копилки — выполненные
    'goal_completed_1', 'goal_completed_3', 'goal_completed_5', 'goal_completed_10',
    # Копилки — пополнения
    'first_deposit', 'deposits_10', 'deposits_50', 'deposits_100',
    # Разнообразие
    'categories_5', 'categories_10',
    # Счета
    'first_account', 'accounts_3',
    # Копилки — создание
    'first_goal',
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
    streak_current: int
    streak_best: int
    achievements: list[AchievementOut]
    achievements_unlocked: int
    achievements_total: int
    xp_total: int
