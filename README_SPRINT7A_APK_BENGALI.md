# NEXO Ride Sprint-7A APK Permission + Google Return Fix

এই ZIP-এ server 6F-এর সব feature রাখা হয়েছে এবং নতুন native Android APK project যোগ করা হয়েছে।

## কী ঠিক হয়েছে

- Location permission: Driver GPS, Check GPS, Go Online
- Camera permission: Driver KYC photo/document capture
- File/Gallery permission: Aadhaar/Licence/Vehicle document upload
- Notification permission: Ride request/payment/OTP alert-এর প্রস্তুতি
- WebView GPS bridge: website থেকে `navigator.geolocation` call করলে Android permission popup আসবে
- Google Login return-to-app: Google login Chrome/browser-এ complete হলে app-এ ফিরে আসবে
- App Settings button: permission deny হলে app settings খুলবে

## Server deploy

SmartASP root folder-এ এই ZIP-এর server files overwrite করতে পারেন। তবে এইগুলো কখনও overwrite/delete করবেন না:

```text
site1/data/production.env
site1/data/nexo_ride_db.json
site1/data/uploads/
site1/data/backups/
```

Deploy করার পর Node.js Settings-এ startup file `server.js` দিয়ে Save/Restart করুন।

Check URL:

```text
https://ride.nexoofficial.in/api/env-check?v=apk7a
```

Version হওয়া উচিত:

```text
2.0-SPRINT7A_APK_PERMISSION_GOOGLE_RETURN
```

## APK build — GitHub Actions

1. এই ZIP GitHub repo-তে upload/commit করুন।
2. GitHub → Actions → `Build NEXO Ride APK 7A` খুলুন।
3. Run workflow চাপুন।
4. `debug` select করে Run করুন।
5. Build complete হলে `Artifacts` থেকে APK download করুন।

APK install করার পর প্রথমবার app খুললে permission চাইবে:

```text
Location
Camera
Photos / Media
Notification
```

সব Allow করুন। Location-এ `Allow only while using the app` এবং `Precise location` ON রাখুন।

## Test flow

```text
Driver login
→ Check GPS
→ GPS Running + Local Area দেখাবে
→ Go Online / ভাড়া নেওয়া শুরু
→ Passenger booking
→ Driver accept
→ Razorpay test payment
→ OTP generate
→ Ride start
```

Google login test:

```text
App থেকে Google Login
→ Chrome/Google login
→ success হলে automatic NEXO Ride app-এ ফিরে আসবে
```

