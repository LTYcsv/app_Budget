from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.auth.deps import get_current_user
from app.models import User
from app.schemas import BootstrapOut
from app.services import list_categories, list_transactions

router = APIRouter(tags=['bootstrap'])


@router.get('/bootstrap', response_model=BootstrapOut)
def bootstrap(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> BootstrapOut:
    transactions = list_transactions(db, current_user.id)
    categories = list_categories(db, current_user.id)
    return BootstrapOut(transactions=transactions, categories=categories)
