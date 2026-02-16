from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.schemas import CategorySpendOut, DashboardOut, SummaryOut
from app.services import category_spend_for_range, dashboard_for_period, summary_for_range

router = APIRouter(prefix='/analytics', tags=['analytics'])


@router.get('/summary', response_model=SummaryOut)
def get_summary(date_from: date, date_to: date, db: Session = Depends(get_db_session)) -> SummaryOut:
    return summary_for_range(db, date_from=date_from, date_to=date_to)


@router.get('/categories', response_model=CategorySpendOut)
def get_categories(date_from: date, date_to: date, db: Session = Depends(get_db_session)) -> CategorySpendOut:
    return category_spend_for_range(db, date_from=date_from, date_to=date_to)


@router.get('/dashboard', response_model=DashboardOut)
def get_dashboard(period: str = 'month', db: Session = Depends(get_db_session)) -> DashboardOut:
    return dashboard_for_period(db, period=period)
