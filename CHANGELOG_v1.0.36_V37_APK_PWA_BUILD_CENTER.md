# NEXO Ride v1.0.36 V37 — APK + PWA Build Center

## Added
- Main Admin Web App-এ নতুন **Build** tab.
- APK/PWA readiness status.
- Package name display: `com.astratechnologies.nexoride`.
- GitHub Actions workflow status and mobile build steps.
- APK target URL helper.
- Final APK-এর আগে কী কী লাগবে checklist.
- `/api/admin/build-status` API.
- Android workflow artifact names version updated to v1.0.36.
- Default workflow URL cache version updated to `136v37`.

## Important
- Termux URL দিয়ে final APK বানানো যাবে না। APK-এর server_url অবশ্যই public HTTPS URL হতে হবে।
- APK থাকবে Passenger/Driver app-এর জন্য। Admin এবং Sub Admin browser web panel থাকবে।
