"""
Tests for auth service: JWT tokens, revocation, password reset.
"""
import time
from datetime import datetime, timedelta, timezone

import pytest

from app.auth.service import (
    authenticate_user,
    consume_password_reset_token,
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    decode_token,
    hash_password,
    is_refresh_token_valid,
    register_user,
    revoke_all_user_refresh_tokens,
    revoke_refresh_token,
    verify_password,
)
from app.models import RefreshToken

from .conftest import make_user


# ── Password hashing ──────────────────────────────────────────────────────────

class TestPasswordHashing:
    def test_hash_is_not_plaintext(self):
        assert hash_password('secret') != 'secret'

    def test_correct_password_verifies(self):
        hashed = hash_password('my-password')
        assert verify_password('my-password', hashed) is True

    def test_wrong_password_fails(self):
        hashed = hash_password('my-password')
        assert verify_password('wrong', hashed) is False


# ── Access token ──────────────────────────────────────────────────────────────

class TestAccessToken:
    def test_token_contains_user_id(self):
        token = create_access_token('user-123')
        payload = decode_token(token)
        assert payload['sub'] == 'user-123'

    def test_token_type_is_access(self):
        token = create_access_token('user-123')
        payload = decode_token(token)
        assert payload['type'] == 'access'

    def test_invalid_token_returns_none(self):
        assert decode_token('not.a.token') is None

    def test_tampered_token_returns_none(self):
        token = create_access_token('user-123')
        tampered = token[:-5] + 'XXXXX'
        assert decode_token(tampered) is None


# ── Refresh token ─────────────────────────────────────────────────────────────

class TestRefreshToken:
    def test_new_refresh_token_is_valid(self, db):
        user = make_user(db)
        token = create_refresh_token(db, user.id)
        payload = decode_token(token)
        assert is_refresh_token_valid(db, payload['jti']) is True

    def test_revoked_token_is_invalid(self, db):
        user = make_user(db)
        token = create_refresh_token(db, user.id)
        jti = decode_token(token)['jti']

        revoke_refresh_token(db, jti)

        assert is_refresh_token_valid(db, jti) is False

    def test_unknown_jti_is_invalid(self, db):
        assert is_refresh_token_valid(db, 'nonexistent-jti') is False

    def test_revoke_all_invalidates_all_tokens(self, db):
        user = make_user(db)
        token_a = create_refresh_token(db, user.id)
        token_b = create_refresh_token(db, user.id)
        jti_a = decode_token(token_a)['jti']
        jti_b = decode_token(token_b)['jti']

        revoke_all_user_refresh_tokens(db, user.id)

        assert is_refresh_token_valid(db, jti_a) is False
        assert is_refresh_token_valid(db, jti_b) is False

    def test_revoke_all_does_not_affect_other_users(self, db):
        user_a = make_user(db, 'a@example.com')
        user_b = make_user(db, 'b@example.com')
        token_a = create_refresh_token(db, user_a.id)
        token_b = create_refresh_token(db, user_b.id)
        jti_a = decode_token(token_a)['jti']
        jti_b = decode_token(token_b)['jti']

        revoke_all_user_refresh_tokens(db, user_a.id)

        assert is_refresh_token_valid(db, jti_a) is False
        assert is_refresh_token_valid(db, jti_b) is True  # user_b unaffected

    def test_revoke_is_idempotent(self, db):
        """Revoking twice must not raise."""
        user = make_user(db)
        token = create_refresh_token(db, user.id)
        jti = decode_token(token)['jti']

        revoke_refresh_token(db, jti)
        revoke_refresh_token(db, jti)  # second call must be safe

        assert is_refresh_token_valid(db, jti) is False

    def test_expired_token_is_invalid(self, db):
        user = make_user(db)
        jti = 'expired-jti'
        expired_record = RefreshToken(
            id='expired-id',
            user_id=user.id,
            jti=jti,
            expires_at=datetime.now(timezone.utc) - timedelta(seconds=1),
        )
        db.add(expired_record)
        db.flush()

        assert is_refresh_token_valid(db, jti) is False


# ── User registration & authentication ───────────────────────────────────────

class TestUserAuth:
    def test_register_creates_user(self, db):
        user = register_user(db, 'new@example.com', 'password123')
        assert user.id is not None
        assert user.email == 'new@example.com'

    def test_register_normalises_email(self, db):
        user = register_user(db, '  UPPER@Example.COM  ', 'pass')
        assert user.email == 'upper@example.com'

    def test_authenticate_valid_credentials(self, db):
        register_user(db, 'auth@example.com', 'correcthorse')
        user = authenticate_user(db, 'auth@example.com', 'correcthorse')
        assert user is not None

    def test_authenticate_wrong_password_returns_none(self, db):
        register_user(db, 'auth2@example.com', 'correcthorse')
        result = authenticate_user(db, 'auth2@example.com', 'wrongpassword')
        assert result is None

    def test_authenticate_unknown_email_returns_none(self, db):
        result = authenticate_user(db, 'nobody@example.com', 'any')
        assert result is None


# ── Password reset ────────────────────────────────────────────────────────────

class TestPasswordReset:
    def test_valid_token_returns_user(self, db):
        user = make_user(db)
        raw_token = create_password_reset_token(db, user)
        result = consume_password_reset_token(db, raw_token)
        assert result is not None
        assert result.id == user.id

    def test_token_is_single_use(self, db):
        user = make_user(db)
        raw_token = create_password_reset_token(db, user)
        consume_password_reset_token(db, raw_token)
        # Second use must fail
        result = consume_password_reset_token(db, raw_token)
        assert result is None

    def test_wrong_token_returns_none(self, db):
        result = consume_password_reset_token(db, 'completely-wrong-token')
        assert result is None

    def test_new_request_invalidates_old_token(self, db):
        """Creating a second reset token must invalidate the first."""
        user = make_user(db)
        old_token = create_password_reset_token(db, user)
        _new_token = create_password_reset_token(db, user)

        result = consume_password_reset_token(db, old_token)
        assert result is None


# ── Profile update (PATCH /auth/me) ───────────────────────────────────────────

class TestUpdateProfile:
    @pytest.fixture
    def http_db(self):
        """Session on a StaticPool engine — TestClient runs the app in a separate
        thread, and the default SQLite in-memory pool gives each thread its own
        (empty) database. StaticPool shares one connection across threads."""
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        from sqlalchemy.pool import StaticPool

        from app.database import Base

        eng = create_engine(
            'sqlite+pysqlite:///:memory:',
            connect_args={'check_same_thread': False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(eng)
        session = sessionmaker(bind=eng)()
        yield session
        session.close()

    @pytest.fixture
    def client(self, http_db):
        from fastapi.testclient import TestClient

        from app.database import get_db
        from app.main import app

        app.dependency_overrides[get_db] = lambda: http_db
        yield TestClient(app)
        app.dependency_overrides.clear()

    def _auth(self, user):
        return {'Authorization': f'Bearer {create_access_token(user.id)}'}

    def test_patch_updates_display_name_and_avatar(self, client, http_db):
        user = make_user(http_db)
        resp = client.patch(
            '/api/v1/auth/me',
            json={'display_name': 'Ашот', 'avatar': '🦊'},
            headers=self._auth(user),
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body['display_name'] == 'Ашот'
        assert body['avatar'] == '🦊'

        http_db.refresh(user)
        assert user.display_name == 'Ашот'
        assert user.avatar == '🦊'

    def test_partial_update_keeps_other_field(self, client, http_db):
        user = make_user(http_db)
        user.display_name = 'Старое имя'
        user.avatar = '😎'
        http_db.commit()

        resp = client.patch('/api/v1/auth/me', json={'avatar': '🐼'}, headers=self._auth(user))
        assert resp.status_code == 200
        assert resp.json()['display_name'] == 'Старое имя'
        assert resp.json()['avatar'] == '🐼'

    def test_blank_display_name_rejected(self, client, http_db):
        user = make_user(http_db)
        resp = client.patch('/api/v1/auth/me', json={'display_name': '   '}, headers=self._auth(user))
        assert resp.status_code == 422

    def test_unauthenticated_request_rejected(self, client):
        resp = client.patch('/api/v1/auth/me', json={'display_name': 'X'})
        assert resp.status_code in (401, 403)

    def test_get_me_returns_profile_fields(self, client, http_db):
        user = make_user(http_db)
        user.display_name = 'Имя'
        user.avatar = '🦁'
        http_db.commit()

        resp = client.get('/api/v1/auth/me', headers=self._auth(user))
        assert resp.status_code == 200
        assert resp.json()['display_name'] == 'Имя'
        assert resp.json()['avatar'] == '🦁'
