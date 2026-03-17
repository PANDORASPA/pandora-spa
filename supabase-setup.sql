-- Supabase Database Setup Script
-- Run this in your Supabase SQL Editor

-- 1. Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  ref VARCHAR(50) UNIQUE NOT NULL,
  service VARCHAR(100) NOT NULL,
  service_price INTEGER NOT NULL,
  date VARCHAR(20) NOT NULL,
  time VARCHAR(10) NOT NULL,
  staff_id INTEGER,
  staff_name VARCHAR(100),
  customer_id INTEGER REFERENCES customers(id),
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  coupon VARCHAR(50), -- Increased length
  final_price INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, completed, cancelled, no_show
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_booking UNIQUE (date, time, staff_id)
);

-- 2. Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255),
  notes TEXT,
  membership_level VARCHAR(20) DEFAULT 'Regular', -- Added membership_level
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  ref VARCHAR(20) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id),
  user_name VARCHAR(100),
  items TEXT NOT NULL,
  total INTEGER NOT NULL,
  delivery VARCHAR(50) NOT NULL,
  payment VARCHAR(50) NOT NULL,
  address TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create settings table (店鋪設定)
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create services table (服務項目)
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price INTEGER DEFAULT 0,
  time INTEGER DEFAULT 60, -- duration in minutes
  category VARCHAR(50), -- Added category
  description TEXT, -- Added description
  image_url VARCHAR(500), -- Added image_url
  enabled BOOLEAN DEFAULT true, -- active status
  sort_order INTEGER DEFAULT 0
);

-- 6. Create products table (產品)
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price INTEGER DEFAULT 0,
  stock INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- 7. Create coupons table (優惠碼)
CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100),
  discount INTEGER DEFAULT 0, -- value
  type VARCHAR(20) DEFAULT 'percent', -- percentage or fixed
  min_spend INTEGER DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE, -- valid_from
  end_date TIMESTAMP WITH TIME ZONE, -- valid_to
  usage_limit INTEGER DEFAULT 0, -- Added usage_limit (0 for unlimited)
  enabled BOOLEAN DEFAULT true -- active status
);

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- More secure RLS policies

-- For public tables that anyone can read
CREATE POLICY "Public read access" ON services FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin full access" ON services FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Public read access" ON products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin full access" ON products FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Public read access" ON coupons FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin full access" ON coupons FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Public read access" ON customers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin full access" ON customers FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Public read access" ON staff FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin full access" ON staff FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Public read access" ON articles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin full access" ON articles FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Public read access" ON faqs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin full access" ON faqs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- For bookings table
CREATE POLICY "Allow public insert" ON bookings FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admin full access" ON bookings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- For users table
CREATE POLICY "Admin full access" ON users FOR ALL TO service_role USING (true) WITH CHECK (true);

-- For orders table
CREATE POLICY "Admin full access" ON orders FOR ALL TO service_role USING (true) WITH CHECK (true);

-- For settings table
CREATE POLICY "Admin full access" ON settings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Insert default services
INSERT INTO services (name, price, time, enabled, sort_order) VALUES
  ('剪髮', 280, 60, true, 1),
  ('染髮', 680, 120, true, 2),
  ('燙髮', 880, 150, true, 3),
  ('護髮', 380, 60, true, 4),
  ('头皮护理', 450, 45, true, 5)
ON CONFLICT DO NOTHING;

-- Insert default products
INSERT INTO products (name, price, stock, enabled, sort_order) VALUES
  ('DS100 護髮精華素', 680, 10, true, 1),
  ('头皮護理液', 280, 20, true, 2),
  ('天然護髮油', 180, 15, true, 3),
  ('專業洗髮水', 150, 25, true, 4),
  ('髮泥定型', 120, 30, true, 5)
ON CONFLICT DO NOTHING;

-- Insert default coupons
INSERT INTO coupons (code, name, discount, type, min_spend, enabled) VALUES
  ('NEW20', '新客8折', 20, 'percent', 0, true),
  ('SAVE100', '節省$100', 100, 'fixed', 500, true),
  ('MEMBER10', '會員9折', 10, 'percent', 0, true)
ON CONFLICT DO NOTHING;

-- 8. Create staff table (員工)
CREATE TABLE IF NOT EXISTS staff (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(50) DEFAULT '髮型師',
  phone VARCHAR(20),
  photo_url VARCHAR(500), -- Added photo_url
  bio TEXT, -- Added bio
  enabled BOOLEAN DEFAULT true, -- active status
  schedule JSONB DEFAULT '{}', -- contains start_time, end_time per day
  services JSONB DEFAULT '[]',
  daysOff JSONB DEFAULT '[]',
  break_start TIME DEFAULT '15:00', -- Added break_start
  break_end TIME DEFAULT '16:00', -- Added break_end
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Create articles table (文章)
CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  category VARCHAR(50),
  excerpt TEXT,
  content TEXT,
  image_url VARCHAR(500),
  enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Create faqs table (常見問題)
CREATE TABLE IF NOT EXISTS faqs (
  id SERIAL PRIMARY KEY,
  question VARCHAR(500) NOT NULL,
  answer TEXT,
  sort_order INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for staff
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public staff" ON staff FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Enable RLS for articles
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public articles" ON articles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Enable RLS for faqs
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public faqs" ON faqs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Insert default staff
INSERT INTO staff (name, role, phone, enabled, schedule, services, daysOff) VALUES
  ('髮型師A', '髮型師', '', true, '{}', '[1,2,3,4,5]', '[]'),
  ('助理A', '助理', '', true, '{}', '[1,4,5]', '[]')
ON CONFLICT DO NOTHING;

-- Insert default articles
INSERT INTO articles (title, category, excerpt, enabled, sort_order) VALUES
  ('如何選擇適合自己的髮型？', '髮型貼士', '根據臉型、髮質同埋個人風格嚟選擇最適合既髮型...', true, 1),
  ('護髮小知識 - 你要知既5件事', '護髮知識', '日常護髮既錯誤示範同正確方法...', true, 2),
  ('脫髮原因同改善方法', '头皮護理', '點解會甩頭髮？等我哋教你點樣改善...', true, 3)
ON CONFLICT DO NOTHING;

-- 11. Create service_packages table (服務套餐)
CREATE TABLE IF NOT EXISTS service_packages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price INTEGER DEFAULT 0,
  description TEXT,
  items JSONB DEFAULT '[]', -- List of service IDs included
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Create tickets table (套票/次數卡)
CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price INTEGER DEFAULT 0,
  count INTEGER DEFAULT 1, -- Number of times
  service_id INTEGER REFERENCES services(id),
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for new tables
ALTER TABLE service_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public service_packages" ON service_packages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public tickets" ON tickets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 13. Create staff_shifts table (按月/日排班)
CREATE TABLE IF NOT EXISTS staff_shifts (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_off BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(staff_id, date)
);

-- Enable RLS for staff_shifts
ALTER TABLE staff_shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public staff_shifts" ON staff_shifts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 14. Create user_tickets table (客戶持有的套票)
CREATE TABLE IF NOT EXISTS user_tickets (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  ticket_id INTEGER REFERENCES tickets(id),
  ticket_name VARCHAR(100), -- Snapshot name
  remaining_count INTEGER DEFAULT 0,
  expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for user_tickets
ALTER TABLE user_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public user_tickets" ON user_tickets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 15. Create reviews table (評價系統)
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) UNIQUE, -- One review per booking
  customer_id INTEGER REFERENCES customers(id),
  staff_id INTEGER REFERENCES staff(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reviews" ON reviews FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

