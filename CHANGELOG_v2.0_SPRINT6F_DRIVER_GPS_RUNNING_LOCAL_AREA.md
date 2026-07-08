# NEXO Ride v2.0 Sprint-6F — Driver GPS Running + Local Area Status

## Fixed
- Check GPS now uses real device GPS only and does not silently fallback to demo location.
- Check GPS stores driver live GPS even when driver is offline.
- Driver status now shows nearest local area name from GPS.
- Go Online now requires GPS inside service area.
- Go Online status shows Running and starts accepting ride/fare requests from the resolved local area.
- Driver dashboard has a clear GPS / Local Area Status card.

## Preserved
- Google Passenger Login
- Razorpay payment gateway
- Profile / Logout restored UI
- KYC/Admin approval sync
- Live tracking and full map booking flow
