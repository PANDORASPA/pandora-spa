# PANDORA HEAD SPA

PANDORA HEAD SPA is a head spa booking, member, package, and admin management app built with Next.js and Supabase. The public positioning follows the Palace Hair Spa reference title: `Pandora Head Spa．全自助頭皮護理中心`.

## Current Scope

- Public pages for home, head spa services, tickets, products, team, articles, FAQs, and booking entry points.
- Supabase Auth for member login, registration, account access, booking ownership, and package visibility.
- Server routes for availability, booking creation, product orders, ticket purchase, payment confirmation, and ticket CSV import.
- Admin dashboard for bookings, customers, services, staff, coupons, content, inventory, analytics, settings, ticket payment confirmation, and legacy ticket import.

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

5. Optionally run [`supabase/seed.sql`](./supabase/seed.sql) for demo head spa content.

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
- Members can select a valid `user_tickets` entitlement during booking to reduce the amount due to `$0` and deduct one package count.

### Orders

- Product checkout posts to `/api/orders/create`.
- Frontend cart storage uses `pandora_cart` and is treated as UI-only state.
- Member identity and order ownership do not rely on browser-stored user objects.
- Order totals are recomputed on the server from live product rows; client-supplied totals are ignored.

### Tickets

- Ticket purchases post to `/api/tickets/purchase`.
- Ticket entitlements are only issued after an explicitly confirmed payment path.
- Unpaid ticket purchase requests create an order record in `awaiting_payment` state instead of minting `user_tickets`.
- Admins can confirm eligible ticket payments and import legacy customer ticket balances by CSV.

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
3. Create a head spa booking and confirm it appears in member bookings.
4. Cancel or reschedule a booking and confirm ownership rules hold.
5. Purchase a ticket and confirm the order stays `awaiting_payment` until admin confirmation.
6. Confirm admin payment approval creates the correct `user_tickets` row.
7. Place a product order and confirm an `orders` row is created.
8. Log into an admin account and confirm `/admin` is accessible.
9. Confirm a non-admin account is redirected away from `/admin`.
10. Run `npm run build` and keep the output as the latest baseline.
11. Keep any real production content separate from `supabase/seed.sql`.

For Palace Hair Spa replacement readiness, use [`PALACEHAIRSPA_REPLACEMENT_ACCEPTANCE.md`](./PALACEHAIRSPA_REPLACEMENT_ACCEPTANCE.md).

## Known Follow-Up Work

- Validate the new migration set against a real Supabase project, not only through local build success.
- Validate RLS and admin access in the real Supabase project after applying the new migrations.
- Add real payment handling so ticket issuance can move from manual payment gating to provider-confirmed settlement.
- Add production address, phone, price list, photos, social links, and SEO assets once confirmed by the business owner.

## License

MIT
