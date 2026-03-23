# Account Model

## Source of Truth
- `member_profiles` is the primary account record shown in admin.
- Supabase Auth is the login identity source.
- `member_profiles.is_admin` controls admin access.

## Status Definitions
### Profile + Auth user
- `member_profiles.id` matches an existing Supabase Auth user id.
- Account can log in if credentials are valid.

### Profile only
- Profile row exists but no Auth user is found for the same id.
- Treat as an incomplete or legacy account record.

### Auth user with incomplete profile
- Auth user exists but required member fields are missing.
- Show as needing profile completion.

### Admin vs member
- `is_admin = true` means the account is allowed to enter `/admin`.
- `is_admin = false` means standard member only.

## Legacy Customer Data
- `customers` remains legacy operational data.
- `customers` must not be treated as an account or permission source.
- Legacy-only customer rows should appear as “未綁定帳號” in admin diagnostics.

## Admin UI Rules
- Customers tab = member account management.
- Admin diagnostics should show:
  - profile id
  - auth user exists
  - auth email
  - member email
  - phone
  - admin flag

## Verification Cases
- Kevin
- VIKKI
- one newly registered member
- one legacy customer without auth linkage
