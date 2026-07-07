# NEXO Ride v1.0.42 V43 — Storage + KYC Upload Center

## Added
- Admin **Storage** tab.
- Driver KYC data-url file uploads are converted into local files under `data/uploads`.
- Upload metadata tracking with file id, mime type, size, SHA-256 hash, owner and reference profile.
- `/api/files/:id` file serving for prototype preview.
- `/api/admin/storage-status` storage dashboard API.
- `/api/admin/uploads` recent uploads API.
- `/api/admin/storage-settings` settings API.
- Upload archive/restore/delete status API.

## Why
Earlier prototype could store long image data inside the JSON database. This version moves uploaded KYC files outside the DB file to keep the database lighter and prepares the app for production object storage like S3, Cloudflare R2 or Google Cloud Storage.

## Production Note
For real launch, use secure object storage, private buckets, signed URLs, encryption and audit logs for Aadhaar/licence/driver photos.
