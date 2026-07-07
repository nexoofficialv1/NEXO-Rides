# Storage + KYC Upload Center — Bengali Guide

এই update-এ Driver KYC document upload system আরও production-ready করা হয়েছে।

## কী নতুন
- Driver photo, Toto/vehicle photo, Aadhaar photo, Licence photo এখন local file হিসেবে `data/uploads` folder-এ save হবে।
- JSON database-এর ভিতরে বড় base64 image জমে DB heavy হবে না।
- Admin panel → **Storage** tab থেকে upload count, file size, recent uploads এবং settings দেখা যাবে।
- প্রত্যেক upload-এর metadata save হবে: file id, type, size, MIME, SHA-256 hash, owner/ref id।

## Admin কোথায় দেখবেন
Main Admin login → **Storage** tab।

## Prototype storage
এখন local system-এ save হবে:

```text
data/uploads/YYYY-MM/file_xxxxx.jpg
```

## Production launch-এর আগে
Real public app-এর জন্য local file storage যথেষ্ট নয়। তখন দরকার:

- S3 / Cloudflare R2 / Google Cloud Storage
- Private bucket
- Signed URL
- Encryption
- Access log / audit log
- Backup policy
- KYC document retention policy

## Important
Aadhaar ও licence sensitive document। Public URL বা open folder-এ production data রাখা ঠিক নয়।
