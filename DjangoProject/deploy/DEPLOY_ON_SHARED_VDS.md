# Deploy Django as second project on shared VDS

Сценарий: текущий `company-process` уже работает в Docker, публичные 80/443 обслуживает контейнер `caddy`.
Этот Django проект запускается без Docker через `gunicorn` + `systemd` на хосте, а Caddy проксирует на `127.0.0.1:8001`.

## 1. DNS

Создайте A-запись:

- `app2.example.com -> <PUBLIC_IP>`

## 2. Подготовка проекта на VDS

```bash
cd ~/company-process-mono/DjangoProject
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip wheel
pip install -r requirements.txt
```

## 3. Production env

```bash
cp deploy/.env.example .env
nano .env
```

Пример:

```env
DJANGO_SECRET_KEY=replace-with-long-random-secret
DJANGO_DEBUG=0
DJANGO_ALLOWED_HOSTS=app2.example.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://app2.example.com
SQLITE_PATH=/opt/smartpoultry/db.sqlite3
```

Если проект лежит не в `/opt/smartpoultry`, укажите актуальный путь в `SQLITE_PATH`.

## 4. Миграции и статика

```bash
./.venv/bin/python manage.py migrate
./.venv/bin/python manage.py collectstatic --noinput
./.venv/bin/python manage.py check --deploy
```

## 5. Systemd service (gunicorn)

1. Откройте шаблон `deploy/gunicorn.service`.
2. Проверьте пути:
- `WorkingDirectory`
- `EnvironmentFile`
- `ExecStart` (путь к `.venv/bin/gunicorn`)

Установка:

```bash
sudo cp deploy/gunicorn.service /etc/systemd/system/smartpoultry.service
sudo systemctl daemon-reload
sudo systemctl enable --now smartpoultry
sudo systemctl status smartpoultry
```

Логи:

```bash
journalctl -u smartpoultry -f
```

## 6. Подключение через существующий Docker Caddy

В корневом `Caddyfile` проекта `company-process-mono` добавьте новый site block.
Используйте `deploy/caddy.smartpoultry.docker.conf` как шаблон:

```caddy
app2.example.com {
    encode zstd gzip
    reverse_proxy host.docker.internal:8001
}
```

Важно: в `docker-compose.yml` для сервиса `caddy` уже добавлен
`extra_hosts: ["host.docker.internal:host-gateway"]`, чтобы контейнер видел host-сервис.

Применить конфиг Caddy:

```bash
cd ~/company-process-mono
docker compose up -d caddy
docker compose logs -f caddy
```

## 7. Проверка

- `https://app2.example.com` открывается
- `journalctl -u smartpoultry -f` без ошибок
- `docker compose logs -f caddy` без TLS/proxy ошибок

## 8. Обновление приложения

```bash
cd ~/company-process-mono
git pull

cd DjangoProject
source .venv/bin/activate
pip install -r requirements.txt
./.venv/bin/python manage.py migrate
./.venv/bin/python manage.py collectstatic --noinput

sudo systemctl restart smartpoultry
sudo systemctl status smartpoultry
```

## 9. SQLite backup

```bash
mkdir -p ~/backups/smartpoultry
cp /opt/smartpoultry/db.sqlite3 ~/backups/smartpoultry/db-$(date +%F-%H%M).sqlite3
```
