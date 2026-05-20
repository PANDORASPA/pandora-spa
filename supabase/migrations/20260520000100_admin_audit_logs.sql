CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  before_data JSONB,
  after_data JSONB,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_actor_idx
ON public.admin_audit_logs(actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS admin_audit_logs_target_idx
ON public.admin_audit_logs(target_table, target_id, created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins read audit logs"
ON public.admin_audit_logs
FOR SELECT
TO authenticated
USING (public.is_admin_user());

DROP POLICY IF EXISTS "Admins write audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins write audit logs"
ON public.admin_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Service role manages audit logs" ON public.admin_audit_logs;
CREATE POLICY "Service role manages audit logs"
ON public.admin_audit_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.write_admin_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID := auth.uid();
  row_id TEXT;
BEGIN
  IF actor_id IS NULL OR NOT public.is_admin_user(actor_id) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  row_id := COALESCE((to_jsonb(NEW)->>'id'), (to_jsonb(OLD)->>'id'));

  INSERT INTO public.admin_audit_logs (
    actor_user_id,
    action,
    target_table,
    target_id,
    before_data,
    after_data
  )
  VALUES (
    actor_id,
    TG_OP,
    TG_TABLE_NAME,
    row_id,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.write_admin_audit_log() FROM PUBLIC;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'settings',
    'orders',
    'bookings',
    'tickets',
    'user_tickets',
    'ticket_redemptions',
    'services',
    'products',
    'staff',
    'staff_shifts',
    'staff_breaks',
    'staff_time_off',
    'blocked_slots',
    'locations',
    'provider_groups',
    'resources',
    'holidays',
    'coupons',
    'customers',
    'member_profiles'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS admin_audit_%I ON public.%I', table_name, table_name);
    EXECUTE format(
      'CREATE TRIGGER admin_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.write_admin_audit_log()',
      table_name,
      table_name
    );
  END LOOP;
END;
$$;
