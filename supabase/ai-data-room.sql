-- Raise AI Data Room: database schema
-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to run more than once (all statements are idempotent).
-- The front-end never touches this table directly. Only the Edge Functions
-- (build-data-room, get-data-room, verify-payment) read/write it using the
-- service_role key, which bypasses RLS. No public policies are created.

-- One row per generated data room. paid=false until verify-payment confirms
-- the Paddle transaction.
create table if not exists public.data_rooms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null,
  token text not null unique,
  stage text not null,
  answers jsonb not null default '{}'::jsonb,
  deck_summary text,
  content jsonb not null default '{}'::jsonb,
  paid boolean not null default false,
  paddle_transaction_id text
);

-- Index for the "recover by email" lookup in verify-payment
-- (latest unpaid room for an email). The token lookup uses the unique
-- constraint's own index, so it needs no extra index.
create index if not exists data_rooms_email_created_idx
  on public.data_rooms (email, created_at desc);

-- Paddle transaction id (added for installs created before the Paddle switch).
alter table public.data_rooms add column if not exists paddle_transaction_id text;

-- Lock the table down: RLS on, no public policies.
alter table public.data_rooms enable row level security;

-- Optional cleanup: delete unpaid rooms older than 30 days.
-- Run manually, or schedule it (e.g. pg_cron) once the rooms pile up.
create or replace function public.delete_unpaid_data_rooms()
returns integer
language sql
security definer
as $$
  with deleted as (
    delete from public.data_rooms
    where paid = false
      and created_at < now() - interval '30 days'
    returning 1
  )
  select count(*) from deleted;
$$;

-- Verify it worked (run after the above):
-- select tablename, rowsecurity from pg_tables where tablename = 'data_rooms';
