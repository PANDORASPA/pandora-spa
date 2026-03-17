-- FIX: Allow Anon (Public) Write Access for Admin Panel
-- Run this script in Supabase SQL Editor to fix "Permission Denied" errors when saving settings

-- 1. Services
DROP POLICY IF EXISTS "Admin full access" ON services;
CREATE POLICY "Allow anon insert" ON services FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon update" ON services FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Allow anon delete" ON services FOR DELETE TO anon, authenticated USING (true);

-- 2. Products
DROP POLICY IF EXISTS "Admin full access" ON products;
CREATE POLICY "Allow anon insert" ON products FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon update" ON products FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Allow anon delete" ON products FOR DELETE TO anon, authenticated USING (true);

-- 3. Staff
DROP POLICY IF EXISTS "Admin full access" ON staff;
CREATE POLICY "Allow anon insert" ON staff FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon update" ON staff FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Allow anon delete" ON staff FOR DELETE TO anon, authenticated USING (true);

-- 4. Coupons
DROP POLICY IF EXISTS "Admin full access" ON coupons;
CREATE POLICY "Allow anon insert" ON coupons FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon update" ON coupons FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Allow anon delete" ON coupons FOR DELETE TO anon, authenticated USING (true);

-- 5. Settings
DROP POLICY IF EXISTS "Admin full access" ON settings;
CREATE POLICY "Allow anon insert" ON settings FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon update" ON settings FOR UPDATE TO anon, authenticated USING (true);

-- 6. Service Packages
DROP POLICY IF EXISTS "Admin full access" ON service_packages; -- (if exists)
CREATE POLICY "Allow anon insert" ON service_packages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon update" ON service_packages FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Allow anon delete" ON service_packages FOR DELETE TO anon, authenticated USING (true);

-- 7. Tickets
DROP POLICY IF EXISTS "Admin full access" ON tickets; -- (if exists)
CREATE POLICY "Allow anon insert" ON tickets FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon update" ON tickets FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Allow anon delete" ON tickets FOR DELETE TO anon, authenticated USING (true);

-- 8. Articles & FAQs
DROP POLICY IF EXISTS "Admin full access" ON articles;
CREATE POLICY "Allow anon insert" ON articles FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon update" ON articles FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Allow anon delete" ON articles FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admin full access" ON faqs;
CREATE POLICY "Allow anon insert" ON faqs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon update" ON faqs FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Allow anon delete" ON faqs FOR DELETE TO anon, authenticated USING (true);

-- 9. Staff Shifts (Ensure write access)
DROP POLICY IF EXISTS "Public staff_shifts" ON staff_shifts;
CREATE POLICY "Public staff_shifts" ON staff_shifts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 10. Orders (Ensure admin update access)
DROP POLICY IF EXISTS "Admin full access" ON orders;
CREATE POLICY "Allow anon update" ON orders FOR UPDATE TO anon, authenticated USING (true);

-- 11. Customers (Ensure admin update access)
DROP POLICY IF EXISTS "Admin full access" ON customers;
CREATE POLICY "Allow anon update" ON customers FOR UPDATE TO anon, authenticated USING (true);
