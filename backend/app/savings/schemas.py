from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


GoalStatus = Literal['active', 'completed']
FeasibilityLabel = Literal['easily', 'feasible', 'hard', 'unrealistic', 'no_data']
InterestFrequency = Literal['monthly', 'yearly']


# ─── Forecast ─────────────────────────────────────────────────────────────────

class GoalForecast(BaseModel):
    monthly_avg_balance: Decimal        # средний остаток в месяц за 90 дней
    required_monthly: Decimal           # нужно откладывать в месяц (уже за вычетом процентов)
    months_to_deadline: int | None      # месяцев до дедлайна (None если нет дедлайна)
    feasibility: FeasibilityLabel       # метка достижимости
    feasibility_label_ru: str           # человекочитаемый текст
    interest_monthly: Decimal | None = None  # ежемесячный доход от процентов


# ─── Deposit ──────────────────────────────────────────────────────────────────

class DepositCreate(BaseModel):
    amount: Decimal = Field(gt=0)
    note: str | None = Field(default=None, max_length=255)
    account_id: str | None = None  # счёт списания (None = без привязки к счёту)


class DepositOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    goal_id: str
    amount: Decimal
    note: str | None
    created_at: datetime


# ─── Goal ─────────────────────────────────────────────────────────────────────

class GoalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    photo_url: str | None = Field(default=None, max_length=1024)
    target_amount: Decimal = Field(gt=0)
    deadline: date | None = None
    interest_rate: Decimal | None = Field(default=None, ge=0, le=100)   # годовой %, напр. 18.00
    interest_frequency: InterestFrequency | None = None                  # monthly | yearly


class GoalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    photo_url: str | None
    target_amount: Decimal
    current_amount: Decimal
    deadline: date | None
    status: GoalStatus
    created_at: datetime
    progress_percent: Decimal               # current / target * 100
    forecast: GoalForecast | None           # None если нет данных транзакций
    interest_rate: Decimal | None = None    # годовой % (None если нет)
    interest_frequency: str | None = None   # monthly | yearly
    interest_next_date: date | None = None  # дата следующего начисления


# ─── List response ────────────────────────────────────────────────────────────

class GoalsListOut(BaseModel):
    active: list[GoalOut]
    completed: list[GoalOut]
