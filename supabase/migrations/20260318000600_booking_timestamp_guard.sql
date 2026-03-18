-- Ensure normalized booking timestamps are populated so overlap protection works

CREATE EXTENSION IF NOT EXISTS btree_gist;

WITH src AS (
  SELECT
    id,
    COALESCE(appointment_date, to_date(date, 'DD/MM/YYYY')) AS booking_date,
    COALESCE(start_time, NULLIF(time, '')::time) AS booking_time,
    COALESCE(duration_min, 60) AS booking_duration,
    COALESCE(buffer_min, 15) AS booking_buffer
  FROM public.bookings
  WHERE appointment_date IS NOT NULL
    OR date IS NOT NULL
)
UPDATE public.bookings AS bookings
SET
  appointment_date = COALESCE(bookings.appointment_date, src.booking_date),
  start_time = COALESCE(bookings.start_time, src.booking_time),
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
