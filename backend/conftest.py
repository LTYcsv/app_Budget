"""
Root-level conftest: sets environment variables BEFORE any test module
imports app code. Environment variables take precedence over the .env file
in pydantic-settings, so the real Settings class is constructed with test
values and full validation — new settings fields keep their real defaults
instead of silently becoming mocks.
"""
import os

os.environ['APP_ENV'] = 'development'
os.environ['DATABASE_URL'] = 'sqlite+pysqlite:///:memory:'
os.environ['JWT_SECRET_KEY'] = 'test-secret-key-at-least-32-chars-long!!'
os.environ['COOKIE_SECURE'] = 'false'
os.environ['RESEND_API_KEY'] = ''
