# Push / FCM Device Center — Bengali Guide

এই update-এ NEXO Ride Admin থেকে Passenger/Driver mobile device token দেখা যাবে এবং manual push test করা যাবে।

## কোথায় দেখবেন
Main Admin → **Push** tab

## কী কী দেখা যাবে
- Active device token
- Driver / Passenger / Admin device count
- Notification permission status
- Device platform: WEB_PWA / Android future
- Push delivery log
- FCM production readiness

## Passenger/Driver side
Profile → **Enable Push / Register Device** চাপলে এই mobile browser/device Admin Push tab-এ show করবে।

## Production-এর আগে লাগবে
1. Firebase project
2. Android app package: `com.astratechnologies.nexoride`
3. FCM server credential
4. Web Push VAPID public key
5. APK notification permission
6. Background push worker / server delivery job

এখন DEMO mode-এ notification app-এর ভিতরে ও delivery log-এ থাকবে। Real Firebase key দিলে production push চালু করা যাবে।
