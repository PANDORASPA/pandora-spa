# VIVA HAIR Validation Report

## Verified

- Workspace is linked to Supabase project `khjjvjufwbmqymgzhbkl` (`Viva hair salon`).
- Remote migration history matches local migrations:
  - `20260318000100`
  - `20260318000200`
  - `20260318000300`
  - `20260318000400`
- Remote signup fix migration is applied:
  - `20260318000500`
- Local `.env.local` now points to the current Supabase project URL and keys.
- `supabase/config.toml` was aligned with the linked project's auth settings to reduce CLI config drift warnings.
- `npm run build` completes successfully.
- A real admin profile exists:
  - `salonmmchk@gmail.com`
  - `is_admin = true`
- Core tables are reachable from the live project:
  - `member_profiles`
  - `bookings`
  - `orders`
  - `user_tickets`
  - `staff_shifts`
  - `staff_breaks`
  - `staff_time_off`
  - `blocked_slots`
- Live member signup now succeeds again.
- Signup automatically creates a matching `member_profiles` row.

## Latest Validation

- `auth.signUp(...)` now succeeds against the live project.
- A fresh test account was created successfully.
- The linked `member_profiles` row is present immediately after signup.
- Current profile sync creates the row reliably, but profile fields such as `full_name` and `phone` are still `null` until the app updates them later.

## Impact

- Existing admin access continues to work.
- New member registration is no longer blocked at the Auth/database layer.
- End-to-end live validation can now continue with:
  - account access
  - booking creation
  - ticket purchase
  - product order

## Recommended Next Check

1. Re-run a full live member journey:
   - member registration
   - account access
   - booking creation
   - ticket purchase
   - product order
2. Verify the app updates `member_profiles.full_name` and `member_profiles.phone` as expected after registration/profile save.
3. Validate admin-side schedule changes against live availability blocking:
   - shop `days_off`
   - staff weekly schedule
   - date-specific `staff_shifts`
   - `blocked_slots`
4. Manually verify non-admin users are redirected away from `/admin`.
