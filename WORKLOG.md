# WORKLOG — Чек (FinFlow)

## Проект
- Название: Чек (бывший FinFlow) — мобильное приложение учёта личных финансов
- Целевая аудитория: поколение Z и Alpha
- Стартап-заявка: программа «Мультиагентная платформа ИИ-решений», заявитель Тоноян Ашот Сираканович

## Стек
- Frontend: React + TypeScript + Vite + Tailwind (тёмная тема) + Framer Motion + React Router v6, порт 8080
- Backend: FastAPI + SQLAlchemy + Alembic + PostgreSQL 16, порт 8000
- Инфра: Docker Compose (db + backend + frontend), Mac локально
- Пути: `app/src/` — фронт, `backend/app/` — бэк

## Навигация (финальная)
- Bottom nav: `/` (Главная) | `/analytics` | `/add` (центральная) | `/goals` (Копилки) | `/profile`
- Хедер: `/accounts` (CreditCard) | `/achievements` (Trophy)

## Модели БД (backend/app/models.py)
- User: id, email, password_hash, created_at; уникальный индекс по email
- Account: id, user_id→User(CASCADE), name, color, initial_balance, created_at
- Transaction: id, user_id→User(CASCADE), name, amount, account_id→Account(SET NULL), category_id→Category(SET NULL), subcategory_id, category_group, category, icon, date, time, type, created_at
- Category: id, name, group, icon, type, is_other, created_at (глобальная, без user_id)
- SavingsGoal: id, user_id→User(CASCADE), name, photo_url, target_amount, current_amount, deadline, status, interest_rate, interest_frequency, interest_next_date, created_at
- SavingsDeposit: id, goal_id→SavingsGoal(CASCADE), transaction_id→Transaction(SET NULL), amount, note, created_at

## Миграции (последняя: 0013_add_users)
0001→0012 (предыдущие) → 0013_add_users: создаёт таблицу users + добавляет user_id FK в accounts, transactions, savings_goals

## Авторизация (backend/app/auth/) ✅
- `schemas.py`: UserCreate, UserLogin, TokenOut, UserOut
- `service.py`: hash_password/verify_password (passlib bcrypt), create/decode JWT, register_user, authenticate_user
- `deps.py`: get_current_user dependency (HTTPBearer → decode JWT → User)
- `router.py`: POST /auth/register, POST /auth/login, POST /auth/refresh (из httpOnly cookie), POST /auth/logout, GET /auth/me
- Access token: 30 мин, Refresh token: 30 дней (httpOnly cookie)
- JWT_SECRET_KEY берётся из `backend/.env` (не в git)

## Мультитенантность ✅
Все сервисные функции принимают `user_id`, все запросы фильтруются по нему:
- `backend/app/services.py` — транзакции и bootstrap
- `backend/app/accounts/service.py` и `router.py`
- `backend/app/savings/service.py` и `router.py`
- `backend/app/gamification/service.py` и `router.py`
- `backend/app/analytics/metrics.py` и `predictive.py`
- `backend/app/api/routes/analytics.py`, `transactions.py`, `bootstrap.py`

## Конфиг (backend/app/config.py)
Переменные: database_url, jwt_secret_key, jwt_algorithm, access_token_expire_minutes, refresh_token_expire_days, cors_origins
CORS разрешён для: localhost:5173, localhost:8080

## Requirements (backend/requirements.txt)
```
fastapi==0.116.1
uvicorn[standard]==0.35.0
SQLAlchemy==2.0.36
psycopg[binary]==3.2.3
pydantic-settings==2.6.1
pydantic[email]==2.10.6
alembic==1.14.0
pytest==8.3.5
passlib[bcrypt]==1.7.4
bcrypt==4.0.1          ← обязательно 4.0.1 (новые версии конфликтуют с passlib)
python-jose[cryptography]==3.3.0
```

## Структура модулей бэкенда
```
backend/app/
├── main.py              — FastAPI app + CORS
├── config.py            — Settings (pydantic-settings)
├── models.py            — SQLAlchemy модели
├── schemas.py           — Pydantic схемы (BootstrapOut и др.)
├── services.py          — Категории, транзакции, bootstrap
├── database.py          — get_db dependency
├── auth/                — register, login, JWT, deps
├── accounts/            — router.py, service.py, schemas.py
├── savings/             — router.py, service.py, schemas.py
├── gamification/        — router.py, service.py, schemas.py
├── analytics/
│   ├── metrics.py       — summary, category_spend, trends, dashboard
│   ├── predictive.py    — прогноз баланса 7d/30d
│   ├── schemas.py
│   └── config.py
└── api/
    ├── router.py        — подключает все роутеры
    └── routes/
        ├── bootstrap.py
        ├── transactions.py
        ├── categories.py
        ├── analytics.py
        └── system.py
```

## Структура модулей фронтенда
```
app/src/
├── App.tsx                  — роутинг + AuthGate + провайдеры
├── context/
│   ├── AuthContext.tsx      — token, login, logout, авто-refresh
│   └── TransactionsContext.tsx
├── lib/
│   └── api.ts               — все API вызовы + setAuthHandlers
├── pages/
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Dashboard.tsx
│   ├── Analytics.tsx
│   ├── Goals.tsx
│   ├── AddTransaction.tsx
│   ├── Profile.tsx          — email из /auth/me, logout
│   ├── Achievements.tsx
│   ├── Transactions.tsx
│   └── Accounts.tsx
├── layouts/
│   └── MainLayout.tsx
└── components/
    ├── StreakIndicator.tsx
    ├── CategoryIcon.tsx
    ├── AnimatedCounter.tsx
    └── ui/
```

## Фронтенд авторизация ✅
- `AuthContext` хранит токен в localStorage, авто-обновляет за 2 мин до истечения через `/auth/refresh` с credentials: include
- `App.tsx` — `AuthGate` редиректит на `/login` если не авторизован; инициализирует `setAuthHandlers` для api.ts
- `api.ts` — добавляет `Authorization: Bearer <token>` к каждому запросу; при 401 вызывает logout; таймаут 10 сек

## Полезные команды
```bash
docker compose up -d --build
docker compose restart backend
docker compose logs backend --tail=30
docker compose exec backend alembic upgrade head
```

## Tech Debt

| ID | Файл | Проблема | Приоритет |
|----|------|----------|-----------|
| TD-001 | gamification/service.py | unlocked_at для streak_7/streak_30 вычисляется приближённо, нет хранения streak_started_at | Низкий |
| TD-002 | analytics/predictive.py | Кэш process-local, сбрасывается при рестарте. Нужен Redis для multi-instance | Низкий |
| TD-003 | analytics/predictive.py | Monte Carlo синхронный в request path — при нагрузке нужен async | Низкий |

## Pending (после MVP-релиза)
1. Тесты (backend/tests/ — scaffold есть)
2. Capacitor — мобильная сборка
3. Экспорт CSV
4. FinSight AI — ARIMA/LSTM прогнозы (замена текущего простого predictive)
5. Бюджеты (модель Budget)
6. Redis для кэша predictive
7. Платная версия Pro (4-й месяц этапа 2 по заявке)