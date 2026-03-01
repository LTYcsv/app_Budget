from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas import TransactionOut


DashboardPeriod = Literal['day', 'week', 'month', 'year']


# ─── Summary / CF / SR ────────────────────────────────────────────────────────

class SummaryOut(BaseModel):
    income: Decimal
    expense: Decimal
    balance: Decimal
    savings_rate: Decimal | None
    savings_status: str | None


# ─── Category spend ───────────────────────────────────────────────────────────

class SubcategorySpendItem(BaseModel):
    name: str
    icon: str
    amount: Decimal
    percent_of_group: Decimal


class CategorySpendItem(BaseModel):
    group: str
    icon: str
    amount: Decimal
    percent: Decimal
    subcategories: list[SubcategorySpendItem] = Field(default_factory=list)


class CategorySpendOut(BaseModel):
    total: Decimal
    items: list[CategorySpendItem]


# ─── Category trends ──────────────────────────────────────────────────────────

class CategoryTrendItem(BaseModel):
    group: str
    icon: str
    current_amount: Decimal
    prev_amount: Decimal
    trend_percent: Decimal | None   # None если не было трат в прошлом периоде
    direction: Literal['up', 'down', 'stable', 'new']


class CategoryTrendsOut(BaseModel):
    date_from: date
    date_to: date
    prev_date_from: date
    prev_date_to: date
    items: list[CategoryTrendItem]


# ─── Dashboard ────────────────────────────────────────────────────────────────

class DashboardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    period: DashboardPeriod
    date_from: date
    date_to: date
    summary: SummaryOut
    recent_transactions: list[TransactionOut]


# ─── Predictive ───────────────────────────────────────────────────────────────

class PredictiveAlert(BaseModel):
    severity: Literal['none', 'medium', 'high']
    message: str


class PredictiveSnapshotOut(BaseModel):
    expected_expenses_7d: Decimal
    expected_expenses_30d: Decimal
    expected_remaining_30d: Decimal
    confidence_label: Literal['Низкая точность', 'Средняя точность', 'Высокая точность']
    alert: PredictiveAlert
