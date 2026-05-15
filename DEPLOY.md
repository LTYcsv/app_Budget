# Deploy

## Requirements

- Ubuntu 22.04 / Debian 12 or newer
- Open port `8080` (or `443` if using domain + SSL)
- At least 1 GB RAM

---

## Stage 1 — Run by IP

### 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Clone the repo

```bash
git clone https://github.com/LTYcsv/app_Budget.git
cd app_Budget
```

### 3. Create `.env`

```bash
cp .env.example .env
nano .env
```

Required variables:

```env
DB_PASSWORD=strong_password_here
JWT_SECRET_KEY=<see generation command below>
COOKIE_SECURE=false
```

Optional:

```env
DB_USER=postgres          # defaults to postgres
RESEND_API_KEY=re_xxx     # required for password-reset emails
```

Generate `JWT_SECRET_KEY`:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

> **Note:** `RESEND_API_KEY` is only required for the password-reset feature.
> The app works fully without it.

### 4. Start

```bash
docker compose up -d --build
```

First build takes ~3–5 minutes (pulls images, builds frontend and backend).

### 5. Verify

```bash
docker compose ps
```

All three containers (`db`, `backend`, `frontend`) should show status `healthy`.

App is available at: `http://YOUR_SERVER_IP:8080`

---

## Stage 2 — Domain + SSL

Required for HTTPS (and secure cookies in production).

### 6. Point your domain to the server

Add an A record in your DNS settings:

```
@  →  YOUR_SERVER_IP
```

### 7. Open firewall ports

```bash
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 8080
```

### 8. Install Caddy

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

Create `/etc/caddy/Caddyfile`:

```
yourdomain.com {
    reverse_proxy localhost:8080
}
```

Start Caddy:

```bash
sudo systemctl enable --now caddy
```

Caddy automatically obtains an SSL certificate via Let's Encrypt.

### 9. Enable secure cookies

```bash
nano .env
```

```env
COOKIE_SECURE=true
```

Restart the app:

```bash
docker compose up -d
```

App is available at: `https://yourdomain.com`

---

## Updating the app

```bash
git pull
docker compose up -d --build
```

This rebuilds changed images and replaces containers with zero data loss.
The database volume (`finflow_pg_data`) is preserved between updates.

---

## Useful commands

```bash
# Container status
docker compose ps

# All logs (follow)
docker compose logs -f

# Specific container logs
docker compose logs -f backend

# Restart one container
docker compose restart backend

# Stop everything
docker compose down

# Full reset — WARNING: deletes all database data
docker compose down -v

# Run Alembic migrations manually
docker compose exec backend alembic upgrade head

# Run tests
docker compose exec backend pytest -v
```
