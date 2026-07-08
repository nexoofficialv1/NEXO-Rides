# NEXO Ride Sprint-5H Update

এই আপডেটে user-এর reference video অনুযায়ী black logo reveal splash animation যোগ করা হয়েছে।

## কী আছে
- KWORK-style black startup animation
- NEXO Ride wordmark letter reveal
- white wipe transition
- loading time হলে smooth app preview loader
- আগের color contrast fix বজায় রাখা হয়েছে

## Deploy
1. SmartASP root backup রাখুন।
2. ZIP upload করুন।
3. Extract করুন।
4. সব file root folder-এ overwrite করুন।
5. `data/production.env` এবং `data/nexo_ride_db.json` overwrite/delete করবেন না।
6. Node.js Settings → Save / Restart।

Open: `/app/?v=splash5h`

## Sprint-6C Razorpay Payment Setup

`data/production.env`-এ Google/OTP/Mappls lines রেখে শুধু Razorpay lines add করুন:

```env
RAZORPAY_ENABLED=true
RAZORPAY_MODE=test
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=আপনার_RAZORPAY_SECRET
RAZORPAY_CURRENCY=INR
RAZORPAY_COMPANY_NAME=NEXO Ride
```

Test complete হলে live key বসাতে হবে:

```env
RAZORPAY_MODE=live
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=আপনার_LIVE_SECRET
```

Secret chat-এ বা frontend-এ দেবেন না।


## Sprint-6E Hotfix
Admin approve করার পরও Driver app-এ KYC Required দেখানোর সমস্যা ঠিক করা হয়েছে। GPS ON/OFF/Last GPS status Driver panel-এ দেখা যাবে।
