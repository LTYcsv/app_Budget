import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Category(Base):
    __tablename__ = 'categories'

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    group: Mapped[str] = mapped_column(String(128), nullable=False)
    icon: Mapped[str] = mapped_column(String(1024), nullable=False)
    type: Mapped[str] = mapped_column(String(16), nullable=False)  # income | expense
    is_other: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    __table_args__ = (
        Index('ix_categories_type_name', 'type', 'name'),
        Index('ix_categories_type_group_name', 'type', 'group', 'name'),
    )


class Account(Base):
    __tablename__ = 'accounts'

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    color: Mapped[str] = mapped_column(String(32), nullable=False, default='#6366F1')  # hex color
    initial_balance: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=Decimal('0'))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    __table_args__ = (
        Index('ix_accounts_created_at', 'created_at'),
    )


class Transaction(Base):
    __tablename__ = 'transactions'

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    account_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey('accounts.id', onupdate='CASCADE', ondelete='SET NULL'),
        nullable=True,
    )
    category_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey('categories.id', onupdate='CASCADE', ondelete='SET NULL'),
        nullable=True,
    )
    subcategory_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    category_group: Mapped[str | None] = mapped_column(String(128), nullable=True)
    category: Mapped[str] = mapped_column(String(128), nullable=False)
    icon: Mapped[str] = mapped_column(String(1024), nullable=False)
    date: Mapped[datetime] = mapped_column(Date, nullable=False)
    time: Mapped[str] = mapped_column(String(5), nullable=False)
    type: Mapped[str] = mapped_column(String(16), nullable=False)  # income | expense | transfer
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    __table_args__ = (
        Index('ix_transactions_date', 'date'),
        Index('ix_transactions_type_date', 'type', 'date'),
        Index('ix_transactions_type_date_group', 'type', 'date', 'category_group'),
        Index('ix_transactions_created_at', 'created_at'),
        Index('ix_transactions_account_id', 'account_id'),
    )


class SavingsGoal(Base):
    __tablename__ = 'savings_goals'

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    photo_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    target_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    current_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=Decimal('0'))
    deadline: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default='active')  # active | completed
    # Процент по вкладу (необязательно)
    interest_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)   # годовой %, например 18.00
    interest_frequency: Mapped[str | None] = mapped_column(String(16), nullable=True)     # monthly | yearly
    interest_next_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)      # дата следующего начисления
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    __table_args__ = (
        Index('ix_savings_goals_status', 'status'),
        Index('ix_savings_goals_created_at', 'created_at'),
    )


class SavingsDeposit(Base):
    __tablename__ = 'savings_deposits'

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    goal_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey('savings_goals.id', onupdate='CASCADE', ondelete='CASCADE'),
        nullable=False,
    )
    # Ссылка на транзакцию-расход, созданную вместе с депозитом.
    # SET NULL при удалении транзакции — нужно обрабатывать в Python до удаления.
    transaction_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey('transactions.id', onupdate='CASCADE', ondelete='SET NULL'),
        nullable=True,
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    __table_args__ = (
        Index('ix_savings_deposits_goal_id', 'goal_id'),
        Index('ix_savings_deposits_created_at', 'created_at'),
        Index('ix_savings_deposits_transaction_id', 'transaction_id'),
    )
