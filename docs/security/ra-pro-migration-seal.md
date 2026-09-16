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

## Current tip seal (atomic checkout bootstrap + try-lock capacity; NO_CUTOVER × 4; no backfill)

| Field | Value |
|-------|-------|
| Blob OID | `646a6ed5e8582f4ebb9e7064457888f7752a3062` |
| SHA-256 | `72a167a5370df518c92c9ff0107f2ce8b89afe75f3de14e166a84a6b7dafd589` |
| Bytes | `35883` |

`.gitattributes` forces `text eol=lf` for this migration path. Production apply remains separately authorized and is **not** performed by this PR. **No company↔firm backfill** — operator decision `NO_CUTOVER × 4` (see `ra-pro-cutover-operator-decision.json` / `ra-pro-decision-record-seal.md`).

**Pilot occupancy (this tip):** activation SQL uses `pilot_slot_number BETWEEN 1 AND 10` (status-agnostic), matching `lib/review-assist-pro/limits.ts`. Numbered slots are not recycled until a separately reviewed reclamation policy.

**Capacity concurrency (this tip):**
- Guards run only under **READ COMMITTED**; `REPEATABLE READ` / `SERIALIZABLE` raise `ra_pro_capacity_isolation_unsupported` before mutation.
- Per-firm keys use `pg_try_advisory_xact_lock(hashtextextended('ra_pro_firm_capacity:' || firm_id, 0))`.
- Contention raises `ra_pro_capacity_lock_busy` (no wait → no cross-statement deadlock). Callers must **ROLLBACK and retry** the full transaction; the database does not auto-retry.
- Per-call ascending uuid try-order orders one acquisition set only; it does **not** claim transaction-wide ordering across statements.

**Checkout bootstrap (this tip):** `bootstrap_checkout_firm_workspace` / `bootstrap_checkout_company_workspace` (service_role, SECURITY INVOKER) atomically create firm+membership or company+owner. Optional `billing_company_id` enforces the unique linked firm. Failures roll back inside the RPC — no app DELETE compensation.
