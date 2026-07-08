# NEXO Ride v2.0 Sprint-1E - Auto KYC + Service Area Approval

## What changed
- Driver KYC no longer needs manual admin approval when:
  1. all required KYC fields/documents are complete, and
  2. driver GPS location is inside the configured service area.
- Driver is automatically marked:
  - `kyc_status = VERIFIED`
  - `status = APPROVED`
- Go Online is allowed immediately after auto approval.
- If GPS is missing or outside the service area, KYC remains submitted/pending and the driver is asked to allow GPS inside service area.
- Admin panel still keeps the review/audit trail for auto approved KYC.

## Service area
Default: Kalna Sub-Division bounds configured in `db.service_area.bounds`.
Admin can update service area bounds from `/api/admin/service-area`.

## APK
No APK rebuild required. This is server update only.
