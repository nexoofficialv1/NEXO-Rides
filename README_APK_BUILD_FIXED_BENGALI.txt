NEXO Ride APK Build Fix

এই ZIP GitHub repo-তে push করুন।
GitHub Actions > Build Android APK > Run workflow.
server_url default: https://ride.nexoofficial.in/app/?v=1
build_type: debug

Fix included:
- Node.js 22 in all APK workflows
- Capacitor pinned to 7.4.3
- Clean android wrapper before each build
- Default live server URL set to ride.nexoofficial.in
