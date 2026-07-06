# NEXO Ride v1.0.50 V51 — KYC Submit + Review Visibility Fix

## Fixed
- Driver KYC submit করার পর এখন clear confirmation দেখাবে।
- Selected file name/size driver side-এ visible হবে।
- Mobile camera photo upload fail কমাতে image compression add করা হয়েছে।
- KYC upload limit 2 MB থেকে minimum 10 MB করা হয়েছে।
- Driver side-এ Review Status: Submitted / Under Admin Review / Incomplete / Verified / Rejected দেখাবে।
- Admin KYC panel-এ Under Review, Submitted Incomplete, Recent Submission Log দেখাবে।
- Admin KYC panel-এ uploaded document preview/open button ঠিক করা হয়েছে।
- KYC submissions history `kyc_submissions` collection-এ save হবে।

## Tested
- Server syntax check
- App JS syntax check
- Admin JS syntax check
- Health endpoint
- Driver KYC upload API
- Admin KYC review API
