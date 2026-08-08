# WBP Xero ↔ QBO Parity Status

Living document tracking behavioral asymmetries between the Xero and QBO adapters during the WBP W1+ build. Every asymmetry is either **acceptable** (documented + intentional) or **must-fix** (blocks W1d parity harness green).

Updated whenever a new asymmetry is discovered during W1b/W1c/W1d implementation.

## Legend

| Symbol | Meaning |
|---|---|
| ✅ | Behaviour matches across both providers |
| ⚠️ | Asymmetry, acceptable — documented rationale |
| ❌ | Asymmetry, must-fix before W1d green |
| ❓ | Untested — verify in W1c smoke or W1d harness |

## Contract fields

| Field | Xero source | QBO source | Status | Notes |
|---|---|---|---|---|
| `JournalLine.accountCode` | Account.Code (e.g. "090") | Account.Id (numeric) | ⚠️ | Both are the canonical join key in each provider's cache; adapter translates |
| `JournalLine.accountId` | Account.AccountID (UUID) | Account.Id (numeric) | ✅ | Persisted from response |
| `JournalLine.debit / credit` | LineAmount sign (+ = debit) | PostingType Debit/Credit + Amount | ✅ | Sign convention verified in WBP W0.5 (finding 2A) |
| `JournalEntry.currency` | Implicit Organisation.BaseCurrency | CurrencyRef.value | ⚠️ | Xero ManualJournal has no CurrencyCode field (W0.5 finding 1A); QBO does |
| `JournalEntry.status` | DRAFT / POSTED | (QBO always POSTED — no DRAFT concept for JournalEntry) | ❌ | See "Open asymmetries" below |
| `JournalEntry.externalRef` | (mapped to Reference field on ManualJournal) | PrivateNote or DocNumber | ❓ | Idempotency implementation TBD in W1c |
| `WriteReceipt.providerJournalNumber` | JournalNumber | DocNumber | ✅ | Both providers assign auto |

## Open asymmetries

### ASY-01 — QBO has no DRAFT status for JournalEntry (BLOCKER for status: "DRAFT" uniformity)

**Discovered:** WBP W1a spec drafting
**Xero:** ManualJournal supports `Status: 'DRAFT' | 'POSTED' | 'VOIDED'`. DRAFT is safe for review before commit.
**QBO:** JournalEntry has no DRAFT concept. Any POST commits immediately to the GL. Void is a separate POST with `?operation=void`.
**Resolution options:**
   - **Option A (recommended):** For QBO, treat `status: "DRAFT"` as "post + immediately void" — creates the entry, records it in `pilot_lifecycle_events`, then voids it. Provides parity semantics (evidence exists, GL unaffected) but doubles QBO API calls per DRAFT.
   - Option B: `status: "DRAFT"` is Xero-only; QBO writes reject DRAFT with `WriteRejected`.
   - Option C: Rework interface so `status` is `"POSTED" | "REVIEW"` where REVIEW = "adapter-specific safe review mode". Xero implements as DRAFT, QBO implements as post+void.

**Decision needed by:** W1c drafting. Recorded here for W1c author to choose.

### ASY-02 — QBO account cache uses numeric ID, Xero uses code string

**Discovered:** WBP W1a spec drafting
**Xero:** `Account.Code` is 3-5 char string ("090", "200-01"), reused as the canonical key
**QBO:** `Account.Id` is a numeric string ("1", "84"), `Account.Name` and `Account.FullyQualifiedName` are the human-facing labels
**Resolution:** Interface `JournalLine.accountCode` accepts BOTH; adapter looks up in its own cache. Callers building `JournalEntry` must know which they have. Ask Pulse UI presents human-friendly `account_name + account_code` for Xero, `account_name + fully_qualified_name` for QBO.
**Status:** ⚠️ Acceptable — documented convention.

## Forbidden-account rules per provider

Verified from WBP W0.5 spike (Xero) and Intuit docs (QBO):

### Xero — reject if any of:
- `Account.Type === "BANK"` (all bank accounts; e.g. code 090 in Demo Company US)
- `Account.SystemAccount` in:
  - `"DEBTORS"` (system AR control, code 120 in Demo Company US)
  - `"CREDITORS"` (system AP control, code 200)
  - `"RETAINEDEARNINGS"` (code 320) — CRITICAL: Xero accepted this at DRAFT in W0.5 (finding 3B), client-side is the ONLY guard
  - `"SALESTAXPAYABLE"`, `"SALESTAXRECEIVABLE"` (per Xero docs, not tested in W0.5)
  - `"UNPAIDEXPCLM"`, `"HISTADJUSTMENT"` (per Xero docs)
  - `"GST"`, `"GSTONIMPORTS"` (per Xero docs)

Source: WBP W0.5 spike + [Xero SystemAccount enum](https://developer.xero.com/documentation/api/accounting/accounts) (verify link during W1b).

### QBO — reject if any of:
- `Account.AccountType` in:
  - `"Bank"`
  - `"Accounts Receivable"`
  - `"Accounts Payable"`
  - `"Credit Card"`
- `Account.AccountSubType` in:
  - `"OpeningBalanceEquity"`
  - `"RetainedEarnings"` (parallels Xero RETAINEDEARNINGS)
  - `"UndepositedFunds"`

Source: [Intuit QBO API Reference — JournalEntry](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/journalentry) (verify link during W1b, may need deep-research subagent if silent-behaviour differs from Xero).

## Drift-detection scope per provider

| Detection | Xero | QBO | Status |
|---|---|---|---|
| Line count mismatch (request vs response) | ✅ per W0.5 finding 3A | ❓ verify in W1c | ❓ |
| Warnings[] non-empty in response | ✅ per W0.5 finding 3A | ❓ QBO error/warning envelope shape TBD | ❓ |
| Status mismatch | ✅ | ⚠️ N/A given ASY-01 | — |
| AccountCode stripped / rewritten | ✅ per W0.5 finding 3A | ❓ | ❓ |
| Amount modified | ⚠️ not observed in W0.5 but possible | ❓ | ❓ |

**W1c task:** run 4-fixture QBO probe (parallel to W0.5 Xero probe) to fill in the ❓s. Findings extend this doc.

---

## Revision log

- **2026-08-08** — WBP W1a scaffold. ASY-01 (DRAFT status) and ASY-02 (account key type) documented.
- (add entries as W1b, W1c, W1d discover new asymmetries)
