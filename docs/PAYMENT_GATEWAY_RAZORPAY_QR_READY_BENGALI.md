# NEXO Ride Payment Gateway Ready

এই version-এ payment flow production-ready structure-এ নেওয়া হয়েছে।

## Supported modes
- DEMO: test payment, real money নয়
- MANUAL_QR: passenger UPI/QR দিয়ে pay করে reference দেবে
- RAZORPAY: Razorpay checkout/order integration-এর জন্য ready placeholder

## Flow
Driver accept → Passenger payment order create → payment reference/verification → booking confirmed → Ride OTP generate.

## Production reminder
Razorpay live করার আগে webhook signature verification, backend-only Key Secret, refund policy এবং settlement reconciliation করতে হবে।
