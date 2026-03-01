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

router = APIRouter(prefix='/analytics', tags=['analytics'])


@router.get('/summary', response_model=SummaryOut)
def get_summary(
    date_from: date = Query(..., description='YYYY-MM-DD'),
    date_to: date = Query(..., description='YYYY-MM-DD'),
    db: Session = Depends(get_db_session),
) -> SummaryOut:
    return summary_for_range(db, date_from, date_to)


@router.get('/category-spend', response_model=CategorySpendOut)
def get_category_spend(
    date_from: date = Query(..., description='YYYY-MM-DD'),
    date_to: date = Query(..., description='YYYY-MM-DD'),
    db: Session = Depends(get_db_session),
) -> CategorySpendOut:
    return category_spend_for_range(db, date_from, date_to)


@router.get('/category-trends', response_model=CategoryTrendsOut)
def category_trends(
    date_from: date = Query(..., description='YYYY-MM-DD'),
    date_to: date = Query(..., description='YYYY-MM-DD'),
    prev_date_from: date | None = Query(None, description='YYYY-MM-DD'),
    prev_date_to: date | None = Query(None, description='YYYY-MM-DD'),
    db: Session = Depends(get_db_session),
) -> CategoryTrendsOut:
    return category_trends_for_range(db, date_from, date_to, prev_date_from, prev_date_to)


@router.get('/dashboard', response_model=DashboardOut)
def get_dashboard(period: DashboardPeriod = Query('month'), db: Session = Depends(get_db_session)) -> DashboardOut:
    return dashboard_for_period(db, period)


@router.get('/predictive', response_model=PredictiveSnapshotOut)
def get_predictive_snapshot(db: Session = Depends(get_db_session)) -> PredictiveSnapshotOut:
    return build_predictive_snapshot(db)
