-- VIVA HAIR baseline schema
-- This migration is the canonical starting point for a fresh database.
-- It intentionally excludes demo content; use supabase/seed.sql for optional sample data.

CREATE TABLE IF NOT EXISTS public.customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  notes TEXT,
  membership_level TEXT DEFAULT 'Regular',
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.settings (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.services (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER DEFAULT 0,
  time INTEGER DEFAULT 60,
  category TEXT,
  description TEXT,
  image_url TEXT,
  emoji TEXT DEFAULT '✂️',
  enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  price INTEGER DEFAULT 0,
  orig INTEGER DEFAULT 0,
  stock INTEGER DEFAULT 0,
  emoji TEXT DEFAULT '🧴',
  enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coupons (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT,
  discount INTEGER DEFAULT 0,
  type TEXT DEFAULT 'percent',
  min_spend INTEGER DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  usage_limit INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.staff (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'Hair Stylist',
  phone TEXT,
  photo_url TEXT,
  bio TEXT,
  enabled BOOLEAN DEFAULT true,
  schedule JSONB DEFAULT '{}'::jsonb,
  services JSONB DEFAULT '[]'::jsonb,
  "daysOff" JSONB DEFAULT '[]'::jsonb,
  break_start TIME DEFAULT '15:00',
  break_end TIME DEFAULT '16:00',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.articles (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  excerpt TEXT,
  content TEXT,
  image_url TEXT,
  enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.faqs (
  id BIGSERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT,
  sort_order INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_packages (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER DEFAULT 0,
  orig INTEGER DEFAULT 0,
  description TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  emoji TEXT DEFAULT '🎁',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tickets (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER DEFAULT 0,
  orig INTEGER DEFAULT 0,
  count INTEGER DEFAULT 1,
  service_id BIGINT REFERENCES public.services(id),
  description TEXT,
  emoji TEXT DEFAULT '🎟️',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id BIGSERIAL PRIMARY KEY,
  ref TEXT UNIQUE NOT NULL,
  service TEXT,
  service_price INTEGER DEFAULT 0,
  date TEXT,
  time TEXT,
  staff_id BIGINT REFERENCES public.staff(id),
  staff_name TEXT,
  customer_id BIGINT REFERENCES public.customers(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  coupon TEXT,
  final_price INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  service_id BIGINT REFERENCES public.services(id),
  user_id UUID REFERENCES auth.users(id),
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  appointment_date DATE,
  start_time TIME,
  end_time TIME,
  buffer_end_time TIME,
  duration_min INTEGER,
  buffer_min INTEGER DEFAULT 0,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  buffer_end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id BIGSERIAL PRIMARY KEY,
  ref TEXT UNIQUE NOT NULL,
  user_id BIGINT REFERENCES public.customers(id),
  member_user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  name TEXT,
  phone TEXT,
  product_name TEXT,
  items TEXT NOT NULL,
  total INTEGER NOT NULL,
  delivery TEXT NOT NULL,
  payment TEXT NOT NULL,
  address TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.staff_shifts (
  id BIGSERIAL PRIMARY KEY,
  staff_id BIGINT NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_off BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, date)
);

CREATE TABLE IF NOT EXISTS public.user_tickets (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT REFERENCES public.customers(id) ON DELETE CASCADE,
  member_user_id UUID REFERENCES auth.users(id),
  ticket_id BIGINT REFERENCES public.tickets(id),
  ticket_name TEXT,
  remaining_count INTEGER DEFAULT 0,
  expiry_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT UNIQUE REFERENCES public.bookings(id),
  customer_id BIGINT REFERENCES public.customers(id),
  staff_id BIGINT REFERENCES public.staff(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS services_enabled_sort_idx ON public.services(enabled, sort_order);
CREATE INDEX IF NOT EXISTS products_enabled_sort_idx ON public.products(enabled, sort_order);
CREATE INDEX IF NOT EXISTS coupons_enabled_idx ON public.coupons(enabled);
CREATE INDEX IF NOT EXISTS bookings_created_idx ON public.bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS orders_created_idx ON public.orders(created_at DESC);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read services" ON public.services;
CREATE POLICY "Public read services"
ON public.services
FOR SELECT
TO anon, authenticated
USING (enabled = true);

DROP POLICY IF EXISTS "Public read products" ON public.products;
CREATE POLICY "Public read products"
ON public.products
FOR SELECT
TO anon, authenticated
USING (enabled = true);

DROP POLICY IF EXISTS "Public read coupons" ON public.coupons;
CREATE POLICY "Public read coupons"
ON public.coupons
FOR SELECT
TO anon, authenticated
USING (enabled = true);

DROP POLICY IF EXISTS "Public read staff" ON public.staff;
CREATE POLICY "Public read staff"
ON public.staff
FOR SELECT
TO anon, authenticated
USING (enabled = true);

DROP POLICY IF EXISTS "Public read articles" ON public.articles;
CREATE POLICY "Public read articles"
ON public.articles
FOR SELECT
TO anon, authenticated
USING (enabled = true);

DROP POLICY IF EXISTS "Public read faqs" ON public.faqs;
CREATE POLICY "Public read faqs"
ON public.faqs
FOR SELECT
TO anon, authenticated
USING (enabled = true);

DROP POLICY IF EXISTS "Public read service packages" ON public.service_packages;
CREATE POLICY "Public read service packages"
ON public.service_packages
FOR SELECT
TO anon, authenticated
USING (enabled = true);

DROP POLICY IF EXISTS "Public read tickets" ON public.tickets;
CREATE POLICY "Public read tickets"
ON public.tickets
FOR SELECT
TO anon, authenticated
USING (enabled = true);

DROP POLICY IF EXISTS "Public read reviews" ON public.reviews;
CREATE POLICY "Public read reviews"
ON public.reviews
FOR SELECT
TO anon, authenticated
USING (true);
