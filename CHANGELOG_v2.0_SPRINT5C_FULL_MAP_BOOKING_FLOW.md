# NEXO Ride v2.0 Sprint-5C — Full Map Booking Flow

Server update only. APK rebuild is not required.

## Added
- Booking starts with full-screen pickup map.
- Pickup and drop are both selected from full-screen movable center-pin map.
- After drop selection, map becomes compact and route/fare is calculated.
- Distance, ETA, fare breakup and service area status shown before booking.
- Book button starts driver search only after fare preview.
- Passenger pays only after driver accepts the ride.

## Safe Deploy Notes
- Do not overwrite `data/production.env`.
- Do not overwrite `data/nexo_ride_db.json`.
- Restart Node.js after deployment.
