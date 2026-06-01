create extension if not exists pgcrypto;

-- Additive control hardening for service-owned backend writes.
-- These policies do not change customer-facing behavior; they make intended
-- backend-only access explicit for audit/SOC 2 control design review.

alter table if exists public.audit_logs enable row level security;
alter table if exists public.background_jobs enable row level security;
alter table if exists public.accounting_connections enable row level security;
alter table if exists public.free_review_leads enable row level security;
alter table if exists public.pdf_package_customizations enable row level security;
alter table if exists public.pulse_conversation_memory enable row level security;
alter table if exists public.pulse_historical_snapshots enable row level security;
alter table if exists public.pulse_insight_memory enable row level security;
alter table if exists public.pulse_usage_events enable row level security;
alter table if exists public.support_tickets enable row level security;
alter table if exists public.company_invitations enable row level security;
alter table if exists public.company_roles enable row level security;

drop policy if exists "service_role_all_accounting_connections" on public.accounting_connections;
create policy "service_role_all_accounting_connections"
on public.accounting_connections
for all
to service_role
using (true)
with check (true);

drop policy if exists "service_role_all_pdf_package_customizations" on public.pdf_package_customizations;
create policy "service_role_all_pdf_package_customizations"
on public.pdf_package_customizations
for all
to service_role
using (true)
with check (true);

drop policy if exists "service_role_all_pulse_memory" on public.pulse_conversation_memory;
create policy "service_role_all_pulse_memory"
on public.pulse_conversation_memory
for all
to service_role
using (true)
with check (true);

drop policy if exists "service_role_all_pulse_historical_snapshots" on public.pulse_historical_snapshots;
create policy "service_role_all_pulse_historical_snapshots"
on public.pulse_historical_snapshots
for all
to service_role
using (true)
with check (true);

drop policy if exists "service_role_all_pulse_insight_memory" on public.pulse_insight_memory;
create policy "service_role_all_pulse_insight_memory"
on public.pulse_insight_memory
for all
to service_role
using (true)
with check (true);

drop policy if exists "service_role_all_pulse_usage_events" on public.pulse_usage_events;
create policy "service_role_all_pulse_usage_events"
on public.pulse_usage_events
for all
to service_role
using (true)
with check (true);

drop policy if exists "service_role_all_support_tickets" on public.support_tickets;
create policy "service_role_all_support_tickets"
on public.support_tickets
for all
to service_role
using (true)
with check (true);

drop policy if exists "service_role_all_company_invitations" on public.company_invitations;
create policy "service_role_all_company_invitations"
on public.company_invitations
for all
to service_role
using (true)
with check (true);

drop policy if exists "authenticated_users_can_read_company_roles" on public.company_roles;
create policy "authenticated_users_can_read_company_roles"
on public.company_roles
for select
to authenticated
using (true);

drop policy if exists "company admins can manage company invitations" on public.company_invitations;
create policy "company admins can manage company invitations"
on public.company_invitations
for all
to authenticated
using (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_invitations.company_id
      and cu.user_id = auth.uid()
      and cu.status = 'active'
      and cu.role = 'company_admin'
  )
)
with check (
  exists (
    select 1
    from public.company_users cu
    where cu.company_id = company_invitations.company_id
      and cu.user_id = auth.uid()
      and cu.status = 'active'
      and cu.role = 'company_admin'
  )
);

create index if not exists audit_logs_resource_idx on public.audit_logs (resource_type, resource_id);
create index if not exists audit_logs_actor_created_idx on public.audit_logs (actor_user_id, created_at desc);
