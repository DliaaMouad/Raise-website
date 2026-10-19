-- Raise Tools founder accounts: profiles table.
-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- The profiles table holds the public founder profile (one row per auth user).
-- Passwords live in Supabase Auth (auth.users), never in this table.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  country text,
  company text,
  stage text,
  linkedin text,
  twitter text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Founders read their own profile" on public.profiles;
create policy "Founders read their own profile"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Founders create their own profile" on public.profiles;
create policy "Founders create their own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Founders update their own profile" on public.profiles;
create policy "Founders update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Audit diagnostic results: score_results table.
-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- The Audit page inserts one row per completed diagnostic (email nullable).
-- Reads are NOT allowed for anon: use the Supabase dashboard Table Editor
-- (and its CSV export) as the admin view.
create table if not exists public.score_results (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text,
  consent boolean not null default false,
  team smallint not null check (team between 1 and 5),
  problem smallint not null check (problem between 1 and 5),
  market smallint not null check (market between 1 and 5),
  product smallint not null check (product between 1 and 5),
  traction smallint not null check (traction between 1 and 5),
  business_model smallint not null check (business_model between 1 and 5),
  go_to_market smallint not null check (go_to_market between 1 and 5),
  competition smallint not null check (competition between 1 and 5),
  financials_ask smallint not null check (financials_ask between 1 and 5),
  narrative_clarity smallint not null check (narrative_clarity between 1 and 5),
  total_score smallint not null check (total_score between 10 and 50),
  top_3_leaks text[] not null,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  source text
);

alter table public.score_results enable row level security;

drop policy if exists "Public insert only" on public.score_results;
create policy "Public insert only"
  on public.score_results for insert to anon with check (true);
-- No SELECT policy for anon: results are readable only via service_role / dashboard.
