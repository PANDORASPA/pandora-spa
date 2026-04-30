# PANDORA HEAD SPA

PANDORA HEAD SPA is a head spa booking, member, package, Stripe payment, and admin management app built with Next.js and Supabase. The public positioning follows the Palace Hair Spa replacement direction: `Pandora Head Spa．全自助頭皮護理中心`.

## Current Scope

- Public pages for home, head spa services, packages, products, team, articles, FAQs, and booking entry points.
- Supabase Auth for member login, registration, account access, booking ownership, and package visibility.
- Server routes for availability, booking creation, product orders, package purchase, Stripe Checkout, webhook fulfilment, manual payment confirmation, and legacy package CSV import.
- Admin dashboard for bookings, customers, services, staff, coupons, content, inventory, analytics, settings, package payment confirmation, and legacy package import.

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
- `NEXT_PUBLIC_SITE_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CURRENCY` (defaults to `hkd`)

4. Apply the canonical migrations in [`supabase/migrations`](./supabase/migrations).

5. Optionally run [`supabase/seed.sql`](./supabase/seed.sql) for local sample head spa content.

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
- Members can select a valid `user_tickets` entitlement during booking to reduce the amount due to `$0` and deduct one package count.
- Ticket redemption and cancellation reimbursement are recorded in `ticket_redemptions`.

### Orders And Stripe

- Product checkout posts to `/api/orders/create`.
- Package checkout posts to `/api/tickets/purchase`.
- Stripe Checkout is available for package and product orders when Stripe environment variables are configured.
- Stripe webhooks post to `/api/stripe/webhook`; successful package payments issue `user_tickets` and write `ticket_redemptions`.
- Manual payment confirmation remains available in admin as a backup settlement path.

### Packages

- Public and admin copy uses the customer-facing term `套票`.
- `tickets` stores the package catalog.
- `user_tickets` stores member-owned package balances.
- `ticket_redemptions` is the immutable ledger for issue, redemption, and reimbursement events.

## Supabase Setup

The canonical schema lives under [`supabase/migrations`](./supabase/migrations).

Fresh setup checklist:

1. Create a clean Supabase project or reset the development database.
2. Apply the migration files in filename order from `supabase/migrations`.
3. Optionally run [`supabase/seed.sql`](./supabase/seed.sql) for local sample content.
4. Create a test member account through the app.
5. Mark one user as admin in `member_profiles`.
6. Verify public pages, `/account`, booking flow, orders, packages, Stripe webhook, and `/admin`.

Legacy note:

- The old root-level SQL files remain in the repo as historical reference only.
- `sql-fix-permissions.sql` is an emergency legacy repair script and must not be used as part of a clean setup.

## Verification Checklist

Before launch review:

1. Register a new member and confirm a `member_profiles` row is created.
2. Log in and confirm `/account` shows member data correctly.
3. Create a head spa booking and confirm it appears in member bookings.
4. Purchase a package with Stripe test card and confirm webhook fulfilment creates `user_tickets`.
5. Purchase a package through manual payment and confirm it stays `awaiting_payment` until admin approval.
6. Book with a valid package and confirm one count is deducted.
7. Cancel a package booking and confirm one count is restored.
8. Confirm admin payment approval creates the correct `user_tickets` row.
9. Place a product order and confirm Stripe success marks it completed.
10. Log into an admin account and confirm `/admin` is accessible.
11. Confirm a non-admin account is redirected away from `/admin`.
12. Run `npm run build` and keep the output as the latest baseline.

For Palace Hair Spa replacement readiness, use [`PALACEHAIRSPA_REPLACEMENT_ACCEPTANCE.md`](./PALACEHAIRSPA_REPLACEMENT_ACCEPTANCE.md).

## Known Follow-Up Work

- Validate all migrations, RLS policies, RPCs, and admin access against the real production Supabase project.
- Configure production Stripe live keys, webhook endpoint, and `NEXT_PUBLIC_SITE_URL`, then run a full live-mode payment rehearsal before DNS cutover.
- Add confirmed production address, phone, WhatsApp, price list, photos, social links, opening hours, and SEO assets once approved by the business owner.

## License

MIT
