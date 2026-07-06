# NEXO Ride v1.0.37 V38 — Production Deployment Center

## Added
- Main Admin panel-এ নতুন **Deploy** tab
- Production deployment readiness checklist
- Deploy provider setting: DEMO / DIGITALOCEAN / RENDER / VPS / OTHER
- Public server URL, domain, repo, branch setting
- HTTPS/SSL configured flag
- PostgreSQL DATABASE_URL configured flag
- Production URLs preview: root/app/admin/subadmin/health
- Deployment step-by-step guide
- APIs: `/api/admin/deployment-status`, `/api/admin/deployment-settings`
- `.env.example` deployment variables
- Bengali deployment guide doc

## Notes
- Termux local preview same port `3333`
- Final APK target URL should be a public HTTPS `/app/` URL, not local Termux URL.
