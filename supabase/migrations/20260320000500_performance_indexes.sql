-- Low-risk performance indexes for booking month summary and admin operational views

CREATE INDEX IF NOT EXISTS bookings_appointment_date_idx
  ON public.bookings (appointment_date);

CREATE INDEX IF NOT EXISTS staff_shifts_staff_date_idx
  ON public.staff_shifts (staff_id, date);

CREATE INDEX IF NOT EXISTS staff_breaks_staff_day_idx
  ON public.staff_breaks (staff_id, day_of_week);

CREATE INDEX IF NOT EXISTS staff_time_off_staff_date_idx
  ON public.staff_time_off (staff_id, date);

CREATE INDEX IF NOT EXISTS blocked_slots_staff_date_idx
  ON public.blocked_slots (staff_id, date);

CREATE INDEX IF NOT EXISTS service_locations_service_location_idx
  ON public.service_locations (service_id, location_id);

CREATE INDEX IF NOT EXISTS service_provider_groups_service_group_idx
  ON public.service_provider_groups (service_id, provider_group_id);

CREATE INDEX IF NOT EXISTS service_resources_service_resource_idx
  ON public.service_resources (service_id, resource_id);

CREATE INDEX IF NOT EXISTS transactions_booking_idx
  ON public.transactions (booking_id);

CREATE INDEX IF NOT EXISTS transactions_order_idx
  ON public.transactions (order_id);

CREATE INDEX IF NOT EXISTS transactions_customer_idx
  ON public.transactions (customer_id);
