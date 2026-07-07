# NEXO Ride v1.0.52 V53 — Termux Start Fix Stable

এই version feature-add build নয়; এটি V51 successful test-এর উপর final pilot-stable release candidate।

## Confirmed from field test
- Driver KYC submit visibility OK
- Admin KYC review queue OK
- Driver approval OK
- Driver online OK
- Passenger booking OK
- Driver accept OK
- Demo payment + OTP ride start/end OK
- Admin dashboard / Operations / Reports / Monitor flow OK

## This build includes
- Version freeze to `1.0.52-V53_TERMUX_START_FIX_STABLE`
- Fresh PWA cache key `152v53` to avoid old UI/server cache confusion
- Updated Termux start banner and run links
- Pilot QA checklist document
- Stable source package for deployment preparation

## Next real work after V52
1. Backup/export current JSON data.
2. Select deployment server and domain.
3. Configure HTTPS.
4. Configure real OTP provider.
5. Configure Map provider.
6. Configure Razorpay/manual QR production payment.
7. Build Android APK against public HTTPS URL.
