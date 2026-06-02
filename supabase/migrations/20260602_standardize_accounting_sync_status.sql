update public.accounting_syncs
set validation_status = case lower(validation_status)
  when 'ready' then 'SUCCESS'
  when 'successful' then 'SUCCESS'
  when 'completed' then 'SUCCESS'
  when 'synced' then 'SUCCESS'
  when 'partial' then 'FAILED'
  when 'invalid' then 'FAILED'
  when 'failed' then 'FAILED'
  when 'running' then 'RUNNING'
  when 'pending' then 'PENDING'
  else validation_status
end
where validation_status is not null;

alter table public.accounting_syncs
  add column if not exists last_synced_at timestamptz not null default now();

update public.accounting_syncs
set normalized_payload = jsonb_set(normalized_payload, '{syncStatus}', to_jsonb(validation_status))
where normalized_payload is not null
  and validation_status in ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED');

alter table public.accounting_syncs
  drop constraint if exists accounting_syncs_validation_status_enum;

alter table public.accounting_syncs
  add constraint accounting_syncs_validation_status_enum
  check (validation_status in ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED'));
