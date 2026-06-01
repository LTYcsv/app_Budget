<div align="center">

# Чек

**Веб-приложение для учёта личных финансов**

[![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript_5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![FastAPI](https://img.shields.io/badge/FastAPI_0.116-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker_Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docs.docker.com/compose)
[![Tests](https://img.shields.io/badge/135_tests-passing-4CAF50?style=flat-square&logo=pytest&logoColor=white)](https://pytest.org)

[**→ чек.site**](https://чек.site)

</div>

---

Production-ready финансовый трекер с аналитикой, прогнозами баланса, целями накоплений и геймификацией. Типизированный код на всех уровнях, атомарные операции с БД, JWT-аутентификация с httpOnly cookie, одна команда для запуска.

## Возможности

**Счета и транзакции**
- Несколько счетов: наличные, карты, накопительные
- Доходы, расходы и переводы между счетами с защитой от race condition
- 50+ системных категорий + создание своих

**Аналитика**
- Сводка по периоду, расходы по категориям и группам
- Тренды по месяцам с графиками (Recharts)
- Прогноз баланса на 7 и 30 дней методом Монте-Карло

**Цели и накопления**
- Копилки с целевой суммой, датой и прогрессом
- Начисление процентов, история пополнений
- Каждый депозит создаёт транзакцию → аналитика всегда синхронна

**Геймификация**
- Ежедневный стрик (серия дней с транзакциями)
- 22 достижения четырёх уровней редкости: common / rare / epic / legendary
- XP-система с учётом стрика и достижений — всё на бэкенде

**Прочее**
- Сброс пароля по email (Resend)
- Интерфейс на русском и английском (LangContext)
- Security event logging, rate limiting (slowapi)

## Стек

| Уровень | Технологии |
|---|---|
| **Frontend** | React 19, TypeScript 5.9, Vite 7 |
| **UI** | Tailwind CSS 3.4, Radix UI (30+ компонентов), Framer Motion |
| **Формы / валидация** | React Hook Form, Zod |
| **Графики** | Recharts |
| **Backend** | FastAPI 0.116, SQLAlchemy 2.0, Alembic |
| **База данных** | PostgreSQL 16, psycopg3 |
| **Безопасность** | python-jose (JWT), passlib[bcrypt], slowapi |
| **Инфраструктура** | Docker Compose, Nginx, pytest |

## Технические решения

| Задача | Решение | Зачем |
|---|---|---|
| Денежные значения | `NUMERIC(14,2)` в БД, `Decimal` в Python — никогда `float` | Float-ошибки округления недопустимы |
| Переводы | `SELECT FOR UPDATE` на оба счёта в одной транзакции | Атомарность при конкурентных запросах |
| Токены | Access token в React state, refresh в `httpOnly` cookie | XSS-атака не достаёт refresh token |
| Баланс | Вычисляется из транзакций, не хранится в БД | Нет рассинхронизации при откате операции |
| Категории | Системные — через Alembic-миграции, кастомные — через API | Одинаковый seed во всех окружениях |
| Аналитика | In-process TTL-кеш (300 с) с инвалидацией по `user_id` | Меньше SQL-запросов при повторных обращениях |
| Геймификация | Стрики и достижения считаются на бэкенде | Единый источник правды, нет drift'а клиента |

## Быстрый старт

```bash
git clone https://github.com/LTYcsv/app_Budget.git
cd app_Budget

# Заполнить переменные окружения
cp backend/.env.example backend/.env
# Отредактировать backend/.env: DB_PASSWORD и JWT_SECRET_KEY

# Запустить
docker compose up -d --build
```

Приложение откроется на [localhost:8080](http://localhost:8080).

<details>
<summary>Минимальный backend/.env</summary>

```env
DATABASE_URL=postgresql+psycopg://postgres:your_password@db:5432/finflow
DB_PASSWORD=your_password
JWT_SECRET_KEY=<64 символа hex>
COOKIE_SECURE=false
```

Сгенерировать JWT ключ:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

</details>

## Архитектура

```
Браузер
  └── React SPA  ──  Nginx :8080  (frontend-контейнер)
                         │
                    /api/v1/* →  FastAPI :8000  (backend-контейнер, internal)
                                      │
                               PostgreSQL :5432  (db-контейнер, internal)
```

Backend и БД не пробрасывают порты наружу — доступны только через Nginx-прокси внутри Docker-сети.

## Структура проекта

```
app/src/
├── pages/           # 13 страниц (маршруты)
├── context/         # AuthContext · TransactionsContext · LangContext
├── lib/api.ts       # Все API-вызовы: Bearer-заголовок, авто-logout при 401
└── components/ui/   # 65+ Radix-based компонентов

backend/app/
├── auth/            # JWT, bcrypt, refresh tokens, password reset
├── accounts/        # Счета и переводы (SELECT FOR UPDATE)
├── savings/         # Цели, депозиты, начисление процентов
├── gamification/    # Стрики, 22 достижения, XP
├── analytics/       # Метрики, тренды, Монте-Карло прогноз
└── api/routes/      # REST-эндпоинты

alembic/versions/    # 16 миграций: от начальной схемы до auth_security
```

## Тесты

```bash
docker compose exec backend pytest
# 135 passed
```

Покрытие: auth flow, транзакции, счета и переводы, аналитика, геймификация, копилки, категории, удаление транзакций.

---

## Лицензия

© 2025 LTYcsv. Все права защищены.

Исходный код опубликован в ознакомительных целях. Использование, копирование, распространение или развёртывание без письменного разрешения автора запрещено.
