from __future__ import annotations

from collections import defaultdict
from dataclasses import replace
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
import hashlib
import json
import random

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.analytics.config import DEFAULT_PREDICTIVE_CONFIG, PredictiveModelConfig
from app.analytics.schemas import (
    AlertOut,
    CategoryRiskOut,
    PeriodForecastOut,
    PredictiveAnalyticsOut,
    PredictiveAnalyticsRequest,
    RiskOut,
)
from app.config import settings
from app.models import Transaction


def _to_decimal(value: float | int | Decimal) -> Decimal:
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def _round2(value: Decimal) -> Decimal:
    return value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def _risk_level(probability: Decimal) -> str:
    if probability >= Decimal('60'):
        return 'high'
    if probability >= Decimal('30'):
        return 'medium'
    return 'none'


def _confidence_label(days_of_data: int) -> str:
    if days_of_data < 30:
        return 'Низкая точность'
    if days_of_data <= 90:
        return 'Средняя точность'
    return 'Высокая точность'


def _avg_daily(spend_by_day: dict[date, Decimal], days: int, end_day: date) -> Decimal:
    start_day = end_day - timedelta(days=days - 1)
    total = Decimal('0')
    for i in range(days):
        day = start_day + timedelta(days=i)
        total += spend_by_day.get(day, Decimal('0'))
    return total / Decimal(days)


def _std_daily(spend_by_day: dict[date, Decimal], days: int, end_day: date) -> Decimal:
    start_day = end_day - timedelta(days=days - 1)
    samples: list[Decimal] = []
    for i in range(days):
        day = start_day + timedelta(days=i)
        samples.append(spend_by_day.get(day, Decimal('0')))
    if len(samples) < 2:
        return Decimal('0')
    mean = sum(samples, Decimal('0')) / Decimal(len(samples))
    variance = sum((x - mean) * (x - mean) for x in samples) / Decimal(len(samples) - 1)
    return variance.sqrt()


def _seasonality_factors(
    spend_by_day: dict[date, Decimal],
    lookback_days: int,
    end_day: date,
    config: PredictiveModelConfig,
) -> tuple[dict[int, Decimal], dict[int, Decimal]]:
    start_day = end_day - timedelta(days=lookback_days - 1)
    points: list[tuple[date, Decimal]] = []
    for i in range(lookback_days):
        d = start_day + timedelta(days=i)
        points.append((d, spend_by_day.get(d, Decimal('0'))))

    baseline = sum((v for _, v in points), Decimal('0')) / Decimal(max(1, len(points)))
    if baseline <= 0:
        baseline = Decimal('1')

    by_weekday: dict[int, list[Decimal]] = defaultdict(list)
    by_dom: dict[int, list[Decimal]] = defaultdict(list)
    for d, v in points:
        by_weekday[d.weekday()].append(v)
        by_dom[d.day].append(v)

    dow_factor: dict[int, Decimal] = {}
    for wd in range(7):
        vals = by_weekday.get(wd, [])
        mean = (sum(vals, Decimal('0')) / Decimal(len(vals))) if vals else baseline
        factor = mean / baseline
        dow_factor[wd] = min(
            _to_decimal(config.seasonality_max_factor),
            max(_to_decimal(config.seasonality_min_factor), factor),
        )

    dom_factor: dict[int, Decimal] = {}
    for dom in range(1, 32):
        vals = by_dom.get(dom, [])
        mean = (sum(vals, Decimal('0')) / Decimal(len(vals))) if vals else baseline
        factor = mean / baseline
        dom_factor[dom] = min(
            _to_decimal(config.seasonality_max_factor),
            max(_to_decimal(config.seasonality_min_factor), factor),
        )

    return dow_factor, dom_factor


def _detect_recurring(expenses: list[Transaction], config: PredictiveModelConfig) -> dict[str, list[tuple[int, Decimal]]]:
    grouped: dict[str, list[Transaction]] = defaultdict(list)
    for tx in expenses:
        key = tx.category_group or tx.category
        grouped[key].append(tx)

    recurring: dict[str, list[tuple[int, Decimal]]] = defaultdict(list)
    expected_interval = config.recurring_interval_days
    tolerance_days = config.recurring_interval_tolerance_days
    amount_tol = _to_decimal(config.recurring_tolerance)

    for group, items in grouped.items():
        sorted_items = sorted(items, key=lambda x: x.date)
        n = len(sorted_items)
        for i in range(n):
            seq = [sorted_items[i]]
            last = sorted_items[i]
            for j in range(i + 1, n):
                cur = sorted_items[j]
                day_gap = (cur.date - last.date).days
                if abs(day_gap - expected_interval) > tolerance_days:
                    continue
                prev_amount = _to_decimal(last.amount)
                cur_amount = _to_decimal(cur.amount)
                if prev_amount <= 0:
                    continue
                if abs(cur_amount - prev_amount) / prev_amount <= amount_tol:
                    seq.append(cur)
                    last = cur

            if len(seq) >= config.recurring_min_occurrences:
                avg_amount = sum((_to_decimal(x.amount) for x in seq), Decimal('0')) / Decimal(len(seq))
                due_day = seq[-1].date.day
                candidate = (due_day, _round2(avg_amount))
                if candidate not in recurring[group]:
                    recurring[group].append(candidate)

    return recurring


def _project_recurring_for_horizon(
    recurring_patterns: dict[str, list[tuple[int, Decimal]]],
    start_day: date,
    days: int,
) -> tuple[dict[date, Decimal], dict[date, dict[str, Decimal]]]:
    total_by_day: dict[date, Decimal] = defaultdict(lambda: Decimal('0'))
    by_group_day: dict[date, dict[str, Decimal]] = defaultdict(lambda: defaultdict(lambda: Decimal('0')))

    for i in range(days):
        day = start_day + timedelta(days=i)
        for group, patterns in recurring_patterns.items():
            for due_dom, amount in patterns:
                if day.day == due_dom:
                    total_by_day[day] += amount
                    by_group_day[day][group] += amount

    return total_by_day, by_group_day


def _simulate_risk(
    daily_means: list[Decimal],
    sigma_daily: Decimal,
    budget: Decimal,
    runs: int,
) -> Decimal:
    if budget <= 0:
        return Decimal('0')

    rng = random.Random(42)
    sigma = float(sigma_daily)
    exceeded = 0
    for _ in range(runs):
        total = 0.0
        for mean in daily_means:
            sampled = max(0.0, rng.gauss(float(mean), sigma))
            total += sampled
        if total > float(budget):
            exceeded += 1

    return _round2((Decimal(exceeded) / Decimal(runs)) * Decimal('100'))


class PredictiveAnalyticsService:
    def __init__(self, config: PredictiveModelConfig):
        self.config = config
        self._cache: dict[str, tuple[datetime, PredictiveAnalyticsOut]] = {}

    @classmethod
    def from_settings(cls) -> 'PredictiveAnalyticsService':
        cfg = replace(
            DEFAULT_PREDICTIVE_CONFIG,
            trend_30d_weight=settings.predictive_trend_30d_weight,
            trend_90d_weight=settings.predictive_trend_90d_weight,
            recurring_tolerance=settings.predictive_recurring_tolerance,
            recurring_min_occurrences=settings.predictive_recurring_min_occurrences,
            recurring_interval_days=settings.predictive_recurring_interval_days,
            recurring_interval_tolerance_days=settings.predictive_recurring_interval_tolerance_days,
            seasonality_min_factor=settings.predictive_seasonality_min_factor,
            seasonality_max_factor=settings.predictive_seasonality_max_factor,
            monte_carlo_runs=settings.predictive_monte_carlo_runs,
            cache_ttl_seconds=settings.predictive_cache_ttl_seconds,
        )
        return cls(cfg)

    def _cache_key(self, payload: PredictiveAnalyticsRequest, tx_count: int, max_created_at: datetime | None) -> str:
        key_payload = {
            'current_balance': str(payload.current_balance),
            'expected_income': str(payload.expected_income),
            'total_budget': str(payload.total_budget) if payload.total_budget is not None else None,
            'category_budgets': [{'group': x.group, 'budget': str(x.budget)} for x in payload.category_budgets],
            'tx_count': tx_count,
            'max_created_at': max_created_at.isoformat() if max_created_at else None,
        }
        encoded = json.dumps(key_payload, sort_keys=True, ensure_ascii=True)
        return hashlib.sha256(encoded.encode('utf-8')).hexdigest()

    def _load_expenses(self, db: Session, lookback_days: int = 180) -> list[Transaction]:
        today = date.today()
        start_day = today - timedelta(days=lookback_days - 1)
        stmt = (
            select(Transaction)
            .where(
                Transaction.type == 'expense',
                Transaction.date >= start_day,
                Transaction.date <= today,
            )
            .order_by(Transaction.date.asc(), Transaction.created_at.asc())
        )
        return list(db.scalars(stmt))

    def _load_income_by_day(self, db: Session, lookback_days: int = 180) -> dict[date, Decimal]:
        today = date.today()
        start_day = today - timedelta(days=lookback_days - 1)
        stmt = (
            select(Transaction.date, func.coalesce(func.sum(Transaction.amount), 0))
            .where(
                Transaction.type == 'income',
                Transaction.date >= start_day,
                Transaction.date <= today,
            )
            .group_by(Transaction.date)
        )
        rows = db.execute(stmt).all()
        return {row[0]: _to_decimal(row[1]) for row in rows}

    def _resolve_inputs(
        self,
        db: Session,
        payload: PredictiveAnalyticsRequest,
        group_totals_30: dict[str, Decimal],
        avg_daily_income_90: Decimal,
    ) -> tuple[Decimal, Decimal, Decimal, Decimal, dict[str, Decimal]]:
        if payload.current_balance is not None:
            resolved_balance = _to_decimal(payload.current_balance)
        else:
            summary_stmt = select(
                Transaction.type,
                func.coalesce(func.sum(Transaction.amount), 0),
            ).group_by(Transaction.type)
            income_total = Decimal('0')
            expense_total = Decimal('0')
            for tx_type, amount in db.execute(summary_stmt).all():
                amount_decimal = _to_decimal(amount)
                if tx_type == 'income':
                    income_total = amount_decimal
                elif tx_type == 'expense':
                    expense_total = amount_decimal
            resolved_balance = income_total - expense_total

        if payload.expected_income is not None:
            expected_income_30 = _to_decimal(payload.expected_income)
            expected_income_7 = _round2((expected_income_30 / Decimal('30')) * Decimal('7'))
        else:
            expected_income_30 = _round2(avg_daily_income_90 * Decimal('30'))
            expected_income_7 = _round2(avg_daily_income_90 * Decimal('7'))

        if payload.category_budgets:
            resolved_category_budgets = {item.group: _to_decimal(item.budget) for item in payload.category_budgets}
        else:
            resolved_category_budgets = {
                group: _round2(amount * Decimal('1.10'))
                for group, amount in group_totals_30.items()
                if amount > 0
            }

        if payload.total_budget is not None:
            resolved_total_budget = _to_decimal(payload.total_budget)
        else:
            resolved_total_budget = _round2(sum(resolved_category_budgets.values(), Decimal('0')))

        return (
            resolved_balance,
            expected_income_7,
            expected_income_30,
            resolved_total_budget,
            resolved_category_budgets,
        )

    def predict(self, db: Session, payload: PredictiveAnalyticsRequest) -> PredictiveAnalyticsOut:
        meta_stmt = select(func.count(Transaction.id), func.max(Transaction.created_at)).where(Transaction.type == 'expense')
        tx_count, max_created_at = db.execute(meta_stmt).one()

        key = self._cache_key(payload, int(tx_count or 0), max_created_at)
        now = datetime.now(timezone.utc)
        cached = self._cache.get(key)
        if cached and (now - cached[0]).total_seconds() < self.config.cache_ttl_seconds:
            out = cached[1].model_copy(deep=True)
            out.cached = True
            return out

        expenses = self._load_expenses(db)
        today = date.today()
        start_90 = today - timedelta(days=89)
        start_30 = today - timedelta(days=29)

        spend_by_day: dict[date, Decimal] = defaultdict(lambda: Decimal('0'))
        spend_by_day_group: dict[str, dict[date, Decimal]] = defaultdict(lambda: defaultdict(lambda: Decimal('0')))
        for tx in expenses:
            day = tx.date
            amount = _to_decimal(tx.amount)
            group = tx.category_group or tx.category
            spend_by_day[day] += amount
            spend_by_day_group[group][day] += amount

        income_by_day = self._load_income_by_day(db)

        avg30 = _avg_daily(spend_by_day, 30, today)
        avg90 = _avg_daily(spend_by_day, 90, today)
        trend = (_to_decimal(self.config.trend_30d_weight) * avg30) + (_to_decimal(self.config.trend_90d_weight) * avg90)
        avg_income_90 = _avg_daily(income_by_day, 90, today)

        dow_factor, dom_factor = _seasonality_factors(spend_by_day, 90, today, self.config)
        recurring_patterns = _detect_recurring(expenses, self.config)

        group_totals_90: dict[str, Decimal] = {}
        group_totals_30: dict[str, Decimal] = {}
        total_90 = Decimal('0')
        for group, daily in spend_by_day_group.items():
            group_sum = sum((daily.get(start_90 + timedelta(days=i), Decimal('0')) for i in range(90)), Decimal('0'))
            group_totals_90[group] = group_sum
            total_90 += group_sum
            group_totals_30[group] = sum((daily.get(start_30 + timedelta(days=i), Decimal('0')) for i in range(30)), Decimal('0'))
        group_shares = {
            g: (a / total_90 if total_90 > 0 else Decimal('0'))
            for g, a in group_totals_90.items()
        }

        (
            resolved_balance,
            resolved_income_7,
            resolved_income_30,
            resolved_total_budget,
            resolved_category_budgets,
        ) = self._resolve_inputs(
            db=db,
            payload=payload,
            group_totals_30=group_totals_30,
            avg_daily_income_90=avg_income_90,
        )

        forecast_start = today + timedelta(days=1)

        recurring_total_7, recurring_group_7 = _project_recurring_for_horizon(recurring_patterns, forecast_start, 7)
        recurring_total_30, recurring_group_30 = _project_recurring_for_horizon(recurring_patterns, forecast_start, 30)

        def build_daily_predictions(days: int, recurring_total: dict[date, Decimal]) -> list[Decimal]:
            values: list[Decimal] = []
            for i in range(days):
                day = forecast_start + timedelta(days=i)
                seasonal = (dow_factor[day.weekday()] + dom_factor[day.day]) / Decimal('2')
                values.append((trend * seasonal) + recurring_total.get(day, Decimal('0')))
            return values

        daily_7 = build_daily_predictions(7, recurring_total_7)
        daily_30 = build_daily_predictions(30, recurring_total_30)

        pred_7 = _round2(sum(daily_7, Decimal('0')))
        pred_30 = _round2(sum(daily_30, Decimal('0')))

        remaining_7 = _round2(resolved_balance + resolved_income_7 - pred_7)
        remaining_30 = _round2(resolved_balance + resolved_income_30 - pred_30)

        sigma_90 = _std_daily(spend_by_day, 90, today)

        overall_risk: RiskOut | None = None
        alerts: list[AlertOut] = []

        if resolved_total_budget > 0:
            overall_prob = _simulate_risk(daily_30, sigma_90, resolved_total_budget, self.config.monte_carlo_runs)
            overall_level = _risk_level(overall_prob)
            overall_risk = RiskOut(
                budget=_round2(resolved_total_budget),
                predicted_expenses=pred_30,
                risk_probability=overall_prob,
                level=overall_level,
            )
            if overall_level != 'none':
                alerts.append(
                    AlertOut(
                        level=overall_level,
                        message=(
                            f'С вероятностью {overall_prob}% вы превысите общий бюджет в ближайшие 30 дней.'
                        ),
                    )
                )

        category_risks: list[CategoryRiskOut] = []
        budget_by_group = resolved_category_budgets
        for group, budget in budget_by_group.items():
            daily_means: list[Decimal] = []
            for i in range(30):
                day = forecast_start + timedelta(days=i)
                seasonal = (dow_factor[day.weekday()] + dom_factor[day.day]) / Decimal('2')
                base_component = trend * seasonal * group_shares.get(group, Decimal('0'))
                recurring_component = recurring_group_30.get(day, {}).get(group, Decimal('0'))
                daily_means.append(base_component + recurring_component)

            group_pred = _round2(sum(daily_means, Decimal('0')))
            group_sigma = _std_daily(spend_by_day_group.get(group, {}), 90, today)
            prob = _simulate_risk(daily_means, group_sigma, budget, self.config.monte_carlo_runs)
            level = _risk_level(prob)

            category_risks.append(
                CategoryRiskOut(
                    group=group,
                    budget=_round2(budget),
                    predicted_expenses=group_pred,
                    risk_probability=prob,
                    level=level,
                )
            )

            if level != 'none':
                alerts.append(
                    AlertOut(
                        level=level,
                        message=(
                            f"С вероятностью {prob}% вы превысите бюджет на категорию '{group}' в этом месяце."
                        ),
                    )
                )

        data_days = len({tx.date for tx in expenses})

        out = PredictiveAnalyticsOut(
            generated_at=now,
            cached=False,
            confidence_label=_confidence_label(data_days),
            forecast_7d=PeriodForecastOut(days=7, predicted_expenses=pred_7, expected_remaining=remaining_7),
            forecast_30d=PeriodForecastOut(days=30, predicted_expenses=pred_30, expected_remaining=remaining_30),
            overall_risk_30d=overall_risk,
            category_risks_30d=category_risks,
            alerts=alerts,
        )

        self._cache[key] = (now, out)
        return out


predictive_analytics_service = PredictiveAnalyticsService.from_settings()
