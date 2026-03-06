from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel


class AccountCreate(BaseModel):
    name: str
    color: str = '#6366F1'
    initial_balance: Decimal = Decimal('0')


class AccountOut(BaseModel):
    model_config = {'from_attributes': True}

    id: str
    name: str
    color: str
    initial_balance: Decimal
    current_balance: Decimal   # initial_balance + доходы - расходы
    created_at: datetime


class TransferCreate(BaseModel):
    from_account_id: str
    to_account_id: str
    amount: Decimal
    note: str | None = None
    date: str        # YYYY-MM-DD
    time: str        # HH:MM


class TransferOut(BaseModel):
    model_config = {'from_attributes': True}

    from_transaction_id: str
    to_transaction_id: str
    amount: Decimal
    date: str
    time: str
    note: str | None
