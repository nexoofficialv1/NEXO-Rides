# NEXO Ride v1.0.3 V4 - Simple Unique Astra Flow

## কী আপডেট করা হয়েছে
- Green/common UI বাদ দিয়ে Astra Technologies dark neon blue-purple style করা হয়েছে।
- Header/logo-তে NEXO identity রাখা হয়েছে: N mark + Toto icon.
- Passenger home-এ unique **NEXO Smart Toto** hero card.
- Booking flow আরও simple করা হয়েছে: Pickup → Drop → Ride Type/Fare → Driver Request.
- Full Booking ও Sharing selection রাখা হয়েছে।
- Sharing seat selection 1–4 যোগ করা হয়েছে।
- Fare rule user-confirmed অনুযায়ী update:
  - Full booking minimum ₹40
  - Sharing ₹10 per seat
  - First 4 km base
  - তারপর প্রতি 2 km ₹5 extra
  - Sharing capacity 4
- Payment-lock flow যোগ করা হয়েছে:
  - Passenger request করে
  - Driver accept করলে status DRIVER_ACCEPTED
  - Passenger Pay চাপলে status CONFIRMED
  - তারপর driver Start করতে পারবে
- 30-day rolling session renew করা হয়েছে: app open করলে /api/me session extend করবে।
- Privacy/Terms consent register/login flow-এ বাধ্যতামূলক রাখা হয়েছে।
- Old demo fare rules থাকলে server auto-migrate করে নতুন fare rule apply করবে।

## এখনো demo/prototype হিসেবে যা আছে
- Real map API connected নয়। Mappls/Google key দিলে live map যোগ করা যাবে।
- OTP service connected নয়। Firebase/MSG91 key দিলে OTP যোগ করা যাবে।
- Razorpay real payment connected নয়। এখন payment confirmation demo button.
- Admin panel full production হয়নি; next phase.
