#!/usr/bin/env bash
set -e
mkdir -p data/uploads data/backups
node --check server.js
node --check web/app/app.js
node --check web/app/sw.js
export NODE_ENV=${NODE_ENV:-production}
export HOST=${HOST:-127.0.0.1}
export PORT=${PORT:-3333}
export DATA_DIR=${DATA_DIR:-./data}
export UPLOAD_DIR=${UPLOAD_DIR:-./data/uploads}
export SERVER_URL=${SERVER_URL:-https://ride.nexoofficial.in}
node server.js
