from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.analytics.metrics import (
    category_spend_for_range,
    category_trends_for_range,
    dashboard_for_period,
    summary_for_range,
)
from app.analytics.predictive import build_predictive_snapshot
from app.analytics.schemas import (
    CategorySpendOut,
    CategoryTrendsOut,
    DashboardOut,
    DashboardPeriod,
    PredictiveSnapshotOut,
    SummaryOut,
)
from app.api.deps import get_db_session
from app.auth.deps import get_current_user
from app.cache import analytics_cache
from app.models import User

router = APIRouter(prefix='/analytics', tags=['analytics'])

# Maximum date range accepted from clients — prevents expensive full-history scans
_MAX_RANGE_DAYS = 366


def _validate_range(date_from: date, date_to: date, max_days: int = _MAX_RANGE_DAYS) -> None:
    """Raise 422 for inverted or excessively wide date ranges."""
    if date_from > date_to:
        raise HTTPException(
            status_code=422,
            detail='date_from must be on or before date_to',
        )
    if (date_to - date_from).days > max_days:
        raise HTTPException(
            status_code=422,
            detail=f'Date range cannot exceed {max_days} days',
        )


@router.get('/summary', response_model=SummaryOut)
def get_summary(
    date_from: date = Query(...),
    date_to: date = Query(...),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> SummaryOut:
    _validate_range(date_from, date_to)
    params = {'df': str(date_from), 'dt': str(date_to)}
    cached = analytics_cache.get(current_user.id, 'summary', params)
    if cached is not None:
        return cached
    result = summary_for_range(db, current_user.id, date_from, date_to)
    analytics_cache.set(current_user.id, 'summary', params, result)
    return result


@router.get('/category-spend', response_model=CategorySpendOut)
def get_category_spend(
    date_from: date = Query(...),
    date_to: date = Query(...),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> CategorySpendOut:
    _validate_range(date_from, date_to)
    params = {'df': str(date_from), 'dt': str(date_to)}
    cached = analytics_cache.get(current_user.id, 'category-spend', params)
    if cached is not None:
        return cached
    result = category_spend_for_range(db, current_user.id, date_from, date_to)
    analytics_cache.set(current_user.id, 'category-spend', params, result)
    return result


@router.get('/category-trends', response_model=CategoryTrendsOut)
def category_trends(
    date_from: date = Query(...),
    date_to: date = Query(...),
    prev_date_from: date | None = Query(None),
    prev_date_to: date | None = Query(None),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> CategoryTrendsOut:
    _validate_range(date_from, date_to)
    if prev_date_from is not None and prev_date_to is not None:
        _validate_range(prev_date_from, prev_date_to)
    params = {
        'df': str(date_from),
        'dt': str(date_to),
        'pdf': str(prev_date_from),
        'pdt': str(prev_date_to),
    }
    cached = analytics_cache.get(current_user.id, 'category-trends', params)
    if cached is not None:
        return cached
    result = category_trends_for_range(
        db, current_user.id, date_from, date_to, prev_date_from, prev_date_to
    )
    analytics_cache.set(current_user.id, 'category-trends', params, result)
    return result


@router.get('/dashboard', response_model=DashboardOut)
def get_dashboard(
    period: DashboardPeriod = Query('month'),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> DashboardOut:
    params = {'period': str(period)}
    cached = analytics_cache.get(current_user.id, 'dashboard', params)
    if cached is not None:
        return cached
    result = dashboard_for_period(db, current_user.id, period)
    analytics_cache.set(current_user.id, 'dashboard', params, result)
    return result


@router.get('/predictive', response_model=PredictiveSnapshotOut)
def get_predictive_snapshot(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> PredictiveSnapshotOut:
    cached = analytics_cache.get(current_user.id, 'predictive', {})
    if cached is not None:
        return cached
    result = build_predictive_snapshot(db, current_user.id)
    analytics_cache.set(current_user.id, 'predictive', {}, result, ttl=900)
    return result
