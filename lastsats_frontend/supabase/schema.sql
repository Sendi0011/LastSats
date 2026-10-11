-- LastSats — waitlist schema
--
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- The application only ever touches this table from the server using the
-- service_role key, which bypasses Row Level Security. RLS is enabled with no
-- policies so that the anon/public key can neither read nor write the list.

create table if not exists public.waitlist (
  id         bigint generated always as identity primary key,
  email      text        not null,
  source     text        not null default 'landing',
  created_at timestamptz not null default now()
);

-- One row per address, case-insensitive.
create unique index if not exists waitlist_email_unique
  on public.waitlist (lower(email));

create index if not exists waitlist_created_at_idx
  on public.waitlist (created_at desc);

alter table public.waitlist enable row level security;

-- Intentionally no policies: the table is private. All access goes through the
-- server (service_role) via /api/waitlist and /api/admin/*.
