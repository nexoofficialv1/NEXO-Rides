# NEXO Ride v2.0 Sprint-1C — 2Factor Production SMS OTP

Added server-side 2Factor SMS OTP support for:
- Login OTP
- New user OTP login
- Forgot Password OTP
- Reset Password OTP verification

## Deployment
1. Upload/extract ZIP to SmartASP ride root.
2. Create `data/production.env` from `data/production.env.example`.
3. Set `OTP_PROVIDER=TWOFACTOR` and your `TWOFACTOR_API_KEY`.
4. Restart Node.js app from SmartASP.
5. Test OTP request from APK.

## Security
- API key stays on backend only.
- OTP is verified through 2Factor session verification.
- Rate limit and resend cooldown remain active.
