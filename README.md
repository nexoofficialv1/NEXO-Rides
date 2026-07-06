# NEXO Ride v1.0.52 V53 — Termux Start Fix Stable

This is the stable release candidate after successful KYC and full ride-cycle tests.

Open:
- Passenger/Driver: `http://127.0.0.1:3333/app/`
- Admin: `http://127.0.0.1:3333/app/admin.html`
- Health: `http://127.0.0.1:3333/api/health`

Run in Termux:
```bash
bash start_termux.sh
```

## Bengali guide
See `README_BENGALI.md` and `docs/FINAL_PILOT_QA_STABLE_RELEASE_BENGALI.md`.

---

# NEXO Ride v1.0.48 V49 — Monitoring + Error Log Center

Latest update: Main Admin Monitor tab, health checklist, DB/upload size, backup count, audit log, error log, API endpoint readiness.

# NEXO Ride v1.0.28 V29 - Push Notification Center Ready

NEXO Ride v1.0.18 V19 - Admin Standalone Web Fix

Admin Web App fixed as standalone route. Open: http://127.0.0.1:3333/admin/

# NEXO Ride v1.0.17 V18 — Admin Route Fix

Admin not found issue fix করা হয়েছে।

## Termux Run
```bash
pkill node
rm -rf ~/nexo
mkdir ~/nexo
cp /sdcard/Download/NEXO_Ride_v1_0_17_V18_ADMIN_ROUTE_FIX.zip ~/nexo/
cd ~/nexo
unzip NEXO_Ride_v1_0_17_V18_ADMIN_ROUTE_FIX.zip
cd nexo_v117
bash start_termux.sh
```

## Open Links
Passenger/Driver App:
`http://127.0.0.1:3333/app/`

Admin Web App:
`http://127.0.0.1:3333/admin/`

Health check:
`http://127.0.0.1:3333/api/health`

Root page:
`http://127.0.0.1:3333/`


# NEXO Ride v1.0.8 V9

Update: App-এর ভিতরে realistic Toto splash asset যোগ করা হয়েছে। App open করলে realistic toto left থেকে right যাবে, তারপর login page আসবে।

# NEXO Ride v1.0.6 V7 — Splash Toto Animation

Simple but unique local Toto booking starter for Kalna Sub-Division.

## Included
- Single APK concept: Passenger + Toto Driver in one app
- Language-first UI: Bengali / English / Hindi
- Privacy Policy + Terms consent checkbox before use
- 30-day rolling login session
- Admin login seeded:
  - Email: bappa.roysm@gmail.com
  - Mobile: 6295192839
  - Temporary password: admin@123
  - First-login password change rule marked
- Support contact:
  - Mobile: 9749983737
  - Email: babairoykalma@gmail.com
- Package name: com.astratechnologies.nexoride
- Driver registration stays Pending until Admin approves
- Full Booking / Sharing booking
- Sharing seats 1-4
- User-confirmed fare rule
- Driver accept → Passenger payment → Booking confirm
- Astra Technologies dark neon style
- Map API placeholder/demo mode: works without Map key for testing
- GitHub Actions workflow for APK/AAB build

## Run locally / Termux
```bash
npm start
```
Open:
```text
http://127.0.0.1:3333/app/?v=106v7
```

Termux:
```bash
bash start_termux.sh
```

Check:
```bash
npm run check
```

## Real production keys needed later
- Mappls or Google Maps API key for real map, route, ETA, distance and live tracking
- Firebase/MSG91 for real OTP
- Razorpay key or UPI QR for real payment
- Production server URL for APK wrapper


## v1.0.6 V7 — Splash Toto Animation
- App open করলে প্রথমে NEXO Ride splash screen দেখাবে।
- একটি Toto বাম দিক থেকে ডানদিকে যাবে।
- Animation শেষ হলে login/language page বা existing session dashboard খুলবে।
- Consent checkbox এখন pre-ticked নয়; user নিজে tick করবে।

Open URL: `http://127.0.0.1:3333/app/?v=106v7`


## v1.0.8 V9 Update
Final NEXO Ride logo style applied everywhere, realistic toto startup animation improved, login consent enforced, and driver mandatory fields expanded. Open: `/app/?v=112v13`.


## v1.0.11 V11 Update
- Booking monitor flow added.
- Passenger ride status progress bar added.
- Admin dashboard now shows live booking monitor and recent bookings.
- Use URL: http://127.0.0.1:3333/app/?v=112v13


## v1.0.11 V12 Update
- Driver accept করলে passenger payment timer শুরু হবে।
- 3 মিনিটের মধ্যে pay করলে booking confirmed হবে।
- Driver-এর জন্য Reached Pickup step যোগ হয়েছে।
- Flow: Request → Accept → Pay → Confirm → Reached Pickup → Start → Complete.


## v1.0.12 V13 Update - Ride OTP Safety Flow
- Payment success হলে passenger-এর জন্য 4 digit Ride OTP generate হবে।
- Driver pickup reached করার পর passenger OTP না দিলে ride start করা যাবে না।
- Wrong OTP দিলে error দেখাবে।
- Flow: Request → Accept → Pay → OTP → Reached Pickup → Start → Complete.
- Open: http://127.0.0.1:3333/app/?v=112v13

## v1.0.15 V14 — SOS + Share Trip Support

Added active-ride safety actions: Share Trip, SOS, Call Support, passenger/driver call shortcuts, and Admin Safety Monitor.

Preview:

```text
http://127.0.0.1:3333/app/?v=115v16
```


## v1.0.15 V15
- Driver earnings / pending payout
- Passenger rating after completed ride
- Admin payment monitor
- 10% platform commission calculation


## v1.0.15 V16 — Admin Settlement + Payout Flow

- Admin panel থেকে driver-wise pending payout দেখা যাবে।
- Admin “Mark Paid” করলে completed ride-এর settlement status PAID হবে।
- Payment reference / UPI transaction ID note save হবে।
- Driver wallet-এ paid payout এবং settlement history দেখা যাবে।

Run URL:

```text
http://127.0.0.1:3333/app/?v=115v16
```


## v1.0.19 V20 Admin Safe Route
Admin now also opens from `/app/admin.html`, using the same static app route that opens on mobile browsers. Use: http://127.0.0.1:3333/app/admin.html


## v1.0.20 Important
Port 3000-এ পুরোনো server থাকলে Not Found দেখাতে পারে। এই version default 3333 port-এ চলবে। Open: http://127.0.0.1:3333/ and Admin: http://127.0.0.1:3333/app/admin.html


## v1.0.21 V22 - Live Location + Geofence Ready
- Driver Online করলে geo-tag save হবে।
- Passenger booking করলে pickup geo-tag save হবে।
- Admin Web App-এ Live tab থেকে online driver/location দেখা যাবে।
- এখন Map API ছাড়াও demo/GPS coordinate চলবে; পরে Mappls/Google key দিলে real map হবে।
- Port: `3333`
- App: `http://127.0.0.1:3333/app/`
- Admin: `http://127.0.0.1:3333/app/admin.html`

---

## v1.0.22 V23 - Route Preview + Fare Breakup

Passenger fare estimation now includes a lightweight route preview, fare breakup, and Kalna Sub-Division geofence status. Real map tiles/API remain configurable later through Mappls/Google Maps.


## v1.0.25 V25 — Area Sub Admin + Commission Flow

এই update-এ এলাকা ভিত্তিক Sub Admin system যোগ করা হয়েছে।

- Main Admin area/locality অনুযায়ী Sub Admin তৈরি করতে পারবে।
- Sub Admin তার নিজের এলাকার Toto Driver ও Passenger add করতে পারবে।
- Sub Admin দ্বারা managed Driver ride complete করলে platform commission থেকে Sub Admin share calculate হবে।
- Default Sub Admin share: platform commission-এর 30%।
- Example: Ride fare ₹100 হলে platform commission 10% = ₹10। Sub Admin share 30% হলে Sub Admin পাবে ₹3।
- Admin Web App → **Sub Admin** tab থেকে Sub Admin create, managed user add, commission monitor এবং Mark Paid করা যাবে।
- Sub Admin commission total fare থেকে নয়, platform commission থেকে কাটা হবে।

Admin link: `http://127.0.0.1:3333/app/admin.html`



## v1.0.25 V26 Update
- Sub Admin payout request flow added.
- Sub Admin can request pending commission payout.
- Main Admin can approve/pay requested payout from Admin Web App.
- Port remains 3333.


## v1.0.27 V27 - Persistent Database + Backup
- Main Admin > Data tab added.
- Database status, backup, export, import/restore, cleanup available.
- Data stored at `data/nexo_ride_db.json`; backups stored at `data/backups/`.
- Public launch-এর আগে PostgreSQL migration করা উচিত।


## v1.0.28 V29 — Push Notification Center Ready

- Main Admin > Integrations tab added.
- Map/OTP/Payment/Push/Server readiness checklist added.
- Demo OTP request/login API added.
- Secrets should remain in `.env` or production server environment.

Open Admin: `http://127.0.0.1:3333/app/admin.html` → Integrations tab.


## v1.0.28 V29 — Push Notification Center Ready

- Passenger/Driver in-app Notification Center added.
- Admin Notification Center added.
- Demo push-token registration API added.
- Ride request, driver accept, payment confirm, OTP, pickup reached, SOS, driver approval and Sub Admin payout request notifications are now logged.
- Firebase FCM keys can be added later in `.env` for real push notifications.

Open URLs remain:

```text
http://127.0.0.1:3333/
http://127.0.0.1:3333/app/
http://127.0.0.1:3333/app/admin.html
http://127.0.0.1:3333/subadmin/
```


## v1.0.29 V30 - Driver KYC Document Verification

- Driver app/profile থেকে Aadhaar, Driving Licence, driver photo, vehicle photo submit করা যাবে।
- Admin Web App-এ নতুন KYC tab যোগ হয়েছে।
- Admin KYC verify করলে driver profile APPROVED হবে।
- Reject করলে reason save হবে এবং driver notification পাবে।
- Prototype-এ image data local JSON DB-তে থাকে; production-এ secure object storage ব্যবহার করতে হবে।


## v1.0.31 V31 — Security Audit + RBAC
- Main Admin Security tab
- Audit trail viewer
- Role permission matrix
- Active session status
- Admin/Sub Admin password change
- API endpoints: `/api/admin/audit`, `/api/admin/security-status`, `/api/auth/change-password`


## v1.0.31 V32 Reports + Export Center
- Main Admin panel-এ Reports tab add হয়েছে।
- Daily performance, driver performance, area report, sub-admin due/paid report দেখা যাবে।
- Completed rides CSV export করা যাবে।
- New APIs: `/api/admin/reports`, `/api/admin/reports/completed-rides.csv`.


## v1.0.32 V33 Support + Refund Center
- Passenger/Driver support ticket
- Ride-linked complaint
- Paid ride refund request
- Admin support/refund management
- Notification update for ticket/refund status


## v1.0.35 V35 Payment Gateway + Razorpay/QR Ready

- Main Admin panel-এ নতুন **Control** tab যোগ হয়েছে।
- Fare rules এখন Admin থেকে update করা যাবে: Full base, Sharing per seat, extra km step, sharing capacity.
- Platform commission % এবং Sub Admin share % এখন configurable.
- Service Area / Geofence settings update করা যাবে: area name, bounds, road multiplier, service points.
- Area Catalog add হয়েছে: locality create / activate / deactivate.
- New APIs: `/api/admin/fare`, `/api/admin/service-area`, `/api/admin/areas`.
- Service area বাইরে booking block করার logic previous geofence feature-এর সাথে linked.


## v1.0.35 V35 Payment Gateway + Razorpay/QR Ready

- Passenger payment এখন payment order তৈরি করে verify হবে।
- Demo, Razorpay-ready এবং Manual UPI QR mode supported.
- Main Admin Web App-এ Gateway tab add হয়েছে।
- Payment orders, provider, UPI ID, Razorpay Key ID placeholder, transaction reference tracking ready.
- Production launch-এর আগে Razorpay webhook/server-side signature verification enable করতে হবে।


## v1.0.35 V36 — Map Navigation + API Ready
- Admin Web App > Maps tab added.
- Demo/Mappls/Google provider settings.
- External Google Maps route link for active rides.
- APIs: /api/maps/options, /api/maps/places, /api/maps/route, /api/rides/:id/navigation.

## v1.0.36 V37 — APK + PWA Build Center
- Added Main Admin **Build** tab.
- Added APK/PWA readiness helper API.
- Updated Android workflow artifact names and default URL version.
- Production APK requires a public HTTPS server URL.


---

## v1.0.38 V39 — Launch Readiness + Field Test Center
- Main Admin > Deploy tab
- Public server URL/domain/repo/branch/SSL/PostgreSQL readiness
- Production URL preview and deployment checklist
- New APIs: `/api/admin/deployment-status`, `/api/admin/deployment-settings`

## v1.0.38 V39 — Launch Readiness + Field Test Center
- Added Main Admin Launch tab.
- Shows core, production and pilot readiness.
- Lists blockers before public release.
- Adds launch checklist and field test targets.
- New API: `/api/admin/launch-readiness`.


## v1.0.40 V41 — Operations + Fleet Center
- Main Admin Operations tab
- Live fleet summary
- Ride queue monitor
- Area demand vs driver supply
- Driver suspend/reactivate/offline
- Fleet health/document expiry alerts

## v1.0.42 V43 — Legal + Consent Center
- Main Admin Legal tab
- Privacy/Terms/Refund/Driver Agreement/Sub Admin Agreement/Data Retention control
- Mandatory legal readiness score
- Consent acceptance record API ready


## v1.0.42 V43 — Storage + KYC Upload Center
- Admin Storage tab added.
- Driver KYC uploads now save as local files under data/uploads.
- Upload metadata, SHA-256 hash, file status and storage settings added.
- Production storage guide added for S3/R2/GCS signed URL model.


## v1.0.44 V45 — OTP Authentication + Session Center
- Admin Data tab upgraded to Database Migration Center.
- PostgreSQL readiness checklist, dry-run snapshot, schema SQL download.
- Backup/export/import workflow retained for safe migration.


## v1.0.47 V48 - Passenger/Driver Mobile UX Fix

- Admin panel mobile layout fixed from screenshot.
- Added compact Admin Section selector.
- Bottom admin tab bar is now swipeable and safe-area friendly.
- Use `/app/admin.html` and select tabs from the top dropdown on mobile.


## v1.0.47 V48 - Passenger/Driver Mobile UX Fix
- Passenger/Driver mobile layout improved.
- Swipe bottom nav + safe area padding added.
- Profile Install App and Clear Cache options added.
- PWA cache `146v47`.


## v1.0.47 V48 — Push FCM Device Center
- Admin Push tab
- Device token monitor
- Manual push test
- FCM/Web Push readiness
- Push delivery log


## v1.0.49 V50 - Security Hardening + Admin Access Center

- Main Admin panel now includes a **Security** tab.
- Security score, default admin password warning, admin session monitor, rate-limit/lockout settings, admin 2FA readiness, HTTPS/secrets/PostgreSQL checklist, force logout, recovery code and security event log are included.

Termux folder: `nexo_v149`


## v1.0.50 V51 — KYC Submit + Review Visibility Fix
- Driver KYC submit confirmation fixed.
- Admin KYC Queue now shows submitted/under review documents.
- Mobile image compression added for KYC photos.
- Upload max limit raised to 10 MB minimum.
- Recent KYC submission log added.


## V54 VPS Deploy Pack - nexoofficial.in

Production URL plan:

- Official website: `https://nexoofficial.in`
- NEXO Ride app: `https://ride.nexoofficial.in/app/`
- NEXO Ride admin: `https://ride.nexoofficial.in/app/admin.html`
- Sub Admin: `https://ride.nexoofficial.in/subadmin/`

See: `docs/VPS_DEPLOY_NEXOOFFICIAL_BENGALI.md`

Quick VPS start after upload/unzip:

```bash
cd /var/www/nexo-ride/current
sudo cp deploy/vps/env.production.example .env
sudo bash deploy/vps/setup_vps_ubuntu.sh
sudo certbot --nginx -d ride.nexoofficial.in
```
