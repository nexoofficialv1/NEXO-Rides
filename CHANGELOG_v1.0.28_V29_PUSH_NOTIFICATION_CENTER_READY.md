# NEXO Ride v1.0.28 V29 — Push Notification Center Ready

## Added
- Notification Center API for Passenger, Driver, Admin and Sub Admin.
- Demo push-token registration endpoint, ready for Firebase FCM later.
- Automatic notification logs for:
  - Ride request to nearby drivers
  - Driver accepted passenger booking
  - Passenger payment confirmed
  - Ride OTP generated
  - Driver reached pickup
  - Ride started/completed
  - SOS alerts to Admin
  - Driver approval/rejection
  - Sub Admin payout request
- Admin Notification Center with test notification buttons.
- Passenger/Driver in-app Notification Center.
- Backend endpoints:
  - `POST /api/notifications/register-token`
  - `GET /api/notifications`
  - `POST /api/notifications/read-all`
  - `GET /api/admin/notifications`
  - `POST /api/admin/notifications/test`

## Notes
- This version stores notifications in persistent local JSON database.
- Real push notification requires Firebase Cloud Messaging keys in `.env`.
- Admin web route remains on port 3333.
