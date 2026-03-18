# VIVA HAIR

Hair salon booking and admin system built with Next.js and Supabase.

## What is already here

- Public site with services, packages, articles, FAQs, products, and booking entry points.
- Supabase Auth for member login, registration, account access, and member bookings.
- Server-side booking availability and create routes.
- Admin dashboard tabs for bookings, staff, services, inventory, coupons, articles, FAQs, customers, analytics, and settings.

## Setup

1. Install dependencies.

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and fill in the Supabase values.

3. Apply the SQL files in the order documented in [`SUPABASE_SETUP_ORDER.md`](./SUPABASE_SETUP_ORDER.md).

4. Start the app.

```bash
npm run dev
```

5. Build for production.

```bash
npm run build
```

## Environment Variables

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:

- `NEXT_PUBLIC_SITE_URL`

## Authentication Flow

- Member auth uses Supabase Auth.
- `/account` is protected by middleware and requires a valid session.
- `member_profiles` is the profile extension table for authenticated users.
- Admin access is intended to be controlled by Supabase-backed roles and SQL policies, not by a front-end password or `localStorage`.

## Booking Flow

- The canonical booking shape uses `appointment_date`, `start_time`, `end_time`, `buffer_end_time`, `duration_min`, `buffer_min`, `user_id`, `service_id`, and `staff_id`.
- Legacy `date` and `time` fields are transitional compatibility fields only.
- Availability checks and booking creation should go through server routes, not direct browser writes.

## Admin Flow

- Admin reads and writes should be protected by RLS and server-side policy checks.
- The old `localStorage`-based admin gate is a legacy development pattern and should not be used as a security boundary.

## SQL Notes

- The current SQL files are intentionally split by concern and history.
- The canonical execution order is documented in [`SUPABASE_SETUP_ORDER.md`](./SUPABASE_SETUP_ORDER.md).
- `sql-fix-permissions.sql` is a legacy repair script and should not be part of a fresh baseline.

## Troubleshooting

- If `npm run build` fails because dependencies are missing, run `npm install` first.
- If Supabase queries fail, confirm that your `.env.local` has the correct project URL, anon key, and service role key.

## License

MIT
