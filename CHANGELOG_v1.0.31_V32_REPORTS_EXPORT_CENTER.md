# NEXO Ride v1.0.31 V32 — Reports + Export Center

## Added
- Main Admin Reports tab.
- Overview: gross fare, platform commission, driver payout, pending dues, sub-admin dues.
- Daily performance report.
- Top driver report.
- Area-wise report.
- Sub Admin due/paid report.
- Completed rides CSV export.

## APIs
- `GET /api/admin/reports`
- `GET /api/admin/reports/completed-rides.csv`

## Notes
- CSV export uses admin token and downloads from browser.
- Report data is derived from completed rides and settlement records.
