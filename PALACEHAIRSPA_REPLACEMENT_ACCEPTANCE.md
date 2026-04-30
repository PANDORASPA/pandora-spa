# PANDORA HEAD SPA Replacement Acceptance Criteria

Use this board to confirm the new PANDORA HEAD SPA site is ready to stand in for the current Palace Hair Spa public and operational experience. The reference source is `www.palacehairspa.com`, whose visible title identifies the business direction as `Pandora Head Spa．全自助頭皮護理中心`.

## Public Site Parity

- Home page communicates `PANDORA HEAD SPA 全自助頭皮護理中心`, contact options, hours, and primary booking call to action above the fold.
- Head spa services, packages, products, care team, articles/news, FAQs, and contact content are present with production-ready copy.
- Navigation exposes the approved customer-facing destinations for the replacement site.
- Phone, address, map, social, and messaging links open the correct production destinations once confirmed.
- Legacy or external URLs that matter for customers are redirected or represented in the new navigation.
- Placeholder images, lorem ipsum, test pricing, old salon labels, and sample-only labels are removed before launch.

## Booking

- A guest or member can start booking from all primary public entry points.
- A member can select head spa service, staff where applicable, date, and available time without seeing blocked or invalid slots.
- Booking creation stores the correct member, service, staff, appointment date, start time, end time, duration, and buffer fields.
- Booking confirmation is clear on screen and the booking appears in the member account.
- Members can cancel or reschedule only their own bookings.
- Booking validation handles unavailable staff, blocked slots, breaks, time off, duplicate submissions, and expired availability.
- Admin users can see new bookings in the admin dashboard with customer, service, payment, and package context.

## Packages And Tickets

- Package listings show correct names, descriptions, prices, validity rules, usage rules, and availability.
- Package purchase creates an order tied to the authenticated member.
- Entitlements are issued only after Stripe confirms payment or admin uses the approved manual confirmation path.
- Unpaid package requests remain in an awaiting-payment state and do not create usable entitlements.
- Member-owned packages are visible in the member center with remaining balance, status, expiration, purchase source, and usage history where available.
- Booking can consume only the authenticated member's valid package entitlement.
- Package redemption and cancellation reimbursement are recorded in `ticket_redemptions`.

## Member Center

- Signup creates a member profile and login redirects to the intended member experience.
- Account pages show profile details, bookings, orders, packages, and membership state using authenticated session data.
- Member data does not rely on browser-stored user objects as an authority.
- Members cannot view, cancel, reschedule, or consume another member's records.
- Logout clears the session and protected account pages require a fresh authenticated session.
- Empty, loading, error, unpaid, cancelled payment, and unauthenticated states are understandable and production-ready.

## Admin Import And Payment Confirmation

- Admin-only routes require an authenticated admin profile and reject non-admin members.
- Admin package CSV import accepts the approved template: `email`, `phone`, `full_name`, `ticket_name`, `service_name`, `remaining_count`, `expiry_date`, `note`.
- Imports validate required fields, reject malformed rows, and report row-level errors before production data is changed.
- Import runs are repeatable or clearly guarded against duplicate production records.
- Admin users can manually confirm eligible package payments and see the resulting order and package state change.
- Stripe Checkout success for a package order creates the member package automatically through the webhook path.
- Payment confirmation actions are auditable with actor, timestamp, target record, and resulting status where supported by the schema.
- Failed or partial import and confirmation flows leave records in a recoverable state.

## Mobile

- Public pages, booking, member center, and admin-critical views are usable at common mobile widths.
- Navigation, forms, calendars or date controls, package cards, and account tables do not overflow or hide required actions.
- Tap targets are large enough for practical use and form inputs trigger appropriate mobile keyboards.
- Booking and payment-confirmation flows can be completed on mobile without desktop-only affordances.
- Mobile smoke testing covers at least one iOS-sized and one Android-sized viewport.

## SEO And Sharing

- Each public page has production-ready title and description metadata.
- Canonical URLs, robots settings, sitemap, and structured data are correct for launch.
- Brand name, service names, address, phone number, and opening hours are crawlable as text.
- Open Graph and social sharing metadata use production images and copy.
- Removed or renamed public routes have redirects where needed to preserve customer and search traffic.
- No staging, localhost, or sample URLs are exposed in public metadata.

## Launch

- Environment variables point to the intended production Supabase project, Stripe account, and public site URL.
- Canonical migrations have been applied in order and the production database contains required admin and content records.
- `npm run build` completes successfully and the output is saved as the latest launch baseline.
- Desktop and mobile smoke tests pass for public navigation, booking, package purchase, member center, admin import, and payment confirmation.
- Production content, pricing, staff schedules, package rules, and contact details are approved by the business owner.
- Rollback plan, DNS plan, redirect plan, and post-launch monitoring owner are documented before cutover.
- Launch is accepted only after public parity, booking, packages, member center, admin, mobile, SEO, Stripe, Supabase, and smoke checks are complete.
