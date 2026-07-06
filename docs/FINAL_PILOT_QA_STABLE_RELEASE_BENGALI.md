# NEXO Ride V52 Final Pilot QA Stable Release

## Status
User confirmed the important pilot flows are OK. V52 is the stable release candidate to keep before production deployment work.

## Do not add more major features before deployment
এখন নতুন feature add করলে আবার old bug ফিরে আসার risk থাকবে। V52 কে stable base ধরে deployment/APK কাজ করা উচিত।

## Required final checks
- `/api/health` version must show `1.0.52-V53_TERMUX_START_FIX_STABLE`
- Passenger app opens on `/app/`
- Admin opens on `/app/admin.html`
- Driver KYC submit and Admin KYC review still works
- Full ride cycle still works
- Monitor tab error log clean

## Production checklist
- Public HTTPS domain
- Database backup and PostgreSQL migration plan
- Real OTP provider
- Real Maps API provider
- Real payment gateway or manual UPI flow
- Firebase/FCM setup for push notifications
- APK build with public URL
