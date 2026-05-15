# CLAUDE.md — Чек (app_Budget)

## Стек

**Frontend** (`app/`) — React 19 + TypeScript 5.9 + Vite 7, Tailwind CSS 3.4 + Radix UI + Framer Motion, React Router DOM 7, React Hook Form + Zod, Recharts. Состояние: Context API (AuthContext, TransactionsContext, LangContext).

**Backend** (`backend/`) — FastAPI + SQLAlchemy 2.0 + Alembic, PostgreSQL 16 + psycopg3, JWT (python-jose) + bcrypt (passlib) + slowapi.

**Инфраструктура** — Docker Compose, порт 8080. Запуск: `docker-compose up -d --build`.

## Ключевые решения

- **Баланс** вычисляется из транзакций (`initial_balance + income - expense ± transfers`), не кешируется
- **Переводы** = две транзакции с `SELECT FOR UPDATE` (атомарность, защита от race condition)
- **Депозиты в цели** создают транзакцию типа `expense` в category `invest-savings`
- **JWT**: access token в React state (не localStorage), refresh token в httpOnly cookie
- **Деньги**: `NUMERIC(14,2)` в БД, `Decimal` в Python — никогда `float`
- **Категории**: системные (`user_id=NULL`) через Alembic-миграции, кастомные через API
- **Переводы**: направление кодируется в имени: `→` (вычет) / `←` (зачисление)
- **Язык UI**: RU/EN через LangContext, хранится в localStorage
- **Password reset**: flow через Resend (`email.py`); требует `RESEND_API_KEY` в env
- `category_group` и `subcategory_id` в транзакциях — денормализованные поля для быстрой аналитики

## Obsidian Knowledge Vault

**Путь**: `/Users/ashot17/Library/Mobile Documents/iCloud~md~obsidian/Documents/Чек`

### При старте сессии

Прочитать: `00-home/index.md` (навигация) и `00-home/текущие-приоритеты.md` (что актуально).

### При команде "сохрани сессию"

1. **Лог** → `sessions/YYYY-MM-DD-название.md` (frontmatter: `tags: [session], date: YYYY-MM-DD`). Включить: что сделано, файлы, решения, открытые вопросы.
2. **Обновить** `00-home/текущие-приоритеты.md` — убрать выполненное, добавить новое.
3. **Решения** → `knowledge/decisions/` если принято архитектурное решение.
4. **Баги** → `knowledge/debugging/` если найден/исправлен баг.
5. **atlas/** — обновить устаревшие заметки если изменилась архитектура/стек.

### Структура vault

`00-home/` · `atlas/` (архитектура, стек, БД, деплой, дизайн) · `knowledge/decisions/` · `knowledge/debugging/` · `knowledge/patterns/` · `knowledge/security/` · `sessions/` · `inbox/`
