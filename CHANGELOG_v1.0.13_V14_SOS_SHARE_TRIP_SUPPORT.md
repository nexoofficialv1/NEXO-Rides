# NEXO Ride v1.0.13 V14 — SOS + Share Trip Support

## Added
- Active ride screen now shows **Share Trip**, **SOS**, and **Call Support** controls.
- Passenger can call assigned driver after driver accepts.
- Driver can call passenger after assignment.
- Share Trip generates a clean trip text containing route, status, fare, passenger/driver and support information.
- SOS creates a safety event and stores it in the local JSON database.
- Admin Dashboard now includes **Safety Monitor** with open SOS alert count.
- New admin endpoint: `/api/admin/safety-events`.

## Safety rule
- Safety controls appear only for active rides: `DRIVER_ACCEPTED`, `CONFIRMED`, `ARRIVED`, `STARTED`.
- Ride OTP remains hidden from the driver until passenger verbally shares it.

## Version
- Cache/version updated to `113v14`.
