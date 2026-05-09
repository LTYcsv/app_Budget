from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.auth.deps import get_current_user
from app.models import User
from app.schemas import BootstrapOut
from app.services import get_bootstrap

router = APIRouter(tags=['bootstrap'])


@router.get('/bootstrap', response_model=BootstrapOut)
def bootstrap(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    limit: int = Query(default=500, ge=1, le=1000),
) -> BootstrapOut:
    return get_bootstrap(db, current_user.id, limit=limit)
