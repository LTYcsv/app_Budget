import json
import warnings
from typing import Annotated

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

_INSECURE_DEFAULT_SECRET = 'change-me-in-production-use-long-random-string'


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    app_name: str = 'чек API'
    # Secure by default: anything that is not explicitly APP_ENV=development
    # is treated as production
    app_env: str = 'production'
    app_version: str = '1.0.0'
    api_prefix: str = '/api/v1'
    database_url: str = 'postgresql+psycopg://postgres:postgres@localhost:5432/finflow'
    # NoDecode: keep the raw string from env/.env — parse_cors_origins below
    # accepts both JSON and comma-separated formats
    cors_origins: Annotated[list[str], NoDecode] = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:8080',
        'http://127.0.0.1:8080',
    ]

    # JWT
    jwt_secret_key: str = _INSECURE_DEFAULT_SECRET
    jwt_algorithm: str = 'HS256'
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 30

    # Security
    # Set cookie_secure=true in production (requires HTTPS)
    cookie_secure: bool = False

    # Email (Resend)
    resend_api_key: str = ''
    from_email: str = 'Чек <noreply@чек.site>'
    frontend_url: str = 'http://localhost:5173'

    @field_validator('jwt_secret_key')
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError(
                'JWT_SECRET_KEY must be at least 32 characters. '
                'Generate one: python -c "import secrets; print(secrets.token_hex(32))"'
            )
        return v

    @model_validator(mode='after')
    def reject_default_secret_outside_dev(self) -> 'Settings':
        if self.jwt_secret_key == _INSECURE_DEFAULT_SECRET:
            message = (
                '[SECURITY] JWT_SECRET_KEY is using the insecure default value. '
                'Generate a strong secret: python -c "import secrets; print(secrets.token_hex(32))" '
                'and set it as JWT_SECRET_KEY in your .env file.'
            )
            if self.app_env != 'development':
                raise ValueError(message + ' Set APP_ENV=development to allow the default locally.')
            warnings.warn(message, UserWarning, stacklevel=2)
        return self

    @field_validator('cookie_secure')
    @classmethod
    def validate_cookie_secure(cls, v: bool) -> bool:
        if not v:
            warnings.warn(
                '[SECURITY] COOKIE_SECURE=false — refresh token cookie will be sent over plain HTTP. '
                'Set COOKIE_SECURE=true in production (requires HTTPS).',
                UserWarning,
                stacklevel=2,
            )
        return v

    @field_validator('cors_origins', mode='before')
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            if value.startswith('['):
                return json.loads(value)
            return [item.strip() for item in value.split(',') if item.strip()]
        return value


settings = Settings()
