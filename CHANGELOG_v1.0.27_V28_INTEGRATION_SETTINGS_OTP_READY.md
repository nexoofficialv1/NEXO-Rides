# NEXO Ride v1.0.27 V28 — Integration Settings + OTP Ready

## Added
- Main Admin Web App-এর নতুন **Integrations** tab.
- Map provider setting: DEMO / MAPPLS / GOOGLE.
- OTP provider setting: DEMO / FIREBASE / MSG91 / 2FACTOR.
- Payment provider setting: DEMO / RAZORPAY / MANUAL_QR.
- Production server URL setting.
- Integration readiness checklist: Database, Map, OTP, Payment, Push, Server.
- Demo OTP APIs:
  - `POST /api/auth/request-otp`
  - `POST /api/auth/login-otp`
- `.env.example` update with DEMO_OTP, TWOFACTOR_API_KEY, FCM_SERVER_KEY, SERVER_URL.

## Notes
- Secret keys should not be stored in UI. Use `.env`/server environment for secret values.
- Demo OTP defaults to `123456` for testing only.
- Real SMS, payment and map SDK integration will be activated after keys are supplied.
