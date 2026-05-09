from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.auth.deps import get_current_user
from app.models import User
from app.schemas import TransactionCreate, TransactionOut, TransactionUpdate
from app.services import create_transaction, delete_all_transactions, delete_transaction, list_transactions, update_transaction

router = APIRouter(prefix='/transactions', tags=['transactions'])


@router.get('', response_model=list[TransactionOut])
def get_transactions(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[TransactionOut]:
    return list_transactions(db, current_user.id)


@router.post('', response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def post_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> TransactionOut:
    return create_transaction(db, current_user.id, payload)


@router.put('/{tx_id}', response_model=TransactionOut)
def put_transaction(
    tx_id: str,
    payload: TransactionUpdate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> TransactionOut:
    return update_transaction(db, current_user.id, tx_id, payload)


@router.delete('', status_code=status.HTTP_200_OK)
def clear_all_transactions(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    deleted = delete_all_transactions(db, current_user.id)
    return {'deleted': deleted}


@router.delete('/{tx_id}', status_code=status.HTTP_204_NO_CONTENT)
def remove_transaction(
    tx_id: str,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Response:
    delete_transaction(db, current_user.id, tx_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
