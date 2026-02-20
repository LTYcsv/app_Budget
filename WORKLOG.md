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
