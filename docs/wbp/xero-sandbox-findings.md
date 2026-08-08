# WBP W0.5 — Xero Sandbox Spike Findings

**Run:** `d4f6bea6-1ea3-4886-9c24-553a43d5e05f`  
**Result Hash:** `c8df1a824b36bf78f7fad5a24e9b4b4d8327b19784eb1f1152fa08fff40fb46b`  
**Tenant:** `ceaea696-081f-491e-9daa-a9263a023ca9` (Demo Company US, BaseCurrency=USD)  
**Connection:** `671afdab-8f46-4862-a1f2-6ba09b0aec35`  
**Execution:** 2026-08-08T06:19:56Z → 06:20:01Z (5.05s, 11 Xero API calls)  
**Token refreshed:** yes (`refresh_token` grant, new access_token cached + re-encrypted)  
**Lifecycle emit:** `pilot.lifecycle.wbp-probe-result` (hash-chained into `pilot_lifecycle_events`)

All test artifacts are DRAFT ManualJournals in Xero Demo Company US. User cleanup: Xero UI → Accounting → Advanced → Manual Journals → filter Draft → delete WBP W0.5 entries.

---

## Test 1: Currency handling on ManualJournal (3 variants)

**Purpose:** Determine which shape of `CurrencyCode` (none, header-level, line-level) Xero's ManualJournal endpoint accepts and how it echoes currency back.

| Variant | Sent CurrencyCode | HTTP | Posted | Journal ID | Currency in response |
|---|---|---|---|---|---|
| `no_code` | none | 200 | ✅ DRAFT | `05f8bbee...` | **no CurrencyCode field returned** |
| `header_code` | `USD` at header | 200 | ✅ DRAFT | `5fcffce0...` | **no CurrencyCode field returned** |
| `line_code` | `USD` on each JournalLine | 200 | ✅ DRAFT | `754ed116...` | line-level field silently dropped, no header CurrencyCode returned |

### Finding 1A — ManualJournal has NO currency field at all
The Xero ManualJournal object (per this Demo Company US, org BaseCurrency=USD) **does not carry a `CurrencyCode` field on the response** in any of the three shapes tested. Xero's ManualJournal is implicitly denominated in the tenant's **BaseCurrency** (`Organisation.BaseCurrency`).

**Implication for W1 (Xero adapter):**
- **Do not send `CurrencyCode`** on ManualJournal writes (all three variants accepted, but the field is meaningless — it's neither stored nor validated).
- **Currency comes from `Organisation.BaseCurrency`**, which must be fetched once per connection and cached in the connection row.
- Our internal `IJournalEntry.currency` must be validated against `Organisation.BaseCurrency` BEFORE calling Xero — mismatch = reject at the boundary. Multi-currency support (foreign currency journals) is NOT possible via ManualJournal; would require Invoices/Bills/BankTransactions with `CurrencyCode` on line items (out of scope for W1).

### Finding 1B — Silent field drop
Xero silently dropped line-level `CurrencyCode` in variant C without returning warnings or 400s. **This is a common Xero pattern** — unknown/misplaced fields are dropped silently rather than rejected.

**Implication for W1:** Our adapter's readback-verification MUST diff request body vs response body and surface silent drops as write-quality warnings emitted to `pilot_lifecycle_events`.

---

## Test 2: Sign convention verification

**Purpose:** Confirm Xero preserves `LineAmount` sign as we send it (positive = debit, negative = credit), and that readback returns the same signs.

| Line | Sent | Readback |
|---|---|---|
| Line 1 | `LineAmount=+100`, acct=140 | `LineAmount=100`, `AccountID=ce67231e...` |
| Line 2 | `LineAmount=-100`, acct=150 | `LineAmount=-100`, `AccountID=2703...` |

### Finding 2A — Sign convention CONFIRMED as "positive=debit, negative=credit"
Xero preserves signs exactly. Our internal `IJournalLine.debit / .credit` model translates cleanly:
```
xeroLineAmount = line.debit > 0 ? +line.debit : -line.credit
```

**Implication for W1:** Direct mapping, no sign flipping needed. This matches Xero's public docs (verified) but had to be confirmed for the ManualJournal endpoint specifically (Invoices/CreditNotes use different conventions).

### Finding 2B — Readback returns `AccountID`, request sent `AccountCode`
- Request sent: `AccountCode: "140"`, `"150"`
- Response returned: `AccountID: "ce67231e-c087-4195-818e-dc15615ae8b0"`, `"2703..."` (UUIDs)
- `AccountCode` echoed in response too, but the ID is what Xero considers canonical.

**Implication for W1:** Adapter should persist BOTH `AccountCode` (human-readable, used in COA) AND `AccountID` (canonical UUID) on the write-record, to survive future account-code renames without breaking evidence links.

---

## Test 3: Forbidden account behavior — CRITICAL FINDING

**Purpose:** Determine whether Xero rejects ManualJournal lines that reference system accounts (Bank, System AR, System AP, Retained Earnings) or accepts them silently.

**Result: Xero DOES enforce, but SILENTLY via warnings — not rejection.**

| Account Code | Name | Type | System Account | HTTP | Posted as DRAFT | Xero Behavior |
|---|---|---|---|---|---|---|
| `090` | Checking Account | BANK | (not marked) | 200 | ✅ | **Line SILENTLY REMOVED**, warning: "Account code '090' has been removed as it does not match a recognised account." |
| `120` | Accounts Receivable | CURRENT | `DEBTORS` | 200 | ✅ | **Line SILENTLY REMOVED**, same warning |
| `200` | Accounts Payable | CURRLIAB | `CREDITORS` | 200 | ✅ | **Line SILENTLY REMOVED**, same warning |
| `320` | Retained Earnings | EQUITY | `RETAINEDEARNINGS` | 200 | ✅ | **Line ACCEPTED as-written** (no removal, no warning) |

### Finding 3A — Xero returns HTTP 200 even when it strips lines
This is the most important finding of the spike. Xero's ManualJournal endpoint:
- **Never returns 4xx** for account-type violations
- **Silently drops offending lines** and returns HTTP 200
- **Emits a `Warnings[]` array** in the response body — easy to miss if you don't read it
- **Result: an unbalanced or incomplete journal is created as DRAFT** and requires human cleanup

For codes 090, 120, 200: line was completely dropped from response. The DRAFT journal now has ONE line instead of two (unbalanced — Xero allows unbalanced DRAFTs; balance is only enforced on POST).

### Finding 3B — `RETAINEDEARNINGS` is NOT blocked at DRAFT
Retained Earnings (code 320, SystemAccount=RETAINEDEARNINGS) was accepted as a regular journal line. Xero may enforce this on POST (POSTED status) but does NOT enforce at DRAFT. Our adapter cannot rely on Xero to block writes to this account.

### Finding 3C — Xero exposes SystemAccount type in Accounts response
`GET /Accounts?where=Status=="ACTIVE"` returns `SystemAccount` field with values like `DEBTORS`, `CREDITORS`, `RETAINEDEARNINGS`, empty for regular accounts.

For BANK accounts, `SystemAccount` is empty but `Type='BANK'` is the signal.

**Enumerable forbidden-account markers (verified from spike):**
- `Type == 'BANK'` (all bank accounts)
- `SystemAccount == 'DEBTORS'` (AR control account)
- `SystemAccount == 'CREDITORS'` (AP control account)
- `SystemAccount == 'RETAINEDEARNINGS'` (RE)
- `SystemAccount == 'SALESTAXPAYABLE'` (not tested here, common)
- `SystemAccount == 'SALESTAXRECEIVABLE'` (not tested here)
- `SystemAccount == 'UNPAIDEXPCLM'`, `'HISTADJUSTMENT'`, etc. (see Xero SystemAccount enum)

### Implication for W1 (Xero adapter) — CRITICAL

Xero's silent-drop behavior means **all forbidden-account enforcement MUST happen client-side in our adapter**. Silent drops would corrupt evidence integrity: our system claims we wrote a 2-line balanced journal, Xero stored a 1-line unbalanced one, next reconciliation would show variance.

**Required in W1 Xero adapter (non-negotiable):**

1. **Pre-flight forbidden-account check** — before every ManualJournal POST, fetch the target `AccountCode`s from tenant's `Accounts` cache, check for:
   - `Type == 'BANK'`
   - `SystemAccount in ('DEBTORS','CREDITORS','RETAINEDEARNINGS','SALESTAXPAYABLE','SALESTAXRECEIVABLE','UNPAIDEXPCLM','HISTADJUSTMENT','TRACKING','WAGEEXPENSES','WAGESPAYABLE','GST','GSTONIMPORTS')`  
   Return a `WriteRejected` error BEFORE hitting Xero, with structured reason. Emit as `pilot.lifecycle.write-rejected` event.

2. **Post-write response validation** — after every POST, verify:
   - `response.ManualJournals[0].JournalLines.length === request.JournalLines.length`
   - `response.ManualJournals[0].Warnings` is empty or absent
   - If ANY mismatch: emit `pilot.lifecycle.write-drifted` lifecycle event (patent-covered — this ties to the assertion-linked schema-drift evidence pattern), attempt to void the DRAFT (`Status: 'VOIDED'`), and return `WriteDrifted` error to caller.

3. **Accounts cache with SystemAccount + Type** — the connection row (or a `xero_accounts_cache` table) must persist `AccountCode`, `AccountID`, `Type`, `SystemAccount`, `Status`, `EnablePaymentsToAccount`, refreshed on every sync. Never call `/Accounts` inline on every write.

---

## Cross-cutting observations

### Token refresh worked cleanly
- Access token was ~8 minutes from expiry
- Refresh flow: POST `/connect/token` with `grant_type=refresh_token`, received new access_token + rotated refresh_token
- New tokens re-encrypted with `ACCOUNTING_TOKEN_ENCRYPTION_KEY` (SUPABASE_SERVICE_ROLE_KEY per current fallback), persisted to `accounting_connections`
- `token_expires_at` updated

**Implication:** Refresh path in `lib/integrations/xero/provider.ts` (line ~733) is working. W1 adapter should reuse this — do not re-implement.

### 11 HTTP calls, 5.05s total
Average ~460ms per POST. Xero rate limits are 60/min/tenant sustained — this spike used 11 in 5s (well under). W1 adapter should assume ~500ms per Xero write and NOT batch synchronously in tight loops.

### Home currency for Demo Company US
- `BaseCurrency: USD`, `CountryCode: US`, `IsDemoCompany: true`
- Prior DB scan showed `home_currency` was `null` on connection row — W1 must backfill this from `/Organisation` on connect + on periodic refresh.

---

## Consequences for W1 Xero adapter (build order)

1. Extend `accounting_connections` schema with `home_currency`, `accounts_cache` (jsonb), `accounts_cache_refreshed_at`
2. Extract `IAccountingProvider` interface (already frozen in W0 — reuse)
3. Xero adapter methods:
   - `connect()` — OAuth (existing), then fetch `/Organisation` + `/Accounts`, persist to connection row
   - `refreshAccounts()` — periodic (daily cron) refresh of `accounts_cache`
   - `validateJournalEntry(je)` — pre-flight: currency match, forbidden-account check, balanced-lines check
   - `writeJournalEntry(je)` — POST ManualJournal, response drift-check, emit lifecycle events, return `WriteReceipt` with both `AccountCode` and `AccountID`
   - `readJournalEntry(id)` — GET ManualJournal by ID
   - `voidJournalEntry(id)` — PUT with `Status: 'VOIDED'` (only for DRAFTs, not POSTED)

4. Lifecycle events emitted per write (all hash-chained per patent):
   - `pilot.lifecycle.write-validated` (pre-flight passed)
   - `pilot.lifecycle.write-rejected` (pre-flight failed — never hit Xero)
   - `pilot.lifecycle.write-posted` (Xero returned 200 + no drift)
   - `pilot.lifecycle.write-drifted` (Xero returned 200 but response ≠ request)
   - `pilot.lifecycle.write-failed` (Xero returned 4xx/5xx)

5. Parity test suite (W5) MUST cover all 4 forbidden-account cases + the 3 currency variants + sign convention + drift-detection scenarios.

---

## Evidence retention

Full raw request/response for all 11 Xero calls preserved in `docs/wbp/xero-sandbox-raw/d4f6bea6-1ea3-4886-9c24-553a43d5e05f.json` (53KB). Result hash `c8df1a...` matches `pilot_lifecycle_events.payload.resultHash` — evidence tamper-proof via chain integrity.

## Cleanup

- [ ] User: delete 4 test DRAFT journals from Xero Demo Company US UI
- [ ] Cursor Step 6: `vercel env rm WBP_SPIKE_TOKEN preview --yes` + delete `app/api/wbp/xero-spike/route.ts`
