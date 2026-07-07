# NEXO Ride Security + Audit + RBAC Guide

## Purpose
এই update-এ Admin panel-এ Security tab যোগ করা হয়েছে, যাতে কে কখন কী কাজ করেছে তার audit trail দেখা যায়।

## কী কী আছে
- Active session count
- Audit event count
- Main Admin count
- Sub Admin count
- Role-wise permission matrix
- Password change option
- Recent audit trail

## Role Rules
- Passenger: booking, payment, ride history, rating, SOS
- Driver: KYC submit, online/offline, accept ride, start/complete ride, wallet
- Sub Admin: নিজের area-এর passenger/driver add, driver approval, area commission, payout request
- Main Admin: full access, driver KYC, settlement, sub admin, audit, backup

## Important
Production launch-এর আগে default admin password `admin@123` বদলানো বাধ্যতামূলক।
