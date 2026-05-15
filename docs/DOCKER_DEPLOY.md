# Docker deploy

Проект запускается как набор контейнеров:

- `postgres` - PostgreSQL 16, данные хранятся в Docker volume `postgres_data`.
- `backend` - NestJS API. При старте выполняет `prisma migrate deploy`, затем запускает `node dist/main`.
- `frontend` - собранный Vite SPA, отдается через Nginx. Nginx также проксирует `/api` в backend.
- `caddy` - внешний reverse proxy. Локально может работать по HTTP, на VDS с доменом автоматически выпускает HTTPS-сертификат.

## Локальный запуск

```bash
cp .env.example .env
# поменяйте POSTGRES_PASSWORD и JWT_SECRET в .env
docker compose up -d --build
```

После запуска:

- приложение: http://localhost
- Swagger: http://localhost/api/docs
- логи backend: `docker compose logs -f backend`
- логи всех сервисов: `docker compose logs -f`

Остановить контейнеры:

```bash
docker compose down
```

Остановить и удалить базу данных:

```bash
docker compose down -v
```

## Настройка `.env`

Для локального запуска:

```env
APP_DOMAIN=:80
CORS_ORIGIN=http://localhost
VITE_API_URL=/api
POSTGRES_DB=company_process
POSTGRES_USER=company_process
POSTGRES_PASSWORD=strong-password
JWT_SECRET=long-random-secret
```

Для VDS с доменом:

```env
APP_DOMAIN=example.com
CORS_ORIGIN=https://example.com
VITE_API_URL=/api
POSTGRES_DB=company_process
POSTGRES_USER=company_process
POSTGRES_PASSWORD=strong-password
JWT_SECRET=long-random-secret
```

`JWT_SECRET` должен быть длинной случайной строкой. Сгенерировать можно так:

```bash
openssl rand -base64 48
```

## Подготовка VDS Ubuntu

Ниже пример для Ubuntu 22.04/24.04/26.04.

1. Обновить систему и поставить базовые утилиты:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl git ufw
```

2. Установить Docker из официального apt-репозитория:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"${UBUNTU_CODENAME:-$VERSION_CODENAME}\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

3. Разрешить текущему пользователю запускать Docker без `sudo`:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

4. Проверить Docker:

```bash
docker --version
docker compose version
docker run --rm hello-world
```

5. Настроить firewall. Для публичного сайта нужны только SSH, HTTP и HTTPS:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Важно: Docker публикует порты через свои iptables-правила. Не публикуйте порт PostgreSQL наружу в `docker-compose.yml`.

## Деплой на VDS

1. Склонировать проект:

```bash
git clone <repo-url>
cd company-process-mono
```

2. Создать `.env`:

```bash
cp .env.example .env
nano .env
```

Для домена укажите:

```env
APP_DOMAIN=example.com
CORS_ORIGIN=https://example.com
```

3. Убедиться, что DNS A-запись домена указывает на IP VDS.

4. Запустить проект:

```bash
docker compose up -d --build
```

5. Проверить статус:

```bash
docker compose ps
docker compose logs -f backend
```

6. Открыть:

```text
https://example.com
https://example.com/api/docs
```

Caddy сам получит и обновит HTTPS-сертификат, если домен уже смотрит на сервер и порты `80/443` открыты.

## Обновление после изменений

```bash
git pull
docker compose up -d --build
```

Если изменились Prisma migrations, backend применит их автоматически командой `prisma migrate deploy` при старте.

## Бэкап PostgreSQL

Создать дамп:

```bash
docker compose exec -T postgres pg_dump -U company_process company_process > backup.sql
```

Восстановить дамп в пустую базу:

```bash
cat backup.sql | docker compose exec -T postgres psql -U company_process company_process
```

Если вы меняли `POSTGRES_USER` или `POSTGRES_DB`, используйте свои значения.

## Что не нужно делать на VDS

- Не ставьте Node.js, npm и PostgreSQL на хост для production-запуска. Они уже внутри контейнеров.
- Не открывайте порт `5432` наружу.
- Не коммитьте настоящий `.env`.
- Не используйте `prisma migrate dev` на сервере. Для production нужен `prisma migrate deploy`.
