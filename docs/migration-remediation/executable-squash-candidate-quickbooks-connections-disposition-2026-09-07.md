# Product/security disposition — `public.quickbooks_connections` — 2026-09-07

## Verdict

**Recommended disposition: `CONTROLLED_OMIT_AFTER_CALLER_MIGRATION`**

Do **not** recreate `quickbooks_connections` in the executable squash candidate. Eliminate the live fallback surface first (application PR), then omit the table from the baseline. Do not seed or copy the four production rows. Exact production ACL/token parity remains forbidden.

Credential event remains closed: `EPHEMERAL_CLI_LOGIN_ROLE_PASSWORD` — rotation not required.

## Pins

| Pin | Value |
|-----|-------|
| PR #314 HEAD | `10a92062f50f82b3663d35b637420609200fca20` |
| `origin/main` | `9d8a01d37422179ddd68bbd181a8815d8a893577` |
| Candidate | `c386185f4e33a571a759fd6d57cb8e8c2d5bf6f6` |
| Seal | `170b7105b09acdb2fd1d5d1846e5242234b263528e18b8ee9180eab8cc2df48e` |
| Prior provenance | `docs/migration-remediation/executable-squash-candidate-eight-object-provenance-disposition-2026-09-07.md` |

No candidate SQL edited. No production SQL executed this turn. No row/token values read.

---

## Part A — Schema contract (catalog/evidence only; no row access)

Reconstructed from the eight-object provenance seal inventory (prior read-only catalog). Column order matches prior `information_schema` ordinal positions.

| # | Column | Type | Nullable | Default |
|---|--------|------|----------|---------|
| 1 | `id` | uuid | NO | `gen_random_uuid()` |
| 2 | `user_id` | uuid | YES | — |
| 3 | `realm_id` | text | NO | — |
| 4 | `access_token` | text | NO | — (**secret-bearing**) |
| 5 | `refresh_token` | text | NO | — (**secret-bearing**) |
| 6 | `token_expiry` | timestamptz | YES | — |
| 7 | `created_at` | timestamptz | YES | `now()` |
| 8 | `updated_at` | timestamptz | YES | `now()` |

| Contract item | Value |
|---------------|-------|
| Owner | `postgres` |
| PK | `quickbooks_connections_pkey` (`id`) |
| FK | `quickbooks_connections_user_id_fkey` → `auth.users(id)` |
| Unique (non-PK) | none recorded |
| Indexes | PK only |
| Triggers | none |
| RLS enabled | true |
| RLS forced | false |
| Policy | `"Users can access own QB connection"` — roles `{public}`, cmd `ALL` |
| ACL | `postgres`, **`anon`**, `authenticated`, `service_role` — full table (`arwdDxtm`) |
| Inbound FKs | none |
| Outbound FKs | `auth.users` only |
| Views/functions ON table | none in repo SQL; `qbo_connections_unified` does **not** include this table |
| CREATE in 185 prod statements | **absent** |
| CREATE in git | **absent** (pre-git / out-of-band) |
| Deprecation markers | Adapter comment-SQL rename → `erp_connections` only; not applied as a migration |
| Row count (prior metadata) | 4 — **contents not read this turn** |

---

## Part B — Live caller inventory

### Direct repository callers (current HEAD = main for these files)

| Caller | Behavior | Columns | Role | Prod-reachable? | Absent-table handling | Canonical replacement |
|--------|----------|---------|------|-----------------|----------------------|------------------------|
| `lib/erp-adapters/quickbooks-adapter.js` (`saveConnection`, `getConnection`, `refreshToken`) | read + **insert/update** plaintext tokens when `erp_connections` missing | `user_id`, `realm_id`, `access_token`, `refresh_token`, `token_expiry`, `id`, `updated_at` | Server / service-role (`supabaseAdmin`) | **Yes** (OAuth dual-write, status, SDK paths) | `isMissingTableError` → fall back to legacy | Prefer `erp_connections` then **`accounting_connections`** via `persistAuthenticatedQuickBooksGrant` |
| `lib/erp/quickbooks/token-resolver.ts` (`loadErpConnectionForScope`, `persistRefreshedToken`) | read; **update** tokens on refresh if source table is legacy | token + realm + user + id | Server / admin | **Yes** (JE/Pulse/tie-out/health consumers of resolver) | PGRST205/42P01 → null | Prefer `accounting_connections` first |
| `lib/integrations/quickbooks/promote-legacy-grant-execute.ts` | **read** only; writes to `companies` + `accounting_connections` | token columns for promote | Server / ops | Script/tests (no API route) | missing table ignored | Already targets canonical |
| `scripts/verify-accounting-connections.js` | head/count read | `id` | CLI | Script only | logs unavailable | N/A |
| `tests/integrations/quickbooks/promote-legacy-grant.test.ts` | fixtures | — | Test | No | — | — |
| `tests/migration-remediation/review-gate.test.ts` | asserts baseline SQL must **not** contain name | — | Test | No | — | — |
| Migrations `20260531_*` | historical SELECT→INSERT backfill into `accounting_connections` | tokens copied plaintext | Migration | Applied once | `to_regclass` guard | Destination is canonical |

### Indirect prod paths (no string match; call adapter/resolver)

- `lib/integrations/quickbooks/persist-authenticated-grant.ts` → `saveConnection`
- `app/api/quickbooks/callback/route.js` (log mentions `erp_or_quickbooks_connections`; writes via persist/adapter)
- `app/api/quickbooks/status/route.js` → `getConnection`
- Resolver consumers (JE poster, Pulse, tie-out, reviewer QBO accounts, health, write-preflight)

**Not a legacy writer:** `app/api/quickbooks/disconnect/route.js` updates `erp_connections` + `accounting_connections` only — legacy rows can remain for fallbacks.

### Database-side dependents

- No triggers/functions/views in repo SQL that reference `quickbooks_connections`.
- `qbo_connections_unified` unions `accounting_connections` + optional `erp_connections` only.
- No inbound FKs from other public tables (prior catalog).

---

## Part C — Token security assessment

| Question | Finding |
|----------|---------|
| Canonical QBO storage | `accounting_connections` (`access_token`, `refresh_token`, `token_expires_at`, `tenant_or_realm_id`, …) |
| Encrypted at rest (QBO)? | **No.** `secureTokenForStorage` encrypts **only when `provider === "xero"`** (`lib/integrations/accounting/service.ts`, `ensure-fresh-tokens.ts`). Helper exists in `token-encryption.ts` (`enc:v1:`) but unused for QBO. |
| Still writes plaintext into `quickbooks_connections`? | **Yes, conditionally** — adapter save/refresh and resolver persist when legacy is the active storage table / `erp_connections` missing. |
| Data API / RLS | Policy `{public}` ALL + anon table ACL → **unsafe** for browser-role exposure of token columns; service-role bypasses RLS entirely. |
| Logging risk | Callback logs table-name labels; promote/plan use boolean `hasAccessToken` flags (good). Avoid logging token fields. |
| Duplication | Dual-write: ERP/legacy adapter path **and** canonical grant; refresh may update whichever source was resolved. |
| Exact ACL replication | **Prohibited.** |
| Row/token values | **Not read.** |

Implication: even the canonical QBO path is plaintext today. That is a **separate hardening track**. For this disposition, the requirement is to **stop using / recreating** the unrecovered legacy table with PUBLIC ALL + plaintext columns.

---

## Part D — Options

### Option A — Controlled omit

| Dimension | Assessment |
|-----------|------------|
| Security | Best: no baseline object to hold plaintext tokens; removes PUBLIC ALL surface from squash |
| Compatibility | Requires removing/migrating all live fallbacks **before** promoting a baseline that lacks the table |
| App changes | (1) Adapter: never fall back to `quickbooks_connections`; require `erp_connections` or write only via canonical persist. (2) Token-resolver: drop legacy table from `loadErpConnectionForScope`; persist refresh only to `accounting_connections` (or `erp_connections` if retained). (3) Promote-legacy: keep read-from-legacy only as **temporary prod ops** tool against existing prod table, not as baseline dependency. (4) Verify script / tests update. (5) Disconnect already ignores legacy — add explicit legacy clear only under later prod auth. |
| DB objects in candidate | **None** for this table |
| Fresh data-less env | Clean — no table, no seed |
| Existing prod rows | Remain until separately authorized migration/deletion; app must not depend on them after caller remediation |
| Token migration/deletion | Separate authorization |
| Safe in ESC candidate? | **Yes, after caller remediation lands** |

### Option B — Restricted compatibility table

| Dimension | Assessment |
|-----------|------------|
| Security | With plaintext token columns retained: **UNSAFE** — still enables future insecure writes (explicitly disallowed). Without token columns: breaks save/refresh callers. |
| Compatibility | Minimizes immediate code change only if token columns remain — rejected by preference order |
| DB objects | CREATE hardened table + RLS + revoke PUBLIC/anon — still recreates unrecovered schema |
| Seed | None (required) |
| Safe in ESC candidate? | **No** while token columns remain writable; not recommended |

### Option C — Secure compatibility view/RPC

| Dimension | Assessment |
|-----------|------------|
| Security | Can hide tokens from browser if view/RPC is server-only and INVOKER over canonical rows |
| Compatibility | Reads could map realm/user metadata; **writes** must redirect to `accounting_connections` — equivalent to caller migration plus new DB API surface |
| DEFINER | Avoid unless fully guarded; not required if service-role server code talks to canonical tables directly |
| Safe in ESC candidate? | Possible as a later overlay, but **does not beat Option A** for eliminating plaintext persistence and unrecovered CREATE debt |

---

## Part E — Decision

**`CONTROLLED_OMIT_AFTER_CALLER_MIGRATION`**

Rationale vs preference order:

1. Eliminates plaintext-token persistence **in the squash baseline** (does not recreate the insecure table).
2. Forces use of canonical `accounting_connections` (+ optional `erp_connections` only if product keeps it).
3. Preserves server-side behavior only through canonical paths after remediation.
4. Denies browser access by omitting the PUBLIC ALL table from the baseline.
5. Does not seed/copy the four production rows.

Not chosen: restricted table (permits plaintext writes or breaks callers); view/RPC (heavier, still needs write-path migration); leave blocked indefinitely (delays the seven unrelated overlays unnecessarily if we wrongly couple them — see below).

---

## Part F — Transition gates (separately authorized)

| # | Gate | Notes |
|---|------|-------|
| 1 | **Application caller remediation PR** | Remove legacy fallback writes/reads from adapter + token-resolver; update tests/scripts; keep promote-legacy as optional prod-ops against existing table only |
| 2 | Static security review | No new plaintext token sinks; no browser token exposure |
| 3 | Disposable local tests | Unit/integration for resolver/adapter without legacy table |
| 4 | Read-only production dependency recheck | Confirm no new DB dependents; still no row dumps |
| 5 | Candidate overlay authoring | **Seven harden-include objects** may be authored here; **omit** `quickbooks_connections` |
| 6 | Candidate source review | Privilege/RLS/seal |
| 7 | Local squash replay | Still separately authorized |
| 8 | Production data/token transition | Migrate/delete legacy rows / optional QBO token encryption — **separate auth** |
| 9 | Rollback / deprecation | If remediations regress, restore fallbacks only behind explicit kill-switch; never restore PUBLIC ALL |

### Independence of the seven harden-include objects

**Yes — they may proceed independently** under a future candidate-remediation authorization while this QuickBooks omit waits on Gate 1.

They do not depend on `quickbooks_connections` schema. ESC already treats the name as forbidden in review-gate assembled SQL. Keeping QB omitted does not block recovered overlays for:

`pilot_lifecycle_coverage_downloads`, `pulse_je_submissions`, `qbo_accounts_cache`, `xero_accounts_cache`, `platform_integrity_chain_status`, `sp_write_pilot_slot_and_event`, `v_platform_integrity_current`.

---

## Exact next bounded authorization

**Authorize an application-only PR** to remove `quickbooks_connections` read/write fallbacks from adapter + token-resolver (and update tests), targeting `origin/main` / stacked as required — **without** candidate SQL edits, production DDL, or token-row access.

Optionally in parallel (separate auth): **candidate remediation for the seven harden-include objects** with `quickbooks_connections` explicitly omitted.
