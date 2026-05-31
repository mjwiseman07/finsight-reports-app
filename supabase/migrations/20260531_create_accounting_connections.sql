create extension if not exists pgcrypto;

create table if not exists public.accounting_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text not null,
  provider_family text not null,
  provider_product text not null,
  external_entity_id text,
  external_entity_name text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  tenant_or_realm_id text,
  scopes text[] not null default array[]::text[],
  status text not null default 'connected',
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists accounting_connections_user_provider_idx on public.accounting_connections(user_id, provider);
create index if not exists accounting_connections_status_idx on public.accounting_connections(status);
create index if not exists accounting_connections_external_entity_idx on public.accounting_connections(provider, external_entity_id);

alter table public.accounting_connections enable row level security;

drop policy if exists "users can read their accounting connection metadata" on public.accounting_connections;
create policy "users can read their accounting connection metadata" on public.accounting_connections
  for select using (user_id = auth.uid());

drop policy if exists "users can update their accounting connections" on public.accounting_connections;
create policy "users can update their accounting connections" on public.accounting_connections
  for update using (user_id = auth.uid());

-- Compatibility lift for existing QuickBooks connections. Tokens remain server-side only.
do $$
begin
  if to_regclass('public.erp_connections') is not null then
    insert into public.accounting_connections (
      user_id,
      provider,
      provider_family,
      provider_product,
      external_entity_id,
      external_entity_name,
      access_token,
      refresh_token,
      token_expires_at,
      tenant_or_realm_id,
      scopes,
      status,
      metadata_json,
      created_at,
      updated_at
    )
    select
      user_id,
      'quickbooks',
      'intuit',
      'quickbooks_online',
      'qbo:' || realm_id,
      null,
      access_token,
      refresh_token,
      token_expiry,
      realm_id,
      array['com.intuit.quickbooks.accounting'],
      'connected',
      jsonb_build_object('source_table', 'erp_connections', 'legacy_connection_id', id),
      coalesce(created_at, now()),
      coalesce(updated_at, now())
    from public.erp_connections
    where platform = 'quickbooks'
      and not exists (
        select 1
        from public.accounting_connections existing
        where existing.user_id = erp_connections.user_id
          and existing.provider = 'quickbooks'
          and existing.external_entity_id = 'qbo:' || erp_connections.realm_id
      );
  end if;

  if to_regclass('public.quickbooks_connections') is not null then
    insert into public.accounting_connections (
      user_id,
      provider,
      provider_family,
      provider_product,
      external_entity_id,
      external_entity_name,
      access_token,
      refresh_token,
      token_expires_at,
      tenant_or_realm_id,
      scopes,
      status,
      metadata_json,
      created_at,
      updated_at
    )
    select
      user_id,
      'quickbooks',
      'intuit',
      'quickbooks_online',
      'qbo:' || realm_id,
      null,
      access_token,
      refresh_token,
      token_expiry,
      realm_id,
      array['com.intuit.quickbooks.accounting'],
      'connected',
      jsonb_build_object('source_table', 'quickbooks_connections', 'legacy_connection_id', id),
      coalesce(created_at, now()),
      coalesce(updated_at, now())
    from public.quickbooks_connections
    where not exists (
      select 1
      from public.accounting_connections existing
      where existing.user_id = quickbooks_connections.user_id
        and existing.provider = 'quickbooks'
        and existing.external_entity_id = 'qbo:' || quickbooks_connections.realm_id
    );
  end if;
end $$;
