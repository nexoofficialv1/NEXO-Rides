#!/usr/bin/env bash
set -e
APP_DIR=/var/www/nexo-ride/current
ZIP_FILE=${1:-/tmp/nexo_ride_latest.zip}

echo "=== Updating NEXO Ride from $ZIP_FILE ==="
if [ ! -f "$ZIP_FILE" ]; then
  echo "ZIP not found: $ZIP_FILE"
  echo "Usage: bash deploy/vps/update_release_vps.sh /path/to/NEXO_Ride.zip"
  exit 1
fi

mkdir -p /tmp/nexo_update
rm -rf /tmp/nexo_update/*
unzip -o "$ZIP_FILE" -d /tmp/nexo_update
NEW_DIR=$(find /tmp/nexo_update -maxdepth 1 -type d -name 'nexo_v*' | head -1)
if [ -z "$NEW_DIR" ]; then
  echo "No nexo_v* folder found inside ZIP"
  exit 1
fi

# Preserve live data and env
mkdir -p "$APP_DIR/data" "$APP_DIR/data/uploads" "$APP_DIR/data/backups"
cp -a "$APP_DIR/data" /tmp/nexo_live_data_$(date +%s) 2>/dev/null || true
cp "$APP_DIR/.env" /tmp/nexo_live_env 2>/dev/null || true

rsync -a --delete --exclude data --exclude .env "$NEW_DIR/" "$APP_DIR/"
if [ -f /tmp/nexo_live_env ]; then cp /tmp/nexo_live_env "$APP_DIR/.env"; fi

cd "$APP_DIR"
node --check server.js
node --check web/app/app.js
node --check web/app/sw.js
pm2 restart nexo-ride || pm2 start deploy/vps/ecosystem.config.cjs
pm2 save

echo "Updated. Check: curl http://127.0.0.1:3333/api/health"
