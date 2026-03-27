import warnings

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_INSECURE_DEFAULT_SECRET = 'change-me-in-production-use-long-random-string'


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    app_name: str = 'чек API'
    app_version: str = '1.0.0'
    api_prefix: str = '/api/v1'
    database_url: str = 'postgresql+psycopg://postgres:postgres@localhost:5432/finflow'
    cors_origins: list[str] = [
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
    # Set require_email_verification=true once SMTP is configured
    require_email_verification: bool = False

    @field_validator('jwt_secret_key')
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        if v == _INSECURE_DEFAULT_SECRET:
            warnings.warn(
                '[SECURITY] JWT_SECRET_KEY is using the insecure default value. '
                'Generate a strong secret: python -c "import secrets; print(secrets.token_hex(32))" '
                'and set it as JWT_SECRET_KEY in your .env file.',
                UserWarning,
                stacklevel=2,
            )
        if len(v) < 32:
            raise ValueError(
                'JWT_SECRET_KEY must be at least 32 characters. '
                'Generate one: python -c "import secrets; print(secrets.token_hex(32))"'
            )
        return v

    @field_validator('cors_origins', mode='before')
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if isinstance(value, str) and value and not value.startswith('['):
            return [item.strip() for item in value.split(',') if item.strip()]
        return value


settings = Settings()
