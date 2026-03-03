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

## 10) Startup Lifecycle and Seeding
- Decision: Remove runtime category seeding from FastAPI startup hook and move seeding to Alembic migrations.
- Status: Implemented.
- Why:
  - Avoid deprecated startup event usage for data init.
  - Prevent repetitive seeding workload on every app restart.
  - Keep bootstrap deterministic in migration chain.

## 11) Alembic Revision ID Policy
- Decision: Keep Alembic `revision` values under 32 chars.
- Status: Implemented.
- Why:
  - Avoid overflow issues with `alembic_version.version_num` length.
- Result:
  - Revisions were renamed to short IDs (`0005_transactions_category_fk`, `0006_tx_type_date_group_idx`, `0007_tx_subcategory_id`).

## 12) Category Integrity for Analytics
- Decision: Enforce FK from `transactions.category_id` to `categories.id` and aggregate with category joins/fallbacks.
- Status: Implemented.
- Why:
  - Reduce denormalization drift when category metadata changes.
  - Keep grouped analytics stable over time.

## 13) Analytics Module Boundary
- Decision: Keep analytics as dedicated backend domain package.
- Status: Implemented.
- Structure:
  - `app/analytics/schemas.py` (contracts),
  - `app/analytics/metrics.py` (fast DB aggregates),
  - `app/analytics/predictive.py` (forecast logic),
  - `app/analytics/config.py` (constants),
  - `app/api/routes/analytics.py` (routing only).

## 14) Savings Domain and Cross-Domain Accounting
- Decision: Treat savings deposits as first-class goal events and mirrored expense transactions.
- Status: Implemented.
- Rule:
  - On deposit to goal, create `SavingsDeposit` and an expense transaction (`category_id='invest-savings'`).
- Why:
  - Keep budget analytics and goals history synchronized.

## 15) Category Taxonomy Expansion
- Decision: Expand expense/income category defaults and add reseed migration for existing DBs.
- Status: Implemented.
- Notes:
  - Added investment-related categories.
  - Added `0010_reseed_categories` to normalize existing datasets.

## 16) Gamification Backend Exposure
- Decision: Add separate backend domain for gamification with dedicated API route.
- Status: Implemented (backend scaffold).
- Structure:
  - `app/gamification/{schemas.py,service.py,router.py}` + router include in API.

## 17) Compatibility Policy During Refactors
- Decision: Add short-term compatibility aliases when service function names are refactored.
- Status: Implemented.
- Example:
  - `list_categories/list_transactions` aliases restored to prevent router import breakage and Docker boot failures.
