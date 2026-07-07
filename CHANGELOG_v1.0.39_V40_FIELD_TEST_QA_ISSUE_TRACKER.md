# NEXO Ride v1.0.39 V40 — Field Test QA + Issue Tracker

## Added
- Main Admin panel-এ নতুন **QA** tab
- Field test checklist visible inside Admin
- QA issue create system
- Module-wise issue tagging: Passenger, Driver, Admin, Sub Admin, Payment, Map, Notification, KYC, Reports
- Priority: LOW / MEDIUM / HIGH / CRITICAL
- Status flow: OPEN → IN_PROGRESS → RESOLVED → CLOSED
- QA audit trail entries
- Launch-এর আগে High/Critical open issue track করার summary

## New APIs
- `GET /api/admin/qa`
- `POST /api/admin/qa/issues`
- `POST /api/admin/qa/issues/:id/status`

## Why
Field test-এর সময় screenshot/bug কথায় হারিয়ে না গিয়ে Admin panel থেকেই issue track হবে।
