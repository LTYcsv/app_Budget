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
    balance: Decimal                  # CF — чистый денежный поток
    savings_rate: Decimal | None      # SR в процентах, None если нет дохода
    savings_status: str | None        # "surplus" | "deficit" | "no_income"


# ─── Category spend (с подкатегориями) ────────────────────────────────────────

class SubcategorySpendItem(BaseModel):
    """Одна подкатегория внутри группы."""
    name: str
    icon: str
    amount: Decimal
    percent_of_group: Decimal         # доля внутри группы, не от общего


class CategorySpendItem(BaseModel):
    """Группа категорий с вложенными подкатегориями."""
    group: str
    icon: str
    amount: Decimal
    percent: Decimal                  # доля от общих расходов
    subcategories: list[SubcategorySpendItem] = Field(default_factory=list)


class CategorySpendOut(BaseModel):
    total: Decimal
    items: list[CategorySpendItem]


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
