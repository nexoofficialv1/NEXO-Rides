#!/usr/bin/env bash
set -e
curl -s http://127.0.0.1:3333/api/health | python3 -m json.tool || curl -s http://127.0.0.1:3333/api/health
printf "
Public check:
"
curl -I https://ride.nexoofficial.in/api/health || true
