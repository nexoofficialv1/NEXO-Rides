# NEXO Ride — Database Migration + Backup Center

এই update public launch-এর আগে database প্রস্তুতির জন্য। Termux/local testing-এ JSON database চলবে, কিন্তু real public app চালাতে PostgreSQL দরকার।

## কী আছে
- Local JSON database status
- Backup count / DB size
- Full JSON export
- Import / restore
- PostgreSQL migration checklist
- Collections/table row count overview
- Migration dry-run snapshot
- Schema SQL download
- Migration logs

## কেন দরকার
Passenger, driver, payment, ride, KYC, support/refund — সব production data local phone/server file-এ রাখা উচিত নয়। Public server হলে PostgreSQL database দরকার, যাতে backup, search, reporting, multi-user access এবং data recovery ঠিক থাকে।

## Admin ব্যবহার
Main Admin → Database tab খুলুন।
1. Create Backup চাপুন।
2. Export JSON download করুন।
3. DATABASE_URL configured checkbox tick করুন, যখন real PostgreSQL URL set করা হবে।
4. Migration Dry-run Snapshot করুন।
5. Schema SQL download করে production DB-তে apply করুন।

## Production notes
- Real migration করার আগে full backup রাখবেন।
- Cutover-এর সময় old JSON data read-only করে রাখবেন।
- PostgreSQL database daily dump/backup configure করবেন।
- Final migration script deployment environment অনুযায়ী run করতে হবে।
