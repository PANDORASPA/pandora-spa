-- Operational foundation for multi-location booking and operations admin

CREATE TABLE IF NOT EXISTS public.locations (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  address TEXT,
  contact_phone TEXT,
  timezone TEXT DEFAULT 'Asia/Hong_Kong',
  enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.provider_groups (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_locations (
  id BIGSERIAL PRIMARY KEY,
  service_id BIGINT NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  location_id BIGINT NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  extra_price INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service_id, location_id)
);

CREATE TABLE IF NOT EXISTS public.staff_provider_groups (
  id BIGSERIAL PRIMARY KEY,
  staff_id BIGINT NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  provider_group_id BIGINT NOT NULL REFERENCES public.provider_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, provider_group_id)
);

CREATE TABLE IF NOT EXISTS public.service_provider_groups (
  id BIGSERIAL PRIMARY KEY,
  service_id BIGINT NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  provider_group_id BIGINT NOT NULL REFERENCES public.provider_groups(id) ON DELETE CASCADE,
  assignment_mode TEXT DEFAULT 'any',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service_id, provider_group_id)
);

CREATE TABLE IF NOT EXISTS public.timetable_templates (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  timezone TEXT DEFAULT 'Asia/Hong_Kong',
  is_default BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.timetable_entries (
  id BIGSERIAL PRIMARY KEY,
  timetable_id BIGINT REFERENCES public.timetable_templates(id) ON DELETE CASCADE,
  staff_id BIGINT REFERENCES public.staff(id) ON DELETE CASCADE,
  location_id BIGINT REFERENCES public.locations(id) ON DELETE CASCADE,
  resource_id BIGINT,
  day_of_week SMALLINT,
  specific_date DATE,
  start_time TIME,
  end_time TIME,
  is_off BOOLEAN DEFAULT false,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.holidays (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  holiday_date DATE NOT NULL,
  end_date DATE,
  location_id BIGINT REFERENCES public.locations(id) ON DELETE CASCADE,
  staff_id BIGINT REFERENCES public.staff(id) ON DELETE CASCADE,
  provider_group_id BIGINT REFERENCES public.provider_groups(id) ON DELETE CASCADE,
  is_closed BOOLEAN DEFAULT true,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.resources (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'room',
  location_id BIGINT REFERENCES public.locations(id) ON DELETE CASCADE,
  capacity INTEGER DEFAULT 1,
  enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'timetable_entries_resource_id_fkey'
  ) THEN
    ALTER TABLE public.timetable_entries
      ADD CONSTRAINT timetable_entries_resource_id_fkey
      FOREIGN KEY (resource_id) REFERENCES public.resources(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.service_resources (
  id BIGSERIAL PRIMARY KEY,
  service_id BIGINT NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  resource_id BIGINT NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(service_id, resource_id)
);

CREATE TABLE IF NOT EXISTS public.booking_resource_allocations (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  resource_id BIGINT NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  allocated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_id, resource_id)
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id BIGSERIAL PRIMARY KEY,
  ref TEXT UNIQUE NOT NULL,
  order_id BIGINT REFERENCES public.orders(id) ON DELETE SET NULL,
  booking_id BIGINT REFERENCES public.bookings(id) ON DELETE SET NULL,
  customer_id BIGINT REFERENCES public.customers(id) ON DELETE SET NULL,
  member_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  kind TEXT DEFAULT 'sale',
  amount INTEGER NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'HKD',
  status TEXT DEFAULT 'completed',
  payment_method TEXT,
  payment_ref TEXT,
  provider TEXT,
  notes TEXT,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS locations_enabled_sort_idx ON public.locations(enabled, sort_order);
CREATE INDEX IF NOT EXISTS provider_groups_enabled_sort_idx ON public.provider_groups(enabled, sort_order);
CREATE INDEX IF NOT EXISTS service_locations_service_idx ON public.service_locations(service_id, enabled);
CREATE INDEX IF NOT EXISTS service_locations_location_idx ON public.service_locations(location_id, enabled);
CREATE INDEX IF NOT EXISTS staff_provider_groups_staff_idx ON public.staff_provider_groups(staff_id);
CREATE INDEX IF NOT EXISTS service_provider_groups_service_idx ON public.service_provider_groups(service_id);
CREATE INDEX IF NOT EXISTS timetable_entries_staff_date_idx ON public.timetable_entries(staff_id, specific_date, day_of_week);
CREATE INDEX IF NOT EXISTS holidays_date_idx ON public.holidays(holiday_date, end_date);
CREATE INDEX IF NOT EXISTS resources_location_idx ON public.resources(location_id, enabled);
CREATE INDEX IF NOT EXISTS service_resources_service_idx ON public.service_resources(service_id);
CREATE INDEX IF NOT EXISTS booking_resource_allocations_booking_idx ON public.booking_resource_allocations(booking_id);
CREATE INDEX IF NOT EXISTS transactions_created_idx ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS transactions_member_idx ON public.transactions(member_user_id, created_at DESC);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_provider_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_provider_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_resource_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read enabled locations" ON public.locations;
CREATE POLICY "Public read enabled locations"
ON public.locations
FOR SELECT
TO anon, authenticated
USING (enabled = true);

DROP POLICY IF EXISTS "Public read enabled service locations" ON public.service_locations;
CREATE POLICY "Public read enabled service locations"
ON public.service_locations
FOR SELECT
TO anon, authenticated
USING (enabled = true);

DROP POLICY IF EXISTS "Admins manage locations" ON public.locations;
CREATE POLICY "Admins manage locations"
ON public.locations
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admins manage provider groups" ON public.provider_groups;
CREATE POLICY "Admins manage provider groups"
ON public.provider_groups
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admins manage service locations" ON public.service_locations;
CREATE POLICY "Admins manage service locations"
ON public.service_locations
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admins manage staff provider groups" ON public.staff_provider_groups;
CREATE POLICY "Admins manage staff provider groups"
ON public.staff_provider_groups
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admins manage service provider groups" ON public.service_provider_groups;
CREATE POLICY "Admins manage service provider groups"
ON public.service_provider_groups
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admins manage timetable templates" ON public.timetable_templates;
CREATE POLICY "Admins manage timetable templates"
ON public.timetable_templates
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admins manage timetable entries" ON public.timetable_entries;
CREATE POLICY "Admins manage timetable entries"
ON public.timetable_entries
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admins manage holidays" ON public.holidays;
CREATE POLICY "Admins manage holidays"
ON public.holidays
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admins manage resources" ON public.resources;
CREATE POLICY "Admins manage resources"
ON public.resources
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admins manage service resources" ON public.service_resources;
CREATE POLICY "Admins manage service resources"
ON public.service_resources
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admins manage booking resource allocations" ON public.booking_resource_allocations;
CREATE POLICY "Admins manage booking resource allocations"
ON public.booking_resource_allocations
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Admins manage transactions" ON public.transactions;
CREATE POLICY "Admins manage transactions"
ON public.transactions
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "Members read own transactions" ON public.transactions;
CREATE POLICY "Members read own transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (member_user_id = auth.uid());
