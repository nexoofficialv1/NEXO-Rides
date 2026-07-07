# KYC Submit + Review Visibility Fix

Driver KYC submit করলে এখন driver app-এ সঙ্গে সঙ্গে confirmation দেখাবে এবং Admin panel-এর KYC tab-এ under review হিসেবে দেখা যাবে।

## Driver side
1. Profile → Driver KYC / Documents
2. Toto number, Aadhaar number, Licence number দিন
3. Driver Photo, Vehicle/Toto Photo, Aadhaar Photo, Licence Photo select করুন
4. Select করার পর file name দেখা যাবে
5. Submit KYC for Admin Review চাপুন
6. Success message দেখাবে

## Admin side
1. Main Admin → KYC tab
2. KYC Queue-তে driver দেখা যাবে
3. Document preview/open দেখা যাবে
4. সব complete হলে Verify & Approve করুন
5. না হলে Reject করুন

## Important
Mobile camera photo বড় হলে app নিজে compress করে upload করবে। Server-side upload limit now minimum 10 MB.
