create table if not exists public.practice_accounts (
  id uuid primary key default gen_random_uuid(),
  account_type text not null,
  name text not null,
  structure text,
  client_count text,
  primary_services text[] not null default array[]::text[],
  default_reporting_cadence text,
  invite_users_now boolean not null default false,
  owner_user_id uuid,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies
  add column if not exists account_type text not null default 'my-own-company',
  add column if not exists practice_id uuid references public.practice_accounts(id) on delete set null;

alter table public.practice_accounts enable row level security;

drop policy if exists "practice owner can read practice accounts" on public.practice_accounts;
create policy "practice owner can read practice accounts" on public.practice_accounts
  for select using (owner_user_id = auth.uid());

drop policy if exists "practice owner can update practice accounts" on public.practice_accounts;
create policy "practice owner can update practice accounts" on public.practice_accounts
  for update using (owner_user_id = auth.uid());

create index if not exists companies_practice_id_idx on public.companies(practice_id);
create index if not exists companies_account_type_idx on public.companies(account_type);
create index if not exists practice_accounts_owner_user_id_idx on public.practice_accounts(owner_user_id);
