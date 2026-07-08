# Sprint-7A FIX2 - Full APK Build Stable Patch

এই patch শুধু APK build stable করার জন্য। Server/app UI/Profile/Logout/Razorpay/GPS flow বদলানো হয়নি।

Fix:
- FIX1 Gradle/SDK settings included
- MainActivity Java generics compile fix: List<String>, ValueCallback<Uri[]>
- AndroidManifest/resources/file_paths valid files included
- Debug APK workflow preserved

Apply from Termux:

```bash
cd ~/NEXO-Rides
unzip -o /sdcard/Download/NEXO_Ride_v2_0_Sprint7A_FIX2_FULL_APK_BUILD_STABLE_PATCH.zip -d ~/NEXO-Rides
git add .
git commit -m "Fix Sprint 7A APK build Java and SDK"
git push
gh workflow run build-apk.yml -f build_type=debug
```
