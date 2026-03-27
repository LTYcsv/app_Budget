import re
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator


# Accepts #RGB or #RRGGBB only — no CSS injection via color field
_HEX_COLOR_RE = re.compile(r'^#[0-9A-Fa-f]{3}(?:[0-9A-Fa-f]{3})?$')

# Shared ceiling for monetary amounts (999 999 999.99)
_MAX_AMOUNT = Decimal('999999999.99')


class AccountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    color: str = Field(default='#6366F1')
    initial_balance: Decimal = Field(default=Decimal('0'), ge=0, le=_MAX_AMOUNT, decimal_places=2)

    @field_validator('name', mode='before')
    @classmethod
    def strip_name(cls, v: object) -> object:
        return v.strip() if isinstance(v, str) else v

    @field_validator('color')
    @classmethod
    def validate_color(cls, v: str) -> str:
        if not _HEX_COLOR_RE.match(v):
            raise ValueError('color must be a valid hex color (#RGB or #RRGGBB)')
        return v.upper()


class AccountOut(BaseModel):
    model_config = {'from_attributes': True}

    id: str
    name: str
    color: str
    initial_balance: Decimal
    current_balance: Decimal   # initial_balance + доходы - расходы
    created_at: datetime


class TransferCreate(BaseModel):
    from_account_id: str = Field(min_length=1, max_length=64)
    to_account_id: str = Field(min_length=1, max_length=64)
    amount: Decimal = Field(gt=0, le=_MAX_AMOUNT, decimal_places=2)
    note: str | None = Field(default=None, max_length=255)
    date: date          # parsed from YYYY-MM-DD by Pydantic — invalid format → 422
    time: str = Field(min_length=5, max_length=5, pattern=r'^(?:[01]\d|2[0-3]):[0-5]\d$')


class TransferOut(BaseModel):
    model_config = {'from_attributes': True}

    from_transaction_id: str
    to_transaction_id: str
    amount: Decimal
    date: date
    time: str
    note: str | None
