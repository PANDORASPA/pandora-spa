-- Optional demo seed for development and internal demos.
-- Do not treat these rows as production content.

INSERT INTO public.services (name, price, time, category, description, emoji, enabled, sort_order)
SELECT '頭皮狀態檢測', 180, 30, '頭皮檢測', '了解頭皮油脂、乾燥、敏感和日常護理需要，適合首次到店客人。', 'CHECK', true, 1
WHERE NOT EXISTS (SELECT 1 FROM public.services WHERE name = '頭皮狀態檢測');

INSERT INTO public.services (name, price, time, category, description, emoji, enabled, sort_order)
SELECT '深層頭皮潔淨護理', 480, 60, '深層潔淨', '以溫和節奏清潔頭皮堆積，配合放鬆護理，適合定期保養。', 'CLEAN', true, 2
WHERE NOT EXISTS (SELECT 1 FROM public.services WHERE name = '深層頭皮潔淨護理');

INSERT INTO public.services (name, price, time, category, description, emoji, enabled, sort_order)
SELECT '舒緩保濕 Head Spa', 680, 75, '放鬆養生', '針對乾燥、繃緊或壓力型頭皮，提供舒緩保濕與放鬆體驗。', 'CALM', true, 3
WHERE NOT EXISTS (SELECT 1 FROM public.services WHERE name = '舒緩保濕 Head Spa');

INSERT INTO public.products (name, category, description, price, orig, stock, emoji, enabled, sort_order)
SELECT '頭皮平衡洗護露', '頭皮潔淨', '適合日常頭皮潔淨，洗後保持清爽不繃緊。', 180, 220, 25, 'SCALP', true, 1
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = '頭皮平衡洗護露');

INSERT INTO public.products (name, category, description, price, orig, stock, emoji, enabled, sort_order)
SELECT '保濕舒緩頭皮精華', '保濕舒緩', '輕盈頭皮精華，適合乾燥或容易繃緊的日常保養。', 260, 320, 15, 'CARE', true, 2
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = '保濕舒緩頭皮精華');

INSERT INTO public.service_packages (name, price, orig, description, items, emoji, enabled)
SELECT '頭皮護理體驗套票', 1280, 1440, '三次深層頭皮潔淨護理，用作前台展示或後續合併到 tickets。', '[]'::jsonb, 'SPA', true
WHERE NOT EXISTS (SELECT 1 FROM public.service_packages WHERE name = '頭皮護理體驗套票');

INSERT INTO public.tickets (name, price, orig, count, description, emoji, enabled)
SELECT '深層潔淨 3 次套票', 1280, 1440, 3, '付款確認後存入會員帳戶，可於預約深層頭皮潔淨護理時扣次。', 'SPA', true
WHERE NOT EXISTS (SELECT 1 FROM public.tickets WHERE name = '深層潔淨 3 次套票');

INSERT INTO public.tickets (name, price, orig, count, description, emoji, enabled)
SELECT 'Head Spa 5 次養護套票', 2980, 3400, 5, '適合定期頭皮保養與放鬆養生，會員可於預約適用服務時使用。', 'HEAD', true
WHERE NOT EXISTS (SELECT 1 FROM public.tickets WHERE name = 'Head Spa 5 次養護套票');

INSERT INTO public.coupons (code, name, discount, type, min_spend, enabled)
SELECT 'WELCOME10', '新會員體驗優惠', 10, 'percent', 0, true
WHERE NOT EXISTS (SELECT 1 FROM public.coupons WHERE code = 'WELCOME10');

INSERT INTO public.coupons (code, name, discount, type, min_spend, enabled)
SELECT 'SAVE100', '滿 500 減 100', 100, 'fixed', 500, true
WHERE NOT EXISTS (SELECT 1 FROM public.coupons WHERE code = 'SAVE100');

INSERT INTO public.staff (name, role, phone, bio, enabled, schedule, services, "daysOff", break_start, break_end)
SELECT
  'Mika',
  '資深頭皮護理師',
  '',
  '專注頭皮檢測、深層潔淨和舒緩放鬆流程。',
  true,
  '{"1":{"start":"11:00","end":"20:00"},"2":{"start":"11:00","end":"20:00"},"3":{"start":"11:00","end":"20:00"},"4":{"start":"11:00","end":"20:00"},"5":{"start":"11:00","end":"20:00"},"6":{"start":"11:00","end":"18:00"}}'::jsonb,
  '[]'::jsonb,
  '["0"]'::jsonb,
  '15:00',
  '16:00'
WHERE NOT EXISTS (SELECT 1 FROM public.staff WHERE name = 'Mika');

INSERT INTO public.staff (name, role, phone, bio, enabled, schedule, services, "daysOff", break_start, break_end)
SELECT
  'Nora',
  'Head Spa 服務人員',
  '',
  '提供自助頭皮護理引導、保濕舒緩和日常保養建議。',
  true,
  '{"2":{"start":"11:00","end":"20:00"},"3":{"start":"11:00","end":"20:00"},"4":{"start":"11:00","end":"20:00"},"5":{"start":"11:00","end":"20:00"},"6":{"start":"11:00","end":"18:00"},"0":{"start":"12:00","end":"18:00"}}'::jsonb,
  '[]'::jsonb,
  '["1"]'::jsonb,
  '15:00',
  '16:00'
WHERE NOT EXISTS (SELECT 1 FROM public.staff WHERE name = 'Nora');

INSERT INTO public.articles (title, category, excerpt, content, enabled, sort_order)
SELECT
  '第一次做頭皮護理前要知道的事',
  '頭皮護理',
  '簡單了解頭皮檢測、潔淨和舒緩護理的基本流程。',
  '這篇示例文章用於開發環境，正式上線前請以真實內容取代。',
  true,
  1
WHERE NOT EXISTS (SELECT 1 FROM public.articles WHERE title = '第一次做頭皮護理前要知道的事');

INSERT INTO public.articles (title, category, excerpt, content, enabled, sort_order)
SELECT
  '如何安排定期 Head Spa 保養',
  '放鬆養生',
  '依照頭皮狀態與生活節奏，安排適合自己的保養頻率。',
  '這篇示例文章用於開發環境，正式上線前請以真實內容取代。',
  true,
  2
WHERE NOT EXISTS (SELECT 1 FROM public.articles WHERE title = '如何安排定期 Head Spa 保養');

INSERT INTO public.faqs (question, answer, sort_order, enabled)
SELECT
  '預約前需要先註冊會員嗎？',
  '建議先登入會員，因為預約、我的套票和套票扣次都會綁定 Supabase Auth 會員身份。',
  1,
  true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE question = '預約前需要先註冊會員嗎？');

INSERT INTO public.faqs (question, answer, sort_order, enabled)
SELECT
  '購買套票後可以即時使用嗎？',
  '第一版採後台人工確認付款。付款確認後套票才會加入會員帳戶，之後可於預約適用服務時使用。',
  2,
  true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE question = '購買套票後可以即時使用嗎？');

INSERT INTO public.settings (key, value)
SELECT 'shop_name', 'PANDORA HEAD SPA'
WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'shop_name');

INSERT INTO public.settings (key, value)
SELECT 'business_hours', '11:00 - 20:00'
WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'business_hours');
