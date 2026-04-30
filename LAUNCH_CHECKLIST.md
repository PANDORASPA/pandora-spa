# PANDORA HEAD SPA Launch Checklist

Use [`PALACEHAIRSPA_REPLACEMENT_ACCEPTANCE.md`](./PALACEHAIRSPA_REPLACEMENT_ACCEPTANCE.md) as the acceptance board for the Palace Hair Spa replacement and PANDORA HEAD SPA launch readiness.

## Environment

- Confirm `.env.local` contains the correct project URL, anon key, and service role key.
- Confirm Stripe keys and webhook secret are set for production payment:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_CURRENCY`
- Confirm the local workspace is linked to the correct Supabase project.
- Confirm `supabase/migrations` is the only official schema source going forward.

## Database

- Confirm the canonical migrations are present on remote.
- Confirm core tables exist:
  - `member_profiles`
  - `bookings`
  - `orders`
  - `tickets`
  - `user_tickets`
  - `ticket_redemptions`
  - `staff_shifts`
  - `staff_breaks`
  - `staff_time_off`
  - `blocked_slots`
- Confirm at least one admin row exists in `member_profiles`.
- Decide whether to keep production content manual or load `supabase/seed.sql` for demo use only.

## Accounts And Roles

- Verify the intended admin account can log into `/admin`.
- Verify a normal member account is redirected away from `/admin`.
- Verify a new member signup creates a `member_profiles` row automatically.

## Core Flows

- Booking:
  - Log in as a member.
  - Create a head spa booking.
  - Confirm it appears in `/account/bookings`.
  - Cancel or reschedule it and confirm only that member can change it.
- Tickets:
  - Purchase a ticket.
  - Confirm unpaid purchase remains an `awaiting_payment` order.
  - Confirm Stripe ticket payment redirects to Checkout and webhook creates `user_tickets`.
  - Confirm admin payment approval creates a `user_tickets` row with the correct `member_user_id`.
  - Confirm booking can consume only that member's valid ticket.
- Orders:
  - Place a product order.
  - Confirm an `orders` row is created with the correct `member_user_id`.
- Admin:
  - Confirm bookings, orders, customers, services, tickets, CSV import, and settings load in `/admin`.

## Content

- Replace any remaining demo or placeholder copy with real PANDORA HEAD SPA information.
- Confirm services, staff, tickets, FAQs, and articles reflect current head spa business data.
- Confirm phone, address, hours, and contact links are production-ready.

## Build And Release

- Run `npm run build` and save the latest successful output.
- Smoke test the main flows on desktop.
- Smoke test the main flows on mobile.
- Keep a copy of the current migration state and linked project ref before any future schema changes.

## Rollback Notes

- Do not edit root-level legacy SQL files as the live schema source.
- If a future schema change fails, create a new forward migration instead of editing already-applied migrations.
- Keep production content changes separate from schema migrations whenever possible.
