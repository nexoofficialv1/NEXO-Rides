NEXO Ride One-Time Production Safe Deploy

1) SmartASP root folder backup নিন।
2) এই ZIP upload/extract করে nexo_v153-এর ভেতরের সব file root-এ overwrite করুন।
3) data/production.env.COMPLETE_TEMPLATE দেখে ফোনে/Termux-এ data/production.env বানিয়ে upload/overwrite করুন।
4) production.env-এ 2Factor API key এবং Mappls Static key বসান।
5) Node.js Settings -> Save/Restart।
6) Test URL: https://ride.nexoofficial.in/api/env-check
   এখানে twofactor_key_present=true এবং mappls_key_present=true হলে config ঠিক।
7) App: https://ride.nexoofficial.in/app/?v=prod-safe

এই update-এ blank screen হলে app নিজে error card দেখাবে এবং Clear Cache button থাকবে।
