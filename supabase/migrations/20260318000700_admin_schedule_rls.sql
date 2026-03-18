-- Allow admin users to manage all scheduling support tables from the browser admin UI

DROP POLICY IF EXISTS "Admins manage staff breaks" ON public.staff_breaks;
CREATE POLICY "Admins manage staff breaks"
ON public.staff_breaks
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

DROP POLICY IF EXISTS "Admins manage staff time off" ON public.staff_time_off;
CREATE POLICY "Admins manage staff time off"
ON public.staff_time_off
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

DROP POLICY IF EXISTS "Admins manage blocked slots" ON public.blocked_slots;
CREATE POLICY "Admins manage blocked slots"
ON public.blocked_slots
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);
