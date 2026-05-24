# Unified Docker deploy (Company Process + Django)

Подробный пошаговый runbook с troubleshooting:

- [VDS_DEPLOY_RUNBOOK.md](VDS_DEPLOY_RUNBOOK.md)

Этот репозиторий разворачивает два проекта в одном `docker compose`:

- `company-process` (frontend + backend + postgres)
- `DjangoProject` (gunicorn + sqlite)
- `caddy` как единая точка входа на `80/443`

## Сервисы

- `postgres` — база для Nest backend.
- `backend` — NestJS API, при старте делает `prisma migrate deploy`.
- `frontend` — Nginx со статикой Vite и proxy `/api` в backend.
- `django` — Django + gunicorn (sqlite в volume).
- `caddy` — reverse proxy и TLS.

## Входные домены

- `${APP_DOMAIN}` -> `frontend`
- `${DJANGO_DOMAIN}` -> `django`

Пример:

- `app.example.com` -> company process
- `django.example.com` -> Django

## 1) Подготовка VDS Ubuntu (с нуля)

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl git ufw

sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"${UBUNTU_CODENAME:-$VERSION_CODENAME}\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker $USER
newgrp docker
```

Проверка:

```bash
docker --version
docker compose version
```

Firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

## 2) DNS

Создайте A-записи на IP сервера:

- `app.example.com`
- `django.example.com`

## 3) Клонирование проекта

```bash
git clone <repo-url>
cd company-process-mono
```

## 4) Настройка `.env`

```bash
cp .env.example .env
nano .env
```

Минимум для production:

```env
APP_DOMAIN=app.example.com
DJANGO_DOMAIN=django.example.com

CORS_ORIGIN=https://app.example.com
VITE_API_URL=/api

POSTGRES_DB=company_process
POSTGRES_USER=company_process
POSTGRES_PASSWORD=strong-postgres-password
JWT_SECRET=long-random-secret

DJANGO_SECRET_KEY=long-random-secret
DJANGO_DEBUG=0
DJANGO_ALLOWED_HOSTS=django.example.com,127.0.0.1,localhost
DJANGO_CSRF_TRUSTED_ORIGINS=https://django.example.com,http://127.0.0.1
DJANGO_GUNICORN_WORKERS=3
```

Генерация секретов:

```bash
openssl rand -base64 48
```

## 5) Первый запуск

```bash
docker compose up -d --build
```

Проверка:

```bash
docker compose ps
docker compose logs -f caddy
docker compose logs -f backend
docker compose logs -f django
```

## 6) Доступ

- `https://app.example.com`
- `https://app.example.com/api/docs`
- `https://django.example.com`

## 7) Обновление после изменений

```bash
git pull
docker compose up -d --build
```

Обновление определенного контейнера
```bash
docker compose up -d --build [название контейнера]
```

Добавить тестовые данныя для проекта Django
```bash
docker compose exec django python manage.py seed_demo_data --days 30 --end-date 2026-05-29
```

## 8) Остановка

```bash
docker compose down
```

С удалением данных БД/SQLite volumes:

```bash
docker compose down -v
```

## 9) Бэкапы

Postgres (Nest backend):

```bash
docker compose exec -T postgres pg_dump -U company_process company_process > backup-postgres.sql
```

SQLite (Django):

```bash
docker compose exec -T django sh -lc 'cp /app/runtime/db.sqlite3 /tmp/db.sqlite3 && cat /tmp/db.sqlite3' > backup-django.sqlite3
```

## 10) Важные замечания

- Не открывайте наружу порты `5432`, `8000`, `8001` и т.д. Снаружи нужны только `80/443`.
- Не запускайте Django на хосте через `systemd`, если используете этот unified compose.
- Не коммитьте реальный `.env`.
