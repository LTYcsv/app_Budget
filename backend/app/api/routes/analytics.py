from datetime import date

from fastapi import APIRouter, Depends, Query
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
from app.models import User

router = APIRouter(prefix='/analytics', tags=['analytics'])


@router.get('/summary', response_model=SummaryOut)
def get_summary(
    date_from: date = Query(...),
    date_to: date = Query(...),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> SummaryOut:
    return summary_for_range(db, current_user.id, date_from, date_to)


@router.get('/category-spend', response_model=CategorySpendOut)
def get_category_spend(
    date_from: date = Query(...),
    date_to: date = Query(...),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> CategorySpendOut:
    return category_spend_for_range(db, current_user.id, date_from, date_to)


@router.get('/category-trends', response_model=CategoryTrendsOut)
def category_trends(
    date_from: date = Query(...),
    date_to: date = Query(...),
    prev_date_from: date | None = Query(None),
    prev_date_to: date | None = Query(None),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> CategoryTrendsOut:
    return category_trends_for_range(db, current_user.id, date_from, date_to, prev_date_from, prev_date_to)


@router.get('/dashboard', response_model=DashboardOut)
def get_dashboard(
    period: DashboardPeriod = Query('month'),
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> DashboardOut:
    return dashboard_for_period(db, current_user.id, period)


@router.get('/predictive', response_model=PredictiveSnapshotOut)
def get_predictive_snapshot(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> PredictiveSnapshotOut:
    return build_predictive_snapshot(db, current_user.id)
