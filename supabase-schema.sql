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
