-- FIX: Allow Anon (Public) Write Access for Admin Panel
-- Run this script in Supabase SQL Editor to fix "Permission Denied" errors when saving settings

-- 1. Services
DO $$
BEGIN
  IF to_regclass('public.services') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admin full access" ON public.services';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon insert" ON public.services';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon update" ON public.services';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon delete" ON public.services';
    EXECUTE 'CREATE POLICY "Allow anon insert" ON public.services FOR INSERT TO anon, authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Allow anon update" ON public.services FOR UPDATE TO anon, authenticated USING (true)';
    EXECUTE 'CREATE POLICY "Allow anon delete" ON public.services FOR DELETE TO anon, authenticated USING (true)';
  END IF;
END $$;

-- 2. Products
DO $$
BEGIN
  IF to_regclass('public.products') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admin full access" ON public.products';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon insert" ON public.products';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon update" ON public.products';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon delete" ON public.products';
    EXECUTE 'CREATE POLICY "Allow anon insert" ON public.products FOR INSERT TO anon, authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Allow anon update" ON public.products FOR UPDATE TO anon, authenticated USING (true)';
    EXECUTE 'CREATE POLICY "Allow anon delete" ON public.products FOR DELETE TO anon, authenticated USING (true)';
  END IF;
END $$;

-- 3. Staff
DO $$
BEGIN
  IF to_regclass('public.staff') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admin full access" ON public.staff';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon insert" ON public.staff';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon update" ON public.staff';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon delete" ON public.staff';
    EXECUTE 'CREATE POLICY "Allow anon insert" ON public.staff FOR INSERT TO anon, authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Allow anon update" ON public.staff FOR UPDATE TO anon, authenticated USING (true)';
    EXECUTE 'CREATE POLICY "Allow anon delete" ON public.staff FOR DELETE TO anon, authenticated USING (true)';
  END IF;
END $$;

-- 4. Coupons
DO $$
BEGIN
  IF to_regclass('public.coupons') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admin full access" ON public.coupons';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon insert" ON public.coupons';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon update" ON public.coupons';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon delete" ON public.coupons';
    EXECUTE 'CREATE POLICY "Allow anon insert" ON public.coupons FOR INSERT TO anon, authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Allow anon update" ON public.coupons FOR UPDATE TO anon, authenticated USING (true)';
    EXECUTE 'CREATE POLICY "Allow anon delete" ON public.coupons FOR DELETE TO anon, authenticated USING (true)';
  END IF;
END $$;

-- 5. Settings
DO $$
BEGIN
  IF to_regclass('public.settings') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admin full access" ON public.settings';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon insert" ON public.settings';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon update" ON public.settings';
    EXECUTE 'CREATE POLICY "Allow anon insert" ON public.settings FOR INSERT TO anon, authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Allow anon update" ON public.settings FOR UPDATE TO anon, authenticated USING (true)';
  END IF;
END $$;

-- 6. Service Packages
DO $$
BEGIN
  IF to_regclass('public.service_packages') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admin full access" ON public.service_packages';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon insert" ON public.service_packages';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon update" ON public.service_packages';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon delete" ON public.service_packages';
    EXECUTE 'CREATE POLICY "Allow anon insert" ON public.service_packages FOR INSERT TO anon, authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Allow anon update" ON public.service_packages FOR UPDATE TO anon, authenticated USING (true)';
    EXECUTE 'CREATE POLICY "Allow anon delete" ON public.service_packages FOR DELETE TO anon, authenticated USING (true)';
  END IF;
END $$;

-- 7. Tickets
DO $$
BEGIN
  IF to_regclass('public.tickets') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admin full access" ON public.tickets';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon insert" ON public.tickets';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon update" ON public.tickets';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon delete" ON public.tickets';
    EXECUTE 'CREATE POLICY "Allow anon insert" ON public.tickets FOR INSERT TO anon, authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Allow anon update" ON public.tickets FOR UPDATE TO anon, authenticated USING (true)';
    EXECUTE 'CREATE POLICY "Allow anon delete" ON public.tickets FOR DELETE TO anon, authenticated USING (true)';
  END IF;
END $$;

-- 8. Articles & FAQs
DO $$
BEGIN
  IF to_regclass('public.articles') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admin full access" ON public.articles';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon insert" ON public.articles';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon update" ON public.articles';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon delete" ON public.articles';
    EXECUTE 'CREATE POLICY "Allow anon insert" ON public.articles FOR INSERT TO anon, authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Allow anon update" ON public.articles FOR UPDATE TO anon, authenticated USING (true)';
    EXECUTE 'CREATE POLICY "Allow anon delete" ON public.articles FOR DELETE TO anon, authenticated USING (true)';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.faqs') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admin full access" ON public.faqs';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon insert" ON public.faqs';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon update" ON public.faqs';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon delete" ON public.faqs';
    EXECUTE 'CREATE POLICY "Allow anon insert" ON public.faqs FOR INSERT TO anon, authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "Allow anon update" ON public.faqs FOR UPDATE TO anon, authenticated USING (true)';
    EXECUTE 'CREATE POLICY "Allow anon delete" ON public.faqs FOR DELETE TO anon, authenticated USING (true)';
  END IF;
END $$;

-- 9. Staff Shifts (Ensure write access)
DO $$
BEGIN
  IF to_regclass('public.staff_shifts') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Public staff_shifts" ON public.staff_shifts';
    EXECUTE 'CREATE POLICY "Public staff_shifts" ON public.staff_shifts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- 10. Orders (Ensure admin update access)
DO $$
BEGIN
  IF to_regclass('public.orders') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admin full access" ON public.orders';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon update" ON public.orders';
    EXECUTE 'CREATE POLICY "Allow anon update" ON public.orders FOR UPDATE TO anon, authenticated USING (true)';
  END IF;
END $$;

-- 11. Customers (Ensure admin update access)
DO $$
BEGIN
  IF to_regclass('public.customers') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admin full access" ON public.customers';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon update" ON public.customers';
    EXECUTE 'CREATE POLICY "Allow anon update" ON public.customers FOR UPDATE TO anon, authenticated USING (true)';
  END IF;
END $$;
