# Mobile দিয়ে APK Build — GitHub Actions Guide

## দরকার
- GitHub account
- এই package-এর সব file GitHub repository-তে upload
- App-এর live server URL

## Step
1. GitHub app/browser খুলুন
2. New repository তৈরি করুন: `nexo-ride`
3. ZIP unzip করে files repository-তে upload করুন
4. Actions tab খুলুন
5. `Build NEXO Ride APK` workflow select করুন
6. `Run workflow` চাপুন
7. `server_url` field-এ দিন:

```text
https://your-domain.com/app/?v=106v7
```

8. build_type: `debug` রাখুন first test-এর জন্য
9. Build complete হলে artifact থেকে APK download করুন

## Important
- Debug APK testing-এর জন্য। Play Store upload করার জন্য signed release build লাগবে।
- Real map/OTP/payment না থাকলে APK demo mode-এ test করা যাবে।
