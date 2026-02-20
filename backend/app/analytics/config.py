from dataclasses import dataclass


@dataclass(frozen=True)
class PredictiveModelConfig:
    trend_30d_weight: float = 0.7
    trend_90d_weight: float = 0.3
    recurring_tolerance: float = 0.05
    recurring_min_occurrences: int = 3
    recurring_interval_days: int = 30
    recurring_interval_tolerance_days: int = 5
    seasonality_min_factor: float = 0.6
    seasonality_max_factor: float = 1.6
    monte_carlo_runs: int = 1000
    cache_ttl_seconds: int = 6 * 60 * 60


DEFAULT_PREDICTIVE_CONFIG = PredictiveModelConfig()
