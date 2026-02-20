from datetime import date, timedelta
from decimal import Decimal

from app.analytics.config import DEFAULT_PREDICTIVE_CONFIG
from app.analytics.predictive import (
    _avg_daily,
    _confidence_label,
    _risk_level,
    _seasonality_factors,
    _simulate_risk,
    _std_daily,
)


def _build_series(days: int, base: Decimal) -> tuple[dict[date, Decimal], date]:
    end_day = date.today()
    start = end_day - timedelta(days=days - 1)
    data: dict[date, Decimal] = {}
    for i in range(days):
        data[start + timedelta(days=i)] = base
    return data, end_day


def test_trend_component_weighted_average_mvp() -> None:
    data, end_day = _build_series(90, Decimal('100'))

    for i in range(30):
        data[end_day - timedelta(days=i)] = Decimal('200')

    avg_30 = _avg_daily(data, 30, end_day)
    avg_90 = _avg_daily(data, 90, end_day)
    trend = (Decimal('0.7') * avg_30) + (Decimal('0.3') * avg_90)

    assert avg_30 == Decimal('200')
    assert avg_90 == Decimal('133.3333333333333333333333333')
    assert trend == Decimal('180')


def test_seasonality_detects_day_of_week_pattern() -> None:
    data, end_day = _build_series(90, Decimal('100'))
    start_day = end_day - timedelta(days=89)

    for i in range(90):
        d = start_day + timedelta(days=i)
        if d.weekday() >= 5:
            data[d] = Decimal('200')
        else:
            data[d] = Decimal('80')

    dow_factor, _ = _seasonality_factors(data, 90, end_day, DEFAULT_PREDICTIVE_CONFIG)

    assert dow_factor[5] > dow_factor[0]
    assert dow_factor[6] > dow_factor[2]


def test_monte_carlo_risk_probability_high_vs_low() -> None:
    daily = [Decimal('100')] * 30

    low_risk = _simulate_risk(daily_means=daily, sigma_daily=Decimal('5'), budget=Decimal('5000'), runs=1000)
    high_risk = _simulate_risk(daily_means=daily, sigma_daily=Decimal('5'), budget=Decimal('2500'), runs=1000)

    assert low_risk < Decimal('30')
    assert high_risk > Decimal('60')


def test_synthetic_dataset_prediction_stability() -> None:
    data, end_day = _build_series(90, Decimal('120'))
    avg_30 = _avg_daily(data, 30, end_day)
    avg_90 = _avg_daily(data, 90, end_day)
    trend = (Decimal('0.7') * avg_30) + (Decimal('0.3') * avg_90)
    dow_factor, dom_factor = _seasonality_factors(data, 90, end_day, DEFAULT_PREDICTIVE_CONFIG)

    forecast = Decimal('0')
    for i in range(30):
        day = (end_day + timedelta(days=1)) + timedelta(days=i)
        seasonal = (dow_factor[day.weekday()] + dom_factor[day.day]) / Decimal('2')
        forecast += trend * seasonal

    expected = Decimal('120') * Decimal('30')
    delta = abs(forecast - expected)

    assert delta < Decimal('120')


def test_edge_cases_helpers() -> None:
    sparse_data, end_day = _build_series(10, Decimal('50'))
    spike_data, spike_end = _build_series(90, Decimal('100'))
    spike_data[spike_end] = Decimal('2000')

    assert _confidence_label(10) == 'Низкая точность'
    assert _confidence_label(30) == 'Средняя точность'
    assert _confidence_label(120) == 'Высокая точность'

    assert _risk_level(Decimal('0')) == 'none'
    assert _risk_level(Decimal('30')) == 'medium'
    assert _risk_level(Decimal('60')) == 'high'

    assert _std_daily(sparse_data, 10, end_day) == Decimal('0')
    assert _std_daily(spike_data, 90, spike_end) > Decimal('0')
