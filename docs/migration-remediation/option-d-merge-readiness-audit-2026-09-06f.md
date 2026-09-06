# Merge-readiness audit — draft PRs #312 / #313 (2026-09-06f)

**Authorization:** PASS_RUNTIME evidence retention + review-only merge-readiness audit  
**Bound:** #313 `317e36e5…` · #312 `633bdebd…` · suite/seed/resolver/setup `b647f3b1` / `88ee0df6` / `5178894f` / `5f6ff5be` · manifest `0d2a39a3` / `9dc080cf` / 164204 / 151/7 · CLI 2.116.0  
**Remediation / merge / ready-for-review:** none (both remain draft)

## Scope distinction

| Scope | State |
|-------|--------|
| A. Option D isolated clean-replay | **PASS_RUNTIME** (151/151 + security) |
| B. PR #312 disposable Postgres suite | **PASS** (13/13) |
| C. Production dashboard-branch replay parity | **unresolved** |

`PASS_RUNTIME` ≠ production dashboard parity.

## PR #312 verdict: **PASS**

Independent full-diff review (vs `main`) confirms:

- Authority sealed off public barrel; public deps cannot inject resolvers
- Two-person SoD enforced; exact proposal/approval/business bindings
- Reservation/transition idempotent + fail-closed; Patent #6 adjacency preserved
- Expected rejections SAVEPOINT-contained; Prepare hidden when execution exists
- No provider/QBO/OAuth/token/Memory/worker/dispatch on prepare surface
- Production sandbox empty-404 before auth/DB; PREPARE/CREATE/VERIFY OFF; kill switches ON
- Migrations: RLS, immutable custody, service_role RPC grants, `extensions.digest` + pinned `search_path`

**Residual (non-blocking):** deep-import residual risk; JE-3A RPCs use `search_path=public` (pre-digest Q8b pattern on `publish_ledger_event` is stricter); live suite CI may not always run.

Live Postgres gate: satisfied by retained 2026-09-06f **13/13** evidence (not re-run in this authorization).

## PR #313 verdict: **MERGE-READY AS TOOLING/EVIDENCE ONLY** (blocked for full remediation claim)

- Draft/recovered/derived under `migrations-draft/**` cannot deploy as active CLI migrations
- Git-blob authority, target safety, freshness, cleanup, diagnostics, redaction present
- Recovered / derived-baseline provenance documented
- **One intentional active migration** on this PR: `20260906184500_publish_ledger_event_extensions_digest_qualify.sql` — must be acknowledged in scope (not “zero active migration change”)
- Stale PR body/status history superseded by 2026-09-06f evidence; prior FAIL/BLOCKED retained in `priorStatusHistory` / dated evidence files
- **Blocked from claiming complete lineage remediation** while C (production dashboard parity) remains unresolved

## Dependency / landing recommendation

1. **PR #312 may be reviewed and landed independently** of #313 for the JE prepare feature (capability OFF). Option D evidence on #313 validates its Postgres suite but is not a hard merge dependency for the product PR.
2. **PR #313 may land later as tooling/evidence** after PR description/scope correction acknowledging: (a) Option D PASS_RUNTIME, (b) unresolved production dashboard parity, (c) the single digest forward migration if retained.
3. **Do not** mark either PR ready or merge under this authorization.
4. **Remaining gate for C:** separate production-lineage mechanism (Option A/B or squash) proving empty dashboard/MCP branch replay of production `schema_migrations.statements[]` — not Option D’s assembled draft.

## Recommended merge order (advisory only)

1. Land **#312** when product review accepts PASS + residual risks (still draft until separately authorized).  
2. Land **#313** as tooling/evidence with explicit C-out-of-scope wording — or keep draft until a production-parity authorization.  
3. Production dashboard parity: **separate authorization** required.

## Next authorization gate

Choose one (mutually exclusive intents):

- Mark **#312** ready-for-review / merge (product), or  
- Update **#313** PR description + optionally mark ready as tooling-only, or  
- Authorize **production dashboard replay parity** mechanism (Option A/B / squash) — still unresolved.
