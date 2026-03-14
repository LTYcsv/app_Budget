from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


TransactionType = str  # 'income' | 'expense'


class CategoryBase(BaseModel):
    group: str = Field(min_length=1, max_length=128)
    name: str = Field(min_length=1, max_length=128)
    icon: str = Field(min_length=1, max_length=1024)


class CategoryCreate(CategoryBase):
    # parent_id — если создаём подкатегорию под существующей категорией
    parent_id: str | None = Field(default=None, min_length=1, max_length=64)


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    icon: str | None = Field(default=None, min_length=1, max_length=1024)
    is_hidden: bool | None = None
    sort_order: int | None = None


class CategoryOut(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: TransactionType
    is_other: bool
    parent_id: str | None = None
    sort_order: int = 0
    is_hidden: bool = False
    # is_custom = True если создана пользователем (user_id не null)
    is_custom: bool = False


class TransactionBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    amount: Decimal = Field(gt=0)
    account_id: str | None = Field(default=None, min_length=1, max_length=64)
    category_id: str | None = Field(default=None, min_length=1, max_length=64)
    subcategory_id: str | None = Field(default=None, min_length=1, max_length=64)
    category_group: str | None = Field(default=None, min_length=1, max_length=128)
    category: str = Field(min_length=1, max_length=128)
    icon: str = Field(min_length=1, max_length=1024)
    date: date
    time: str = Field(min_length=5, max_length=5, pattern=r'^\d{2}:\d{2}$')
    type: TransactionType


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
    