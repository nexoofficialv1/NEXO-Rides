# NEXO Ride v1.0.37 V38 — Production Deployment Center

এই update-এ Main Admin panel-এ **Deploy** tab যোগ করা হয়েছে।

## উদ্দেশ্য
Termux/local preview থেকে production deployment পর্যন্ত কী কী বাকি আছে সেটা এক জায়গায় দেখা ও manage করা।

## Deploy tab-এ থাকবে
- Deploy provider: DEMO / DIGITALOCEAN / RENDER / VPS / OTHER
- Public server URL
- Domain name
- GitHub repo URL
- Branch
- SSL/HTTPS configured status
- PostgreSQL DATABASE_URL configured status
- Production URLs preview
- Deployment checklist
- Step-by-step deployment guide

## Final Production-এর আগে দরকার
1. Public HTTPS domain
2. Production server
3. PostgreSQL database
4. `.env` secret keys
5. Map/OTP/Payment/Push real integration
6. APK target URL set: `https://YOUR-DOMAIN/app/`
7. GitHub Actions থেকে APK build

## API
- `GET /api/admin/deployment-status`
- `POST /api/admin/deployment-settings`

