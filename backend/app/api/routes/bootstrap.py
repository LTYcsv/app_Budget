from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.schemas import BootstrapOut
from app.services import list_categories, list_transactions

router = APIRouter(tags=['bootstrap'])


@router.get('/bootstrap', response_model=BootstrapOut)
def bootstrap(db: Session = Depends(get_db_session)) -> BootstrapOut:
    txs = list_transactions(db)
    categories = list_categories(db)
    return BootstrapOut(transactions=txs, categories=categories)
