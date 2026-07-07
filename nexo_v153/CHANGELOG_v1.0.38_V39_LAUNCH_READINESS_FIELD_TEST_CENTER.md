# NEXO Ride v1.0.38 V39 — Launch Readiness + Field Test Center

## Added
- Main Admin panel-এর **Launch** tab.
- Launch readiness score: core flow, production dependencies, field pilot checks.
- Minimum pilot checks: 5 approved drivers, 5 passengers, 1 sub-admin, 20 completed rides, pending KYC/support/refund clear.
- Production blockers list: Map, OTP, payment, push, public server, HTTPS, PostgreSQL, GitHub/APK target.
- New API: `/api/admin/launch-readiness`.
- Launch step-by-step action list.

## Purpose
এই version production release-এর আগে exact কী বাকি আছে সেটা Admin panel থেকেই দেখাবে।
