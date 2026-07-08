NEXO Ride Sprint-4B Mappls Static Key Config

এই update Server Update Only. APK বানাতে হবে না।

SmartASP site1/data/production.env ফাইলে আগের 2Factor OTP lines রেখে নিচের lines যোগ করুন:

MAP_PROVIDER=MAPPLS
NAVIGATION_PROVIDER=MAPPLS_WEB
MAPPLS_STATIC_KEY=আপনার_Mappls_Static_Key
MAPPLS_PUBLIC_KEY_ENABLED=false
MAPPLS_ALLOWED_DOMAIN=ride.nexoofficial.in

তারপর SmartASP Node.js Settings -> Save / Restart করুন।
Admin -> Map Center এ API Key = YES এবং Provider = MAPPLS দেখাবে।
