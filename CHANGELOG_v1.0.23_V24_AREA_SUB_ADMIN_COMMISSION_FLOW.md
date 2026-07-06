# NEXO Ride v1.0.23 V24 — Area Sub Admin + Commission Flow

Added area-based Sub Admin model.

## Added
- Main Admin can create Sub Admin for an area/locality
- Sub Admin can add Passenger/Driver under own area
- Driver profile now supports area/sub_admin_user_id linkage
- Completed ride now calculates Sub Admin commission from platform commission
- Default Sub Admin share: 30% of platform commission
- Main Admin can mark Sub Admin commission as paid
- Admin Web App has new Sub Admin tab
- Dashboard shows Sub Admin pending commission

## Rule
Sub Admin commission is calculated from platform commission, not total fare. Example: fare ₹100, platform commission 10% = ₹10, Sub Admin share 30% of ₹10 = ₹3.
