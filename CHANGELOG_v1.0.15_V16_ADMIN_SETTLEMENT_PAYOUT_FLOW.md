# NEXO Ride v1.0.15 V16 — Admin Settlement + Payout Flow

এই update-এ driver earning-এর পর admin payout settlement flow যোগ করা হয়েছে।

## Added
- Admin Payment Monitor-এ Driver Payout Settlement section
- Driver-wise pending payout grouping
- Admin “Mark Paid” action
- Payment reference / UPI transaction ID note save
- Completed ride settlement status: PENDING → PAID
- Driver wallet-এ Paid payout এবং settlement history
- Settlement records saved in database
- Admin summary-তে paid payout tracking

## Flow
Ride Complete → Driver earning generated → Admin Payment Monitor → Mark Paid → Driver wallet settlement history updated.

Cache/version: 115v16
