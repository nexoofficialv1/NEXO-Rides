-- NEXO Ride production DB direction (starter note)
-- Prototype uses data/nexo_ride_db.json. Public launch should migrate to PostgreSQL.

CREATE TABLE users (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, mobile TEXT UNIQUE NOT NULL, email TEXT, role TEXT NOT NULL,
  area TEXT, status TEXT NOT NULL, password_hash TEXT NOT NULL, password_salt TEXT NOT NULL,
  consent_at TIMESTAMPTZ, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
);

CREATE TABLE driver_profiles (
  id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id), vehicle_type TEXT, vehicle_no TEXT,
  license_no TEXT, aadhaar_no TEXT, area TEXT, sub_admin_user_id TEXT, status TEXT, online BOOLEAN,
  rating NUMERIC DEFAULT 5, total_rides INT DEFAULT 0, total_earnings NUMERIC DEFAULT 0, pending_payout NUMERIC DEFAULT 0
);

CREATE TABLE rides (
  id TEXT PRIMARY KEY, passenger_id TEXT REFERENCES users(id), driver_id TEXT REFERENCES users(id),
  pickup TEXT, drop_location TEXT, ride_type TEXT, distance_km NUMERIC, estimated_fare NUMERIC,
  status TEXT, payment_status TEXT, ride_otp TEXT, platform_commission NUMERIC, driver_earning NUMERIC,
  sub_admin_user_id TEXT, sub_admin_commission NUMERIC, created_at TIMESTAMPTZ, completed_at TIMESTAMPTZ
);

CREATE TABLE audit_log (id TEXT PRIMARY KEY, user_id TEXT, action TEXT, target TEXT, target_id TEXT, details JSONB, at TIMESTAMPTZ);
