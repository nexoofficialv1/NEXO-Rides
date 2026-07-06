# NEXO Ride V54 VPS Production Deploy Pack

Target official domain:

- Main website stays as: `https://nexoofficial.in`
- NEXO Ride app will run on: `https://ride.nexoofficial.in/app/`
- NEXO Ride admin: `https://ride.nexoofficial.in/app/admin.html`
- Area Sub Admin: `https://ride.nexoofficial.in/subadmin/`

## 1) DNS

In your domain DNS panel, add this record:

```text
Type: A
Name: ride
Value: YOUR_VPS_IP
TTL: Auto / 300
```

Do not change the root `nexoofficial.in` website record.

## 2) Upload ZIP to VPS

On VPS:

```bash
sudo mkdir -p /var/www/nexo-ride/current
cd /var/www/nexo-ride/current
sudo unzip -o NEXO_Ride_v1_0_53_V54_VPS_DEPLOY_PACK_NEXOOFFICIAL.zip
sudo rsync -a nexo_v153/ ./
```

If using mobile, you can upload the ZIP through your hosting panel/SFTP, then unzip it in the above folder.

## 3) Production env

```bash
cd /var/www/nexo-ride/current
sudo cp deploy/vps/env.production.example .env
sudo nano .env
```

Change these before public launch:

```text
APP_SECRET=long_random_secret
JWT_SECRET=long_random_jwt_secret
SERVER_URL=https://ride.nexoofficial.in
DOMAIN_NAME=ride.nexoofficial.in
```

For pilot, OTP/PAYMENT/MAP can remain `DEMO`.

## 4) Run VPS setup

```bash
cd /var/www/nexo-ride/current
sudo bash deploy/vps/setup_vps_ubuntu.sh
```

This installs/checks Node.js, PM2, Nginx, configures reverse proxy, and starts the app on `127.0.0.1:3333`.

## 5) SSL

After DNS points to your VPS, run:

```bash
sudo certbot --nginx -d ride.nexoofficial.in
```

## 6) Check

```bash
curl http://127.0.0.1:3333/api/health
curl https://ride.nexoofficial.in/api/health
```

Browser:

```text
https://ride.nexoofficial.in/app/
https://ride.nexoofficial.in/app/admin.html
https://ride.nexoofficial.in/subadmin/
```

## 7) PM2 useful commands

```bash
pm2 status
pm2 logs nexo-ride
pm2 restart nexo-ride
pm2 save
```

## 8) Backup

```bash
sudo bash /var/www/nexo-ride/current/deploy/vps/backup_vps.sh
```

Backup will be saved under:

```text
/var/backups/nexo-ride/
```

## Important

- Do not deploy this app at the root `https://nexoofficial.in/` because your official website is already there.
- Use `ride.nexoofficial.in` only.
- Final APK target URL should be: `https://ride.nexoofficial.in/app/`
