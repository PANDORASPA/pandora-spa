-- Phase 2 bridge migration: operational foundation -> booking rules foundation

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS location_id BIGINT REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider_group_id BIGINT REFERENCES public.provider_groups(id) ON DELETE SET NULL;

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS default_location_id BIGINT REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS default_provider_group_id BIGINT REFERENCES public.provider_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS slot_step_min INTEGER,
  ADD COLUMN IF NOT EXISTS min_booking_qty INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS max_booking_qty INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS booking_mode TEXT DEFAULT 'staff';

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS location_id BIGINT REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider_group_id BIGINT REFERENCES public.provider_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS timetable_template_id BIGINT REFERENCES public.timetable_templates(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS location_id BIGINT REFERENCES public.locations(id) ON DELETE SET NULL;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS location_id BIGINT REFERENCES public.locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider_group_id BIGINT REFERENCES public.provider_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resource_id BIGINT REFERENCES public.resources(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'service_provider_groups_assignment_mode_check'
  ) THEN
    ALTER TABLE public.service_provider_groups
      ADD CONSTRAINT service_provider_groups_assignment_mode_check
      CHECK (assignment_mode IN ('any', 'preferred', 'required'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'resources_capacity_positive_check'
  ) THEN
    ALTER TABLE public.resources
      ADD CONSTRAINT resources_capacity_positive_check
      CHECK (capacity > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'service_resources_quantity_positive_check'
  ) THEN
    ALTER TABLE public.service_resources
      ADD CONSTRAINT service_resources_quantity_positive_check
      CHECK (quantity > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'booking_resource_allocations_quantity_positive_check'
  ) THEN
    ALTER TABLE public.booking_resource_allocations
      ADD CONSTRAINT booking_resource_allocations_quantity_positive_check
      CHECK (quantity > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'holidays_date_range_check'
  ) THEN
    ALTER TABLE public.holidays
      ADD CONSTRAINT holidays_date_range_check
      CHECK (end_date IS NULL OR end_date >= holiday_date);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'holidays_scope_check'
  ) THEN
    ALTER TABLE public.holidays
      ADD CONSTRAINT holidays_scope_check
      CHECK (
        location_id IS NOT NULL
        OR staff_id IS NOT NULL
        OR provider_group_id IS NOT NULL
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_amount_non_negative_check'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_amount_non_negative_check
      CHECK (amount >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_kind_check'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_kind_check
      CHECK (kind IN ('sale', 'refund', 'adjustment', 'deposit', 'payout'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_status_check'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_status_check
      CHECK (status IN ('pending', 'authorized', 'completed', 'failed', 'refunded', 'voided'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'services_booking_qty_check'
  ) THEN
    ALTER TABLE public.services
      ADD CONSTRAINT services_booking_qty_check
      CHECK (
        min_booking_qty >= 1
        AND max_booking_qty >= min_booking_qty
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'services_booking_mode_check'
  ) THEN
    ALTER TABLE public.services
      ADD CONSTRAINT services_booking_mode_check
      CHECK (booking_mode IN ('staff', 'provider_group', 'resource', 'hybrid'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'services_slot_step_min_check'
  ) THEN
    ALTER TABLE public.services
      ADD CONSTRAINT services_slot_step_min_check
      CHECK (slot_step_min IS NULL OR slot_step_min > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'timetable_entries_scope_check'
  ) THEN
    ALTER TABLE public.timetable_entries
      ADD CONSTRAINT timetable_entries_scope_check
      CHECK (timetable_id IS NOT NULL OR staff_id IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'timetable_entries_date_mode_check'
  ) THEN
    ALTER TABLE public.timetable_entries
      ADD CONSTRAINT timetable_entries_date_mode_check
      CHECK (
        (day_of_week IS NOT NULL AND specific_date IS NULL)
        OR (day_of_week IS NULL AND specific_date IS NOT NULL)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'timetable_entries_day_of_week_check'
  ) THEN
    ALTER TABLE public.timetable_entries
      ADD CONSTRAINT timetable_entries_day_of_week_check
      CHECK (day_of_week IS NULL OR day_of_week BETWEEN 0 AND 6);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'timetable_entries_interval_check'
  ) THEN
    ALTER TABLE public.timetable_entries
      ADD CONSTRAINT timetable_entries_interval_check
      CHECK (
        (is_off = true AND start_time IS NULL AND end_time IS NULL)
        OR (
          COALESCE(is_off, false) = false
          AND start_time IS NOT NULL
          AND end_time IS NOT NULL
          AND start_time < end_time
        )
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS timetable_templates_default_idx
  ON public.timetable_templates (is_default)
  WHERE is_default = true;

CREATE UNIQUE INDEX IF NOT EXISTS holidays_scope_unique_idx
  ON public.holidays (
    holiday_date,
    COALESCE(end_date, holiday_date),
    COALESCE(location_id, -1),
    COALESCE(staff_id, -1),
    COALESCE(provider_group_id, -1),
    lower(title)
  );

CREATE UNIQUE INDEX IF NOT EXISTS resources_location_name_unique_idx
  ON public.resources (COALESCE(location_id, -1), lower(name));

CREATE INDEX IF NOT EXISTS staff_location_enabled_idx
  ON public.staff (location_id, enabled);

CREATE INDEX IF NOT EXISTS staff_provider_group_enabled_idx
  ON public.staff (provider_group_id, enabled);

CREATE INDEX IF NOT EXISTS services_default_location_enabled_idx
  ON public.services (default_location_id, enabled);

CREATE INDEX IF NOT EXISTS services_default_provider_group_enabled_idx
  ON public.services (default_provider_group_id, enabled);

CREATE INDEX IF NOT EXISTS service_locations_location_service_enabled_idx
  ON public.service_locations (location_id, service_id)
  WHERE enabled = true;

CREATE INDEX IF NOT EXISTS staff_provider_groups_group_staff_idx
  ON public.staff_provider_groups (provider_group_id, staff_id);

CREATE INDEX IF NOT EXISTS service_provider_groups_group_service_idx
  ON public.service_provider_groups (provider_group_id, service_id);

CREATE INDEX IF NOT EXISTS timetable_entries_location_date_idx
  ON public.timetable_entries (location_id, specific_date, day_of_week);

CREATE INDEX IF NOT EXISTS timetable_entries_resource_date_idx
  ON public.timetable_entries (resource_id, specific_date, day_of_week);

CREATE INDEX IF NOT EXISTS holidays_location_date_idx
  ON public.holidays (location_id, holiday_date);

CREATE INDEX IF NOT EXISTS holidays_staff_date_idx
  ON public.holidays (staff_id, holiday_date);

CREATE INDEX IF NOT EXISTS holidays_provider_group_date_idx
  ON public.holidays (provider_group_id, holiday_date);

CREATE INDEX IF NOT EXISTS service_resources_resource_service_idx
  ON public.service_resources (resource_id, service_id);

CREATE INDEX IF NOT EXISTS booking_resource_allocations_resource_booking_idx
  ON public.booking_resource_allocations (resource_id, booking_id);

CREATE INDEX IF NOT EXISTS bookings_location_date_idx
  ON public.bookings (location_id, appointment_date);

CREATE INDEX IF NOT EXISTS bookings_provider_group_date_idx
  ON public.bookings (provider_group_id, appointment_date);

CREATE INDEX IF NOT EXISTS orders_location_created_idx
  ON public.orders (location_id, created_at DESC);

CREATE INDEX IF NOT EXISTS transactions_location_created_idx
  ON public.transactions (location_id, created_at DESC);

CREATE INDEX IF NOT EXISTS transactions_provider_group_created_idx
  ON public.transactions (provider_group_id, created_at DESC);

DROP POLICY IF EXISTS "Public read enabled provider groups" ON public.provider_groups;
CREATE POLICY "Public read enabled provider groups"
ON public.provider_groups
FOR SELECT
TO anon, authenticated
USING (enabled = true);

DROP POLICY IF EXISTS "Public read enabled resources" ON public.resources;
CREATE POLICY "Public read enabled resources"
ON public.resources
FOR SELECT
TO anon, authenticated
USING (enabled = true);

DROP POLICY IF EXISTS "Public read enabled timetable templates" ON public.timetable_templates;
CREATE POLICY "Public read enabled timetable templates"
ON public.timetable_templates
FOR SELECT
TO anon, authenticated
USING (enabled = true);

DROP POLICY IF EXISTS "Public read service provider groups" ON public.service_provider_groups;
CREATE POLICY "Public read service provider groups"
ON public.service_provider_groups
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Public read service resources" ON public.service_resources;
CREATE POLICY "Public read service resources"
ON public.service_resources
FOR SELECT
TO anon, authenticated
USING (true);
