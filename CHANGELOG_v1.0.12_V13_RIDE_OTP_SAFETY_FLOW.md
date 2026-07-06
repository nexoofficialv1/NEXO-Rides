# NEXO Ride v1.0.12 V13 - Ride OTP Safety Flow

## Added
- Passenger payment success হলে 4 digit Ride OTP generate হবে.
- Passenger rides screen-এ OTP card দেখাবে.
- Driver pickup reached করার পরে passenger OTP না দিলে ride start হবে না.
- Wrong OTP হলে server side error দেখাবে.
- Driver view-এ OTP hidden থাকবে; passenger/admin view-এ visible.
- Ride flow এখন: Request → Accept → Pay → OTP → Reached Pickup → Start → Complete.

## Why
Fake ride start বন্ধ করতে এবং passenger-driver confirmation safer করতে এই OTP step যোগ করা হলো.

## Version
Open URL: `/app/?v=112v13`
