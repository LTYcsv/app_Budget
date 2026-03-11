from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.auth.deps import get_current_user
from app.models import User

from .schemas import GamificationOut
from .service import get_gamification

router = APIRouter(prefix='/gamification', tags=['gamification'])


@router.get('', response_model=GamificationOut)
def gamification(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    return get_gamification(db, current_user.id)
