# MC-2e.4 — Live Browser Smoke Report

## Preview URL
<Vercel preview URL for feat/mc-2e-4-locale-verification>

## Environment
- Branch: feat/mc-2e-4-locale-verification
- Base commit: a5d44256 (MC-2e.3)
- Fixture: docs/mc-2e-4/de-DE-fixture.xlsx
- Browser: Chrome <version> on Windows 11 Alienware
- Tester: mattjanice07
- Timestamp: <YYYY-MM-DD HH:MM ET>

## Test 1 — Upload de-DE fixture as anonymous free-review user
Steps:
1. Navigate to <preview URL>/upload
2. Select docs/mc-2e-4/de-DE-fixture.xlsx from disk
3. Wait for parse to complete

Expected KPI values (from fixture Betrag column, en-US-normalized):
- Total assets side (rows 1-5 net): 1234.56 + 45678.90 + 12345.67 − 1500.00 = 57759.13
- Row-by-row parse:
  - "1.234,56"      → 1234.56
  - "45.678,90"     → 45678.90
  - "12.345,67"     → 12345.67
  - "(1.500,00)"    → -1500.00
  - "(23.456,78)"   → -23456.78
  - "-98.765,43"    → -98765.43
  - "12.500,00"     → 12500.00
  - "34.567,89"     → 34567.89
  - "156.789,12"    → 156789.12

Result: <PASS / FAIL — paste actual KPI values or a screenshot path>
Screenshot: <docs/mc-2e-4/screenshot-upload-parse.png>

## Test 2 — CAD sandbox realm regression (MC-1 wiring re-verify)
Confirms MC-1's home_currency capture at lib/integrations/quickbooks/provider.ts:309 is still live.

Steps:
1. Sign in as CAD test lead (id e0237ccc-2ee3-4bc2-8ef6-1531ccebfeb9)
2. Trigger POST /api/quickbooks/fetch-reports for the last completed month
3. In Supabase, query:
   ```sql
   SELECT bundle -> 'sourceMetadata' ->> 'home_currency' AS home_currency,
          created_at
   FROM accounting_bundles
   WHERE accounting_connection_id = '94b13eb9-c96e-4edf-82b1-565f2d3d9bdf'
   ORDER BY created_at DESC LIMIT 1;
   ```
Expected: home_currency = "CAD", created_at within the last 5 minutes.

Result: <PASS / FAIL — paste SQL output>

## Test 3 — vitest lib/parse suite still green post-changes
Run in CI on the PR (Vercel build step).

Result: <PASS / FAIL — paste count>

## Conclusion
- Gap I-3 closed: <YES / NO>
- Ready for Intuit App Store questionnaire submission: <YES / NO>
- Follow-ups: <any>
