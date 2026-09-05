create table if not exists public.mfg_waitlist (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null unique,
  company text not null,
  revenue_band text not null,
  current_erp text not null,
  pain_point text,
  source text,
  contacted_at timestamptz,
  status text not null default 'new'
);

create index if not exists mfg_waitlist_created_at_idx
  on public.mfg_waitlist (created_at desc);
create index if not exists mfg_waitlist_status_idx
  on public.mfg_waitlist (status);

-- Lock down. Only the service role (server action) can write.
-- Super admins can read/manage from the admin surfaces. No public policies.
alter table public.mfg_waitlist enable row level security;

drop policy if exists "Super admins can manage mfg waitlist" on public.mfg_waitlist;
create policy "Super admins can manage mfg waitlist"
on public.mfg_waitlist
for all
using (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'super_admin'
  or auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin'
)
with check (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'super_admin'
  or auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin'
);
