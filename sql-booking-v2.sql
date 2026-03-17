ALTER TABLE public.services ADD COLUMN IF NOT EXISTS buffer_min INTEGER DEFAULT 0;

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS service_id INTEGER REFERENCES public.services(id);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_email TEXT;

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS appointment_date DATE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS buffer_end_time TIME;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS duration_min INTEGER;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS buffer_min INTEGER;

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS buffer_end_at TIMESTAMPTZ;

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE INDEX IF NOT EXISTS bookings_staff_date_idx ON public.bookings(staff_id, appointment_date);
CREATE INDEX IF NOT EXISTS bookings_user_idx ON public.bookings(user_id);

WITH src AS (
  SELECT
    id,
    COALESCE(appointment_date, to_date(date, 'DD/MM/YYYY')) AS d,
    COALESCE(start_time, NULLIF(time, '')::time) AS t,
    COALESCE(duration_min, 60) AS dur,
    COALESCE(buffer_min, 15) AS buf
  FROM public.bookings
  WHERE (appointment_date IS NULL OR start_time IS NULL OR start_at IS NULL)
)
UPDATE public.bookings b
SET
  appointment_date = src.d,
  start_time = src.t,
  duration_min = src.dur,
  buffer_min = src.buf,
  end_time = COALESCE(b.end_time, (src.t + make_interval(mins => src.dur))::time),
  buffer_end_time = COALESCE(b.buffer_end_time, ((src.t + make_interval(mins => src.dur + src.buf)))::time),
  start_at = COALESCE(b.start_at, timezone('Asia/Hong_Kong', (src.d::timestamp + src.t))),
  end_at = COALESCE(b.end_at, timezone('Asia/Hong_Kong', (src.d::timestamp + src.t)) + make_interval(mins => src.dur)),
  buffer_end_at = COALESCE(b.buffer_end_at, timezone('Asia/Hong_Kong', (src.d::timestamp + src.t)) + make_interval(mins => src.dur + src.buf))
FROM src
WHERE b.id = src.id;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;
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
  staff_id INTEGER NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  service_id INTEGER NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, service_id)
);

CREATE TABLE IF NOT EXISTS public.staff_breaks (
  id BIGSERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  label TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.staff_time_off (
  id BIGSERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_all_day BOOLEAN DEFAULT false,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.blocked_slots (
  id BIGSERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
