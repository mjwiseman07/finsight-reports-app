do $$
begin
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
