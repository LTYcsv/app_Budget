from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.schemas import CategoryCreate, CategoryOut
from app.services import create_category, delete_category

router = APIRouter(prefix='/categories', tags=['categories'])


@router.post('/{category_type}', response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def post_category(category_type: str, payload: CategoryCreate, db: Session = Depends(get_db_session)) -> CategoryOut:
    return create_category(db, category_type, payload)


@router.delete('/{category_type}/{category_id}', status_code=status.HTTP_204_NO_CONTENT)
def remove_category(category_type: str, category_id: str, db: Session = Depends(get_db_session)) -> Response:
    delete_category(db, category_type, category_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
