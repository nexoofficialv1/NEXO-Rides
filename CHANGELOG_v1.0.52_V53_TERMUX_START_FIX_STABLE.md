# NEXO Ride v1.0.52 V53 — Termux Start Fix Stable

This is a stability patch over V52.

## Fixed
- Fixed broken `start_termux.sh` echo quote issue.
- Fixed Termux startup failure: `Passenger/Driver: No such file or directory`.
- Startup banner now prints clean app/admin/health URLs.
- Preserved V52 stable KYC + full ride flow features.

## Validation
- `node --check server.js`
- `node --check web/app/app.js`
- `node --check web/app/sw.js`
- Health endpoint test on local port.
