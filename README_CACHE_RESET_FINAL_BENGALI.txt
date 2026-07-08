NEXO Ride cache reset final server update

এই update-এর উদ্দেশ্য:
- async is not defined / blank screen problem পুরোনো service-worker/cache থেকে হচ্ছিল।
- এই build service-worker unregister করে এবং cache no-store করে।
- data/production.env delete/overwrite করবেন না।

Deploy:
1) SmartASP root files backup
2) ZIP extract করে সব root-এ overwrite
3) data/production.env আগেরটাই রাখুন
4) Node.js Save/Restart
5) URL খুলুন: https://ride.nexoofficial.in/app/?v=prod-cache-reset-final
6) APK-তে Update/Clear Cache একবার চাপুন, তারপর Reload
