from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import User
from ..security_logging import (
    log_login_failure,
    log_login_success,
    log_logout,
    log_password_changed,
    log_password_reset_applied,
    log_password_reset_requested,
    log_register,
    log_token_refresh,
    log_token_reuse_attack,
)
from ..email import send_password_reset_email
from .deps import get_current_user
from .schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    TokenOut,
    UserCreate,
    UserLogin,
    UserOut,
)
from .service import (
    authenticate_user,
    consume_password_reset_token,
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    decode_token,
    get_user_by_id,
    hash_password,
    is_refresh_token_valid,
    register_user,
    revoke_all_user_refresh_tokens,
    revoke_refresh_token,
    verify_password,
)

router = APIRouter(prefix='/auth', tags=['auth'])
limiter = Limiter(key_func=get_remote_address)


def _set_refresh_cookie(response: Response, token: str) -> None:
    """Set the httpOnly refresh token cookie with correct security flags.

    samesite='strict' — cookie is NOT sent on any cross-site request,
    including top-level navigations. This prevents CSRF on the refresh
    endpoint. 'lax' would allow the cookie on GET top-level navigations.
    """
    response.set_cookie(
        key='refresh_token',
        value=token,
        httponly=True,
        secure=settings.cookie_secure,  # Set COOKIE_SECURE=true in production
        samesite='strict',              # Changed from 'lax' — CSRF protection
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        path='/api/v1/auth',           # Scope cookie to auth endpoints only
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie('refresh_token', httponly=True, samesite='strict', path='/api/v1/auth')


# ── Register ──────────────────────────────────────────────────────────────────

@router.post('/register', response_model=TokenOut, status_code=status.HTTP_201_CREATED)
@limiter.limit('3/minute')
def register(request: Request, body: UserCreate, response: Response, db: Session = Depends(get_db)) -> TokenOut:
    try:
        user = register_user(db, body.email, body.password)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Пользователь с таким email уже существует',
        )

    ip = request.client.host if request.client else 'unknown'
    log_register(str(user.id), ip)
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(db, user.id)
    _set_refresh_cookie(response, refresh_token)
    return TokenOut(access_token=access_token)


# ── Login (rate-limited: 5 attempts/minute per IP) ────────────────────────────

@router.post('/login', response_model=TokenOut)
@limiter.limit('5/minute')
def login(
    request: Request,
    body: UserLogin,
    response: Response,
    db: Session = Depends(get_db),
) -> TokenOut:
    ip = request.client.host if request.client else 'unknown'
    user = authenticate_user(db, body.email, body.password)
    if not user:
        log_login_failure(body.email, ip)
        # Generic message — do not reveal whether email exists
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Неверный email или пароль',
        )

    log_login_success(str(user.id), ip)
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(db, user.id)
    _set_refresh_cookie(response, refresh_token)
    return TokenOut(access_token=access_token)


# ── Token refresh (with DB-backed revocation check) ───────────────────────────

@router.post('/refresh', response_model=TokenOut)
@limiter.limit('10/minute')
def refresh(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    refresh_token: str | None = Cookie(default=None),
) -> TokenOut:
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Refresh token не найден')

    payload = decode_token(refresh_token)
    if not payload or payload.get('type') != 'refresh':
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Недействительный refresh token')

    jti: str = payload.get('jti', '')
    user_id: str = payload.get('sub', '')

    ip = request.client.host if request.client else 'unknown'

    # DB check — detects revoked tokens (logout) and re-use after theft
    if not jti or not is_refresh_token_valid(db, jti):
        # If someone tries to use a revoked token, it may indicate theft —
        # revoke all tokens for this user as a precaution
        if user_id:
            log_token_reuse_attack(user_id, ip)
            revoke_all_user_refresh_tokens(db, user_id)
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Refresh token отозван. Выполните вход заново.',
        )

    # Token rotation: revoke the used token, issue a new pair
    revoke_refresh_token(db, jti)
    log_token_refresh(user_id, ip)
    new_access = create_access_token(user_id)
    new_refresh = create_refresh_token(db, user_id)
    _set_refresh_cookie(response, new_refresh)
    return TokenOut(access_token=new_access)


# ── Logout (server-side revocation) ───────────────────────────────────────────

@router.post('/logout')
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    refresh_token: str | None = Cookie(default=None),
) -> dict:
    """
    Revokes the refresh token in the DB and clears the cookie.
    After this call the refresh token is permanently invalid even if an attacker
    captured it before logout.
    """
    ip = request.client.host if request.client else 'unknown'
    if refresh_token:
        payload = decode_token(refresh_token)
        if payload and (jti := payload.get('jti')):
            revoke_refresh_token(db, jti)
            if user_id := payload.get('sub'):
                log_logout(str(user_id), ip)

    _clear_refresh_cookie(response)
    return {'ok': True}


# ── Current user ──────────────────────────────────────────────────────────────

@router.get('/me', response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


# ── Password reset (forgot password flow) ────────────────────────────────────

@router.post('/forgot-password', status_code=status.HTTP_202_ACCEPTED)
@limiter.limit('3/minute')
def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
    db: Session = Depends(get_db),
) -> dict:
    """
    Initiate password reset. Always returns 202 to prevent email enumeration.
    If the email exists, a one-time reset token (1-hour expiry) is generated.

    TODO: plug in your email provider (Resend, SendGrid, SMTP) to send the link.
    Example reset link: https://yourapp.com/reset-password?token={raw_token}
    """
    ip = request.client.host if request.client else 'unknown'
    user = db.query(User).filter(User.email == body.email.lower().strip()).first()
    if user:
        raw_token = create_password_reset_token(db, user)
        # SECURITY: raw_token must NEVER be logged — it grants password reset access
        send_password_reset_email(to=user.email, token=raw_token)
        log_password_reset_requested(str(user.id), ip)
        del raw_token  # prevent accidental use after this point

    return {'detail': 'Если такой email зарегистрирован, инструкции отправлены'}


@router.post('/reset-password', status_code=status.HTTP_200_OK)
@limiter.limit('5/minute')
def reset_password(
    request: Request,
    body: ResetPasswordRequest,
    db: Session = Depends(get_db),
) -> dict:
    """
    Consume a one-time reset token and set a new password.
    The token is invalidated immediately after use.
    """
    user = consume_password_reset_token(db, body.token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Токен недействителен, уже использован или истёк (действует 1 час)',
        )

    user.password_hash = hash_password(body.new_password)
    # Revoke all existing sessions after password change
    revoke_all_user_refresh_tokens(db, user.id)
    db.commit()
    ip = request.client.host if request.client else 'unknown'
    log_password_reset_applied(str(user.id), ip)

    return {'detail': 'Пароль успешно изменён. Выполните вход заново.'}


# ── Change password (authenticated) ──────────────────────────────────────────

@router.post('/change-password', status_code=status.HTTP_200_OK)
@limiter.limit('5/minute')
def change_password(
    request: Request,
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Change password for an authenticated user. Revokes all sessions on success."""
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Неверный текущий пароль',
        )

    ip = request.client.host if request.client else 'unknown'
    current_user.password_hash = hash_password(body.new_password)
    revoke_all_user_refresh_tokens(db, current_user.id)
    db.commit()
    log_password_changed(str(current_user.id), ip)

    return {'detail': 'Пароль изменён. Выполните вход заново на всех устройствах.'}
