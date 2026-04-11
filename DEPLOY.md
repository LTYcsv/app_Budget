# Деплой

## Требования

- Ubuntu / Debian
- Открытый порт `8080`

---

## Этап 1 — Запуск по IP

### 1. Установить Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Клонировать репо

```bash
git clone https://github.com/LTYcsv/app_Budget.git
cd app_Budget
```

### 3. Создать `.env`

```bash
cp .env.example .env
nano .env
```

Заполнить:

```env
DB_PASSWORD=придумай_сильный_пароль
JWT_SECRET_KEY=<вывод_команды_ниже>
COOKIE_SECURE=false
```

Сгенерировать `JWT_SECRET_KEY`:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 4. Запустить

```bash
docker compose up -d --build
```

Первый запуск ~3-5 минут (скачивает образы, билдит фронт и бэкенд).

### 5. Проверить

```bash
docker compose ps
```

Все три контейнера (`db`, `backend`, `frontend`) должны быть со статусом `healthy`.

Приложение доступно по адресу: `http://IP_СЕРВЕРА:8080`

---

## Этап 2 — Домен + SSL (нужен для мобильного приложения)

### 6. Купить домен (~$10/год)

Подойдёт любой регистратор: Namecheap, Cloudflare, reg.ru и др.

### 7. Направить домен на IP сервера

В DNS-настройках домена добавить A-запись:

```
@ → IP_СЕРВЕРА
```

### 8. Установить Caddy

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

Создать `/etc/caddy/Caddyfile`:

```
yourdomain.com {
    reverse_proxy localhost:8080
}
```

Запустить:

```bash
sudo systemctl reload caddy
```

Caddy автоматически получит SSL-сертификат через Let's Encrypt.

### 9. Включить COOKIE_SECURE

```bash
nano .env
```

```env
COOKIE_SECURE=true
```

Перезапустить:

```bash
docker compose up -d
```

Приложение доступно по `https://yourdomain.com`

---

## Полезные команды

```bash
# Посмотреть статус контейнеров
docker compose ps

# Логи всех контейнеров
docker compose logs -f

# Логи конкретного контейнера
docker compose logs -f backend

# Перезапустить
docker compose restart

# Остановить
docker compose down

# Полный сброс (удаляет данные БД)
docker compose down -v
```
