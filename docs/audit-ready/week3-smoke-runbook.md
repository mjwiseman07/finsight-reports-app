# Week 3 Block 3 — PBC Ingest Smoke Runbook

Runs on Alienware, PowerShell, against Preview environment.

## Prep

1. Vercel preview deployed against `feat/ar-week3-block3-pbc-ingest`.
2. Migration applied: `20260720120000_ar_week3_pbc_ingest_llm_usage.sql` (founder via Supabase MCP).
3. Bedrock + AR_* env vars set in Vercel Preview/Production (never paste secrets in chat).
4. Test engagement created (after seed script lands) — copy `engagement_id`.

## Steps

### 1. Empty state

- Visit `https://<preview-url>/audit-ready/<engagement_id>/pbc-list`
- Expect: cost tile shows $0.00 / $8.00 · Sonnet · 0 calls
- Expect: dropzone visible, "No PBC requests yet."

### 2. Upload a real PBC PDF

- Use a sanitized 30-item auditor request list PDF
- Click "Upload PBC list" → select the fixture
- Expect status: `Uploading` → `Parsing with Bedrock (zero-retention)…` → `Parsed N requests`
- Reload: table shows rows with request numbers, descriptions, 1–3 assertion chips each

### 3. Cost tile refresh

- Wait 30s (auto-refresh) OR reload
- Expect: spend advances; model = "Sonnet (premium model)" while under 90% of cap

### 4. Duplicate upload dedupe

- Re-upload the same file
- Expect: 200 with `deduped: true`, no new PBC rows, no new usage rows

### 5. PII redaction verification

```sql
SELECT entity_count, entity_categories
FROM audit_ready_pii_redaction_maps
WHERE engagement_id = '<engagement_id>';
```

Expect: `entity_count > 0` when the fixture contains email/phone/SSN-like values.

### 6. Cap breach simulation (Haiku fallback)

Inflate spend to $7.50, upload another small file — expect amber "Haiku fallback" and `model_family = 'haiku'` on the new usage row.

### 7. Full cap breach → block

Inflate to ≥ $8.00, try another parse — expect HTTP 402 and upload `status = failed` with `engagement_cap_exceeded`.

### 8. Cross-engagement RLS

Second user in a different company visiting the first engagement’s PBC list / usage API — expect 404.

## Pass criteria

All 8 steps pass. Screenshot cost tile in each state. Attach to PR.
