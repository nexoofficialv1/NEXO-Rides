# NEXO Ride v1.0.21 V22 - Live Location + Geofence Ready

## Added
- Live location API: `/api/location/update` and `/api/live/locations`
- Driver online flow now saves geo-tag latitude/longitude
- Passenger booking flow saves pickup geo-tag
- Admin dashboard gets Live Geo Monitor
- Admin Web App gets a separate Live tab
- Kalna Sub-Division demo place coordinates for Map API ready mode
- Port remains 3333 to avoid old Termux port 3000 conflicts

## Notes
- Works without Map API using demo/GPS coordinates.
- Mappls/Google Maps key can be added later to replace the mini-map with real map.
