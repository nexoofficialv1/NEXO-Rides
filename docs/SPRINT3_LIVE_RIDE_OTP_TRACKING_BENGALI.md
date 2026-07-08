# NEXO Ride v2.0 Sprint-3

Server Update Only. APK rebuild লাগবে না।

## Added
- Passenger OTP card after payment confirmation
- Driver Reached Pickup -> OTP Start -> Ride Complete safer flow
- Live ride refresh endpoint `/api/rides/:id/live`
- Driver/passenger call buttons during active ride
- External navigation button for driver
- Active ride polling interval improved

## Test
1. Driver online করুন
2. Passenger booking করুন
3. Driver accept করুন
4. Passenger Pay Now করুন
5. Passenger side OTP দেখুন
6. Driver Reached Pickup -> OTP দিয়ে Start -> Complete করুন
