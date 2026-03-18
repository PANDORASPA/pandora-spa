-- Admin authorization and member-owned order / ticket access

ALTER TABLE public.member_profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS member_user_id UUID REFERENCES auth.users(id);

ALTER TABLE public.user_tickets
ADD COLUMN IF NOT EXISTS member_user_id UUID REFERENCES auth.users(id);

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.member_profiles;
CREATE POLICY "Admins can read all profiles"
ON public.member_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.member_profiles;
CREATE POLICY "Admins can update all profiles"
ON public.member_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

DROP POLICY IF EXISTS "Members can create orders" ON public.orders;
CREATE POLICY "Members can create orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (member_user_id = auth.uid());

DROP POLICY IF EXISTS "Members can view own orders" ON public.orders;
CREATE POLICY "Members can view own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (member_user_id = auth.uid());

DROP POLICY IF EXISTS "Members can create own user tickets" ON public.user_tickets;
CREATE POLICY "Members can create own user tickets"
ON public.user_tickets
FOR INSERT
TO authenticated
WITH CHECK (member_user_id = auth.uid());

DROP POLICY IF EXISTS "Members can view own user tickets" ON public.user_tickets;
CREATE POLICY "Members can view own user tickets"
ON public.user_tickets
FOR SELECT
TO authenticated
USING (member_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage services" ON public.services;
CREATE POLICY "Admins manage services"
ON public.services
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

DROP POLICY IF EXISTS "Admins manage products" ON public.products;
CREATE POLICY "Admins manage products"
ON public.products
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

DROP POLICY IF EXISTS "Admins manage coupons" ON public.coupons;
CREATE POLICY "Admins manage coupons"
ON public.coupons
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

DROP POLICY IF EXISTS "Admins manage customers" ON public.customers;
CREATE POLICY "Admins manage customers"
ON public.customers
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

DROP POLICY IF EXISTS "Admins manage staff" ON public.staff;
CREATE POLICY "Admins manage staff"
ON public.staff
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

DROP POLICY IF EXISTS "Admins manage articles" ON public.articles;
CREATE POLICY "Admins manage articles"
ON public.articles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

DROP POLICY IF EXISTS "Admins manage faqs" ON public.faqs;
CREATE POLICY "Admins manage faqs"
ON public.faqs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

DROP POLICY IF EXISTS "Admins manage settings" ON public.settings;
CREATE POLICY "Admins manage settings"
ON public.settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

DROP POLICY IF EXISTS "Admins manage bookings" ON public.bookings;
CREATE POLICY "Admins manage bookings"
ON public.bookings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

DROP POLICY IF EXISTS "Admins manage orders" ON public.orders;
CREATE POLICY "Admins manage orders"
ON public.orders
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

DROP POLICY IF EXISTS "Admins manage service packages" ON public.service_packages;
CREATE POLICY "Admins manage service packages"
ON public.service_packages
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

DROP POLICY IF EXISTS "Admins manage tickets" ON public.tickets;
CREATE POLICY "Admins manage tickets"
ON public.tickets
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

DROP POLICY IF EXISTS "Admins manage staff shifts" ON public.staff_shifts;
CREATE POLICY "Admins manage staff shifts"
ON public.staff_shifts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

DROP POLICY IF EXISTS "Admins manage reviews" ON public.reviews;
CREATE POLICY "Admins manage reviews"
ON public.reviews
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);

DROP POLICY IF EXISTS "Admins manage user tickets" ON public.user_tickets;
CREATE POLICY "Admins manage user tickets"
ON public.user_tickets
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.member_profiles AS profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  )
);
