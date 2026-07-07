# NEXO Ride SmartASP Node Deploy Note

এই প্যাকটি SmartASP.NET Node.js hosting-এর জন্য আপডেট করা হয়েছে।

## গুরুত্বপূর্ণ পরিবর্তন
- `server.js` এখন `process.env.PORT || 3000` ব্যবহার করে।
- Startup file: `server.js`
- Current code JSON file database ব্যবহার করে: `data/nexo_ride_db.json`
- PostgreSQL database তৈরি করা হয়েছে, কিন্তু এই V54 code-এ PostgreSQL integration নেই। ৭ দিনের field testing-এর জন্য JSON DB ব্যবহার করা যাবে। Final production-এর আগে PostgreSQL migration করা উচিত।

## SmartASP setting
- Enable Node.js: ON
- Application startup file: `server.js`
- Upload all files/folders inside `nexo_v153` to the website root.

## Test URLs
- `/api/health`
- `/app/`
- `/app/admin.html`
- `/subadmin/`
