# NEXO Ride — Field Test QA + Issue Tracker Guide

## উদ্দেশ্য
Launch-এর আগে real driver/passenger দিয়ে test করলে যে bug, UI problem, payment/map/location issue আসবে, তা Admin panel-এর **QA** tab-এ record করতে হবে।

## Issue কীভাবে log করবেন
1. Main Admin login করুন
2. **QA** tab খুলুন
3. Issue title লিখুন
4. Module select করুন
5. Priority select করুন
6. Problem details, expected result, actual result লিখুন
7. Save QA Issue চাপুন

## Priority rule
- LOW: ছোট UI/text issue
- MEDIUM: feature confusing বা minor bug
- HIGH: booking/payment/driver flow-এ বড় issue
- CRITICAL: payment loss, SOS failure, login failure, data loss, ride stuck

## Launch rule
Public launch-এর আগে:
- CRITICAL = 0
- HIGH open issue = 0
- Payment, OTP, KYC, ride complete flow tested
- Admin/Sub Admin payout flow tested
- At least 20 completed field test rides
