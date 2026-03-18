# Supabase Setup Order

This repository currently keeps SQL in separate files by concern and by iteration history. Use the order below as the canonical path for a clean setup or for validating an existing dev database.

## Canonical Order

1. [`supabase-setup.sql`](./supabase-setup.sql)
   - Creates the legacy base tables and seed data that the project still expects.
   - Treat this as the historical baseline for the current codebase.

2. [`sql-update.sql`](./sql-update.sql)
   - Adds the booking v2 columns and supporting schedule tables.
   - Introduces `buffer_min`, `appointment_date`, `start_time`, `end_time`, `staff_service_map`, `staff_breaks`, `staff_time_off`, and `blocked_slots`.

3. [`sql-booking-v2.sql`](./sql-booking-v2.sql)
   - Backfills and normalizes booking data into the newer booking shape.
   - Adds overlap protection and indexes for staff/date lookups.

4. [`sql-auth-membership.sql`](./sql-auth-membership.sql)
   - Creates `member_profiles`.
   - Adds the `auth.users` trigger that seeds profiles.
   - Enables row-level security for member-owned booking reads and writes.

5. [`sql-admin-auth-rls.sql`](./sql-admin-auth-rls.sql)
   - Adds `is_admin` to member profiles.
   - Tightens admin policies around staff, services, coupons, settings, bookings, orders, tickets, reviews, and shifts.

## Legacy / Do Not Use As Baseline

- [`sql-fix-permissions.sql`](./sql-fix-permissions.sql) is a legacy emergency repair script.
- It broadens access too much for a clean setup and should not be part of a fresh baseline.
- Only inspect it if you are diagnosing an already broken development database.

## Recommended Fresh Setup

1. Create a new Supabase project or a clean development database.
2. Run the canonical order above from top to bottom.
3. Mark at least one user as admin in `member_profiles`.
4. Populate the tables with the desired services, staff, settings, and content.
5. Verify the public pages, booking flow, `/account`, and admin access after the SQL is applied.

## Compatibility Notes

- `bookings` currently supports both legacy fields (`date`, `time`) and the newer structured fields (`appointment_date`, `start_time`, `end_time`, `buffer_end_time`).
- The newer structured fields should be treated as the source of truth for new work.
- When extending schema, prefer adding idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements instead of rewriting the legacy tables in place.

