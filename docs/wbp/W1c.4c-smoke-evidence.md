# W1c.4c Sandbox Smoke Evidence

**Date:** 2026-08-08  
**Commit:** _ce123d33516492ccdc3c29866630ce34e88213b4_  
**Branch:** `dash-1-scorecard-and-onboarding`

## Tenants smoked

- QBO: Sandbox Company US 3acd, realm `9341457151063823`, connection UUID `0858b9a0-9c7f-4899-bf4d-2e02f0b2063a`
- Xero: Demo Company US, tenant `ceaea696-081f-491e-9daa-a9263a023ca9`, connection UUID `85123b5c-2e30-4a87-9dc5-2c012259da72` (resolved via Supabase MCP on Preview readiness sweep 2026-08-08)

## Smoke script (PowerShell)

Runs manually against Preview deployment. Requires SUPER_ADMIN_TOKEN / session cookie locally.

```powershell
$PreviewUrl = "https://advisacor-git-dash-1-scorecard-and-onboarding-advisacor.vercel.app"

# 1. QBO manual refresh via admin POST
$qboBody = @{ connection_id = "0858b9a0-9c7f-4899-bf4d-2e02f0b2063a"; provider = "quickbooks" } | ConvertTo-Json
Invoke-RestMethod -Uri "$PreviewUrl/api/admin/write-boundary/refresh-accounts-cache" `
  -Method POST -Body $qboBody -ContentType "application/json" `
  -Headers @{ "Authorization" = "Bearer $env:SUPER_ADMIN_TOKEN" }

# 2. Xero manual refresh via admin POST
$xeroBody = @{ connection_id = "85123b5c-2e30-4a87-9dc5-2c012259da72"; provider = "xero" } | ConvertTo-Json
Invoke-RestMethod -Uri "$PreviewUrl/api/admin/write-boundary/refresh-accounts-cache" `
  -Method POST -Body $xeroBody -ContentType "application/json" `
  -Headers @{ "Authorization" = "Bearer $env:SUPER_ADMIN_TOKEN" }

# 3. Fetch history for QBO
Invoke-RestMethod -Uri "$PreviewUrl/api/admin/write-boundary/refresh-accounts-cache/history?connection_id=0858b9a0-9c7f-4899-bf4d-2e02f0b2063a" `
  -Method GET -Headers @{ "Authorization" = "Bearer $env:SUPER_ADMIN_TOKEN" }
```

## Verification queries (Supabase MCP — PPLX runs these)

Query 1 — QBO lifecycle event present:

```sql
select id, event_kind, payload->>'source_system' as source, payload->>'trigger' as trigger,
       payload->>'total_accounts' as total, chain_seq, prev_hash is not null as has_prev
from pilot_lifecycle_events
where event_kind = 'pilot.lifecycle.cache-refreshed'
  and payload->>'source_system' = 'quickbooks'
order by created_at desc
limit 3;
```

Query 2 — Xero lifecycle event present:

```sql
select id, event_kind, payload->>'source_system' as source, payload->>'trigger' as trigger,
       payload->>'total_accounts' as total, chain_seq, prev_hash is not null as has_prev
from pilot_lifecycle_events
where event_kind = 'pilot.lifecycle.cache-refreshed'
  and payload->>'source_system' = 'xero'
order by created_at desc
limit 3;
```

Query 3 — Memory row byte-parity with lifecycle event payload  
(Note: table is `company_memory_records`, not `client_memory`):

```sql
select cm.memory_key, cm.payload as memory_payload, ple.payload as event_payload,
       cm.payload = ple.payload as byte_parity
from company_memory_records cm
join pilot_lifecycle_events ple
  on ple.payload->>'connection_id' = cm.entity_id
 and ple.payload->>'refreshed_at' = cm.payload->>'refreshed_at'
where cm.memory_type = 'accounts_cache_refresh'
order by cm.updated_at desc
limit 5;
```

Query 4 — Hash-chain integrity:

```sql
select id, chain_seq, prev_hash, row_hash,
       lag(row_hash) over (order by chain_seq) as prior_row_hash,
       prev_hash = lag(row_hash) over (order by chain_seq) as chain_ok
from pilot_lifecycle_events
where event_kind = 'pilot.lifecycle.cache-refreshed'
  and payload->>'connection_id' in (
    '0858b9a0-9c7f-4899-bf4d-2e02f0b2063a'
    , '85123b5c-2e30-4a87-9dc5-2c012259da72'
  )
order by chain_seq;
```

## Results (fill in after smoke run)

- [ ] QBO POST refresh returned 200 + result payload
- [ ] Xero POST refresh returned 200 + result payload
- [ ] History GET returned lifecycle_events + memory_rows arrays
- [ ] Query 1: QBO event visible, trigger="manual", chain_seq monotonic
- [ ] Query 2: Xero event visible, trigger="manual", chain_seq monotonic
- [ ] Query 3: byte_parity = true across all matched pairs
- [ ] Query 4: chain_ok = true for every row (hash chain intact)
- [ ] Rename an account in QBO sandbox, refresh again → Query 1 shows updated_accounts >= 1

## Deferred (to W1d)

- Live smoke against production tenants (blocked on W1d parity harness)
- Automated smoke as CI step (blocked on W2 write router integration)
