-- Backfill partial staff weekly schedules where only start or end exists.

DO $$
DECLARE
  default_hours TEXT := '11:00 - 20:00';
  default_start TEXT := '11:00';
  default_end TEXT := '20:00';
  staff_row RECORD;
  day_key TEXT;
  schedule_json JSONB;
  day_value JSONB;
  next_schedule JSONB;
  start_value TEXT;
  end_value TEXT;
BEGIN
  SELECT value INTO default_hours
  FROM public.settings
  WHERE key = 'business_hours'
  LIMIT 1;

  IF default_hours IS NOT NULL AND position('-' IN default_hours) > 0 THEN
    default_start := trim(split_part(default_hours, '-', 1));
    default_end := trim(split_part(default_hours, '-', 2));
  END IF;

  FOR staff_row IN
    SELECT id, schedule
    FROM public.staff
    WHERE schedule IS NOT NULL
  LOOP
    next_schedule := staff_row.schedule;

    FOR day_key IN SELECT unnest(ARRAY['0','1','2','3','4','5','6'])
    LOOP
      day_value := staff_row.schedule -> day_key;
      IF jsonb_typeof(day_value) = 'object' THEN
        start_value := NULLIF(day_value ->> 'start', '');
        end_value := NULLIF(day_value ->> 'end', '');

        IF start_value IS NOT NULL OR end_value IS NOT NULL THEN
          next_schedule := jsonb_set(
            next_schedule,
            ARRAY[day_key],
            jsonb_build_object(
              'start', COALESCE(start_value, default_start),
              'end', COALESCE(end_value, default_end)
            ),
            true
          );
        END IF;
      END IF;
    END LOOP;

    UPDATE public.staff
    SET schedule = next_schedule
    WHERE id = staff_row.id
      AND schedule IS DISTINCT FROM next_schedule;
  END LOOP;
END $$;
