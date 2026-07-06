# NEXO Ride v1.0.44 V45 — OTP Authentication + Session Center

এই আপডেটে Admin panel-এ **Auth** tab যোগ করা হয়েছে। এখানে OTP login, real SMS provider readiness, demo OTP warning, session expiry এবং consent requirement একসাথে দেখা/কন্ট্রোল করা যাবে।

## Add হয়েছে

- OTP provider mode: DEMO / FIREBASE / MSG91 / TWOFACTOR
- Demo OTP value control
- OTP expiry minutes
- Resend cooldown seconds
- Max OTP per mobile per hour
- 30-day rolling session setting
- Consent mandatory setting
- Active/expired session monitor
- Recent OTP request log
- Expired session cleanup

## New APIs

- `GET /api/admin/auth-status`
- `POST /api/admin/auth-settings`
- `POST /api/admin/auth/cleanup-sessions`

## Production note

DEMO OTP শুধু test-এর জন্য। Public launch-এর আগে Firebase / MSG91 / 2Factor key বসিয়ে real SMS OTP চালু করতে হবে।
