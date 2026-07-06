# NEXO Ride v1.0.47 — V48 Push FCM Device Center

## Added
- Main Admin panel-এ নতুন **Push** tab
- Passenger/Driver device token register tracking
- Firebase Cloud Messaging readiness checklist
- Web/PWA VAPID key status
- Android APK push status
- Manual push test sender
- Push delivery log / demo delivery log
- Push token activate/deactivate action
- App Profile থেকে **Enable Push / Register Device** option
- Service Worker push + notification click scaffold

## New APIs
- `GET /api/admin/push-status`
- `POST /api/admin/push-settings`
- `POST /api/admin/push-send`
- `POST /api/admin/push-tokens/:id/deactivate`
- `POST /api/admin/push-tokens/:id/activate`

## Production Note
Real push notification চালাতে Firebase project, FCM credential/server key, Web Push VAPID public key এবং Android notification permission final করতে হবে। Prototype mode-এ notification in-app log ও delivery log হিসেবে থাকবে।
