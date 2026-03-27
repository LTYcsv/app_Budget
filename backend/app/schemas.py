from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Hard ceiling on any monetary amount in the system
_MAX_AMOUNT = Decimal('999999999.99')

# Explicit enum prevents arbitrary strings reaching the DB type column
TransactionType = Literal['income', 'expense', 'transfer']


class CategoryBase(BaseModel):
    group: str = Field(min_length=1, max_length=128)
    name: str = Field(min_length=1, max_length=128)
    # Icons are emoji or short identifiers — 64 chars is more than enough
    icon: str = Field(min_length=1, max_length=64)


class CategoryCreate(CategoryBase):
    # parent_id — если создаём подкатегорию под существующей категорией
    parent_id: str | None = Field(default=None, min_length=1, max_length=64)


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    icon: str | None = Field(default=None, min_length=1, max_length=64)
    is_hidden: bool | None = None
    # Bounded to prevent absurdly large sort positions
    sort_order: int | None = Field(default=None, ge=0, le=100_000)


class CategoryOut(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: str
    is_other: bool
    parent_id: str | None = None
    sort_order: int = 0
    is_hidden: bool = False
    # is_custom = True если создана пользователем (user_id не null)
    is_custom: bool = False


class TransactionBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    # gt=0 prevents zero/negative amounts; ceiling prevents absurd values
    amount: Decimal = Field(gt=0, le=_MAX_AMOUNT, decimal_places=2)
    account_id: str | None = Field(default=None, min_length=1, max_length=64)
    category_id: str | None = Field(default=None, min_length=1, max_length=64)
    subcategory_id: str | None = Field(default=None, min_length=1, max_length=64)
    category_group: str | None = Field(default=None, min_length=1, max_length=128)
    category: str = Field(min_length=1, max_length=128)
    icon: str = Field(min_length=1, max_length=64)
    date: date
    time: str = Field(min_length=5, max_length=5, pattern=r'^(?:[01]\d|2[0-3]):[0-5]\d$')
    # Strict enum — 'transfer' accepted for account transfers
    type: TransactionType

    @field_validator('name', 'category', 'category_group', mode='before')
    @classmethod
    def strip_strings(cls, v: object) -> object:
        return v.strip() if isinstance(v, str) else v


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(TransactionBase):
    pass


class TransactionOut(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    id: str


class BootstrapOut(BaseModel):
    transactions: list[TransactionOut]
    categories: dict[str, list[CategoryOut]]
