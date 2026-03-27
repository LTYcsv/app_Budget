import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from ..config import settings
from ..models import PasswordResetToken, RefreshToken, User

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')


# ── Password hashing ──────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── JWT tokens ────────────────────────────────────────────────────────────────

def create_access_token(user_id: str) -> str:
    """Short-lived access token (30 min). Stateless — not tracked in DB."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode(
        {
            'sub': user_id,
            'exp': expire,
            'type': 'access',
            'jti': str(uuid.uuid4()),  # unique ID for audit trail
        },
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def create_refresh_token(db: Session, user_id: str) -> str:
    """
    Long-lived refresh token (30 days).
    The JTI is persisted in the DB so the token can be revoked server-side.
    """
    jti = str(uuid.uuid4())
    expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)

    token = jwt.encode(
        {'sub': user_id, 'exp': expire, 'type': 'refresh', 'jti': jti},
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    db_token = RefreshToken(
        id=str(uuid.uuid4()),
        user_id=user_id,
        jti=jti,
        expires_at=expire,
    )
    db.add(db_token)
    db.commit()

    return token


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None


# ── Refresh token revocation ──────────────────────────────────────────────────

def revoke_refresh_token(db: Session, jti: str) -> None:
    """Mark a refresh token as revoked. Idempotent — safe to call multiple times."""
    record = db.query(RefreshToken).filter(RefreshToken.jti == jti).first()
    if record and record.revoked_at is None:
        record.revoked_at = datetime.now(timezone.utc)
        db.commit()


def is_refresh_token_valid(db: Session, jti: str) -> bool:
    """
    Return True only if the token:
    - exists in the DB (was actually issued by this server)
    - has not been explicitly revoked (logout or rotation)
    - has not expired
    """
    record = db.query(RefreshToken).filter(RefreshToken.jti == jti).first()
    if not record:
        return False
    if record.revoked_at is not None:
        return False
    if record.expires_at <= datetime.now(timezone.utc):
        return False
    return True


def revoke_all_user_refresh_tokens(db: Session, user_id: str) -> None:
    """Revoke all active refresh tokens for a user (e.g. password change, account compromise)."""
    now = datetime.now(timezone.utc)
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.revoked_at.is_(None),
    ).update({'revoked_at': now})
    db.commit()


# ── User management ───────────────────────────────────────────────────────────

def register_user(db: Session, email: str, password: str) -> User:
    user = User(
        id=str(uuid.uuid4()),
        email=email.lower().strip(),
        password_hash=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = db.query(User).filter(User.email == email.lower().strip()).first()
    if not user or not verify_password(password, user.password_hash):
        return None
    return user


def get_user_by_id(db: Session, user_id: str) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


# ── Password reset (one-time tokens, 1-hour expiry) ───────────────────────────

def _sha256(value: str) -> str:
    """SHA-256 hex digest. Used to store token hashes — never plaintext."""
    return hashlib.sha256(value.encode()).hexdigest()


def create_password_reset_token(db: Session, user: User) -> str:
    """
    Generate a cryptographically secure, one-time password reset token.
    Expires in 1 hour. Any previous unused tokens for this user are invalidated.
    Returns the RAW token — caller must send this to the user via email.
    The DB stores only the SHA-256 hash.
    """
    # Invalidate any existing unused tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None),
    ).update({'used_at': datetime.now(timezone.utc)})

    raw_token = secrets.token_urlsafe(32)  # 256 bits of entropy
    db_token = PasswordResetToken(
        id=str(uuid.uuid4()),
        user_id=user.id,
        token_hash=_sha256(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.add(db_token)
    db.commit()

    return raw_token


def consume_password_reset_token(db: Session, raw_token: str) -> User | None:
    """
    Validate and consume a password reset token.
    - Checks hash match (constant-time via DB lookup of the hash)
    - Checks not already used (one-time)
    - Checks not expired (1-hour window)
    Returns the User if valid, None otherwise.
    """
    token_hash = _sha256(raw_token)
    now = datetime.now(timezone.utc)

    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.used_at.is_(None),
        PasswordResetToken.expires_at > now,
    ).first()

    if not record:
        return None

    # Mark as used — prevents replay
    record.used_at = now
    db.commit()

    return get_user_by_id(db, record.user_id)
