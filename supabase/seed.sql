-- Optional demo seed for development and internal demos.
-- Do not treat these rows as production content.

INSERT INTO public.services (name, price, time, category, description, emoji, enabled, sort_order)
SELECT 'Signature Cut', 280, 60, 'Cut', 'Basic wash, cut and styling consultation.', '✂️', true, 1
WHERE NOT EXISTS (SELECT 1 FROM public.services WHERE name = 'Signature Cut');

INSERT INTO public.services (name, price, time, category, description, emoji, enabled, sort_order)
SELECT 'Color Refresh', 680, 120, 'Color', 'Single-tone colour refresh with finishing style.', '🎨', true, 2
WHERE NOT EXISTS (SELECT 1 FROM public.services WHERE name = 'Color Refresh');

INSERT INTO public.services (name, price, time, category, description, emoji, enabled, sort_order)
SELECT 'Scalp Treatment', 450, 45, 'Treatment', 'Scalp cleansing and hydration treatment.', '🧴', true, 3
WHERE NOT EXISTS (SELECT 1 FROM public.services WHERE name = 'Scalp Treatment');

INSERT INTO public.products (name, category, description, price, orig, stock, emoji, enabled, sort_order)
SELECT 'Daily Repair Shampoo', 'Hair Care', 'Salon-friendly shampoo for daily cleansing.', 150, 180, 25, '🧴', true, 1
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Daily Repair Shampoo');

INSERT INTO public.products (name, category, description, price, orig, stock, emoji, enabled, sort_order)
SELECT 'Moisture Hair Oil', 'Styling', 'Lightweight finishing oil for shine and smoothing.', 180, 220, 15, '✨', true, 2
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Moisture Hair Oil');

INSERT INTO public.service_packages (name, price, orig, description, items, emoji, enabled)
SELECT '3-Visit Cut Package', 750, 840, 'Three Signature Cut visits at a bundled rate.', '[]'::jsonb, '🎁', true
WHERE NOT EXISTS (SELECT 1 FROM public.service_packages WHERE name = '3-Visit Cut Package');

INSERT INTO public.tickets (name, price, orig, count, description, emoji, enabled)
SELECT 'Treatment Ticket', 1080, 1350, 3, 'Three treatment sessions stored in member account.', '🎟️', true
WHERE NOT EXISTS (SELECT 1 FROM public.tickets WHERE name = 'Treatment Ticket');

INSERT INTO public.tickets (name, price, orig, count, description, emoji, enabled)
SELECT 'Scalp Care Ticket', 1900, 2250, 5, 'Five scalp care visits for recurring maintenance.', '🎫', true
WHERE NOT EXISTS (SELECT 1 FROM public.tickets WHERE name = 'Scalp Care Ticket');

INSERT INTO public.coupons (code, name, discount, type, min_spend, enabled)
SELECT 'WELCOME10', 'Welcome Offer', 10, 'percent', 0, true
WHERE NOT EXISTS (SELECT 1 FROM public.coupons WHERE code = 'WELCOME10');

INSERT INTO public.coupons (code, name, discount, type, min_spend, enabled)
SELECT 'SAVE100', 'Spend 500 Save 100', 100, 'fixed', 500, true
WHERE NOT EXISTS (SELECT 1 FROM public.coupons WHERE code = 'SAVE100');

INSERT INTO public.staff (name, role, phone, bio, enabled, schedule, services, "daysOff", break_start, break_end)
SELECT
  'Mika',
  'Senior Stylist',
  '',
  'Focuses on soft layers, daily styling and color consultation.',
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
  'Stylist',
  '',
  'Provides coloring support, treatments and event styling.',
  true,
  '{"2":{"start":"11:00","end":"20:00"},"3":{"start":"11:00","end":"20:00"},"4":{"start":"11:00","end":"20:00"},"5":{"start":"11:00","end":"20:00"},"6":{"start":"11:00","end":"18:00"},"0":{"start":"12:00","end":"18:00"}}'::jsonb,
  '[]'::jsonb,
  '["1"]'::jsonb,
  '15:00',
  '16:00'
WHERE NOT EXISTS (SELECT 1 FROM public.staff WHERE name = 'Nora');

INSERT INTO public.articles (title, category, excerpt, content, enabled, sort_order)
SELECT
  'How To Pick A Low-Maintenance Cut',
  'Hair Tips',
  'A quick guide to choosing a look that fits your routine.',
  'This demo article is here to populate the articles page in development.',
  true,
  1
WHERE NOT EXISTS (SELECT 1 FROM public.articles WHERE title = 'How To Pick A Low-Maintenance Cut');

INSERT INTO public.articles (title, category, excerpt, content, enabled, sort_order)
SELECT
  'When To Book Scalp Care',
  'Scalp Care',
  'Signs that regular scalp maintenance may help.',
  'This demo article is here to populate the articles page in development.',
  true,
  2
WHERE NOT EXISTS (SELECT 1 FROM public.articles WHERE title = 'When To Book Scalp Care');

INSERT INTO public.faqs (question, answer, sort_order, enabled)
SELECT
  'Do I need an account before booking?',
  'Yes. Booking and member tickets now rely on Supabase Auth, so members should log in first.',
  1,
  true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE question = 'Do I need an account before booking?');

INSERT INTO public.faqs (question, answer, sort_order, enabled)
SELECT
  'Can I reschedule my booking?',
  'Yes. Members can manage their own bookings from the account area, subject to salon policy.',
  2,
  true
WHERE NOT EXISTS (SELECT 1 FROM public.faqs WHERE question = 'Can I reschedule my booking?');

INSERT INTO public.settings (key, value)
SELECT 'shop_name', 'VIVA HAIR'
WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'shop_name');

INSERT INTO public.settings (key, value)
SELECT 'business_hours', 'Tue-Sun 11:00-20:00'
WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'business_hours');
