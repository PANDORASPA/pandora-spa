-- =============================================================================
-- ANALYTICS MIGRATION
-- Adds page_views table + RLS + indexes
-- =============================================================================

create table if not exists page_views (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  referrer text,
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists idx_page_views_created on page_views(created_at);
create index if not exists idx_page_views_path on page_views(path);

alter table page_views enable row level security;

-- Anyone can record a view (page loads)
create policy "public_insert_page_views" on page_views for insert with check (true);

-- Public read aggregate (for the admin dashboard)
create policy "public_read_page_views" on page_views for select using (true);
