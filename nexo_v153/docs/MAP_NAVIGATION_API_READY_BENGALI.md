# NEXO Ride v1.0.35 — Map Navigation + API Ready

এই update-এ Map/Navigation production integration-এর base তৈরি করা হয়েছে। এখন demo coordinate দিয়ে route preview চলে, আর active ride screen থেকে external Google Maps route খুলতে পারবে।

## Added
- Admin Web App > **Maps** tab
- Map provider settings: DEMO / MAPPLS / GOOGLE
- Navigation provider: GOOGLE_WEB / MAPPLS_WEB
- API key configured flag
- Service places list with coordinates
- Sample route test: Kalna Station → Kalna Hospital
- Passenger/Driver active ride screen থেকে **Route** button
- Backend APIs:
  - `GET /api/maps/options`
  - `GET /api/maps/places?q=`
  - `GET /api/maps/route?pickup=&drop=&ride_type=&seats=`
  - `GET /api/rides/:id/navigation`
  - `GET /api/admin/maps`
  - `POST /api/admin/maps/settings`

## Production-এ যা লাগবে
- Mappls API key অথবা Google Maps API key
- Pickup/drop autocomplete API
- Route distance/ETA API
- In-app map SDK integration
- Driver navigation deep link

Demo mode-এ external navigation link কাজ করবে, কিন্তু real route distance এখনো demo coordinate calculation থেকে আসে।
