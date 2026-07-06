# NEXO Ride — Integration Settings + OTP Ready Guide

এই version-এ Admin panel-এর মধ্যে **Integrations** tab যোগ হয়েছে। এখান থেকে দেখা যাবে production launch-এর আগে কোন কোন key/configuration বাকি আছে।

## Integration Tab
Main Admin → **Integrations**

এখানে থাকবে:
- Map: DEMO / MAPPLS / GOOGLE
- OTP: DEMO / FIREBASE / MSG91 / 2FACTOR
- Payment: DEMO / RAZORPAY / MANUAL_QR
- Production Server URL
- Readiness Checklist

## OTP Demo API
Demo OTP testing-এর জন্য:

```http
POST /api/auth/request-otp
{
  "mobile":"9999999999"
}
```

Demo mode হলে response-এ OTP দেখাবে। Default OTP: `123456`

Login/verify:

```http
POST /api/auth/login-otp
{
  "mobile":"9999999999",
  "otp":"123456",
  "consent":true,
  "role":"PASSENGER",
  "name":"Test User"
}
```

## Important Security
- Razorpay Secret, MSG91 Auth Key, Firebase secret, FCM server key UI-তে লিখবেন না।
- এগুলো `.env` file বা production server environment variable-এ রাখা হবে।
- Admin Integration tab শুধু readiness/status দেখাবে।

## Next Production Step
পরের ধাপে real integration করতে হবে:
1. Mappls/Google API real map
2. Firebase/MSG91 real OTP
3. Razorpay checkout + backend payment verification
4. FCM push notification
