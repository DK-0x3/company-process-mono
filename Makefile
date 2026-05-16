COMPOSE := docker compose

.PHONY: help up build restart rebuild down stop ps logs logs-backend logs-frontend logs-caddy logs-postgres

help:
	@echo "Available targets:"
	@echo "  make up             - start containers in background"
	@echo "  make build          - build images and start containers"
	@echo "  make restart        - rebuild and restart all services"
	@echo "  make rebuild        - stop, remove, then rebuild and start"
	@echo "  make down           - stop and remove containers"
	@echo "  make stop           - stop containers without removing"
	@echo "  make ps             - show container status"
	@echo "  make logs           - follow logs for all services"
	@echo "  make logs-backend   - follow backend logs"
	@echo "  make logs-frontend  - follow frontend logs"
	@echo "  make logs-caddy     - follow caddy logs"
	@echo "  make logs-postgres  - follow postgres logs"

up:
	$(COMPOSE) up -d

build:
	$(COMPOSE) up -d --build

restart:
	$(COMPOSE) up -d --build

rebuild:
	$(COMPOSE) down
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

stop:
	$(COMPOSE) stop

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs -f

logs-backend:
	$(COMPOSE) logs -f backend

logs-frontend:
	$(COMPOSE) logs -f frontend

logs-caddy:
	$(COMPOSE) logs -f caddy

logs-postgres:
	$(COMPOSE) logs -f postgres
