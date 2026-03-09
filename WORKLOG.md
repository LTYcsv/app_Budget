# WORKLOG

## Project
- Name: `FinFlow` (personal budget tracker)
- Repo root: `app_Budget/`
- App root: `app/`
- Backend root: `backend/`
- Stack:
  - Frontend: React + TypeScript + Vite + Tailwind + Framer Motion
  - Backend: FastAPI + SQLAlchemy + Alembic
  - DB: PostgreSQL
  - Infra: Docker Compose (`db` + `backend` + `frontend`)

## Current State (Updated)
- Docker stack is operational and stable in normal flow.
- Category/subcategory model is re-implemented and active in product flow.
- Transport categories were updated:
  - `Метро` + `Автобус` merged to `Общественный транспорт`
  - `Парковка` added as separate subcategory.
- Frontend analytics now includes:
  - category spend breakdown card/list,
  - predictive analytics block powered by backend.
- Placeholder `Что если` block was removed from analytics screen as a separate future feature.

## Backend Progress
1. Schema + migrations:
- `0002_category_subcategory_flow` (grouped categories + transaction refs).
- `0003_merge_public_transport...` (bus/metro merge).
- `0004_add_transport_parking`.

2. Core services:
- Category seeding and cleanup logic updated.
- Category spend endpoint implemented:
  - `GET /api/v1/analytics/categories`.

3. Predictive module added (`backend/app/analytics/`):
- `predictive.py` with MVP logic:
  - trend component (30d/90d weighted),
  - seasonality (weekday + day-of-month factors),
  - recurring payments detection,
  - Monte Carlo risk simulation,
  - alerts and confidence labels,
  - 6h cache.
- `schemas.py` and `config.py` for modular architecture.
- API endpoint:
  - `POST /api/v1/analytics/predictive`.
- Auto-input resolution from DB enabled if payload is empty:
  - balance,
  - expected income,
  - total/category budgets.

## Frontend Progress
- `Analytics.tsx` rebuilt around real backend analytics:
  - category breakdown visualization,
  - automatic predictive block (no manual input form).
- `api.ts` expanded with predictive request/response types.

## Testing / Validation
- Frontend build passes (`cd app && npm run build`).
- Backend compile check passes (`cd backend && python3 -m compileall app`).
- Predictive unit tests added in `backend/tests/test_predictive_analytics.py`.
- Note: running pytest requires test dependency install in environment.

## Build / Run Notes
- Frontend build: `cd app && npm run build`
- Backend local run:
  - `cd backend && alembic upgrade head`
  - `uvicorn app.main:app --reload --port 8000`
- Docker:
  - `docker compose up -d --build`

## Tech Debt Register

| ID | Файл | Проблема | Сложность | Приоритет |
|----|------|----------|-----------|-----------|
| TD-001 | `gamification/service.py` → `_check_achievements` | `unlocked_at` для достижений `streak_7`/`streak_30` вычисляется как `today - (N-1) days`, а не из реальных данных. Нет хранения момента первого достижения стрика. **Решение:** добавить `streak_started_at: date` в отдельную таблицу `GamificationState` или передавать из `_calc_streak` дату начала текущей серии. | Средняя | Низкий |
| TD-002 | `savings/service.py` → `_calc_forecast` | ~~Мёртвый код и inline-импорт `timedelta`~~ — **исправлено** (2026-03-09). | — | — |

## Open Work / Next Practical Steps
1. Add persistent user budget model/table (replace inferred budgets in predictive flow).
2. Move predictive cache to shared store (e.g., Redis) for multi-instance consistency.
3. Add async/offloaded Monte Carlo path if response time grows under load.
4. Integrate predictive KPIs into dashboard cards and mobile-first UX polish.
5. Add smoke checklist for:
  - add/edit/delete transaction,
  - category management,
  - analytics categories,
  - predictive endpoint and alerts.

## Session Update (2026-03-02 to 2026-03-03)
- Analytics block was reset and restructured:
  - old analytics routers/modules removed from runtime flow, then reintroduced with clean modular split:
    - `backend/app/analytics/schemas.py`
    - `backend/app/analytics/metrics.py`
    - `backend/app/analytics/predictive.py`
    - `backend/app/analytics/config.py`
    - `backend/app/api/routes/analytics.py`
  - `backend/app/api/router.py` now includes analytics router again.
- Backend data/model hardening:
  - `created_at` defaults switched to timezone-aware UTC (`datetime.now(timezone.utc)`).
  - `Transaction.amount` typing aligned to `Decimal`.
  - `Transaction.category_id` upgraded to FK with cascade/update behavior.
  - Added `subcategory_id` to transactions.
- Alembic migrations evolved:
  - Added and normalized revisions:
    - `0005_transactions_category_fk`
    - `0006_tx_type_date_group_idx`
    - `0007_tx_subcategory_id`
    - `0008_seed_default_categories`
    - `0009_savings_goals`
    - `0010_reseed_categories`
  - Revision IDs were shortened to stay within `alembic_version.version_num` limit.
  - Category seeding moved to migrations (idempotent), not app startup.
- Savings (goals/piggy-bank) module integrated:
  - Added `backend/app/savings/{schemas.py,service.py,router.py,__init__.py}`.
  - Added models `SavingsGoal`, `SavingsDeposit`.
  - Added router wiring in API.
  - `add_deposit` now also creates an expense transaction (`invest-savings`) for analytics consistency.
- Categories reseed/update:
  - `backend/app/services.py` replaced with expanded category taxonomy.
  - Investment categories included (`invest-savings`, `invest-stocks`, `invest-deposits`).
  - Reseed migration added to normalize category set in existing DBs.
- Gamification module scaffold integrated:
  - Added `backend/app/gamification/{schemas.py,service.py,router.py,__init__.py}`.
  - Router connected in API.
- Frontend updates:
  - `app/src/pages/Analytics.tsx` replaced with data-driven analytics screen.
  - `app/src/lib/api.ts` extended/replaced multiple times to match new endpoints.
  - `app/src/pages/Goals.tsx` replaced with API-integrated goals UI.
  - Fixed stale dashboard transactions after deposit by calling `refresh()` from `TransactionsContext`.
  - Fixed category-management UX when icon assets are absent (fallback icon `📦`).
  - Fixed manage-categories list filter by selected group.
- Runtime incident and fix:
  - Docker backend failed with `ImportError: list_categories/list_transactions` after services refactor.
  - Added compatibility aliases in `backend/app/services.py`.
  - Rebuilt backend image and verified healthy startup logs.
