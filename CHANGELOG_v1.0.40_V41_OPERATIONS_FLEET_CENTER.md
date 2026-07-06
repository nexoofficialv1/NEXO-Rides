# NEXO Ride v1.0.40 V41 — Operations + Fleet Center

## Added
- Main Admin panel: **Operations** tab
- Live fleet summary: total, approved, online, offline, idle, busy drivers
- Ride queue monitor for requested/accepted/confirmed/arrived/started rides
- Area-wise demand vs driver availability
- Fleet health alerts for offline approved drivers and document expiry placeholders
- Driver suspend / reactivate / force offline workflow
- New API: `/api/admin/operations`
- Driver action API extended: `suspend`, `reactivate`

## Note
This is still a prototype-ready operational monitor. Real-time refresh, real GPS stream and production database should be used for launch.
