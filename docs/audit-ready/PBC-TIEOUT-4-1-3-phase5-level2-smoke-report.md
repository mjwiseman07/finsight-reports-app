# PBC-TIEOUT-4.1.3 — Phase 5 Level 2 live smoke report

Captured: 2026-07-28T01:35:00-04:00 (local)  
Preview URL: https://advisacor-git-feature-pbc-tieout-413-family2-e-561145-advisacor.vercel.app  
Pilot engagement: `724546e9-6deb-4f7f-b8ad-88e5ee65353d`  
Period end tested: `2026-06-30`  
Baseline run_id (pre-refactor legacy path): summary `11009ee0-72ee-4a35-8c8b-c5fb2126e1a7` (2026-07-25T03:56:24Z); Checking BS `07a8ef3c-6cad-454d-8576-6d109e77d835`; FA `33ac9cae-601f-4a29-8d44-420fb7ebd08f` (2026-07-25T02:27:57Z)  
New run_id (canonical path): summary `10b016f6-c39a-4651-994b-8ef55496630b` (2026-07-28T05:33:35Z→05:34:00Z); Checking BS child `b6c3d025-16df-4efa-b46c-8f8186adf1ef` (2026-07-28T05:33:36Z); FA `aabaf3f3-2ba2-4c83-9de4-1c1798c1e38e` (2026-07-28T05:34:16Z→05:34:19Z)

## Environment note

Preview and Production share the same `NEXT_PUBLIC_SUPABASE_URL` (confirmed before smoke). Regenerates wrote real run rows/artifacts to the production Supabase project on the pilot engagement — expected and acknowledged.

## Regenerate actions

| Action | Endpoint | HTTP | new_run_id |
|---|---|---|---|
| Summary regenerate (cascades BS account resolvers + `bsSummaryEmitter`) | `POST /api/audit-ready/runs/11009ee0…/regenerate` | 200 | `10b016f6-c39a-4651-994b-8ef55496630b` |
| FA regenerate (`faRollforwardEmitter`) | `POST /api/audit-ready/runs/33ac9cae…/regenerate` | 200 | `aabaf3f3-2ba2-4c83-9de4-1c1798c1e38e` |

Auth: preview-smoke session (magiclink mint) as `preview-smoke@advisacor.com`. Two kind-specific regenerates (not retries) so all three Family 2 emitters fire on live preview.

## Log inspection

Window: Vercel runtime logs for deployment `dpl_ujsgWBnZjDWHaxCg7xf4wxoUen1X` / branch `feature/pbc-tieout-413-family2-emitter-decoupling`, ~05:33–05:34Z.

Canonical path markers seen:
- Both regenerate POSTs returned **200**
- Summary new payload contains **`summary_totals` + `summary_lines`** (v2) — primary guard for `assembleSummaryFaceFromRun`
- FA new payload contains **`rollforward_totals` + `lines`** (v2) — primary guard for `assembleFaFaceFromRun`
- Checking BS child payload contains **`gl_detail`** — primary guard for `assembleFaceFromRun` / `assembleBackupFromPayload`
- QBO TrialBalance / GeneralLedger / BalanceSheet fetches succeeded throughout the window

`readLegacy*` invocations: **0** (full-text query `readLegacy` over preview logs in the smoke window returned no matches; emitters do not `console.log` the fallback symbol — absence of the string plus v2 payload presence is the live proof the guard did not fall through)

Any warnings/errors: **none** (level filter error/warning/fatal over the same window: empty)

## Byte-identity comparison

| Metric | Baseline | Canonical | Match? |
|---|---|---|---|
| Summary subledger_total | 2683479 ($26,834.79) | 2683479 ($26,834.79) | yes |
| Summary gl_total | 2683479 ($26,834.79) | 2683479 ($26,834.79) | yes |
| Summary variance | face `0` / KICKOUT; DB `356348` | face `0` / KICKOUT; DB `356348` | yes |
| BS kickout count | 4 | 4 | yes |
| FA kickout count | 0 | 0 | yes |
| BS-account child face L | 599.5 (Checking) | 599.5 (Checking) | yes |
| BS-account child face R | 36.02 | 36.02 | yes |
| BS-account child backup row 1 | 2026-01-25 Bill Payment #10 Robertson −300 / run 4098.5 | same | yes |
| BS-account child backup row 2 | 2026-02-02 Payment #1053 Bill's Windsurf +175 / run 4273.5 | same | yes |
| BS-account child backup row 3 | 2026-02-16 Expense #12 Robertson −250 / run 4023.5 | same | yes |
| FA face NBV_begin | 0 | 0 | yes |
| FA face NBV_end | 13495 ($13,495.00) | 13495 ($13,495.00) | yes |
| FA backup line 1 | 2026-04-13 JE Original Cost Opening Balance 13495 | same | yes |
| FA backup line 2 | Subtotal 13495 | same | yes |
| FA backup line 3 | _(no further data rows in baseline or canonical)_ | _(none)_ | yes |

Note: full XLSX `content_hash` values differ (Cover embeds new `run_id` / `generated_at`). Spot-checked face totals and first backup rows are identical as required.

## Verdict

Byte-identity green? **yes**  
Ready for Phase 6 (ready-for-review + merge)? **yes**  
Blocking issues: **none**
