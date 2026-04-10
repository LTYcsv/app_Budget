# CLAUDE.md — Чек (app_Budget)

## Проект

Приложение для учёта личных финансов

## Стек

### Frontend (`app/`)
- React 19 + TypeScript 5.9 + Vite 7
- Tailwind CSS 3.4 + Radix UI (headless) + Framer Motion
- React Router DOM 7, React Hook Form + Zod, Recharts
- Состояние: Context API (AuthContext, TransactionsContext, LangContext)

### Backend (`backend/`)
- FastAPI + Uvicorn + SQLAlchemy 2.0 + Alembic
- PostgreSQL 16, psycopg3
- JWT (python-jose) + bcrypt (passlib) + slowapi (rate limiting)

### Инфраструктура
- Docker Compose: 3 контейнера (frontend/backend/db)
- Nginx как reverse proxy, единственный публичный порт — 8080
- `docker-compose up -d --build` — полный запуск

## Структура проекта

```
app/src/
  pages/        # 11 страниц (Dashboard, Analytics, Accounts, Goals, ...)
  components/   # Бизнес-компоненты + ui/ (65 Radix-based)
  context/      # AuthContext, TransactionsContext, LangContext
  lib/          # api.ts, i18n.ts, utils.ts

backend/app/
  auth/         # JWT, refresh tokens, bcrypt
  accounts/     # Счета, переводы
  savings/      # Цели накопления, депозиты, прогноз
  gamification/ # Стрики, достижения
  analytics/    # Метрики, тренды, Monte Carlo прогноз
  models.py     # SQLAlchemy ORM (8 таблиц)
  services.py   # Бизнес-логика транзакций и категорий
```

## Ключевые решения

- **Баланс** вычисляется из транзакций (`initial_balance + income - expense ± transfers`), не кешируется
- **Переводы** = две транзакции с `SELECT FOR UPDATE` (атомарность, защита от race condition)
- **Депозиты в цели** создают транзакцию типа `expense` в category `invest-savings`
- **JWT**: access token в React state (не localStorage), refresh token в httpOnly cookie
- **Деньги**: `NUMERIC(14,2)`, никогда `FLOAT`
- **Категории**: системные (`user_id=NULL`) через Alembic-миграции, кастомные через API

## Важные детали

- Все суммы — `Decimal`, не `float`
- `category_group` и `subcategory_id` в транзакциях — денормализованные поля для быстрой аналитики
- Направление перевода кодируется в имени: `→` (вычет) / `←` (зачисление)
- Язык UI: RU/EN, переключается через LangContext, хранится в localStorage
- **Незавершено**: password reset email (токен генерируется, отправка не подключена — `auth/router.py:212,219`)

---

## Obsidian Knowledge Vault

**Путь**: `/Users/ashot17/Library/Mobile Documents/iCloud~md~obsidian/Documents/Чек`

### При старте сессии

Прочитать два файла для контекста:

```
00-home/index.md            — навигация по всей базе знаний
00-home/текущие-приоритеты.md — что актуально прямо сейчас
```

### При команде "сохрани сессию"

1. **Создать лог** в `sessions/YYYY-MM-DD-название.md` с frontmatter:
   ```yaml
   ---
   tags: [session]
   date: YYYY-MM-DD
   ---
   ```
   Включить: что сделано, какие файлы изменены, ключевые решения, открытые вопросы.

2. **Обновить** `00-home/текущие-приоритеты.md` — убрать выполненное, добавить новое.

3. **Зафиксировать решения** в `knowledge/decisions/` если было принято архитектурное решение.

4. **Зафиксировать баги** в `knowledge/debugging/` если был найден и/или исправлен баг.

5. **Обновить** любые устаревшие заметки в `atlas/` если изменилась архитектура/стек.

### Структура vault

```
00-home/          index.md, текущие-приоритеты.md
atlas/            архитектура, стек, база-данных, деплой, дизайн-система
knowledge/
  decisions/      архитектурные решения с обоснованием
  debugging/      баги и решения
  patterns/       паттерны кода и бизнес-логики
  security/       уязвимости и исправления
sessions/         логи сессий
inbox/            необработанные заметки
```
