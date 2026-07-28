# PBC-TIEOUT-4.1.3 — Phase 5 Level 2 live smoke baseline

Captured: 2026-07-28T01:30:29-04:00 (local) / 2026-07-28T05:30:29Z  
Preview URL: https://advisacor-git-feature-pbc-tieout-413-family2-e-561145-advisacor.vercel.app  
Pilot engagement: `724546e9-6deb-4f7f-b8ad-88e5ee65353d`  
Period end: `2026-06-30`  
Source: production Supabase (preview env shares `NEXT_PUBLIC_SUPABASE_URL` with production)  
Capture method: service-role read of completed runs + signed XLSX face/backup sheets (pre-regenerate; legacy-path-era payloads)

## Baseline runs (pre-smoke, legacy-path output)

| Kind | run_id | completed_at (UTC) | trigger_kind | Notes |
|---|---|---|---|---|
| bs_recon_summary | `11009ee0-72ee-4a35-8c8b-c5fb2126e1a7` | 2026-07-25T03:56:24Z | initial | No `summary_totals` / `summary_lines` in payload (pre–Block C) |
| bs_account_recon (Checking, qbo `35`) | `07a8ef3c-6cad-454d-8576-6d109e77d835` | (same summary window) | initial | Has `gl_detail` in payload |
| fixed_asset_rollforward | `33ac9cae-601f-4a29-8d44-420fb7ebd08f` | 2026-07-25T02:27:57Z | initial | No `rollforward_totals` / `lines` in payload (pre–Block B) |

## Summary face totals (`11009ee0…`)

| Metric | Value |
|---|---|
| subledger_total (cents / face $) | `2683479` / `$26,834.79` |
| gl_total (cents / face $) | `2683479` / `$26,834.79` |
| variance (face display) | `$0.00` (status **KICKOUT**) |
| DB `totals_variance_cents` | `356348` (kickout rollup; face equation shows 0) |
| item_kickout_count | `4` |
| item_count | `15` |
| XLSX content_hash | `9c3e318364272e2ffb27db70407c461594b66be3bf675365c9675fab709e35a1` |

Face labels (Recon Face):
- Per Sum of Included Accounts: `26834.79`
- Per QBO Balance Sheet: `26834.79`
- Variance: `0` / `KICKOUT`

## Kickout counts

| Section | Count source | Count |
|---|---|---|
| BS (summary `item_kickout_count`) | run `11009ee0…` | **4** |
| FA (FA run `item_kickout_count`) | run `33ac9cae…` | **0** |
| BS Checking child `item_kickout_count` | run `07a8ef3c…` | **0** (totals kickout via variance cents, not item rows) |

## BS-account child — Checking (`07a8ef3c…`)

| Metric | Value |
|---|---|
| Account | Checking (qbo `35`) |
| Face L — Per Prepared Schedule | `599.5` ($599.50) |
| Face R — Per General Ledger | `36.02` ($36.02) |
| Face Variance | `563.48` / **KICKOUT** |
| subledger_total_cents | `59950` |
| gl_total_cents | `3602` |
| totals_variance_cents | `56348` |
| XLSX content_hash | `ea8348887628ce990ceeb044756d5dd74d1e1449fbd380ea7ddee4b1f30a35a8` |

Backup (Activity Detail) first 3 data rows:

| # | Date | Type | Doc # | Name | Debit | Credit | Net | Running |
|---|---|---|---|---|---|---|---|---|
| 1 | 2026-01-25 | Bill Payment (Check) | 10 | Robertson & Associates | 0 | 300 | -300 | 4098.5 |
| 2 | 2026-02-02 | Payment | 1053 | Bill's Windsurf Shop | 175 | 0 | 175 | 4273.5 |
| 3 | 2026-02-16 | Expense | 12 | Robertson & Associates | 0 | 250 | -250 | 4023.5 |

## FA rollforward (`33ac9cae…`)

| Metric | Value |
|---|---|
| Face NBV_begin (Beginning Balance NBV) | `0` ($0.00) |
| Face NBV_end (Ending Balance NBV) | `13495` ($13,495.00) |
| Artifact `nbv_beginning_cents` | `0` |
| Artifact `nbv_ending_cents` | `1349500` |
| Face L/R schedule vs GL | `13495` / `13495` / variance `0` **TIES** |
| item_kickout_count | `0` |
| XLSX content_hash | `79a3b55834c7ded676cb5b61a396b791d5cf31872625e523ca860f8c53f3abfc` |

Backup (Activity Detail) lines:

| # | Date | Type | Account | Memo | Debit | Credit | Signed |
|---|---|---|---|---|---|---|---|
| 1 | 2026-04-13 | Journal Entry | Original Cost | Opening Balance | 13495 | 0 | 13495 |
| 2 | (subtotal row) | Subtotal | | | | | 13495 |
| 3 | _(no further data rows)_ | | | | | | |

Legacy line row 1: ordinal 0, Journal Entry, Original Cost, Opening Balance, signed_cents `1349500`, bucket `reclass`.

## Payload flags (why this is the legacy baseline)

- Summary: **no** `summary_totals` / `summary_lines` → emitter would hit `readLegacyBsReconSummaryArtifact` if re-emitted without resolver regen.
- FA: **no** `rollforward_totals` / `lines` → emitter would hit `readLegacyFaRollforwardArtifact` if re-emitted without resolver regen.
- Checking BS: **has** `gl_detail` → already eligible for canonical path on re-emit; regenerating still required to exercise live preview dual-write.
