# NEXO Ride — Map, OTP, Payment Keys Guide

## 1. Map API

### এখন
- Demo mode চলবে।
- Pickup/drop popular point থেকে নেওয়া হবে।
- Distance deterministic demo calculation দিয়ে হবে।

### Production
Real booking app-এর জন্য Map API লাগবে:
- pickup/drop location search
- current GPS location
- route distance
- ETA
- nearby driver matching
- live driver movement

Recommended options:
- Mappls / MapmyIndia for India-first local map use
- Google Maps if familiar ecosystem preferred

App config placeholder:
```env
MAP_PROVIDER=demo
MAPPLS_API_KEY=
GOOGLE_MAPS_API_KEY=
```

## 2. OTP Service

### এখন
Demo OTP/login flow থাকবে।

### Production
Options:
- Firebase Phone Auth
- MSG91 / 2Factor SMS OTP

Placeholder:
```env
OTP_PROVIDER=demo
FIREBASE_PROJECT_ID=
MSG91_AUTH_KEY=
```

## 3. Payment

### এখন
Demo payment button থাকবে। Passenger payment না করলে booking confirm হবে না—flow same থাকবে।

### Production
Options:
- Razorpay checkout
- Manual UPI QR

Placeholder:
```env
PAYMENT_PROVIDER=demo
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
MANUAL_UPI_ID=
```

## 4. Server URL for APK
APK build করার সময় GitHub Actions-এ live server URL দিতে হবে:

```text
https://your-domain.com/app/?v=106v7
```

Localhost URL APK-তে দেওয়া যাবে না, কারণ APK user-এর phone থেকে remote server access করতে হবে।
