<div align="center">

# Чек

**Веб-приложение для учёта личных финансов**

[![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript_5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![FastAPI](https://img.shields.io/badge/FastAPI_0.116-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker_Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docs.docker.com/compose)
[![Tests](https://img.shields.io/badge/135_tests-passing-22C55E?style=flat-square&logo=pytest&logoColor=white)]()
[![Status](https://img.shields.io/badge/статус-закрыт-8B5CF6?style=flat-square)]()

</div>

---

Учебный проект — персональный финансовый трекер с нуля до продакшена. Несколько счетов, аналитика с прогнозами методом Монте-Карло, цели накоплений с начислением процентов, геймификация. Полный стек: React + FastAPI + PostgreSQL, задеплоен на Docker Compose с Nginx.

## Что реализовано

| | Модуль | Возможности |
|---|---|---|
| 💳 | **Счета** | Наличные, карты, накопительные счета. Переводы между счетами |
| 📝 | **Транзакции** | Доходы, расходы, переводы. 50+ системных категорий + кастомные |
| 📊 | **Аналитика** | Расходы по категориям, тренды по месяцам, прогноз баланса на 7/30 дней |
| 🎯 | **Цели** | Копилки с датой, прогрессом и начислением процентов |
| 🏆 | **Геймификация** | Ежедневный стрик, 22 достижения четырёх уровней редкости, XP |
| 🔐 | **Безопасность** | JWT + httpOnly cookie, rate limiting, security event logging |
| 🌍 | **Локализация** | Интерфейс на русском и английском, сброс пароля по email |

## Технические решения

| Задача | Решение | Зачем |
|---|---|---|
| Денежные значения | `NUMERIC(14,2)` в БД, `Decimal` в Python — никогда `float` | Исключить ошибки округления |
| Переводы | `SELECT FOR UPDATE` на оба счёта внутри одной транзакции | Атомарность при конкурентных запросах |
| Токены | Access в React state, refresh в `httpOnly` cookie | XSS не достаёт до refresh token |
| Баланс | Вычисляется из транзакций, не хранится в БД | Нет рассинхронизации при откате операций |
| Депозиты в копилки | Каждый депозит создаёт транзакцию типа `expense` | Аналитика и история всегда синхронны |
| Категории | Системные — через Alembic-миграции, кастомные — через API | Одинаковый seed во всех окружениях |
| Кеш аналитики | In-process TTL-кеш (300 с) с инвалидацией по `user_id` | Меньше SQL при повторных запросах |
| Геймификация | Стрики и достижения считаются на бэкенде | Единый источник правды, нет drift'а клиента |

## Архитектура

```
Браузер
  └── React SPA  ──  Nginx :8080  (frontend)
                         │
                    /api/v1/* →  FastAPI :8000  (backend, internal)
                                      │
                               PostgreSQL :5432  (db, internal)
```

Три Docker-контейнера. Backend и БД не пробрасывают порты наружу — доступны только через Nginx-прокси. Каждый контейнер с healthcheck.

```
app/src/
├── pages/          # 13 страниц-маршрутов
├── context/        # AuthContext · TransactionsContext · LangContext
├── lib/api.ts      # Все API-вызовы, Bearer-заголовок, авто-logout при 401
└── components/ui/  # 65+ Radix-based UI-компонентов

backend/app/
├── auth/           # JWT, bcrypt, refresh tokens, password reset
├── accounts/       # Счета и переводы (SELECT FOR UPDATE)
├── savings/        # Цели, депозиты, начисление процентов
├── gamification/   # Стрики, 22 достижения, XP
├── analytics/      # Метрики, тренды, Монте-Карло прогноз
└── api/routes/     # REST-эндпоинты
```

## Стек

**Frontend** — React 19 · TypeScript 5.9 · Vite 7 · Tailwind CSS 3.4 · Radix UI · Framer Motion · React Router 7 · React Hook Form + Zod · Recharts

**Backend** — FastAPI 0.116 · SQLAlchemy 2.0 · Alembic · PostgreSQL 16 · psycopg3 · python-jose · passlib[bcrypt] · slowapi

**Инфраструктура** — Docker Compose · Nginx · pytest

## Масштаб проекта

```
135 тестов            16 Alembic-миграций     22 достижения
50+ категорий         13 страниц              65+ UI-компонентов
```

<details>
<summary>Запуск локально</summary>

```bash
git clone https://github.com/LTYcsv/app_Budget.git
cd app_Budget
cp backend/.env.example backend/.env
# заполнить DB_PASSWORD и JWT_SECRET_KEY в backend/.env
docker compose up -d --build
# → http://localhost:8080
```

```env
# backend/.env (минимум)
DB_PASSWORD=your_password
JWT_SECRET_KEY=...   # python -c "import secrets; print(secrets.token_hex(32))"
COOKIE_SECURE=false
```

</details>

---

## Лицензия

© 2025 LTYcsv. Все права защищены.

Исходный код опубликован в ознакомительных целях. Использование, копирование, распространение или развёртывание без письменного разрешения автора запрещено.
