# NEXO Ride v1.0.52 V53 — Termux Start Fix Stable

এটা V52 stable build-এর startup-script fix।

## Run in Termux

```bash
cd ~
pkill -9 node 2>/dev/null
rm -rf ~/nexo_v53_stable
mkdir -p ~/nexo_v53_stable
cd ~/nexo_v53_stable
cp /sdcard/Download/NEXO_Ride_v1_0_52_V53_TERMUX_START_FIX_STABLE*.zip app.zip
unzip -o app.zip
cd nexo_v152
bash start_termux.sh
```

## Open

- Health: `http://127.0.0.1:3333/api/health`
- Passenger/Driver: `http://127.0.0.1:3333/app/`
- Admin: `http://127.0.0.1:3333/app/admin.html`

Health version should show:

`1.0.52-V53_TERMUX_START_FIX_STABLE`

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
