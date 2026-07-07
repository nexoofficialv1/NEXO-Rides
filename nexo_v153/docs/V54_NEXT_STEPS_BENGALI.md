# V54 Next Steps - VPS deploy

এখন আপনার কাজ:

1. DNS panel-এ `ride.nexoofficial.in` subdomain add করুন।
2. ZIP VPS-এ `/var/www/nexo-ride/current` folder-এ upload করুন।
3. ZIP unzip করে `nexo_v153`-এর ভিতরের সব file current folder-এ copy করুন।
4. `.env` file তৈরি করে secret change করুন।
5. `sudo bash deploy/vps/setup_vps_ubuntu.sh` চালান।
6. DNS ready হলে `sudo certbot --nginx -d ride.nexoofficial.in` চালান।
7. browser-এ খুলুন: `https://ride.nexoofficial.in/app/`

APK build-এর সময় target URL হবে:

```text
https://ride.nexoofficial.in/app/
```
