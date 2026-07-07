# NEXO Ride v1.0.22 V23 - Route Preview + Fare Breakup

## Added
- Passenger fare estimate now shows a small route preview card.
- Fare breakup added: base fare, extra step count, extra fare, per-seat fare for sharing.
- Route distance now uses demo coordinates and road-distance multiplier instead of only hash-based demo distance.
- Geofence result added for Kalna Sub-Division: pickup/drop inside service area message.
- Server-side geofence check added before ride request.
- Cache/version bumped to `122v23`.

## Still Demo / Placeholder
- Real map tiles/API will be connected after Mappls/Google Maps key is provided.
- Current route preview is a lightweight offline/demo map card for Termux/mobile testing.
