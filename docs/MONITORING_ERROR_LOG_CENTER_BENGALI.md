# Monitoring + Error Log Center — Bengali Guide

এই version-এ Admin panel-এ **Monitor** tab add করা হয়েছে। এখানে server health, local database size, upload storage size, backup count, API readiness, recent audit log এবং error log দেখা যাবে।

## কীভাবে ব্যবহার করবেন
1. Admin panel খুলুন।
2. **Monitor** tab চাপুন।
3. Health Checklist দেখুন।
4. Open Issues থাকলে Support/KYC/Database tab থেকে clear করুন।
5. Error log থাকলে আগে পড়ে দেখুন, তারপর প্রয়োজনে **Clear Errors** চাপুন।

## Production note
Local Termux test-এর জন্য internal monitor যথেষ্ট। Public server চালু করার পর external uptime monitoring, error webhook, log rotation এবং automated backup alert লাগবে।
