# VDS Deploy Runbook (Company Process + Django)

Полная инструкция деплоя двух проектов на одном VDS:

1. `kezarev.ru` -> React + Nest + Postgres
2. `django.kezarev.ru` -> Django + SQLite
3. единый вход через `caddy` на `80/443`

Документ покрывает:

1. запуск с нуля
2. обновление
3. проверку здоровья
4. разбор типовых ошибок, которые уже встретились в этом проекте

---

## 1. Архитектура

Сервисы в `docker compose`:

1. `postgres` — БД для Nest backend
2. `backend` — NestJS API (`:8000` внутри docker сети)
3. `frontend` — Nginx со статикой React, проксирует `/api` в `backend`
4. `django` — Gunicorn + Django (`:8000` внутри docker сети), SQLite в docker volume
5. `caddy` — reverse proxy и TLS, публикует наружу `80/443`

Роутинг:

1. `APP_DOMAIN` -> `frontend:80`
2. `DJANGO_DOMAIN` -> `django:8000`

---

## 2. Что ставить на Ubuntu VDS

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
sudo ufw status numbered
```

---

## 3. DNS

Нужны A-записи на публичный IP VDS:

1. `kezarev.ru`
2. `django.kezarev.ru`

Проверка:

```bash
dig +short kezarev.ru
dig +short django.kezarev.ru
```

---

## 4. Клонирование и первый запуск

```bash
cd /root
git clone <REPO_URL> company-process-mono
cd company-process-mono
cp .env.example .env
nano .env
```

Рекомендуемый `.env`:

```env
APP_DOMAIN=kezarev.ru
DJANGO_DOMAIN=django.kezarev.ru

CORS_ORIGIN=http://kezarev.ru,https://kezarev.ru
VITE_API_URL=/api

POSTGRES_DB=company_process
POSTGRES_USER=company_process
POSTGRES_PASSWORD=<STRONG_PASSWORD>
JWT_SECRET=<LONG_RANDOM_SECRET>

DJANGO_SECRET_KEY=<LONG_RANDOM_SECRET>
DJANGO_DEBUG=0
DJANGO_ALLOWED_HOSTS=django.kezarev.ru,127.0.0.1,localhost
DJANGO_CSRF_TRUSTED_ORIGINS=http://django.kezarev.ru,https://django.kezarev.ru
DJANGO_SESSION_COOKIE_SECURE=0
DJANGO_CSRF_COOKIE_SECURE=0
DJANGO_GUNICORN_WORKERS=3
```

Запуск:

```bash
docker compose up -d --build
docker compose ps
```

---

## 5. Проверка, что всё реально работает

### 5.1 Внешние проверки

```bash
curl -I http://kezarev.ru
curl -I https://kezarev.ru
curl -I http://django.kezarev.ru
curl -I https://django.kezarev.ru
```

### 5.2 Проверка связности внутри docker

```bash
docker compose exec frontend sh -lc 'wget -S -O- --timeout=5 http://backend:8000/api 2>&1 | head -n 40'
docker compose exec caddy sh -lc 'wget -S -O- --timeout=5 http://django:8000 2>&1 | head -n 40'
```

Ожидание:

1. первый запрос обычно `404` или `401` (это нормально, главное не `bad address` и не timeout)
2. второй должен вернуть `200/302`, но не `connection refused`

### 5.3 Логи

```bash
docker compose logs --tail=200 postgres
docker compose logs --tail=200 backend
docker compose logs --tail=200 frontend
docker compose logs --tail=200 django
docker compose logs --tail=200 caddy
```

---

## 6. Тестовые данные Django

В проекте нет git-tracked `db.sqlite3` и нет JSON fixtures по умолчанию.  
Используются management-команды:

```bash
docker compose exec django python manage.py seed_reference_data --cross Lohmann
docker compose exec django python manage.py bootstrap_owner --username owner --password '<PASSWORD>'
docker compose exec django python manage.py seed_demo_data --days 21 --houses 3 --flocks-per-house 2 --managers 2
```

Это создает эталонные справочники, владельца и демо-операционные данные (корпуса, стада, дневные записи, склад, заявки, продажи, инциденты).

---

## 7. Обновление проекта

```bash
cd /root/company-process-mono
git pull
docker compose up -d --build
docker compose ps
```

Если менялся только один сервис:

```bash
docker compose up -d --build --force-recreate django
docker compose up -d --build --force-recreate backend
```

---

## 8. Резервные копии

Postgres:

```bash
docker compose exec -T postgres pg_dump -U company_process company_process > /root/backup-postgres-$(date +%F).sql
```

Django SQLite:

```bash
docker compose exec -T django sh -lc 'cat /app/runtime/db.sqlite3' > /root/backup-django-$(date +%F).sqlite3
```

---

## 9. Частые проблемы и точные фиксы

### 9.1 `POSTGRES_PASSWORD is required`

Симптом:

`docker compose up` падает на интерполяции env.

Причина:

В корне нет `.env` или переменная не задана.

Фикс:

```bash
cp .env.example .env
nano .env
```

---

### 9.2 `failed to read dockerfile: open Dockerfile: no such file or directory`

Симптом:

На сервере не собирается `django`/`backend`/`frontend`.

Причина:

`Dockerfile` есть локально, но не закоммичен/не запушен.

Фикс:

```bash
git add <path-to-dockerfile>
git commit -m "add dockerfile"
git push
```

Потом на сервере:

```bash
git pull
docker compose up -d --build
```

---

### 9.3 Backend в рестарте, `Prisma P1000 Authentication failed`

Симптом:

`backend` циклически рестартуется, в логах `P1000`.

Причина:

Пароль в `.env` не совпадает с тем, с которым был создан volume `postgres_data`.

Фикс 1 (если данные не нужны):

```bash
docker compose down -v
docker compose up -d --build
```

Фикс 2 (если данные нужны):

Вернуть старый `POSTGRES_PASSWORD` в `.env`.

---

### 9.4 `django.kezarev.ru` -> `502 Bad Gateway`

Симптом:

Caddy не достучался до Django.

Причины:

1. Django не слушал `0.0.0.0:8000`
2. контейнер Django не поднялся или упал

Проверка:

```bash
docker compose logs --tail=200 django
docker compose exec caddy sh -lc 'wget -S -O- --timeout=5 http://django:8000 2>&1 | head -n 40'
```

Фикс:

Использовать запуск gunicorn с `--bind 0.0.0.0:8000` (уже заложено в `docker-compose.yml`).

---

### 9.5 Ошибка Django `403 CSRF verification failed` на HTTP

Симптом:

Логин-форма открывается, POST на `/login` возвращает 403.

Причина:

Secure cookies при HTTP (`SESSION_COOKIE_SECURE=True`, `CSRF_COOKIE_SECURE=True`) или не доверенный origin.

Фикс:

В `.env`:

```env
DJANGO_CSRF_TRUSTED_ORIGINS=http://django.kezarev.ru,https://django.kezarev.ru
DJANGO_SESSION_COOKIE_SECURE=0
DJANGO_CSRF_COOKIE_SECURE=0
```

Перезапуск:

```bash
docker compose up -d --force-recreate django
```

Проверка:

```bash
docker compose exec django python manage.py shell -c "from django.conf import settings; print(settings.SESSION_COOKIE_SECURE, settings.CSRF_COOKIE_SECURE, settings.CSRF_TRUSTED_ORIGINS)"
```

---

### 9.6 Почему браузер уводит на HTTPS, хотя нужен HTTP

Симптом:

В браузере переход на `https://...`, хотя `curl -I http://...` дает `200`.

Причина:

HSTS-кэш браузера, не сервер.

Проверка:

```bash
curl -I http://kezarev.ru
curl -I http://django.kezarev.ru
```

Если `curl` не редиректит, сервер настроен правильно.

---

### 9.7 `systemctl status` “замораживает” консоль

Симптом:

Кажется, что терминал завис.

Причина:

Открылся pager (`less`).

Фикс:

Нажать `q` или запускать:

```bash
systemctl --no-pager status <service>
```

---

## 10. Команды быстрого обслуживания

Перезапуск всех сервисов:

```bash
docker compose up -d --build
```

Только поднять без пересборки:

```bash
docker compose up -d
```

Остановить:

```bash
docker compose down
```

Полный сброс с удалением данных:

```bash
docker compose down -v
```

---

## 11. Что не делать

1. не запускать второй Django на хосте через `systemd`, если этот же проект уже работает в compose
2. не открывать наружу `5432`, `8000`, `8001` и другие внутренние порты
3. не коммитить реальный `.env`
