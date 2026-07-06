#!/usr/bin/env bash
set -e
APP_DIR=/var/www/nexo-ride/current
BACKUP_ROOT=/var/backups/nexo-ride
TS=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_ROOT"
cd "$APP_DIR"

tar -czf "$BACKUP_ROOT/nexo_ride_data_$TS.tar.gz" data .env 2>/dev/null || tar -czf "$BACKUP_ROOT/nexo_ride_data_$TS.tar.gz" data

echo "Backup created: $BACKUP_ROOT/nexo_ride_data_$TS.tar.gz"
ls -lh "$BACKUP_ROOT/nexo_ride_data_$TS.tar.gz"
