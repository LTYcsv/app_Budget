from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.auth.deps import get_current_user
from app.models import User
from app.schemas import CategoryCreate, CategoryOut, CategoryUpdate
from app.services import (
    create_category,
    delete_category,
    get_categories,
    update_category,
    toggle_category_visibility,
)

router = APIRouter(prefix='/categories', tags=['categories'])


@router.get('', response_model=dict[str, list[CategoryOut]])
def list_categories(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> dict[str, list[CategoryOut]]:
    return get_categories(db, current_user.id)


@router.post('/{category_type}', response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def post_category(
    category_type: str,
    payload: CategoryCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> CategoryOut:
    return create_category(db, current_user.id, category_type, payload)


@router.patch('/{category_type}/{category_id}', response_model=CategoryOut)
def patch_category(
    category_type: str,
    category_id: str,
    payload: CategoryUpdate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> CategoryOut:
    return update_category(db, current_user.id, category_type, category_id, payload)


@router.post('/{category_type}/{category_id}/toggle-visibility', response_model=CategoryOut)
def post_toggle_visibility(
    category_type: str,
    category_id: str,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> CategoryOut:
    return toggle_category_visibility(db, current_user.id, category_type, category_id)


@router.delete('/{category_type}/{category_id}', status_code=status.HTTP_204_NO_CONTENT)
def remove_category(
    category_type: str,
    category_id: str,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Response:
    delete_category(db, current_user.id, category_type, category_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
