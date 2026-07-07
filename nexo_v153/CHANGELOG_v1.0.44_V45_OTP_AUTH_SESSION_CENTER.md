# v1.0.44 V45 — OTP Authentication + Session Center

- Added Main Admin **Auth** tab
- Added OTP provider settings: DEMO / FIREBASE / MSG91 / TWOFACTOR
- Added OTP expiry, resend cooldown and per-mobile rate-limit settings
- Added 30-day rolling session control
- Added consent mandatory readiness check
- Added recent OTP logs and session counters
- Added expired-session cleanup API
- Updated OTP request flow to use configurable expiry/rate-limit
- Added production warning when DEMO OTP is still enabled

New APIs:
- `GET /api/admin/auth-status`
- `POST /api/admin/auth-settings`
- `POST /api/admin/auth/cleanup-sessions`
