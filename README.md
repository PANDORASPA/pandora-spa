# VIVA HAIR

VIVA HAIR is a salon booking and member management app built with Next.js and Supabase.

## Current Scope

- Public pages for home, services, tickets, products, team, articles, FAQs, and booking entry points.
- Supabase Auth for member login, registration, account access, and booking ownership.
- Server routes for availability, booking creation, order creation, and ticket purchase.
- Admin dashboard for bookings, customers, services, staff, coupons, content, inventory, analytics, and settings.

## Local Development

1. Install dependencies.

```bash
npm install
```

2. Copy `.env.example` to `.env.local`.

3. Fill in the required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:

- `NEXT_PUBLIC_SITE_URL`

4. Apply the canonical migrations in [`supabase/migrations`](./supabase/migrations).

5. Optionally run [`supabase/seed.sql`](./supabase/seed.sql) for demo content.

6. Start the app.

```bash
npm run dev
```

7. Build for production validation.

```bash
npm run build
```

## Auth Model

- Member identity comes from Supabase Auth.
- `member_profiles` is the profile extension table for authenticated users.
- `/account` and admin access depend on authenticated sessions, not `localStorage`.
- Admin authorization is based on `member_profiles.is_admin` plus SQL policies.

## Core Flows

### Booking

- Availability and booking creation go through server routes.
- The current source-of-truth booking fields are:
  - `appointment_date`
  - `start_time`
  - `end_time`
  - `buffer_end_time`
  - `duration_min`
  - `buffer_min`
  - `user_id`
  - `service_id`
  - `staff_id`
- Legacy `date` and `time` fields remain transitional compatibility fields only.

### Orders

- Product checkout posts to `/api/orders/create`.
- Frontend cart storage is limited to `viva_cart` and is treated as UI-only state.
- Member identity and order ownership do not rely on browser-stored user objects.
- Order totals are recomputed on the server from live product rows; client-supplied totals are ignored.

### Tickets

- Ticket purchases post to `/api/tickets/purchase`.
- Ticket entitlements are only issued after an explicitly confirmed payment path.
- Unpaid ticket purchase requests now create an order record in `awaiting_payment` state instead of minting `user_tickets`.

## Supabase Setup

The canonical schema now lives under [`supabase/migrations`](./supabase/migrations).

Fresh setup checklist:

1. Create a clean Supabase project or reset the development database.
2. Apply the migration files in filename order from `supabase/migrations`.
3. Optionally run [`supabase/seed.sql`](./supabase/seed.sql) for demo content.
4. Create a test member account through the app.
5. Mark one user as admin in `member_profiles`.
6. Verify public pages, `/account`, booking flow, orders, tickets, and `/admin`.

Legacy note:

- The old root-level SQL files remain in the repo as historical reference only.
- `sql-fix-permissions.sql` is an emergency legacy repair script and must not be used as part of a clean setup.

## Verification Checklist

Before demo or launch review:

1. Register a new member and confirm a `member_profiles` row is created.
2. Log in and confirm `/account` shows member data correctly.
3. Create a booking and confirm it appears in member bookings.
4. Cancel or reschedule a booking and confirm ownership rules hold.
5. Purchase a ticket and confirm a `user_tickets` row is created.
   - Also verify unpaid purchase attempts stay as `awaiting_payment` orders and do not mint tickets.
6. Place a product order and confirm an `orders` row is created.
   - The stored total should match live product prices even if the frontend payload is tampered with.
7. Log into an admin account and confirm `/admin` is accessible.
8. Confirm a non-admin account is redirected away from `/admin`.
9. Run `npm run build` and keep the output as the latest baseline.
10. Keep any real production content separate from `supabase/seed.sql`.

For Palace Hair Spa replacement readiness, use [`PALACEHAIRSPA_REPLACEMENT_ACCEPTANCE.md`](./PALACEHAIRSPA_REPLACEMENT_ACCEPTANCE.md).

## Known Follow-Up Work

- Validate the new migration set against a real Supabase project, not only through local build success.
- Validate RLS and admin access in the real Supabase project after applying the new migrations.
- Add real payment handling so ticket issuance can move from manual payment gating to provider-confirmed settlement.
- Continue polishing remaining admin tabs and operational content.

## License

MIT
