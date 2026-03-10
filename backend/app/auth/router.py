from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from .deps import get_current_user
from .schemas import TokenOut, UserCreate, UserLogin, UserOut
from .service import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    decode_token,
    register_user,
)

router = APIRouter(prefix='/auth', tags=['auth'])


@router.post('/register', response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(body: UserCreate, response: Response, db: Session = Depends(get_db)) -> TokenOut:
    try:
        user = register_user(db, body.email, body.password)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Пользователь с таким email уже существует',
        )

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    response.set_cookie(
        key='refresh_token',
        value=refresh_token,
        httponly=True,
        secure=False,  # True в продакшне с HTTPS
        samesite='lax',
        max_age=30 * 24 * 60 * 60,
    )

    return TokenOut(access_token=access_token)


@router.post('/login', response_model=TokenOut)
def login(body: UserLogin, response: Response, db: Session = Depends(get_db)) -> TokenOut:
    user = authenticate_user(db, body.email, body.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Неверный email или пароль',
        )

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    response.set_cookie(
        key='refresh_token',
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite='lax',
        max_age=30 * 24 * 60 * 60,
    )

    return TokenOut(access_token=access_token)


@router.post('/refresh', response_model=TokenOut)
def refresh(response: Response, refresh_token: str | None = None, db: Session = Depends(get_db)) -> TokenOut:
    """Принимает refresh_token из cookie или из тела запроса (для Capacitor)."""
    from fastapi import Request

    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Refresh token не найден')

    payload = decode_token(refresh_token)
    if not payload or payload.get('type') != 'refresh':
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Недействительный refresh token')

    user_id: str = payload['sub']
    new_access = create_access_token(user_id)
    new_refresh = create_refresh_token(user_id)

    response.set_cookie(
        key='refresh_token',
        value=new_refresh,
        httponly=True,
        secure=False,
        samesite='lax',
        max_age=30 * 24 * 60 * 60,
    )

    return TokenOut(access_token=new_access)


@router.post('/logout')
def logout(response: Response) -> dict:
    response.delete_cookie('refresh_token')
    return {'ok': True}


@router.get('/me', response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
