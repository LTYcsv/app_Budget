# Чек — Personal Finance Tracker

> A full-stack personal finance web app built with production-quality engineering practices: typed end-to-end, atomic DB operations, JWT + httpOnly cookies, 135 tests, and one-command Docker deploy.

## Features

- **Multi-account management** — cash, bank cards, and savings with real-time balance derived from transactions
- **Transactions** — income, expenses, and inter-account transfers with 50+ categorized defaults + custom categories
- **Savings Goals** — set targets, deposit funds, track progress, optional interest accrual
- **Analytics Dashboard** — spending by category, monthly trends, period summaries with charts
- **Predictive Analytics** — 7-day and 30-day balance forecasts via Monte Carlo simulation
- **Gamification** — daily streak tracking + 8 unlockable achievements
- **Bilingual UI** — Russian / English, persisted in localStorage
- **Secure Auth** — access token in React state, refresh token in httpOnly cookie, bcrypt passwords
- **Password Reset** — email flow via Resend

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, TypeScript 5.9, Vite 7 |
| **UI / Styling** | Tailwind CSS 3.4, Radix UI, Framer Motion 12 |
| **Routing / Forms** | React Router 7, React Hook Form, Zod |
| **Charts** | Recharts |
| **Backend** | FastAPI 0.116, SQLAlchemy 2.0, Alembic, PostgreSQL 16 |
| **Auth / Security** | python-jose (JWT), passlib/bcrypt, slowapi (rate limiting) |
| **Infrastructure** | Docker Compose, Nginx |

## Quick Start

**Prerequisites:** Docker + Docker Compose

```bash
# 1. Clone
git clone https://github.com/LTYcsv/app_Budget.git
cd app_Budget

# 2. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env — set DB_PASSWORD and JWT_SECRET_KEY
# Generate a key: python3 -c "import secrets; print(secrets.token_hex(32))"

# 3. Run (first build takes 3-5 min)
docker compose up -d --build
```

| URL | Description |
|-----|-------------|
| http://localhost:8080 | Application |
| http://localhost:8000/docs | Interactive API docs (Swagger UI) |

```bash
docker compose down        # stop
docker compose down -v     # stop + wipe DB
```

See [DEPLOY.md](DEPLOY.md) for production deployment with domain + SSL.

## Architecture

```
┌──────────────────────────────────┐
│   Browser  (React 19 + Vite SPA) │
│   Port 8080, served via Nginx    │
└───────────────┬──────────────────┘
                │  /api/*  →  proxy
┌───────────────▼──────────────────┐
│   FastAPI Backend  (Port 8000)   │
│   SQLAlchemy 2.0 · Alembic       │
└───────────────┬──────────────────┘
                │
┌───────────────▼──────────────────┐
│   PostgreSQL 16  (Port 5432)     │
│   Volume: finflow_pg_data        │
└──────────────────────────────────┘
```

All three services run inside an isolated Docker network. Only port `8080` is exposed to the host — the backend and database are unreachable from outside.

## Backend Layout

```
backend/app/
├── main.py              — FastAPI app + CORS
├── models.py            — SQLAlchemy models
├── auth/                — register, login, JWT, deps
├── accounts/            — multi-account management
├── savings/             — goals + deposits
├── gamification/        — streaks + achievements
├── analytics/
│   ├── metrics.py       — summary, category spend, trends
│   └── predictive.py   — Monte Carlo balance forecast
└── api/                 — route aggregation
```

## Key Engineering Decisions

| Decision | Approach |
|----------|----------|
| Money types | `NUMERIC(14,2)` in DB, `Decimal` in Python — never `float` |
| Transfer atomicity | `SELECT FOR UPDATE` prevents race conditions |
| Balance calculation | Derived from transactions at query time, never cached |
| Auth token storage | Access token in React state, refresh in `httpOnly` cookie |
| Multi-tenancy | `user_id` FK on every data table; all queries are user-scoped |
| Category seeding | Via Alembic migrations, not startup hooks |

Full decision log: [DECISIONS.md](DECISIONS.md)

## Tests

```bash
docker compose exec backend pytest -v
```

**135 tests passing** — auth, accounts, transactions, categories, savings goals, analytics, and gamification.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_PASSWORD` | Yes | PostgreSQL password |
| `JWT_SECRET_KEY` | Yes | 32-byte hex secret for JWT signing |
| `COOKIE_SECURE` | No | Set `true` in production (HTTPS only) |
| `RESEND_API_KEY` | No | Required for password-reset emails |
| `CORS_ORIGINS` | No | Comma-separated list of allowed origins |

## API Reference

Full endpoint reference with request/response schemas: [TechSpec.md](TechSpec.md)  
Or explore interactively at `http://localhost:8000/docs` when running locally.

---

Built by [LTYcsv](https://github.com/LTYcsv)
