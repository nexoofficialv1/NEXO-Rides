# NEXO Ride v1.0.49 V50 - Security Hardening + Admin Access Center

## Added
- Main Admin **Security** tab
- Security readiness score
- Default admin password risk check
- Admin session monitor
- Login rate-limit and lockout settings
- Admin 2FA/OTP readiness toggle
- IP allowlist settings
- Environment secret / HTTPS / PostgreSQL security checklist
- Force logout other sessions
- One-time admin recovery code generator
- Recent security events log

## New API
- `GET /api/admin/security-status`
- `POST /api/admin/security-settings`
- `POST /api/admin/security/force-logout`
- `POST /api/admin/security/rotate-admin-key`
