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

## Current State
- Repository was renamed from `app_Kimi` to `app_Budget`.
- Full-stack architecture is in place (frontend + backend + postgres + nginx frontend container).
- Analytics is backend-driven (recommendation endpoints and server-side calculations).
- Docker setup and migration flow are being stabilized.

## Important Note For Next Chat
- Category/subcategory product-flow work was intentionally rolled back by user during Docker troubleshooting.
- That work must be re-applied after infra stabilization.

## Category/Subcategory Concept To Re-Apply
1. Data model: explicit `category + subcategory` in transactions.
2. Add operation UX:
  - Fast category selection.
  - Contextual subcategory suggestions (e.g. for transport: taxi/metro/bus/carsharing/fuel).
  - Optional, non-blocking save if user keeps `Другое`.
3. Soft prompts:
  - Nudge user to refine `Другое`, especially for essential categories.
  - Never hard-block transaction creation.
4. Analytics quality block:
  - % of categorized expenses.
  - Absolute amount in `Другое`.
  - Explain that better granularity improves recommendation precision.
5. Recommendation policy:
  - Monthly expenses as primary signal.
  - Longer baseline for stability.
  - Conservative handling for essential categories.

## Build / Run Notes
- Frontend build: `cd app && npm run build`
- Backend run locally:
  - `cd backend && alembic upgrade head`
  - `uvicorn app.main:app --reload --port 8000`
- Docker:
  - `docker-compose up -d --build`

## Open Work / Next Practical Steps
1. Stabilize Docker startup/migrations end-to-end.
2. Re-implement category/subcategory flow cleanly after infra is stable.
3. Re-verify analytics recommendation quality with realistic seeded data.
4. Add short smoke-checklist for critical user path:
  - add/edit/delete transaction
  - category management
  - analytics recommendation rendering
