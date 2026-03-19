ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS user_ticket_id BIGINT REFERENCES public.user_tickets(id);

CREATE INDEX IF NOT EXISTS bookings_user_ticket_idx
ON public.bookings(user_ticket_id);
