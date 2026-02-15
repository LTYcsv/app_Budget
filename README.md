# FinFlow MVP

Full-stack personal finance tracker.

## Stack
- Frontend: React + TypeScript + Vite
- Backend: FastAPI + SQLAlchemy
- Database: PostgreSQL
- Infra: Docker Compose + Nginx

## One-command run
```bash
docker-compose up -d --build
```

## URLs
- App: `http://localhost:8080`
- API health: `http://localhost:8080/health`
- API docs: `http://localhost:8000/docs`

## Services
- `frontend` serves static build and proxies `/api/*` to backend
- `backend` applies Alembic migrations on startup and runs API
- `db` persists data in Docker volume `finflow_pg_data`

## Stop
```bash
docker-compose down
```

## Reset data
```bash
docker-compose down -v
```
