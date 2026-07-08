# NEXO Ride v2.0 Sprint-2: Passenger Booking + Nearby Driver Matching

Server Update Only. Stable APK rebuild is not required.

## Added
- Passenger booking now sends request to nearby ONLINE + KYC VERIFIED + APPROVED drivers only.
- Driver matching radius and maximum candidates supported.
- Driver candidate list stored in ride record.
- Driver app shows only assigned/candidate ride requests.
- Driver Accept / Reject flow added.
- Passenger gets matching status and driver accepted notification.
- Admin live monitor can see candidate count and booking status.

## Safety Rules
- Driver must be online before accepting ride.
- Driver must have verified KYC and approved status.
- Busy drivers with active ride are not selected for new requests.
- Rejected driver will not see the same request again.

## Deploy
Upload/extract/overwrite on SmartASP root and Restart Node.js.
Do not overwrite data/production.env.
