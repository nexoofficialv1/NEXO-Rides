# NEXO Ride v1.0.6 Blueprint

## Product
NEXO Ride is a local Toto booking platform for Kalna Sub-Division under Astra Technologies branding.

## Roles
- Passenger
- Toto Driver
- Admin

## One APK Rule
Passenger and Driver both use the same APK. First login/register flow asks the user role. Admin uses web panel.

## Login / Consent
- Privacy Policy + Terms & Conditions consent checkbox required
- 30-day rolling session
- Re-login required if app not opened within session window

## Fare
- Full Booking minimum ₹40
- Sharing ₹10 per seat
- Sharing capacity 4 seats
- First 4 km base
- Every next 2 km +₹5

## Booking Flow
Passenger:
1. Select pickup/drop
2. Select Full Booking or Sharing
3. Estimate fare
4. Request driver
5. Driver accepts
6. Passenger pays
7. Booking confirmed
8. Driver starts and completes ride

Driver:
1. Register
2. Pending status
3. Admin approval
4. Go online
5. Accept ride
6. Wait for passenger payment
7. Start/complete ride

## Admin
- Admin mobile: 6295192839
- Admin email: bappa.roysm@gmail.com
- Support mobile: 9749983737
- Support email: babairoykalma@gmail.com
- Driver approval control
- Fare settings
- Booking reports

## External Services
- Map API: demo placeholder now; Mappls/Google later
- OTP: demo now; Firebase/MSG91 later
- Payment: demo now; Razorpay/manual QR later
- Server: Termux/local for preview, production server for APK
