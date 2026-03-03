from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db_session

from .schemas import GamificationOut
from .service import get_gamification

router = APIRouter(prefix='/gamification', tags=['gamification'])


@router.get('', response_model=GamificationOut)
def gamification(db: Session = Depends(get_db_session)):
    return get_gamification(db)
