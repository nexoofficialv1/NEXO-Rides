# NEXO Ride v1.0.43 V44 — Database Migration + Backup Center

## Added
- Main Admin Data tab upgraded to Database Migration + Backup Center.
- PostgreSQL migration readiness checklist.
- Database collections/table overview with row counts.
- Migration dry-run snapshot action.
- Migration logs.
- Database migration settings: target engine, mode, DATABASE_URL configured, dry-run required, backup required.
- Schema SQL download API.

## New APIs
- `GET /api/admin/database-migration`
- `POST /api/admin/database-settings`
- `POST /api/admin/database/snapshot`
- `GET /api/admin/database/schema.sql`

## Notes
This version keeps local JSON for prototype/testing, but prepares production PostgreSQL migration workflow for launch.
