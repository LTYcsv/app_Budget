from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.auth.deps import get_current_user
from app.models import User

from .schemas import AccountCreate, AccountOut, TransferCreate, TransferOut
from .service import create_account, create_transfer, delete_account, list_accounts, update_account

router = APIRouter(prefix='/accounts', tags=['accounts'])


@router.get('', response_model=list[AccountOut])
def get_accounts(
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    return list_accounts(db, current_user.id)


@router.post('', response_model=AccountOut, status_code=status.HTTP_201_CREATED)
def post_account(
    payload: AccountCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    return create_account(db, current_user.id, payload)


@router.put('/{account_id}', response_model=AccountOut)
def put_account(
    account_id: str,
    payload: AccountCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    return update_account(db, current_user.id, account_id, payload)


@router.delete('/{account_id}', status_code=status.HTTP_204_NO_CONTENT)
def del_account(
    account_id: str,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    delete_account(db, current_user.id, account_id)


@router.post('/transfer', response_model=TransferOut, status_code=status.HTTP_201_CREATED)
def post_transfer(
    payload: TransferCreate,
    db: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
):
    return create_transfer(db, current_user.id, payload)
