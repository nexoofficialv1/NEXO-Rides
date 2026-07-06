# NEXO Ride v1.0.11 V12 - Payment Timer & Pickup Flow

## Added
- Driver accept করার পর Passenger payment-এর জন্য 3 minute timer.
- Timer শেষ হলে ride status হবে PAYMENT_TIMEOUT.
- Payment success হলে booking CONFIRMED.
- Driver side নতুন step: Reached Pickup.
- Flow now: Request -> Accept -> Pay -> Confirm -> Reached Pickup -> Start -> Complete.
- Passenger rides screen-এ live countdown display.
- Admin summary now tracks accepted/confirmed/arrived/expired rides.

## Kept
- Smooth optimized realistic Toto splash.
- Fixed NEXO Ride logo style.
- Privacy/Terms consent required.
- Single APK Passenger/Driver concept.
