# NEXO Ride v2.0 Sprint-5D - Passenger Ride Details Cleanup

Server update only.

## Fixed
- Passenger ride details no longer show internal driver earning, platform commission, or settlement fields.
- Passenger ride card/detail now shows customer-facing fields only: fare, payment, ride type, distance, refund when applicable.
- Driver and admin views still keep earning/commission/settlement information where relevant.
- Passenger profile Wallet/Fare label cleaned up to Payment/Fare/Refund wording.

## Deploy
Upload/extract on SmartASP root, overwrite app files, keep data/production.env and data/nexo_ride_db.json unchanged, then restart Node.js.
