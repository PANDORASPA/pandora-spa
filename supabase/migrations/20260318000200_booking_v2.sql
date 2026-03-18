-- Booking v2 normalization and scheduling helpers

ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS buffer_min INTEGER DEFAULT 0;

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE INDEX IF NOT EXISTS bookings_staff_date_idx
ON public.bookings(staff_id, appointment_date);

CREATE INDEX IF NOT EXISTS bookings_user_idx
ON public.bookings(user_id);

WITH src AS (
  SELECT
    id,
    COALESCE(appointment_date, to_date(date, 'DD/MM/YYYY')) AS booking_date,
    COALESCE(start_time, NULLIF(time, '')::time) AS booking_time,
    COALESCE(duration_min, 60) AS booking_duration,
    COALESCE(buffer_min, 15) AS booking_buffer
  FROM public.bookings
  WHERE appointment_date IS NULL OR start_time IS NULL OR start_at IS NULL
)
UPDATE public.bookings AS bookings
SET
  appointment_date = src.booking_date,
  start_time = src.booking_time,
  duration_min = src.booking_duration,
  buffer_min = src.booking_buffer,
  end_time = COALESCE(bookings.end_time, (src.booking_time + make_interval(mins => src.booking_duration))::time),
  buffer_end_time = COALESCE(bookings.buffer_end_time, (src.booking_time + make_interval(mins => src.booking_duration + src.booking_buffer))::time),
  start_at = COALESCE(bookings.start_at, timezone('Asia/Hong_Kong', src.booking_date::timestamp + src.booking_time)),
  end_at = COALESCE(bookings.end_at, timezone('Asia/Hong_Kong', src.booking_date::timestamp + src.booking_time) + make_interval(mins => src.booking_duration)),
  buffer_end_at = COALESCE(bookings.buffer_end_at, timezone('Asia/Hong_Kong', src.booking_date::timestamp + src.booking_time) + make_interval(mins => src.booking_duration + src.booking_buffer))
FROM src
WHERE bookings.id = src.id
  AND src.booking_date IS NOT NULL
  AND src.booking_time IS NOT NULL;

ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_no_overlap;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_no_overlap
EXCLUDE USING gist (
  staff_id WITH =,
  tstzrange(start_at, buffer_end_at, '[)') WITH &&
)
WHERE (
  staff_id IS NOT NULL
  AND start_at IS NOT NULL
  AND buffer_end_at IS NOT NULL
  AND status IN ('pending', 'confirmed')
);

CREATE TABLE IF NOT EXISTS public.staff_service_map (
  id BIGSERIAL PRIMARY KEY,
  staff_id BIGINT NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  service_id BIGINT NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, service_id)
);

CREATE TABLE IF NOT EXISTS public.staff_breaks (
  id BIGSERIAL PRIMARY KEY,
  staff_id BIGINT NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  label TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.staff_time_off (
  id BIGSERIAL PRIMARY KEY,
  staff_id BIGINT NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_all_day BOOLEAN DEFAULT false,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.blocked_slots (
  id BIGSERIAL PRIMARY KEY,
  staff_id BIGINT NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.staff_service_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;
