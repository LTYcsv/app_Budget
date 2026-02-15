from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


TransactionType = str  # 'income' | 'expense'


class CategoryBase(BaseModel):
    group: str = Field(min_length=1, max_length=128)
    name: str = Field(min_length=1, max_length=128)
    icon: str = Field(min_length=1, max_length=1024)


class CategoryCreate(CategoryBase):
    pass


class CategoryOut(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: TransactionType
    is_other: bool


class TransactionBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    amount: Decimal = Field(gt=0)
    category_id: str | None = Field(default=None, min_length=1, max_length=64)
    category_group: str | None = Field(default=None, min_length=1, max_length=128)
    category: str = Field(min_length=1, max_length=128)
    icon: str = Field(min_length=1, max_length=1024)
    date: date
    time: str = Field(min_length=5, max_length=5)
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


class SummaryOut(BaseModel):
    income: Decimal
    expense: Decimal
    balance: Decimal


class DashboardOut(BaseModel):
    period: str
    date_from: date
    date_to: date
    summary: SummaryOut
    recent_transactions: list[TransactionOut]
