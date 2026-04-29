-- Palace Hair Spa package entitlement audit trail.

CREATE TABLE IF NOT EXISTS public.ticket_redemptions (
  id BIGSERIAL PRIMARY KEY,
  user_ticket_id BIGINT NOT NULL REFERENCES public.user_tickets(id) ON DELETE CASCADE,
  booking_id BIGINT REFERENCES public.bookings(id) ON DELETE SET NULL,
  order_id BIGINT REFERENCES public.orders(id) ON DELETE SET NULL,
  member_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT 'manual_adjustment',
  note TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ticket_redemptions_user_ticket_idx
ON public.ticket_redemptions(user_ticket_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ticket_redemptions_member_idx
ON public.ticket_redemptions(member_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ticket_redemptions_booking_idx
ON public.ticket_redemptions(booking_id);

ALTER TABLE public.ticket_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read own ticket redemptions" ON public.ticket_redemptions;
CREATE POLICY "Members read own ticket redemptions"
ON public.ticket_redemptions
FOR SELECT
USING (member_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage ticket redemptions" ON public.ticket_redemptions;
CREATE POLICY "Admins manage ticket redemptions"
ON public.ticket_redemptions
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS user_tickets_member_remaining_idx
ON public.user_tickets(member_user_id, remaining_count, expiry_date);

CREATE INDEX IF NOT EXISTS orders_ticket_payment_idx
ON public.orders(status, delivery, payment, created_at DESC);

CREATE OR REPLACE FUNCTION public.decrement_user_ticket_once(
  target_user_ticket_id BIGINT,
  target_member_user_id UUID
)
RETURNS TABLE(id BIGINT, remaining_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.user_tickets AS user_ticket
  SET remaining_count = user_ticket.remaining_count - 1
  WHERE user_ticket.id = target_user_ticket_id
    AND user_ticket.member_user_id = target_member_user_id
    AND user_ticket.remaining_count > 0
    AND (user_ticket.expiry_date IS NULL OR user_ticket.expiry_date >= NOW())
  RETURNING user_ticket.id, user_ticket.remaining_count;
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_user_ticket_once(BIGINT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrement_user_ticket_once(BIGINT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_user_ticket_once(BIGINT, UUID) TO service_role;
