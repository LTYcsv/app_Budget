# DECISIONS

## 1) Architecture Direction
- Decision: Keep analytics logic on backend, UI logic on frontend.
- Status: Active and expanded.
- Why:
  - Single source of truth for formulas and risk scoring.
  - Easier backend evolution without frontend drift.
  - Better testability of business logic.

## 2) Categorization Strategy
- Decision: Use strict `category_group + subcategory` for expenses.
- Status: Implemented.
- Notes:
  - Transactions now keep `category_id` and `category_group`.
  - Category model includes `group` and `is_other`.
  - Legacy broad categories were cleaned from defaults.

## 3) Transport Taxonomy
- Decision: Merge `Метро` + `Автобус` into `Общественный транспорт`.
- Status: Implemented via migration.
- Extension:
  - Added `Парковка` as separate transport subcategory.

## 4) UX Principle For Category Precision
- Decision: Non-intrusive precision in add-flow.
- Status: Implemented in MVP.
- Rules:
  - Fast group selection first.
  - Subcategory selection second.
  - Soft hint for `Другое`, no hard blocking.

## 5) Infrastructure Operating Mode
- Decision: One-command startup via Docker Compose is required.
- Status: Implemented and validated.
- Notes:
  - `db`, `backend`, `frontend` are healthy after rebuild.
  - Frontend healthcheck fixed to avoid false negatives.

## 6) Category Spend Analytics
- Decision: Category breakdown is backend-driven and grouped by `category_group`.
- Status: Implemented.
- API:
  - `GET /api/v1/analytics/categories?date_from=...&date_to=...`

## 7) Predictive Analytics MVP
- Decision: Implement predictive module in backend (trend + seasonality + recurring + Monte Carlo).
- Status: Implemented.
- API:
  - `POST /api/v1/analytics/predictive`
- Notes:
  - Forecast horizons: 7d and 30d.
  - Risk scoring by probability tiers (`none` / `medium` / `high`).
  - Alert generation for overall and category overspend risk.
  - In-memory cache TTL: 6 hours.
  - Configurable model parameters in settings.

## 8) Predictive Input Source
- Decision: Predictive calculations should auto-resolve inputs from real DB data by default.
- Status: Implemented.
- Behavior:
  - If not provided, service derives:
    - current balance from historical income-expense totals,
    - expected income from 90d income trend,
    - total/category budgets from recent category spend.
  - Frontend calls predictive endpoint without manual input payload in analytics screen.

## 9) Known Debt / Risks
- No persistent user budget profile yet (separate budget model/table still missing).
- Predictive cache is process-local (resets on backend restart; no Redis yet).
- Monte Carlo currently synchronous in request path (acceptable for MVP, may need async/offload under load).
- Backend tests were added, but running them depends on installing test deps in runtime environment.
