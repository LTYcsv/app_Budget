# FinFlow Backend

Backend service for business logic and persistence.

## Structure
- `app/main.py` app bootstrap and middleware
- `app/api/router.py` route registration
- `app/api/routes/` route modules by domain
- `app/services.py` business logic
- `app/models.py` SQLAlchemy models
- `app/schemas.py` Pydantic contracts
- `alembic/` schema migrations

## Stack
- FastAPI
- PostgreSQL
- SQLAlchemy
- Alembic

## Run locally
1. Create a PostgreSQL database (example: `finflow`).
2. Set env vars:
   - `DATABASE_URL` (example: `postgresql+psycopg://postgres:postgres@localhost:5432/finflow`)
3. Install dependencies:
   - `pip install -r requirements.txt`
4. Run migrations:
   - `alembic upgrade head`
5. Start API:
   - `uvicorn app.main:app --reload --port 8000`

## Main endpoints
- `GET /health`
- `GET /api/v1/bootstrap`
- `GET /api/v1/transactions`
- `POST /api/v1/transactions`
- `PUT /api/v1/transactions/{tx_id}`
- `DELETE /api/v1/transactions/{tx_id}`
- `POST /api/v1/categories/{category_type}`
- `DELETE /api/v1/categories/{category_type}/{category_id}`
- `GET /api/v1/analytics/summary?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`
- `GET /api/v1/analytics/dashboard?period=day|week|month|year`
