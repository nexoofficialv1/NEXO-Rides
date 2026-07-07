# NEXO Ride v2.0 Sprint-1 — KYC Camera/File Upload

Added:
- Driver KYC page with separate Camera and Gallery/File upload controls.
- APK Android permissions in GitHub Actions generated AndroidManifest: CAMERA, READ_MEDIA_IMAGES, READ_MEDIA_VIDEO, READ_EXTERNAL_STORAGE(maxSdkVersion 32).
- Image compression before upload to reduce server load.
- KYC submit progress and Admin review queue compatibility.
- Cache/version bump for app.js, styles.css, manifest, service worker.

Deploy:
1. Upload/extract to SmartASP root.
2. Restart Node.js.
3. Push to GitHub and run Build Android APK workflow.
4. Uninstall old APK, install new APK, open Driver Profile → Driver KYC / Documents.
