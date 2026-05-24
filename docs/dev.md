запускк бэкенда

```
npx prisma migrate dev
```

```angular2html
npm run prisma:seed
```

```bash
# Большой объем связных тестовых данных (backend)
# Параметры: BULK_SCALE=3..10, BULK_RUN_TAG=любая_метка
BULK_SCALE=4 BULK_RUN_TAG=demo1 npm run prisma:seed:bulk
```

```bash
# То же самое в docker-compose окружении
docker compose run --rm --no-deps backend sh -lc "npm ci --include=dev && BULK_SCALE=4 BULK_RUN_TAG=demo1 npm run prisma:seed:bulk"
```

```bash
# Реалистичные данные для компании (много связных сущностей)
# BULK_SCALE влияет на объем (3-10 обычно достаточно)
docker compose run --rm --no-deps backend sh -lc "npm ci --include=dev && BULK_SCALE=6 BULK_OWNER_LOGIN=admin BULK_OWNER_EMAIL=admin@mail.com BULK_DEFAULT_PASSWORD=123456 npm run prisma:seed:bulk"
```

```bash
# Важно: этот сидер очищает данные owner (admin) и создает новый реалистичный демо-набор
```

```angular2html
npm run start
```

## Docker Compose через Makefile

Команды запускать из корня проекта `company-process-mono`.

```bash
make restart
```
Пересобирает образы и перезапускает все сервисы (`docker compose up -d --build`).

```bash
make up
```
Поднимает контейнеры без пересборки (`docker compose up -d`).

```bash
make ps
```
Показывает статус контейнеров.

```bash
make logs
```
Показывает логи всех сервисов в режиме follow.

```bash
make logs-backend
```
Показывает только логи backend.

```bash
make logs-frontend
```
Показывает только логи frontend.

```bash
make logs-caddy
```
Показывает только логи caddy.

```bash
make logs-postgres
```
Показывает только логи postgres.

```bash
make down
```
Останавливает и удаляет контейнеры.

```bash
make rebuild
```
Полный цикл: `down` + `up -d --build`.
