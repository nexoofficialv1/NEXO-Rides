# NEXO Ride v2.0 Sprint-6D - Restore Profile + Logout + Razorpay Consolidation

This hotfix consolidates Sprint-6B visible logout/profile account menu with Sprint-6C Razorpay payment gateway.

## Fixed
- Restored top Logout button.
- Restored Profile shortcut/header click.
- Restored Profile tab account menu and Edit/Create Profile action.
- Restored Driver/Vehicle profile shortcut.
- Kept Razorpay Checkout/order/verify integration.
- Added cache-busting version tags.
- Added CSS safety rules so logout/profile are not hidden by later UI styles.

## Deploy
Upload/extract to SmartASP root and do not overwrite data/production.env or data/nexo_ride_db.json. Restart Node.js.
