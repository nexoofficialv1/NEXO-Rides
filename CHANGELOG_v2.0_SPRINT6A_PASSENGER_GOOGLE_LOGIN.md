# NEXO Ride v2.0 Sprint-6A — Passenger Google Login

## Added
- Passenger-only Google OAuth login.
- Login screen shows **Continue with Google**.
- Backend OAuth redirect endpoints:
  - `/api/auth/google/start?role=PASSENGER`
  - `/api/auth/google/callback`
- Auto-create passenger account from Google profile name/email/photo.
- Existing passenger account can be linked by email.
- Mobile OTP remains fallback.
- Driver login remains mobile/KYC based.

## production.env required
```env
GOOGLE_LOGIN_ENABLED=true
GOOGLE_CLIENT_ID=YOUR_GOOGLE_WEB_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_WEB_CLIENT_SECRET
GOOGLE_CALLBACK_URL=https://ride.nexoofficial.in/api/auth/google/callback
```

## Google Console values
- Authorized JavaScript origin: `https://ride.nexoofficial.in`
- Authorized redirect URI: `https://ride.nexoofficial.in/api/auth/google/callback`
