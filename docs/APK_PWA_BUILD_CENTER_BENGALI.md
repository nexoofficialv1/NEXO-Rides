# NEXO Ride — APK + PWA Build Center Guide

## উদ্দেশ্য
এই update-এ Admin panel-এর ভিতরে Build tab যোগ করা হয়েছে, যেখান থেকে APK/PWA readiness দেখা যাবে।

## APK model
- Passenger + Driver: Single APK
- Main Admin: Web App
- Sub Admin: Web App

## APK build করার জন্য লাগবে
1. Public HTTPS server URL, যেমন `https://api.yourdomain.com/app/`
2. GitHub repository
3. GitHub Actions workflow run
4. Android package name: `com.astratechnologies.nexoride`

## Mobile থেকে APK build steps
1. ZIP unzip করে GitHub repo-তে upload করুন।
2. GitHub app/browser থেকে repository খুলুন।
3. Actions tab খুলুন।
4. **Build NEXO Ride APK** workflow select করুন।
5. `server_url` field-এ public URL দিন, যেমন `https://your-domain.com/app/?v=136v37`।
6. Run workflow চাপুন।
7. Build complete হলে Artifacts থেকে APK download করুন।

## Important
Termux local URL যেমন `http://127.0.0.1:3333/app/` final APK-এর জন্য ব্যবহার করবেন না। এটা শুধু testing/preview।

## PWA install
Chrome থেকে public app URL খুলে **Add to Home Screen** করলে PWA shortcut হিসেবে ব্যবহার করা যাবে।
