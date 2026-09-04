-- =============================================================================
-- SALON POKE — Supabase Schema
-- Project: qikbcmewhshgnhqckonw
-- Generated for migration from localStorage → Supabase
-- =============================================================================
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query
-- =============================================================================

-- Drop everything first (idempotent reset)
drop table if exists newsletter_subscribers cascade;
drop table if exists preorder_reservations cascade;
drop table if exists preorder_items cascade;
drop table if exists bookings cascade;
drop table if exists customer_passes cascade;
drop table if exists customers cascade;
drop table if exists pass_templates cascade;
drop table if exists products cascade;
drop table if exists schedule_days cascade;
drop table if exists blocked_dates cascade;
drop table if exists site_settings cascade;
drop function if exists mark_attended(uuid, boolean) cascade;
drop function if exists refund_pass_visit(uuid) cascade;
drop function if exists expire_old_passes() cascade;

-- =============================================================================
-- STATIC CONTENT (admin-editable, public read)
-- =============================================================================

create table pass_templates (
  id text primary key,
  name text not null,
  jp_name text,
  visits_total int not null,
  price_gbp numeric not null,
  validity_days int,
  description text,
  badge text,
  sort_order int default 0,
  is_active boolean default true,
  accent text,
  created_at timestamptz default now()
);

create table products (
  id text primary key,
  code text,
  jp_code text,
  name text not null,
  jp_name text,
  price numeric not null,
  tier text,
  badge_text text,
  img text,
  alt text,
  description text,
  stock int default 0,
  stock_status text,
  featured boolean default false
);

create table schedule_days (
  id text primary key default gen_random_uuid(),
  day text not null unique,
  day_num int,
  kicker text,
  theme text,
  jp_theme text,
  theme_class text,
  start_time time,
  end_time time,
  seats int default 0,
  closed boolean default false,
  single_price numeric,
  bundle_price numeric,
  box_price numeric,
  entry_price numeric,
  is_featured boolean default false,
  is_closed boolean default false,
  session_note text
);

create table site_settings (
  id int primary key default 1,
  site_meta jsonb,
  hero jsonb,
  pricing jsonb,
  opening_hours jsonb,
  admin_config jsonb,
  pass_faq jsonb,
  promo jsonb,
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);

-- =============================================================================
-- DYNAMIC CONTENT (customers, bookings, etc.)
-- =============================================================================

create table customers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text not null,
  phone text,
  notes text,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table customer_passes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  pass_template_id text references pass_templates(id),
  visits_total int not null,
  visits_remaining int not null,
  visits_used int default 0,
  purchased_at timestamptz default now(),
  expires_at timestamptz,
  status text default 'active',
  payment_status text default 'pending',
  price_gbp numeric,
  source text default 'web'
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  customer_pass_id uuid references customer_passes(id),
  night text not null,
  booking_date date not null,
  party_size int default 1,
  plan text,
  notes text,
  status text default 'pending',
  is_walkin boolean default false,
  source text default 'web',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  attended_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by text,
  rescheduled_at timestamptz,
  rescheduled_by text,
  rescheduled_from text
);

create table preorder_items (
  id text primary key,
  code text,
  name text not null,
  jp_name text,
  release_date date,
  image_url text,
  description text,
  reserved_count int default 0,
  total_slots int,
  is_active boolean default true,
  badge text,
  jp_code text,
  reserved_pct int default 0
);

create table preorder_reservations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  preorder_item_id text references preorder_items(id),
  item_name text,
  item_code text,
  quantity int default 1,
  deposit_paid numeric default 20,
  status text default 'reserved',
  reserved_at timestamptz default now(),
  picked_up_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by text
);

create table blocked_dates (
  id uuid primary key default gen_random_uuid(),
  block_date date unique not null,
  reason text,
  blocked_at timestamptz default now()
);

create table newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  subscribed_at timestamptz default now(),
  unsubscribed_at timestamptz
);

-- =============================================================================
-- RPC FUNCTIONS
-- =============================================================================

-- Atomic "mark attended" with auto-deduct
create or replace function mark_attended(p_booking_id uuid, p_mark boolean)
returns void as $$
declare
  b bookings%rowtype;
  cp customer_passes%rowtype;
begin
  select * into b from bookings where id = p_booking_id;
  if not found then raise exception 'Booking not found'; end if;
  
  if p_mark then
    update bookings set status='attended', attended_at=now(), updated_at=now() 
    where id = p_booking_id;
    
    if b.customer_pass_id is not null then
      select * into cp from customer_passes where id = b.customer_pass_id for update;
      if cp.status <> 'active' then raise exception 'Pass not active (%)', cp.status; end if;
      if cp.visits_remaining <= 0 then raise exception 'No visits remaining'; end if;
      
      update customer_passes
        set visits_remaining = visits_remaining - 1,
            visits_used = visits_used + 1,
            status = case when visits_remaining - 1 = 0 then 'exhausted' else status end
        where id = cp.id;
    end if;
  else
    update bookings set status='confirmed', updated_at=now() where id = p_booking_id;
  end if;
end;
$$ language plpgsql security definer;

-- Refund a pass visit
create or replace function refund_pass_visit(p_pass_id uuid)
returns void as $$
declare
  cp customer_passes%rowtype;
begin
  select * into cp from customer_passes where id = p_pass_id for update;
  if not found then raise exception 'Pass not found'; end if;
  
  if cp.visits_used > 0 then
    update customer_passes
      set visits_used = visits_used - 1,
          visits_remaining = visits_remaining + 1,
          status = case when status = 'exhausted' then 'active' else status end
      where id = p_pass_id;
  end if;
end;
$$ language plpgsql security definer;

-- Auto-expire passes (call from app on render)
create or replace function expire_old_passes()
returns void as $$
begin
  update customer_passes
  set status = 'expired'
  where status = 'active'
    and expires_at is not null
    and expires_at < now();
end;
$$ language plpgsql security definer;

-- =============================================================================
-- RLS POLICIES
-- For a single-shop low-risk site, we allow anon read/write on most tables.
-- Admin operations are still gated by client-side password check (Phase 1).
-- Later we can use Supabase Auth + admin role for stronger security.
-- =============================================================================

alter table pass_templates enable row level security;
alter table products enable row level security;
alter table schedule_days enable row level security;
alter table site_settings enable row level security;
alter table customers enable row level security;
alter table customer_passes enable row level security;
alter table bookings enable row level security;
alter table preorder_items enable row level security;
alter table preorder_reservations enable row level security;
alter table blocked_dates enable row level security;
alter table newsletter_subscribers enable row level security;

-- Public read on static content
create policy "public_read_pass_templates" on pass_templates for select using (true);
create policy "public_read_products" on products for select using (true);
create policy "public_read_schedule_days" on schedule_days for select using (true);
create policy "public_read_site_settings" on site_settings for select using (true);
create policy "public_read_preorder_items" on preorder_items for select using (true);
create policy "public_read_blocked_dates" on blocked_dates for select using (true);

-- Anyone can write to dynamic content (Phase 1: low security)
create policy "public_write_pass_templates" on pass_templates for all using (true) with check (true);
create policy "public_write_products" on products for all using (true) with check (true);
create policy "public_write_schedule_days" on schedule_days for all using (true) with check (true);
create policy "public_write_site_settings" on site_settings for all using (true) with check (true);
create policy "public_write_preorder_items" on preorder_items for all using (true) with check (true);
create policy "public_write_blocked_dates" on blocked_dates for all using (true) with check (true);

create policy "public_all_customers" on customers for all using (true) with check (true);
create policy "public_all_customer_passes" on customer_passes for all using (true) with check (true);
create policy "public_all_bookings" on bookings for all using (true) with check (true);
create policy "public_all_preorder_reservations" on preorder_reservations for all using (true) with check (true);
create policy "public_all_newsletter" on newsletter_subscribers for all using (true) with check (true);

-- =============================================================================
-- SEED DATA (from current data.json)
-- =============================================================================

insert into pass_templates (id, name, jp_name, visits_total, price_gbp, validity_days, description, badge, sort_order, is_active, accent) values
  ('pass5', '5 Visit Pass', '5回パス', 5, 95, 90, 'Five themed Pack Opening Nights. Use any week, any theme. Best for occasional visitors who want a discount.', 'STARTER', 1, true, '#4ddb8e'),
  ('pass10', '10 Visit Pass', '10回パス', 10, 180, 180, 'Ten nights, our most popular option. Save £60 vs single bundles. Includes 48-hour early pre-order access.', 'MOST POPULAR', 2, true, '#ffd700'),
  ('pass20', '20 Visit Pass', '20回パス', 20, 320, 365, 'Twenty nights, full year. Save £160 vs single bundles. Includes all member perks plus invite-only events.', 'BEST VALUE', 3, true, '#ff8c00');

insert into products (id, code, jp_code, name, jp_name, price, tier, badge_text, img, alt, description, stock, stock_status, featured) values
  ('blackBolt', 'SV11B', '黑龍', 'Black Bolt', '黒炎のドラグーン', 96, 'TOP', 'TOP TIER · £96', 'imgs/black_bolt_box.jpg', 'Black Bolt booster box', 'Stellar Crown · 30 packs · Dragona ex chase · Friday signature night', 4, 'low', true),
  ('whiteFlare', 'SV11W', '白龍', 'White Flare', 'ホワイトフレア', 96, 'TOP', 'TOP TIER · £96', 'imgs/white_flare_box.jpg', 'White Flare booster box', 'Stellar Crown · 30 packs · White Dragnoir ex · Wednesday night', 5, 'low', true),
  ('pokemon151', 'SV2a', '', 'Pokemon 151', 'ポケモン151', 78, 'CLASSIC', 'CLASSIC · £78', 'imgs/pokemon_151.jpg', 'Pokemon 151 booster box', 'Reprint · 30 packs · Original 151 chase · Monday night', 3, 'low', false),
  ('shinyTreasure', 'SV4a', '', 'Shiny Treasure ex', 'シャイニートレジャー', 72, 'CLASSIC', 'CLASSIC · £72', 'imgs/shiny_treasure.jpg', 'Shiny Treasure ex booster box', 'Shiny reprint · 30 packs · Shiny chase · Tuesday night', 99, 'in', false),
  ('matchless', 'S5a', '', 'Matchless Fighter', '一撃マスター', 54, 'ENTRY', 'ENTRY · £54', 'imgs/matchless.jpg', 'Matchless Fighter booster box', 'SWSH · 30 packs · Budget entry box', 99, 'in', false),
  ('vmaxClimax', 'S8', '', 'VMAX Climax', 'VMAXクライマックス', 48, 'ENTRY', 'ENTRY · £48', 'imgs/vmax_climax.jpg', 'VMAX Climax booster box', 'SWSH · 30 packs · Bulk SWSH favourite', 2, 'low', false);

insert into schedule_days (day, day_num, kicker, theme, jp_theme, theme_class, start_time, end_time, seats, closed, single_price, bundle_price, box_price, entry_price, is_featured, is_closed, session_note) values
  ('MON', 1, 'Retro Night', 'Pokemon 151', 'ポケモン151', 'day-theme-151', '19:00', '22:00', 10, false, 8, 24, null, null, false, false, null),
  ('TUE', 2, 'Shiny Hunters', 'Shiny Treasure', 'シャイニートレジャー', 'day-theme-shiny', '19:00', '22:00', 10, false, 8, 24, null, null, false, false, null),
  ('WED', 3, 'Stellar Crown', 'White Flare Night', 'ホワイトフレア · 白龍', 'day-theme-white', '19:00', '22:00', 10, false, 8, 24, null, null, false, false, null),
  ('THU', 4, 'BYO Box', 'Mixed Singles', '持ち込み開封', 'day-theme-mixed', '19:00', '22:00', 10, false, null, null, null, 15, false, false, null),
  ('FRI', 5, 'Stellar Crown · 黑龍', 'Black Bolt Night', 'ブラックボルト · 黒炎のドラグーン', 'day-theme-black', '18:00', '01:00', 20, false, 8, 24, 96, null, true, false, '2 sessions'),
  ('SAT', 6, 'Community Day', 'Family Open Box', '家族DAY', 'day-theme-family', '14:00', '19:00', 15, false, 8, 24, null, null, false, false, null),
  ('SUN', 7, 'Closed', 'Private Hire', '貸切営業のみ', 'day-theme-closed', null, null, 6, true, null, null, null, 120, false, true, null);

insert into preorder_items (id, code, jp_code, name, jp_name, release_date, image_url, description, reserved_pct, badge, is_active) values
  ('nightWanderer', 'SV9a', '新規', 'Night Wanderer', 'ナイトワンダラー', '2026-07-18', 'imgs/night_wanderer.jpg', '30 packs · expected chase: new Dark-type ex', 72, 'Drops 18 Jul 2026', true),
  ('megaBrave', 'M1L', '新規', 'MEGA Brave', 'メガブレイブ', '2026-08-15', 'imgs/mega_brave.jpg', '30 packs · expected chase: MEGA evolution ex', 38, 'Drops 15 Aug 2026', false),
  ('megaSymphonia', 'M1S', '新規', 'MEGA Symphonia', 'メガシンフォニア', '2026-09-19', 'imgs/mega_symphonia.jpg', '30 packs · twin of MEGA Brave · music-themed', 24, 'Drops 19 Sep 2026', false);

insert into site_settings (id, site_meta, hero, pricing, opening_hours, admin_config, pass_faq, promo) values (
  1,
  '{"brandName":"SALON POKE","tagline":"Bristol''s home for Sealed Japanese Pokemon","aboutLead":"Salon Poke is where Bristol collectors come to <b>open boxes, share pulls and chase the chase</b>. We curate only <b>factory-sealed Japanese booster boxes</b> — the real deal, shrink-wrapped, straight from Tokyo.","aboutBody":"Six nights a week we run a <b>themed Pack Opening Night</b> with limited seats. We hold new-release <b>pre-orders</b>, sell <b>Visit Passes</b> for regulars, host private group nights and trade singles at the counter. Bring a friend. Bring a box. Bring your chase list.","city":"Bristol","country":"UK","address":"60A Park Row","postcode":"BS1 5LE","phoneDisplay":"+44 117 555 0182","phoneRaw":"+441175550182","whatsappRaw":"441175550182","emailPublic":"hello@salonpoke.co.uk","emailBookings":"book@salonpoke.co.uk","emailPrivacy":"privacy@salonpoke.co.uk","instagramHandle":"@salonpoke","instagramUrl":"https://instagram.com/salonpoke","tiktokHandle":"@salonpoke","tiktokUrl":"https://tiktok.com/@salonpoke","companyName":"Salon Poke Ltd","companyNumber":"14857291","vatNumber":"GB 438 927 192","tradingSince":"2023","metaDescription":"Bristol''s home for sealed Japanese Pokemon TCG. Booster boxes, singles, accessories, weekly Pack Opening Nights, and pre-orders for new JP releases."}'::jsonb,
  '{"badge":"BRISTOL · UK · JAPANESE TCG","title":"Bristol''s home for","titleAccent":"Sealed Japanese Pokemon","subtitle":"Factory-sealed booster boxes · 6 weekly themed Pack Opening Nights · Visit Passes · Pre-orders for new JP releases.","cta1":"Shop Boxes","cta2":"Reserve a Seat →","stats":[{"value":"6","label":"Weekly Events"},{"value":"£24","label":"3-Pack Bundle"},{"value":"100%","label":"Factory Sealed"},{"value":"10","label":"Seats / Night"}]}'::jsonb,
  '{"singlePack":8,"bundle3":24,"boxFrom":48,"byoEntry":15,"privateHire":120,"loyaltyFreeAfter":9,"preorderDeposit":20,"currency":"GBP"}'::jsonb,
  '{"monThuOpen":"11:00","monThuClose":"19:00","friOpen":"11:00","friClose":"22:00","friPackNote":"Pack Night 18:00 – 01:00","satOpen":"11:00","satClose":"19:00","satPackNote":"Community Day 14:00 – 19:00","sunNote":"Closed (Private Hire Only)","googleMapsEmbed":"https://www.google.com/maps?q=60A+Park+Row+Bristol+BS1+5LE&output=embed"}'::jsonb,
  '{"password":"salonpoke2026","sessionHours":12}'::jsonb,
  '[{"q":"How do I use my pass?","a":"Book any night as usual, then tick ''Use my Visit Pass'' on the form. We''ll automatically redeem one visit from your pass when you attend."},{"q":"Do passes expire?","a":"Yes — 5-visit passes are valid 90 days, 10-visit 180 days, 20-visit 365 days from purchase."},{"q":"Can I share my pass?","a":"Passes are tied to one email. You can bring a friend on the night but only your seat uses a visit."},{"q":"What if I can''t make a night?","a":"Cancel up to 24 hours before for free. Cancellations inside 24 hours do not refund the visit."},{"q":"Refunds?","a":"Unstarted passes are refundable within 14 days. Once a visit is used the pass is non-refundable."}]'::jsonb,
  '{"enabled":false,"text":"","cta":"","link":"#"}'::jsonb
);

-- =============================================================================
-- INDEXES for performance
-- =============================================================================
create index idx_customers_email on customers(email);
create index idx_bookings_customer on bookings(customer_id);
create index idx_bookings_date on bookings(booking_date);
create index idx_bookings_status on bookings(status);
create index idx_passes_customer on customer_passes(customer_id);
create index idx_passes_status on customer_passes(status);
create index idx_preorder_customer on preorder_reservations(customer_id);
create index idx_preorder_item on preorder_reservations(preorder_item_id);

-- =============================================================================
-- DONE! Verify with these queries:
-- =============================================================================
-- select count(*) from pass_templates;     -- should be 3
-- select count(*) from products;            -- should be 6
-- select count(*) from schedule_days;       -- should be 7
-- select count(*) from preorder_items;      -- should be 3
-- select * from site_settings;              -- should have 1 row
