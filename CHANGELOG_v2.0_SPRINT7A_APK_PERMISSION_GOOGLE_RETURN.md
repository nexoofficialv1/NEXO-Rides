# NEXO Ride v2.0 Sprint-7A — APK Permission + Google Return-to-App

## Purpose
Driver GPS, KYC upload, notification prompt and Google Login browser return issue are APK-side fixes. This release keeps Sprint-6F server features and adds an Android native APK project.

## Preserved from previous patches
- Razorpay test payment gateway
- Passenger Google Login server flow
- Profile + Logout restore
- Driver approval/KYC verified sync
- Driver GPS running + local area status
- Go Online only after GPS verification
- Full booking/payment/OTP flow

## APK additions
- Location permission declared and requested
- Camera permission declared and requested
- File/media picker support for KYC document upload
- Notification permission for Android 13+
- WebView geolocation bridge
- Google Login external browser return via `nexoride://auth/google`
- Native Open App Settings button bridge
- Clear WebView-compatible user agent marker `NEXO-Ride-Android/7A`

## Server additions
- Google OAuth start supports `app=1`
- Google callback redirects APK users to `nexoride://auth/google?...`
- Env check shows Sprint-7A version and APK deep link information
