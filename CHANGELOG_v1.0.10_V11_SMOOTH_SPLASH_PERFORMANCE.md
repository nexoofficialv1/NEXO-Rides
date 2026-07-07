# NEXO Ride v1.0.11 V11 — Smooth Splash Performance

## Fixed
- Splash animation stutter reduced for mobile/Termux browser.
- Heavy 467 KB splash image replaced with lightweight WebP asset.
- Removed expensive CSS effects from animated Toto: mix-blend-mode, heavy drop-shadow, animated wheel-glow.
- Toto motion now uses transform-only `translate3d` animation.
- Splash duration reduced to feel faster.
- Service worker cache version updated to `111v12` so old assets do not remain stuck.

## Run
```bash
pkill node
rm -rf ~/nexo
mkdir ~/nexo
cp /sdcard/Download/NEXO_Ride_v1_0_10_V11_SMOOTH_SPLASH_PERFORMANCE.zip ~/nexo/
cd ~/nexo
unzip NEXO_Ride_v1_0_10_V11_SMOOTH_SPLASH_PERFORMANCE.zip
cd nexo_v110
bash start_termux.sh
```

Open:
`http://127.0.0.1:3000/app/?v=111v12`
