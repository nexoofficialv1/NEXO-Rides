# NEXO Ride v2.0 Sprint-1D — Driver Go Online Fixed

## Added / Fixed
- Driver Go Online now requires verified KYC + Admin approval.
- Driver Go Online asks GPS/location and updates live location to backend.
- Auto location heartbeat every 15 seconds while online and app is open.
- Go Offline stops location heartbeat and marks driver offline in backend.
- Added backend aliases: `/api/driver/go-online`, `/api/driver/go-offline`, `/api/driver/location-update`, `/api/driver/status`.
- Driver cannot accept ride unless KYC verified, admin approved, and currently online.
- Admin live driver monitor receives online/offline notifications and latest GPS coordinates.

## Server Update Only
Deploy to SmartASP only. Stable Base APK does not need rebuild.
