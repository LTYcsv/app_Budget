# Техническая спецификация — Чек (FinFlow)

## 1. Стек и версии

| Слой | Технология | Версия |
|------|-----------|--------|
| Frontend framework | React + TypeScript | 18 + 5 |
| Build tool | Vite | latest |
| Styling | Tailwind CSS | 3 |
| Animations | Framer Motion | latest |
| Routing | React Router | v6 |
| Backend | FastAPI | 0.116.1 |
| ORM | SQLAlchemy | 2.0.36 |
| Migrations | Alembic | 1.14.0 |
| Database | PostgreSQL | 16 |
| Auth | python-jose + passlib[bcrypt] | 3.3.0 + 1.7.4 |
| Container | Docker Compose | — |

## 2. Переменные окружения

### backend/.env (не в git)
```
DATABASE_URL=postgresql+psycopg://postgres:postgres@db:5432/finflow
JWT_SECRET_KEY=<случайная строка 64 символа>
```

### Опционально в .env
```
CORS_ORIGINS=http://localhost:8080,https://yourdomain.com
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30
```

### Frontend (через docker-compose args)
```
VITE_API_BASE_URL=/api/v1
```

## 3. API эндпоинты

### Auth
| Метод | Путь | Описание |
|-------|------|----------|
| POST | /api/v1/auth/register | Регистрация → {access_token} |
| POST | /api/v1/auth/login | Логин → {access_token} |
| POST | /api/v1/auth/refresh | Обновление токена (из httpOnly cookie) |
| POST | /api/v1/auth/logout | Удаление refresh cookie |
| GET | /api/v1/auth/me | {id, email, created_at} |

### Bootstrap
| Метод | Путь | Описание |
|-------|------|----------|
| GET | /api/v1/bootstrap | {transactions, categories} текущего юзера |

### Транзакции
| Метод | Путь | Описание |
|-------|------|----------|
| GET | /api/v1/transactions | Список транзакций юзера |
| POST | /api/v1/transactions | Создать транзакцию |
| PUT | /api/v1/transactions/{id} | Обновить транзакцию |
| DELETE | /api/v1/transactions/{id} | Удалить транзакцию |

### Категории (глобальные)
| Метод | Путь | Описание |
|-------|------|----------|
| GET | /api/v1/categories | {expense: [...], income: [...]} |
| POST | /api/v1/categories/{type} | Создать кастомную категорию |
| DELETE | /api/v1/categories/{type}/{id} | Удалить кастомную категорию |

### Счета
| Метод | Путь | Описание |
|-------|------|----------|
| GET | /api/v1/accounts | Счета юзера |
| POST | /api/v1/accounts | Создать счёт |
| PUT | /api/v1/accounts/{id} | Обновить счёт |
| DELETE | /api/v1/accounts/{id} | Удалить счёт |
| POST | /api/v1/accounts/transfer | Перевод между счетами |

### Копилки
| Метод | Путь | Описание |
|-------|------|----------|
| GET | /api/v1/savings | {active: [...], completed: [...]} |
| POST | /api/v1/savings | Создать цель |
| DELETE | /api/v1/savings/{id} | Удалить цель |
| POST | /api/v1/savings/{id}/complete | Завершить цель |
| POST | /api/v1/savings/{id}/deposits | Пополнить копилку |
| GET | /api/v1/savings/{id}/deposits | История пополнений |

### Аналитика
| Метод | Путь | Описание |
|-------|------|----------|
| GET | /api/v1/analytics/summary | {income, expense, balance, savings_rate} |
| GET | /api/v1/analytics/category-spend | Расходы по категориям |
| GET | /api/v1/analytics/category-trends | Тренды по категориям |
| GET | /api/v1/analytics/dashboard | Сводка за период |
| GET | /api/v1/analytics/predictive | Прогноз 7d/30d |

### Геймификация
| Метод | Путь | Описание |
|-------|------|----------|
| GET | /api/v1/gamification | {streak_current, streak_best, achievements[]} |

### System
| Метод | Путь | Описание |
|-------|------|----------|
| GET | /health | {status: "ok"} — используется для healthcheck |

## 4. Схемы авторизации

### JWT payload (access token)
```json
{"sub": "user_id", "type": "access", "exp": 1234567890}
```

### JWT payload (refresh token)
```json
{"sub": "user_id", "type": "refresh", "exp": 1234567890}
```

### Заголовок запроса
```
Authorization: Bearer <access_token>
```

## 5. Tailwind CSS переменные (тёмная тема)

```css
--primary: #6366F1
--primary-light: #818CF8
--secondary: #EC4899
--accent: #22D3EE
--success: #10B981
--warning: #F59E0B
--error: #EF4444
--bg-primary: #0F0F1A
--bg-secondary: #1A1A2E
--bg-tertiary: #252542
--text-primary: #FFFFFF
--text-secondary: #A1A1AA
--text-tertiary: #71717A
--text-muted: #52525B
```

## 6. Фронтенд — ключевые паттерны

### Авторизация
```
AuthProvider → хранит token в localStorage
AuthGate → редиректит на /login если !isAuthenticated
setAuthHandlers → инициализирует api.ts с getToken и onUnauthorized
```

### Авто-refresh токена
```
При mount: читаем exp из JWT payload
Ставим setTimeout за 2 мин до истечения
При срабатывании: POST /auth/refresh с credentials:'include'
Получаем новый access_token → login(newToken)
При ошибке → logout()
```

### API вызовы
```typescript
// Все запросы через api.ts
// Автоматически добавляет Authorization header
// При 401 → вызывает onUnauthorized (logout)
// Таймаут 10 секунд
api.getBootstrap()
api.createTransaction(payload)
api.getMe()
// и т.д.
```

### TransactionsContext
```
Загружает транзакции и категории через bootstrap
Предоставляет: transactions, categories, isLoading, error, refresh()
refresh() — перезагружает данные (нужен после создания депозита)
```

## 7. База данных — важные детали

- `Transaction.amount` — тип Decimal (не float!)
- `Category.id` — строковый (например: 'food-supermarket', 'cat-expense-abc123')
- Категории пользователя начинаются с 'cat-', дефолтные — нет
- `SavingsDeposit` при удалении транзакции — откатывает `current_amount` копилки
- `created_at` — timezone-aware UTC

## 8. Docker Compose — порты

| Сервис | Внутренний | Внешний |
|--------|-----------|---------|
| PostgreSQL | 5432 | 5432 |
| Backend (FastAPI) | 8000 | 8000 |
| Frontend (nginx) | 80 | 8080 |

## 9. Именование файлов модулей

Все модули используют стандартное именование:
- `backend/app/accounts/router.py` (не accounts_router.py)
- `backend/app/accounts/service.py` (не accounts_service.py)
- `backend/app/savings/router.py`
- `backend/app/savings/service.py`
- `backend/app/gamification/router.py`
- `backend/app/gamification/service.py`

## 10. Производительность и ограничения MVP

- Predictive кэш: process-local, TTL 6h (сбрасывается при рестарте)
- Monte Carlo: синхронный (приемлемо для MVP)
- Нет Redis, нет Celery
- Нет rate limiting
- Нет email-верификации