NEXO Ride Passenger Google Login Setup

1) Google Cloud Console খুলুন
2) OAuth Consent Screen configure করুন
3) Credentials > Create OAuth client ID > Web application
4) Authorized JavaScript origin দিন:
   https://ride.nexoofficial.in
5) Authorized redirect URI দিন:
   https://ride.nexoofficial.in/api/auth/google/callback
6) Client ID এবং Client Secret কপি করে data/production.env-এ দিন:

GOOGLE_LOGIN_ENABLED=true
GOOGLE_CLIENT_ID=YOUR_GOOGLE_WEB_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_WEB_CLIENT_SECRET
GOOGLE_CALLBACK_URL=https://ride.nexoofficial.in/api/auth/google/callback

7) SmartASP Node.js Settings > Save/Restart
8) Test URL:
   https://ride.nexoofficial.in/app/?v=google6a

Note: Google login passenger-only. Driver login OTP/KYC থাকবে।
