NEXO Ride v2.0 Sprint-4C
Map Pin + Live Place Search Server Update

কী যোগ হয়েছে:
- Booking flow-এ in-app map preview
- Pickup pin এবং Drop pin দেখাবে
- Current GPS pickup দিলে আসল lat,lng parse করে backend route/fare করবে
- Pickup/Drop লিখলে live search suggestion দেখাবে
- Map থেকে Pickup / Drop point select করার modal
- My Rides card-এ ছোট route map দেখাবে
- /api/maps/reverse endpoint: GPS অনুযায়ী nearest service place দেখাবে
- Kalna service area-এর আরও local points যোগ করা হয়েছে

Deploy:
1. SmartASP root folder backup রাখুন।
2. ZIP upload/extract করুন।
3. nexo_v153 folder থাকলে ভিতরের সব file root folder-এ overwrite করুন।
4. data/production.env delete/overwrite করবেন না।
5. Node.js Settings → Save / Restart করুন।
6. খুলুন: https://ride.nexoofficial.in/app/?v=map-pin-search

Note:
এটা Server Update Only; APK rebuild লাগবে না।
