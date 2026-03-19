-- Scheduling guardrails for admin booking and availability data.

UPDATE public.bookings
SET status = LOWER(TRIM(COALESCE(status, 'pending')));

UPDATE public.bookings
SET status = 'pending'
WHERE status IS NULL
   OR status NOT IN ('pending', 'confirmed', 'completed', 'cancelled');

ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_status_check
CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled'))
NOT VALID;

ALTER TABLE public.staff_shifts
DROP CONSTRAINT IF EXISTS staff_shifts_time_check;

ALTER TABLE public.staff_shifts
ADD CONSTRAINT staff_shifts_time_check
CHECK (
  (
    COALESCE(is_off, false) IS TRUE
    AND start_time IS NULL
    AND end_time IS NULL
  )
  OR
  (
    COALESCE(is_off, false) IS FALSE
    AND start_time IS NOT NULL
    AND end_time IS NOT NULL
    AND start_time < end_time
  )
)
NOT VALID;

ALTER TABLE public.staff_breaks
DROP CONSTRAINT IF EXISTS staff_breaks_time_check;

ALTER TABLE public.staff_breaks
DROP CONSTRAINT IF EXISTS staff_breaks_day_check;

ALTER TABLE public.staff_breaks
ADD CONSTRAINT staff_breaks_day_check
CHECK (day_of_week BETWEEN 0 AND 6)
NOT VALID;

ALTER TABLE public.staff_breaks
ADD CONSTRAINT staff_breaks_time_check
CHECK (
  start_time IS NOT NULL
  AND end_time IS NOT NULL
  AND start_time < end_time
)
NOT VALID;

ALTER TABLE public.staff_time_off
DROP CONSTRAINT IF EXISTS staff_time_off_time_check;

ALTER TABLE public.staff_time_off
ADD CONSTRAINT staff_time_off_time_check
CHECK (
  (
    COALESCE(is_all_day, false) IS TRUE
    AND start_time IS NULL
    AND end_time IS NULL
  )
  OR
  (
    COALESCE(is_all_day, false) IS FALSE
    AND start_time IS NOT NULL
    AND end_time IS NOT NULL
    AND start_time < end_time
  )
)
NOT VALID;

ALTER TABLE public.blocked_slots
DROP CONSTRAINT IF EXISTS blocked_slots_time_check;

ALTER TABLE public.blocked_slots
ADD CONSTRAINT blocked_slots_time_check
CHECK (
  start_time IS NOT NULL
  AND end_time IS NOT NULL
  AND start_time < end_time
)
NOT VALID;

WITH deduped_staff_breaks AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY staff_id, day_of_week, start_time, end_time, COALESCE(label, ''), COALESCE(enabled, true)
      ORDER BY id
    ) AS rn
  FROM public.staff_breaks
)
DELETE FROM public.staff_breaks
USING deduped_staff_breaks
WHERE public.staff_breaks.id = deduped_staff_breaks.id
  AND deduped_staff_breaks.rn > 1;

WITH deduped_staff_time_off AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY
        staff_id,
        date,
        COALESCE(start_time::text, ''),
        COALESCE(end_time::text, ''),
        COALESCE(is_all_day, false),
        COALESCE(reason, '')
      ORDER BY id
    ) AS rn
  FROM public.staff_time_off
)
DELETE FROM public.staff_time_off
USING deduped_staff_time_off
WHERE public.staff_time_off.id = deduped_staff_time_off.id
  AND deduped_staff_time_off.rn > 1;

WITH deduped_blocked_slots AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY
        staff_id,
        date,
        start_time,
        end_time,
        COALESCE(reason, ''),
        COALESCE(source, '')
      ORDER BY id
    ) AS rn
  FROM public.blocked_slots
)
DELETE FROM public.blocked_slots
USING deduped_blocked_slots
WHERE public.blocked_slots.id = deduped_blocked_slots.id
  AND deduped_blocked_slots.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS staff_breaks_unique_slot_idx
ON public.staff_breaks (staff_id, day_of_week, start_time, end_time, COALESCE(label, ''))
WHERE enabled IS TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS staff_time_off_unique_entry_idx
ON public.staff_time_off (
  staff_id,
  date,
  COALESCE(start_time::text, ''),
  COALESCE(end_time::text, ''),
  COALESCE(is_all_day, false),
  COALESCE(reason, '')
);

CREATE UNIQUE INDEX IF NOT EXISTS blocked_slots_unique_entry_idx
ON public.blocked_slots (
  staff_id,
  date,
  start_time,
  end_time,
  COALESCE(reason, ''),
  COALESCE(source, '')
);
