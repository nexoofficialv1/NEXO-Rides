# v2.0 Sprint-6C — Razorpay Payment Gateway Integration

## Added
- Passenger Pay Now opens Razorpay Checkout when Razorpay is configured.
- Server creates Razorpay Order using `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET`.
- Server verifies Razorpay payment signature before marking ride payment as PAID.
- OTP is generated only after verified payment.
- Demo/manual payment fallback remains available for testing.

## Env required
```env
RAZORPAY_ENABLED=true
RAZORPAY_MODE=test
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_CURRENCY=INR
RAZORPAY_COMPANY_NAME=NEXO Ride
```

## Notes
- Do not put Razorpay Secret in the app/frontend.
- Test key starts with `rzp_test_`; live payment requires live key after Razorpay verification.
