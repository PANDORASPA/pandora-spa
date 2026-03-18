-- VIVA HAIR signup debug checklist
-- Run these queries in Supabase SQL Editor when investigating signup failures.

-- 1. Check whether the profile sync function exists and is a security definer.
select
  n.nspname as schema_name,
  p.proname as function_name,
  p.prosecdef as is_security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('handle_new_auth_user', 'set_updated_at');

-- 2. Check that the auth.users trigger is attached.
select
  tgname,
  tgrelid::regclass as table_name,
  tgenabled
from pg_trigger
where tgname = 'on_auth_user_created';

-- 3. Inspect the member_profiles table structure.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'member_profiles'
order by ordinal_position;

-- 4. Inspect current member profile policies.
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'member_profiles';

-- 5. Inspect the latest auth users and related member profiles.
select id, email, created_at
from auth.users
order by created_at desc
limit 10;

select id, email, full_name, is_admin, created_at
from public.member_profiles
order by created_at desc
limit 10;
