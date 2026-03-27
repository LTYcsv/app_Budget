from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

GoalStatus = Literal['active', 'completed']
FeasibilityLabel = Literal['easily', 'feasible', 'hard', 'unrealistic', 'no_data']
InterestFrequency = Literal['monthly', 'yearly']

_MAX_AMOUNT = Decimal('999999999.99')


# ─── Forecast ─────────────────────────────────────────────────────────────────

class GoalForecast(BaseModel):
    monthly_avg_balance: Decimal
    required_monthly: Decimal
    months_to_deadline: int | None
    feasibility: FeasibilityLabel
    feasibility_label_ru: str
    interest_monthly: Decimal | None = None


# ─── Deposit ──────────────────────────────────────────────────────────────────

class DepositCreate(BaseModel):
    amount: Decimal = Field(gt=0, le=_MAX_AMOUNT, decimal_places=2)
    note: str | None = Field(default=None, max_length=255)
    # account_id is validated against ownership in the service layer
    account_id: str | None = Field(default=None, min_length=1, max_length=64)


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
    # photo_url validated as an absolute HTTPS URL — prevents open redirect /
    # data URI injection. Stored as string in DB after validation.
    photo_url: HttpUrl | None = None
    target_amount: Decimal = Field(gt=0, le=_MAX_AMOUNT, decimal_places=2)
    deadline: date | None = None
    # Interest rate: 0–100 %, 2 decimal places (e.g. 18.50 %)
    interest_rate: Decimal | None = Field(default=None, ge=0, le=100, decimal_places=2)
    interest_frequency: InterestFrequency | None = None

    @field_validator('name', mode='before')
    @classmethod
    def strip_name(cls, v: object) -> object:
        return v.strip() if isinstance(v, str) else v

    @field_validator('deadline')
    @classmethod
    def deadline_must_be_future(cls, v: date | None) -> date | None:
        if v is not None and v <= date.today():
            raise ValueError('Дедлайн должен быть в будущем')
        return v

    @field_validator('photo_url', mode='before')
    @classmethod
    def allow_none_or_url(cls, v: object) -> object:
        if v == '' or v is None:
            return None
        return v


class GoalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    photo_url: str | None       # returned as plain string for frontend
    target_amount: Decimal
    current_amount: Decimal
    deadline: date | None
    status: GoalStatus
    created_at: datetime
    progress_percent: Decimal
    forecast: GoalForecast | None
    interest_rate: Decimal | None = None
    interest_frequency: str | None = None
    interest_next_date: date | None = None


# ─── List response ────────────────────────────────────────────────────────────

class GoalsListOut(BaseModel):
    active: list[GoalOut]
    completed: list[GoalOut]
