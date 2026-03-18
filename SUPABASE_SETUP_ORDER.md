# Supabase Setup Order

The canonical database source now lives under [`supabase/migrations`](./supabase/migrations). The root-level SQL files remain in the repository only as legacy reference material from the pre-migration cleanup stage.

## Canonical Migration Order

Apply the files in filename order:

1. [`supabase/migrations/20260318000100_baseline_core_schema.sql`](./supabase/migrations/20260318000100_baseline_core_schema.sql)
   - Creates the current baseline business tables, core indexes, and public read policies.
   - Excludes demo content.

2. [`supabase/migrations/20260318000200_booking_v2.sql`](./supabase/migrations/20260318000200_booking_v2.sql)
   - Adds booking v2 normalization, overlap protection, and scheduling helper tables.

3. [`supabase/migrations/20260318000300_auth_membership.sql`](./supabase/migrations/20260318000300_auth_membership.sql)
   - Creates `member_profiles`, auth trigger wiring, and member-owned booking/profile policies.

4. [`supabase/migrations/20260318000400_admin_auth_rls.sql`](./supabase/migrations/20260318000400_admin_auth_rls.sql)
   - Adds admin flags and the RLS policies used by the current admin and member flows.

## Optional Seed

- [`supabase/seed.sql`](./supabase/seed.sql) contains clean demo content for local development and internal demos.
- Do not treat the seed file as production content.
- Fresh production setup should run migrations first, then only run selected data imports that reflect real shop content.

## Recommended Fresh Setup

1. Create a clean Supabase project or reset a development database.
2. Apply the files in `supabase/migrations` in filename order.
3. Optionally run `supabase/seed.sql` for demo or development content.
4. Create or register at least one member account through the app.
5. Mark one row in `member_profiles` as admin:

```sql
update public.member_profiles
set is_admin = true
where email = 'you@example.com';
```

6. Verify `/account`, booking, product order, ticket purchase, and `/admin`.

## Legacy SQL Status

- [`supabase-setup.sql`](./supabase-setup.sql), [`sql-update.sql`](./sql-update.sql), [`sql-booking-v2.sql`](./sql-booking-v2.sql), [`sql-auth-membership.sql`](./sql-auth-membership.sql), and [`sql-admin-auth-rls.sql`](./sql-admin-auth-rls.sql) are now legacy source material.
- They should not be used as the fresh setup path going forward.
- [`sql-fix-permissions.sql`](./sql-fix-permissions.sql) remains an emergency legacy repair script and must not be used as part of a clean baseline.

## Compatibility Notes

- `bookings` still keeps legacy `date` and `time` fields for compatibility, but new work should treat `appointment_date`, `start_time`, `end_time`, and `buffer_end_time` as source of truth.
- `orders.member_user_id` and `user_tickets.member_user_id` are the current member ownership fields used by the app.
- `users` is a historical table from the legacy schema and is not the active member identity source.
