"""
HTTP-тесты auth-флоу через TestClient: httpOnly cookie, ротация refresh
токена, отзыв при logout, rate limit. Сервис-уровневые тесты (test_auth.py)
это не покрывают — slowapi и cookie-логика живут только на уровне роутера.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app, limiter as app_limiter
from app.auth.router import limiter as auth_limiter

EMAIL = 'http-test@example.com'
PASSWORD = 'Str0ng-password!'


@pytest.fixture
def client():
    eng = create_engine(
        'sqlite+pysqlite:///:memory:',
        connect_args={'check_same_thread': False},
        poolclass=StaticPool,  # одна in-memory БД на все соединения теста
    )

    @event.listens_for(eng, 'connect')
    def set_fk(conn, _):
        conn.execute('PRAGMA foreign_keys=ON')

    Base.metadata.create_all(eng)
    TestSession = sessionmaker(bind=eng, autoflush=False, autocommit=False)

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    # Лимитер общий на процесс — сбрасываем, чтобы тесты не душили друг друга
    app_limiter.reset()
    auth_limiter.reset()
    # Без контекст-менеджера — lifespan (purge-таск) в тестах не нужен
    yield TestClient(app)
    app.dependency_overrides.clear()


def _register(client: TestClient) -> str:
    res = client.post('/api/v1/auth/register', json={'email': EMAIL, 'password': PASSWORD})
    assert res.status_code == 201, res.text
    return res.json()['access_token']


def test_register_sets_httponly_refresh_cookie(client):
    res = client.post('/api/v1/auth/register', json={'email': EMAIL, 'password': PASSWORD})
    assert res.status_code == 201
    assert res.json()['access_token']

    set_cookie = res.headers['set-cookie']
    assert 'refresh_token=' in set_cookie
    assert 'HttpOnly' in set_cookie
    assert 'SameSite=strict' in set_cookie
    assert 'Path=/api/v1/auth' in set_cookie


def test_access_token_works_on_protected_route(client):
    token = _register(client)
    res = client.get('/api/v1/auth/me', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200
    assert res.json()['email'] == EMAIL


def test_protected_route_rejects_missing_and_garbage_token(client):
    _register(client)
    assert client.get('/api/v1/auth/me').status_code in (401, 403)
    res = client.get('/api/v1/auth/me', headers={'Authorization': 'Bearer garbage'})
    assert res.status_code == 401


def test_login_wrong_password_generic_401(client):
    _register(client)
    res = client.post('/api/v1/auth/login', json={'email': EMAIL, 'password': 'wrong-password-1!'})
    assert res.status_code == 401
    # Сообщение не раскрывает, существует ли email
    assert res.json()['detail'] == 'Неверный email или пароль'


def test_refresh_rotates_token_and_old_cookie_is_revoked(client):
    _register(client)
    old_cookie = client.cookies.get('refresh_token')
    assert old_cookie

    # Ротация: новый access + новый refresh cookie
    res = client.post('/api/v1/auth/refresh')
    assert res.status_code == 200
    assert res.json()['access_token']
    new_cookie = client.cookies.get('refresh_token')
    assert new_cookie and new_cookie != old_cookie

    # Старый (отозванный) refresh → 401 + отзыв всех сессий (reuse detection)
    client.cookies.set('refresh_token', old_cookie, path='/api/v1/auth')
    res = client.post('/api/v1/auth/refresh')
    assert res.status_code == 401

    # После reuse-атаки отозваны ВСЕ токены — даже свежий не работает
    client.cookies.set('refresh_token', new_cookie, path='/api/v1/auth')
    res = client.post('/api/v1/auth/refresh')
    assert res.status_code == 401


def test_logout_revokes_refresh_token(client):
    token = _register(client)
    res = client.post('/api/v1/auth/logout', headers={'Authorization': f'Bearer {token}'})
    assert res.status_code == 200

    res = client.post('/api/v1/auth/refresh')
    assert res.status_code == 401


def test_refresh_without_cookie_401(client):
    res = client.post('/api/v1/auth/refresh')
    assert res.status_code == 401


def test_login_rate_limited_after_5_attempts(client):
    _register(client)
    for _ in range(5):
        res = client.post('/api/v1/auth/login', json={'email': EMAIL, 'password': 'wrong-password-1!'})
        assert res.status_code == 401
    res = client.post('/api/v1/auth/login', json={'email': EMAIL, 'password': 'wrong-password-1!'})
    assert res.status_code == 429
