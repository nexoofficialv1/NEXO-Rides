# NEXO Ride — Launch Readiness + Field Test Center

এই module public launch-এর আগে NEXO Ride কতটা ready তা দেখাবে।

## Main Admin → Launch Tab
এখানে দেখা যাবে:
- Core app flow ready কিনা
- Production dependency ready কিনা
- Field pilot test ready কিনা
- Current blockers কী কী আছে
- Launch steps কীভাবে complete করতে হবে

## Field Test Target
Launch-এর আগে অন্তত:
- 5 জন approved driver
- 5 জন passenger
- 1 জন sub-admin
- 20টি completed test ride
- Pending KYC clear
- Pending support/refund clear

## Production Dependency
Real launch-এর আগে লাগবে:
- Public HTTPS server
- PostgreSQL database
- Real OTP service
- Real Map API
- Payment gateway/manual QR verification
- Firebase push notification
- APK build and Android device test

## API
- `GET /api/admin/launch-readiness`

এই API শুধু Main Admin access করতে পারবে।
