from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    app_name: str = 'FinFlow API'
    app_version: str = '0.1.0'
    api_prefix: str = '/api/v1'
    database_url: str = 'postgresql+psycopg://postgres:postgres@localhost:5432/finflow'
    cors_origins: list[str] = ['http://localhost:5173', 'http://127.0.0.1:5173']
    predictive_trend_30d_weight: float = 0.7
    predictive_trend_90d_weight: float = 0.3
    predictive_recurring_tolerance: float = 0.05
    predictive_recurring_min_occurrences: int = 3
    predictive_recurring_interval_days: int = 30
    predictive_recurring_interval_tolerance_days: int = 5
    predictive_seasonality_min_factor: float = 0.6
    predictive_seasonality_max_factor: float = 1.6
    predictive_monte_carlo_runs: int = 1000
    predictive_cache_ttl_seconds: int = 21600

    @field_validator('cors_origins', mode='before')
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if isinstance(value, str) and value and not value.startswith('['):
            return [item.strip() for item in value.split(',') if item.strip()]
        return value


settings = Settings()
