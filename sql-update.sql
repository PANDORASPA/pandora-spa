-- Add staff columns to bookings if not exist
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS staff_id INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS staff_name VARCHAR(100);

-- 8. Create staff table (員工)
CREATE TABLE IF NOT EXISTS staff (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(50) DEFAULT '髮型師',
  phone VARCHAR(20),
  enabled BOOLEAN DEFAULT true,
  schedule JSONB DEFAULT '{}',
  services JSONB DEFAULT '[]',
  daysOff JSONB DEFAULT '[]',
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

-- Enable RLS for new tables
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- Public policies
CREATE POLICY "Public staff" ON staff FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public articles" ON articles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public faqs" ON faqs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Insert default staff (if table is empty)
INSERT INTO staff (name, role, phone, enabled, schedule, services, daysOff) 
SELECT '髮型師A', '髮型師', '', true, '{}', '[1,2,3,4,5]', '[]'
WHERE NOT EXISTS (SELECT 1 FROM staff LIMIT 1);

INSERT INTO staff (name, role, phone, enabled, schedule, services, daysOff) 
SELECT '助理A', '助理', '', true, '{}', '[1,4,5]', '[]'
WHERE NOT EXISTS (SELECT 1 FROM staff WHERE name = '助理A');

-- Insert default articles (if table is empty)
INSERT INTO articles (title, category, excerpt, enabled, sort_order) 
SELECT '如何選擇適合自己的髮型？', '髮型貼士', '根據臉型、髮質同埋個人風格嚟選擇最適合既髮型...', true, 1
WHERE NOT EXISTS (SELECT 1 FROM articles LIMIT 1);

INSERT INTO articles (title, category, excerpt, enabled, sort_order) 
SELECT '護髮小知識 - 你要知既5件事', '護髮知識', '日常護髮既錯誤示範同正確方法...', true, 2
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE title LIKE '%護髮%');

INSERT INTO articles (title, category, excerpt, enabled, sort_order) 
SELECT '脫髮原因同改善方法', '头皮護理', '點解會甩頭髮？等我哋教你點樣改善...', true, 3
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE title LIKE '%脫髮%');

-- Insert default faqs (if table is empty)
INSERT INTO faqs (question, answer, sort_order, enabled) 
SELECT '如何預約服務？', '您可以通過我們的網站直接預約，選擇服務項目、日期和時間，填寫資料後即可提交預約。', 1, true
WHERE NOT EXISTS (SELECT 1 FROM faqs LIMIT 1);

INSERT INTO faqs (question, answer, sort_order, enabled) 
SELECT '預約需要付訂金嗎？', '一般預約不需要付訂金，但如果您需要取消或更改預約，請提前一天通知我們。', 2, true
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question LIKE '%訂金%');

INSERT INTO faqs (question, answer, sort_order, enabled) 
SELECT '營業時間是？', '我們的營業時間為早上9點至晚上7點，每逢星期一休息。', 3, true
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question LIKE '%營業%');

INSERT INTO faqs (question, answer, sort_order, enabled) 
SELECT '可以網上付款嗎？', '是的，我們支援信用卡、PayMe和轉數快等付款方式。', 4, true
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question LIKE '%付款%');

INSERT INTO faqs (question, answer, sort_order, enabled) 
SELECT '取消預約的政策？', '請於預約日期前1天取消或更改，否則可能會收取一定費用。', 5, true
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question LIKE '%取消%');
