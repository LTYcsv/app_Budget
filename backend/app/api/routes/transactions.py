from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.schemas import TransactionCreate, TransactionOut, TransactionUpdate
from app.services import create_transaction, delete_transaction, list_transactions, update_transaction

router = APIRouter(prefix='/transactions', tags=['transactions'])


@router.get('', response_model=list[TransactionOut])
def get_transactions(db: Session = Depends(get_db_session)) -> list[TransactionOut]:
    return list_transactions(db)


@router.post('', response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def post_transaction(payload: TransactionCreate, db: Session = Depends(get_db_session)) -> TransactionOut:
    return create_transaction(db, payload)


@router.put('/{tx_id}', response_model=TransactionOut)
def put_transaction(tx_id: str, payload: TransactionUpdate, db: Session = Depends(get_db_session)) -> TransactionOut:
    return update_transaction(db, tx_id, payload)


@router.delete('/{tx_id}', status_code=status.HTTP_204_NO_CONTENT)
def remove_transaction(tx_id: str, db: Session = Depends(get_db_session)) -> Response:
    delete_transaction(db, tx_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
