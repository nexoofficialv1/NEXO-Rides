# NEXO Ride v1.0.46 V47 - Passenger/Driver Mobile UX Fix

## Added / Fixed
- Passenger এবং Driver app-এর mobile responsive layout improve করা হয়েছে।
- Bottom navigation এখন horizontal swipe-friendly এবং Android navigation bar safe padding enabled।
- Sticky mobile header, compact cards, smaller screen typography এবং safe top padding added।
- Profile থেকে **Install App / Home Screen** option added।
- Profile থেকে **Clear Cache / Update App** option added।
- PWA manifest shortcut added: Book Toto, My Rides, Support।
- Service worker cache version updated to `146v47`।
- Query/cache bust updated for app.js, styles.css and manifest।

## Why
Admin panel mobile responsive fix-এর পর Passenger/Driver side-ও mobile-friendly করা হলো, যাতে Android Chrome এবং future APK wrapper-এ layout কেটে না যায়।

## Test
- `node --check server.js`
- `node --check web/app/app.js`
- `node --check web/app/sw.js`
- Health endpoint checked locally.
