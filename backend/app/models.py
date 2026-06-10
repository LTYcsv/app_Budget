import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Numeric, String, Integer
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class User(Base):
    __tablename__ = 'users'

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    # Email verification — set to True after user clicks verification link
    is_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default='false')
    # Profile fields, editable via PATCH /auth/me
    display_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    avatar: Mapped[str | None] = mapped_column(String(16), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    __table_args__ = (
        Index('ix_users_email', 'email', unique=True),
    )


class Category(Base):
    __tablename__ = 'categories'

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    group: Mapped[str] = mapped_column(String(128), nullable=False)
    icon: Mapped[str] = mapped_column(String(1024), nullable=False)
    type: Mapped[str] = mapped_column(String(16), nullable=False)  # income | expense
    is_other: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # null = системная категория, заполнен = пользовательская
    user_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey('users.id', onupdate='CASCADE', ondelete='CASCADE'),
        nullable=True,
    )
    # null = корневая категория (группа), заполнен = подкатегория
    parent_id: Mapped[str | None] = mapped_column(
        String(64),
        ForeignKey('categories.id', onupdate='CASCADE', ondelete='CASCADE'),
        nullable=True,
    )
    # Порядок сортировки внутри группы/родителя
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Скрыта из быстрого выбора (пользователь может скрыть редко используемые)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    __table_args__ = (
        Index('ix_categories_type_name', 'type', 'name'),
        Index('ix_categories_type_group_name', 'type', 'group', 'name'),
        Index('ix_categories_user_id', 'user_id'),
        Index('ix_categories_parent_id', 'parent_id'),
    )


class Account(Base):
    __tablename__ = 'accounts'

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey('users.id', onupdate='CASCADE', ondelete='CASCADE'),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    color: Mapped[str] = mapped_column(String(32), nullable=False, default='#6366F1')
    initial_balance: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=Decimal('0'))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    __table_args__ = (
        Index('ix_accounts_user_id', 'user_id'),
        Index('ix_accounts_created_at', 'created_at'),
    )


class Transaction(Base):
    __tablename__ = 'transactions'

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey('users.id', onupdate='CASCADE', ondelete='CASCADE'),
        nullable=False,
    )
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
    # 'out' = списание (→), 'in' = зачисление (←), null для не-переводов
    transfer_direction: Mapped[str | None] = mapped_column(String(3), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    __table_args__ = (
        Index('ix_transactions_user_id', 'user_id'),
        Index('ix_transactions_date', 'date'),
        Index('ix_transactions_type_date', 'type', 'date'),
        Index('ix_transactions_type_date_group', 'type', 'date', 'category_group'),
        Index('ix_transactions_created_at', 'created_at'),
        Index('ix_transactions_account_id', 'account_id'),
        Index('ix_transactions_transfer_direction', 'transfer_direction'),
    )


class SavingsGoal(Base):
    __tablename__ = 'savings_goals'

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey('users.id', onupdate='CASCADE', ondelete='CASCADE'),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    photo_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    target_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    current_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=Decimal('0'))
    deadline: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default='active')
    interest_rate: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    interest_frequency: Mapped[str | None] = mapped_column(String(16), nullable=True)
    interest_next_date: Mapped[datetime | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    __table_args__ = (
        Index('ix_savings_goals_user_id', 'user_id'),
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


# ── Auth security models ───────────────────────────────────────────────────────

class RefreshToken(Base):
    """
    Server-side registry of issued refresh tokens.
    Enables revocation on logout and detection of token reuse after theft.
    """
    __tablename__ = 'refresh_tokens'

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
    )
    # JWT ID claim — unique identifier embedded in the token payload
    jti: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    # Non-null when token has been explicitly revoked (logout, rotation, compromise)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    __table_args__ = (
        Index('ix_refresh_tokens_jti', 'jti', unique=True),
        Index('ix_refresh_tokens_user_id', 'user_id'),
    )


class PasswordResetToken(Base):
    """
    One-time password reset tokens. Expires in 1 hour.
    Only the SHA-256 hash of the raw token is stored — the plaintext is sent to the user by email.
    """
    __tablename__ = 'password_reset_tokens'

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(
        String(64),
        ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
    )
    # SHA-256(raw_token) — never store the plaintext token
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    # Non-null once the token has been consumed — prevents reuse
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    __table_args__ = (
        Index('ix_password_reset_tokens_token_hash', 'token_hash', unique=True),
        Index('ix_password_reset_tokens_user_id', 'user_id'),
    )
    