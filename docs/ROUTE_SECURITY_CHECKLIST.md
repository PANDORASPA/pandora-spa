# Route Security Checklist

## Scope
- `POST /api/bookings/create`
- `PATCH /api/account/bookings/[id]`
- `GET /api/admin/member-profiles`
- `POST /api/admin/member-profiles`
- `/api/availability`
- `/api/availability/month-summary`
- `/api/availability/date-summary`

## Security Model
### Public
- `/api/availability`
- `/api/availability/month-summary`
- `/api/availability/date-summary`

Rules:
- Only return booking-availability data required by the public booking flow.
- Do not return member profile data, order data, or admin-only diagnostics.
- Public booking ignores location/provider-group gating by design.

### Authenticated
- `POST /api/bookings/create`

Rules:
- Must require a valid authenticated session.
- Must derive member identity from session user.
- Must never trust client-submitted user identity fields.
- May use service-role queries only after auth succeeds.

### Owner-only
- `PATCH /api/account/bookings/[id]`

Rules:
- Must require a valid authenticated session.
- Must scope booking lookup by both `booking.id` and `user.id`.
- Must reject operations on bookings not owned by the current user.
- Rollback failures must return explicit error codes.

### Admin-only
- `GET /api/admin/member-profiles`
- `POST /api/admin/member-profiles`

Rules:
- Must require a valid authenticated session.
- Must verify `member_profiles.is_admin === true` for the current user before using service-role access.
- Must not allow non-admin callers to enumerate or mutate account diagnostics.

## Operational Notes
- Service-role routes remain acceptable in this project, but every route must enforce route-level auth and ownership checks.
- `member_profiles` is the source of truth for admin gating.
- `customers` is not an auth source and must not be used to decide backend access.

## Smoke Verification
- Non-admin user cannot access `/api/admin/member-profiles`.
- Logged-out user cannot create a booking.
- Logged-in user cannot patch another user’s booking.
- Public availability endpoints remain accessible without login.
