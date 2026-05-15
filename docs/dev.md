запускк бэкенда

```
npx prisma migrate dev
```

```angular2html
npm run prisma:seed
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
