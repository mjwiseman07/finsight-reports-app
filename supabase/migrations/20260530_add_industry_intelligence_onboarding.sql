alter table public.companies
  add column if not exists industry_type text not null default 'Other';

alter table public.company_settings
  add column if not exists industry_intelligence jsonb not null default '{}'::jsonb;

create index if not exists companies_industry_type_idx on public.companies(industry_type);
