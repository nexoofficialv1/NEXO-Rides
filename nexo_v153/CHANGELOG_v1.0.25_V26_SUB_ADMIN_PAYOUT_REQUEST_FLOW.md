# NEXO Ride v1.0.25 V26 — Sub Admin Payout Request Flow

## Added
- Sub Admin can request payout for pending commission from Sub Admin Web Panel.
- Main Admin can view Sub Admin payout requests and mark requested payout as paid.
- Payout request lifecycle: REQUESTED → PAID.
- Payout requests include requested amount, commission IDs, area, note, payment reference, and settlement link.
- Existing direct Mark Paid flow still works and closes open payout requests for that Sub Admin.

## Business Rule
Sub Admin earns a share of platform commission only, not from total fare.
