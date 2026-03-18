-- Harden signup/profile sync so auth user creation can persist member_profiles reliably.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.member_profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

ALTER TABLE public.member_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can insert own profile" ON public.member_profiles;
CREATE POLICY "Members can insert own profile"
ON public.member_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Service role can manage profiles" ON public.member_profiles;
CREATE POLICY "Service role can manage profiles"
ON public.member_profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Postgres can insert profiles" ON public.member_profiles;
CREATE POLICY "Postgres can insert profiles"
ON public.member_profiles
FOR INSERT
TO postgres
WITH CHECK (true);
