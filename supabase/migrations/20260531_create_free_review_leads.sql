create table if not exists public.free_review_leads (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  business_name text not null,
  email text not null,
  phone text,
  source_page text,
  referral_information text,
  utm_tracking_data jsonb not null default '{}'::jsonb,
  legal_company_name text,
  industry text,
  revenue_range text,
  fiscal_year text,
  additional_business_information jsonb not null default '{}'::jsonb,
  status text not null default 'lead_captured',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists free_review_leads_email_idx on public.free_review_leads(email);
create index if not exists free_review_leads_created_at_idx on public.free_review_leads(created_at desc);
create index if not exists free_review_leads_status_idx on public.free_review_leads(status);

alter table public.free_review_leads enable row level security;

drop policy if exists "Super admins can manage free review leads" on public.free_review_leads;
create policy "Super admins can manage free review leads"
on public.free_review_leads
for all
using (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'super_admin'
  or auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin'
)
with check (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'super_admin'
  or auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin'
);
