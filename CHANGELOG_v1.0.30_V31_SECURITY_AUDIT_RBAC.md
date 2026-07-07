# NEXO Ride v1.0.30 V31 — Security Audit + RBAC

## Added
- Main Admin panel নতুন **Security** tab
- Role Based Access Control / permission matrix display
- Recent audit trail viewer
- Active session count
- Main Admin/Sub Admin count
- Admin/Sub Admin password change API
- Password change হলে `must_change_password=false` হবে
- `/api/admin/audit` endpoint
- `/api/admin/security-status` endpoint
- `/api/auth/change-password` endpoint

## Security Notes
- Password server-side PBKDF2 hash দিয়ে save হয়।
- Sub Admin নিজের scope-এর audit দেখতে পারবে।
- Main Admin full audit দেখতে পারবে।
- Production launch-এর আগে HTTPS, secure secret, real DB, and admin password change mandatory.
