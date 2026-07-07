# NEXO Ride Push Notification Center — Bengali Note

এই version-এ real Firebase push এখনও চালু করা হয়নি, কিন্তু push notification-এর backend/data flow ready করা হয়েছে।

## এখন কী কাজ করবে
- App-এর ভিতরে Notification Center থাকবে।
- Ride request হলে nearby driver-এর notification log তৈরি হবে।
- Driver accept করলে passenger notification পাবে।
- Passenger payment করলে driver notification পাবে।
- Ride OTP passenger notification হিসেবে থাকবে।
- Driver pickup reached করলে passenger alert পাবে।
- SOS করলে Admin Notification/Safety alert তৈরি হবে।
- Sub Admin payout request করলে Main Admin notification পাবে।

## পরে real push চালু করতে যা লাগবে
`.env` file-এ Firebase/FCM key বসাতে হবে:

```env
FIREBASE_PROJECT_ID=
FCM_SERVER_KEY=
FCM_WEB_VAPID_KEY=
FIREBASE_MESSAGING_SENDER_ID=
```

## API
- `POST /api/notifications/register-token`
- `GET /api/notifications`
- `POST /api/notifications/read-all`
- `GET /api/admin/notifications`
- `POST /api/admin/notifications/test`

## Production Note
Real APK build হলে Firebase Cloud Messaging ব্যবহার করে background push notification চালু হবে। এখন browser prototype-এ notification center/log কাজ করবে।
