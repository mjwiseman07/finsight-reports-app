# Review Assist Pro migration seal authority

**Authoritative artifact:** committed Git **LF** blob for

`supabase/migrations/20260915004500_ra_pro_firm_billing_company_id.sql`

Do **not** hash a Windows CRLF worktree checkout. Always:

```bash
git rev-parse HEAD:supabase/migrations/20260915004500_ra_pro_firm_billing_company_id.sql
git cat-file blob <oid> | openssl dgst -sha256
git cat-file blob <oid> | wc -c
```

## Superseded (non-authoritative)

| Label | SHA-256 | Bytes | Why superseded |
|-------|---------|------:|----------------|
| Pre-review CRLF worktree measurement | `c54ff8f915d24a90de810b95882899fa8e3560fc810b18341f66d0736cfdfdcf` | 15822 | PowerShell/worktree CRLF expansion; not the Git blob |
| Reviewed tip `81f2d218` LF blob | `a3d59450966f16df7d2b98852954bef5737ff911d93ff9b683a2854fe682a2b8` | 15353 | Pre-remediation content |
| Tip `0ba6cee8` LF blob | `46cfc6780de07445541bdaefdd5b2b70bbb5fe0416b26a8efcd5cd8d6dc58486` | 15639 | Pre-lease / pre-cutover-docs content |
| Tip `beed21b0` LF blob | `1a97bb2f681f948c0baad26fb338737258e248cf07d179d1933ec95e5e287b91` | 23526 | Pre–NO_CUTOVER bind / pre–no-backfill seal asserts |
| Tip `79729bfb` LF blob | `2efa0cd40036ae7d5f9b85452dbd0cf7642a509c0516381ee5feadf14c4120b9` | 24765 | Pre–occupancy BETWEEN 1 AND 10 alignment |
| Tip `63483ef` LF blob | `1e05e987107f3d0b191c8480a62621b99ba16494798cd76e9288d91614bf9598` | 24943 | Pre–concurrent firm-capacity advisory locks |
| Tip `db7a2d15` LF blob | `9243e7bd163e67ebad54f2a395c5d6b83c3658847640b17169704cc8bda578f1` | 27246 | Blocking xact advisory locks (RR bypass / multi-statement deadlock class) |
| Tip `ad25a283` LF blob | `217bee361a2cabff6a23c032b2b0ca1dc7791c172334c3834f4f993e2a305aa4` | 28337 | Try-lock + RC-only capacity (pre–atomic checkout bootstrap) |
| Tip `adebc6db` LF blob | `72a167a5370df518c92c9ff0107f2ce8b89afe75f3de14e166a84a6b7dafd589` | 35883 | Atomic bootstrap without exhaustive ownership reconciliation |
| Tip `f8067648` LF blob | `6c5c00a91c0234064949c435acf0f26174d6863137dab30bbd49e5e375577718` | 40234 | Inactive ownership-class treated as repairable orphan |

## Current tip seal (atomic checkout bootstrap + ownership reconciliation; try-lock capacity; NO_CUTOVER × 4; no backfill)

| Field | Value |
|-------|-------|
| Blob OID | `d36f5e2c50f7bab956c3191723c0e8a223279df5` |
| SHA-256 | `c756651f267aaa2ebe5f1331e96d62bfa882507917b4201397f77e25a45f5ff9` |
| Bytes | `40289` |

`.gitattributes` forces `text eol=lf` for this migration path. Production apply remains separately authorized and is **not** performed by this PR. **No company↔firm backfill** — operator decision `NO_CUTOVER × 4` (see `ra-pro-cutover-operator-decision.json` / `ra-pro-decision-record-seal.md`).

**Pilot occupancy (this tip):** activation SQL uses `pilot_slot_number BETWEEN 1 AND 10` (status-agnostic), matching `lib/review-assist-pro/limits.ts`. Numbered slots are not recycled until a separately reviewed reclamation policy.

**Capacity concurrency (this tip):**
- Guards run only under **READ COMMITTED**; `REPEATABLE READ` / `SERIALIZABLE` raise `ra_pro_capacity_isolation_unsupported` before mutation.
- Per-firm keys use `pg_try_advisory_xact_lock(hashtextextended('ra_pro_firm_capacity:' || firm_id, 0))`.
- Contention raises `ra_pro_capacity_lock_busy` (no wait → no cross-statement deadlock). Callers must **ROLLBACK and retry** the full transaction; the database does not auto-retry.
- Per-call ascending uuid try-order orders one acquisition set only; it does **not** claim transaction-wide ordering across statements.

**Checkout / onboarding bootstrap (this tip):**
- `bootstrap_checkout_firm_workspace` / `bootstrap_checkout_company_workspace` (service_role, SECURITY INVOKER).
- **Unlinked firm identity:** exact set of firm ids from `firms.owner_user_id = buyer` ∪ **active** `firm_memberships` for buyer. 0 → create; 1 → reuse (+ insert membership only if absent); >1 → `bootstrap_checkout_ownership_conflict`.
- **Non-active relationships (firm + company, aligned):** any ownership-class / firm_membership row with `status IS DISTINCT FROM 'active'` (revoked, inactive, suspended, null, unknown, …) is an **explicit denial** → `bootstrap_checkout_ownership_revoked`. No reactivate, no replacement workspace, no row mutation.
- **Owner-column-only orphan (firm):** `owner_user_id = buyer` with **no** membership row may insert one active `firm_admin` **only when** no non-active membership exists for the buyer. Owner-only + revoked membership → revoked fail-closed.
- **Linked firm identity:** `firms.billing_company_id` UNIQUE under buyer + billing-company advisory xact locks (same non-active denial).
- **Company identity:** exact set of company ids with **active** ownership-class `company_users` (`owner_executive`|`company_admin`). `companies` has no `owner_user_id`. Zero active + zero non-active ownership-class → create; any non-active ownership-class → revoked.
- **Why no extra UNIQUE(user):** production allows multi-firm / multi-company memberships outside checkout; buyer (and billing-company) advisory locks + exhaustive set equality enforce bootstrap. Never `ORDER BY … LIMIT 1`.
- `/api/company/onboarding` creates company+membership only via the company bootstrap RPC.
- Failures roll back inside the RPC — no app DELETE compensation. HTTP: revoked/conflict → 409 before Stripe customer/session.
