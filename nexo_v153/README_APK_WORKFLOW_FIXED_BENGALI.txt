NEXO Ride APK Workflow Fixed

এই প্যাকেটে GitHub Actions APK build workflow ঠিক করা হয়েছে।

Fixed:
- Node.js 22
- Java 21 (Temurin)
- Capacitor Android wrapper clean rebuild
- Debug/Release APK workflow
- Default URL: https://ride.nexoofficial.in/app/?v=1

Termux deploy:
1) zip unzip করে nexo_v153 folder খুলুন
2) GitHub repo remote set করুন
3) git add .
4) git commit -m "Fix APK workflow Java 21 Node 22"
5) git push
6) GitHub > Actions > Build NEXO Ride APK > Run workflow
7) server_url দিন: https://ride.nexoofficial.in/app/?v=1
8) build_type: debug
9) Success হলে Artifacts থেকে NEXO-Ride-APK download করুন
