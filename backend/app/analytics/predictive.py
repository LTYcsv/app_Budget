from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Transaction

from .config import (
    MIN_DAYS_FOR_HIGH_CONFIDENCE,
    MIN_DAYS_FOR_MEDIUM_CONFIDENCE,
    PREDICTIVE_LONG_HORIZON_DAYS,
    PREDICTIVE_SHORT_HORIZON_DAYS,
)
from .schemas import PredictiveAlert, PredictiveSnapshotOut


def _confidence_label(days_with_data: int) -> str:
    if days_with_data < MIN_DAYS_FOR_MEDIUM_CONFIDENCE:
        return 'Низкая точность'
    if days_with_data <= MIN_DAYS_FOR_HIGH_CONFIDENCE:
        return 'Средняя точность'
    return 'Высокая точность'


def _alert_for_probability(risk_probability: Decimal) -> PredictiveAlert:
    if risk_probability < Decimal('30'):
        return PredictiveAlert(severity='none', message='Риск перерасхода низкий.')
    if risk_probability < Decimal('60'):
        return PredictiveAlert(severity='medium', message=f'Риск перерасхода {risk_probability:.2f}%.')
    return PredictiveAlert(severity='high', message=f'Высокий риск перерасхода: {risk_probability:.2f}%.')


def build_predictive_snapshot(db: Session, user_id: str) -> PredictiveSnapshotOut:
    today = date.today()
    start_90d = today - timedelta(days=89)

    total_90d = db.scalar(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.user_id == user_id,
            Transaction.type == 'expense',
            Transaction.date >= start_90d,
            Transaction.date <= today,
        )
    )
    days_with_data = (
        db.scalar(
            select(func.count(func.distinct(Transaction.date))).where(
                Transaction.user_id == user_id,
                Transaction.type == 'expense',
                Transaction.date >= start_90d,
                Transaction.date <= today,
            )
        )
        or 0
    )
    avg_daily = (Decimal(total_90d) / Decimal(max(days_with_data, 1))).quantize(Decimal('0.01'))

    expected_expenses_7d = (avg_daily * Decimal(PREDICTIVE_SHORT_HORIZON_DAYS)).quantize(Decimal('0.01'))
    expected_expenses_30d = (avg_daily * Decimal(PREDICTIVE_LONG_HORIZON_DAYS)).quantize(Decimal('0.01'))

    income_30d = db.scalar(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.user_id == user_id,
            Transaction.type == 'income',
            Transaction.date >= today - timedelta(days=29),
            Transaction.date <= today,
        )
    )
    expense_30d = db.scalar(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.user_id == user_id,
            Transaction.type == 'expense',
            Transaction.date >= today - timedelta(days=29),
            Transaction.date <= today,
        )
    )
    current_balance = Decimal(income_30d) - Decimal(expense_30d)
    expected_remaining_30d = (current_balance - expected_expenses_30d).quantize(Decimal('0.01'))

    risk_probability = Decimal('0') if expected_remaining_30d >= 0 else Decimal('70')

    return PredictiveSnapshotOut(
        expected_expenses_7d=expected_expenses_7d,
        expected_expenses_30d=expected_expenses_30d,
        expected_remaining_30d=expected_remaining_30d,
        confidence_label=_confidence_label(days_with_data),
        alert=_alert_for_probability(risk_probability),
    )
    