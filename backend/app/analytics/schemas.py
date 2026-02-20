from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class CategoryBudgetIn(BaseModel):
    group: str = Field(min_length=1, max_length=128)
    budget: Decimal = Field(gt=0)


class PredictiveAnalyticsRequest(BaseModel):
    current_balance: Decimal | None = None
    expected_income: Decimal | None = None
    total_budget: Decimal | None = Field(default=None, gt=0)
    category_budgets: list[CategoryBudgetIn] = Field(default_factory=list)


class PeriodForecastOut(BaseModel):
    days: int
    predicted_expenses: Decimal
    expected_remaining: Decimal


class RiskOut(BaseModel):
    budget: Decimal
    predicted_expenses: Decimal
    risk_probability: Decimal
    level: str


class CategoryRiskOut(BaseModel):
    group: str
    budget: Decimal
    predicted_expenses: Decimal
    risk_probability: Decimal
    level: str


class AlertOut(BaseModel):
    level: str
    message: str


class PredictiveAnalyticsOut(BaseModel):
    generated_at: datetime
    cached: bool
    confidence_label: str
    forecast_7d: PeriodForecastOut
    forecast_30d: PeriodForecastOut
    overall_risk_30d: RiskOut | None
    category_risks_30d: list[CategoryRiskOut]
    alerts: list[AlertOut]
