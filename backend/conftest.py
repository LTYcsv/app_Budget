"""
Root-level conftest: patches app.config.settings BEFORE any test module
imports app code, so pydantic_settings never reads the production .env file.
"""
import os
import sys
from unittest.mock import MagicMock

# Inject a fake settings object into sys.modules early, so when app.database
# (and other app modules) do `from .config import settings` they get our stub.
fake_settings = MagicMock()
fake_settings.database_url = 'sqlite+pysqlite:///:memory:'
fake_settings.jwt_secret_key = 'test-secret-key-at-least-32-chars-long!!'
fake_settings.jwt_algorithm = 'HS256'
fake_settings.access_token_expire_minutes = 30
fake_settings.refresh_token_expire_days = 30
fake_settings.cookie_secure = False
fake_settings.cors_origins = ['http://localhost:5173']

fake_config_module = MagicMock()
fake_config_module.settings = fake_settings
sys.modules['app.config'] = fake_config_module
