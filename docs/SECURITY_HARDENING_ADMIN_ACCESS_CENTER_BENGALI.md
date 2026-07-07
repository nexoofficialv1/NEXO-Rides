# Security Hardening + Admin Access Center

এই version-এ Main Admin panel-এ **Security** tab যোগ করা হয়েছে।

## কী করা যাবে
- Security score দেখা
- default admin password risk check
- admin session count দেখা
- rate limit / account lockout setting
- admin 2FA/OTP readiness setting
- HTTPS, app secret, PostgreSQL readiness check
- IP allowlist future control
- one-time recovery code generate
- other sessions force logout

## Launch-এর আগে জরুরি
1. `admin@123` default password বদলানো
2. HTTPS domain চালু করা
3. `APP_SECRET` / `JWT_SECRET` set করা
4. PostgreSQL DATABASE_URL set করা
5. Admin 2FA/OTP enable করা
6. Security tab score 80%+ করা
