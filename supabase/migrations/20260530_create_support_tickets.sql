create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number bigserial unique not null,
  user_id uuid,
  user_email text,
  company_id uuid references public.companies(id) on delete set null,
  company_name text,
  package_level text,
  persona text,
  category text not null default 'Other',
  ticket_type text not null default 'Support Issue',
  priority text not null default 'Normal',
  status text not null default 'Open',
  subject text not null,
  description text not null,
  browser text,
  attachment_metadata jsonb not null default '{}'::jsonb,
  ai_support_context jsonb not null default '{}'::jsonb,
  assigned_to text,
  admin_notes text,
  notification_sent boolean not null default false,
  notification_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists support_tickets_user_id_idx on public.support_tickets(user_id);
create index if not exists support_tickets_company_id_idx on public.support_tickets(company_id);
create index if not exists support_tickets_status_idx on public.support_tickets(status);
create index if not exists support_tickets_category_idx on public.support_tickets(category);
create index if not exists support_tickets_ticket_type_idx on public.support_tickets(ticket_type);
create index if not exists support_tickets_created_at_idx on public.support_tickets(created_at desc);

alter table public.support_tickets enable row level security;

drop policy if exists "Users can view their support tickets" on public.support_tickets;
create policy "Users can view their support tickets"
on public.support_tickets
for select
using (auth.uid() = user_id);

drop policy if exists "Users can create support tickets" on public.support_tickets;
create policy "Users can create support tickets"
on public.support_tickets
for insert
with check (auth.uid() = user_id);

drop policy if exists "Super admins can manage support tickets" on public.support_tickets;
create policy "Super admins can manage support tickets"
on public.support_tickets
for all
using (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'super_admin'
  or auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin'
)
with check (
  auth.jwt() -> 'app_metadata' ->> 'role' = 'super_admin'
  or auth.jwt() -> 'user_metadata' ->> 'role' = 'super_admin'
);
