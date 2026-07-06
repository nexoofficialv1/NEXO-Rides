#!/data/data/com.termux/files/usr/bin/bash
set -e
cd "$(dirname "$0")"
echo "==============================================="
echo "NEXO Ride - v1.0.53 V54 VPS Deploy Pack + Termux Stable"
echo "==============================================="
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js পাওয়া যায়নি. Installing nodejs..."
  pkg update -y
  pkg install nodejs -y
fi
if ! command -v unzip >/dev/null 2>&1; then
  pkg install unzip -y || true
fi
echo "Checking files..."
test -f package.json || { echo "package.json পাওয়া যায়নি. ভুল folder থেকে চালাচ্ছেন."; exit 1; }
test -f server.js || { echo "server.js পাওয়া যায়নি. ভুল folder থেকে চালাচ্ছেন."; exit 1; }
node --check server.js
node --check web/app/app.js
node --check web/app/sw.js
export HOST=${HOST:-0.0.0.0}
export PORT=${PORT:-3333}
echo ""
echo "Root Page:            http://127.0.0.1:${PORT}/"
echo "Passenger/Driver App: http://127.0.0.1:${PORT}/app/"
echo "Admin Web App:        http://127.0.0.1:${PORT}/app/admin.html"
echo "Sub Admin Web App:    http://127.0.0.1:${PORT}/subadmin/"
echo "Health Check:         http://127.0.0.1:${PORT}/api/health"
echo "KYC Review:           Main Admin > KYC tab"
echo "Release Check:        Main Admin > Launch / Monitor / Security tabs"
echo ""
echo "Termux বন্ধ করবেন না।"
echo "বন্ধ করতে: CTRL + C"
echo ""
node server.js
