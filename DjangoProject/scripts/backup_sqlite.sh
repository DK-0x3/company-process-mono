#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/opt/smartpoultry"
BACKUP_DIR="/opt/smartpoultry/backups"
DB_FILE="$PROJECT_DIR/db.sqlite3"
TS="$(date +%Y%m%d_%H%M%S)"

mkdir -p "$BACKUP_DIR"
cp "$DB_FILE" "$BACKUP_DIR/db_${TS}.sqlite3"
find "$BACKUP_DIR" -type f -name "db_*.sqlite3" -mtime +14 -delete
