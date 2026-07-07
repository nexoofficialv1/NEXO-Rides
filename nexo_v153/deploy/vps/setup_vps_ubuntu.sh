#!/usr/bin/env bash
set -e
APP_DIR=/var/www/nexo-ride/current
DOMAIN=ride.nexoofficial.in
PORT=3333

echo "=== NEXO Ride VPS setup for $DOMAIN ==="

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run with sudo/root: sudo bash deploy/vps/setup_vps_ubuntu.sh"
  exit 1
fi

apt update -y
apt install -y curl unzip nginx certbot python3-certbot-nginx

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi

if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

mkdir -p /var/www/nexo-ride/current
mkdir -p /var/log/nexo-ride
mkdir -p "$APP_DIR/data/uploads" "$APP_DIR/data/backups"
chmod -R 755 /var/www/nexo-ride

cd "$APP_DIR"
node --check server.js
node --check web/app/app.js
node --check web/app/sw.js

# Start/restart PM2
pm2 delete nexo-ride 2>/dev/null || true
pm2 start deploy/vps/ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root || true

# Nginx config
cp deploy/vps/nginx_ride.nexoofficial.in.conf /etc/nginx/sites-available/ride.nexoofficial.in
ln -sf /etc/nginx/sites-available/ride.nexoofficial.in /etc/nginx/sites-enabled/ride.nexoofficial.in
nginx -t
systemctl reload nginx

echo "Local health check:"
sleep 2
curl -s "http://127.0.0.1:${PORT}/api/health" || true

echo ""
echo "Next: make sure DNS A record ride.nexoofficial.in points to this VPS IP."
echo "Then run: sudo certbot --nginx -d ride.nexoofficial.in"
echo "Public URL: https://ride.nexoofficial.in/app/"
