# Option D — `_realtime` / `auth.token_expired` investigation (2026-09-03e)

**Mode:** Code/test remediation evidence only — no Docker/SQL replay in this authorization.  
**Blocked HEAD:** `d5e44f3ef21078b6d973aac4bf91c4fe3ca26ee8`  
**Evidence commit:** `d974a449…` (BLOCKED, `sqlApplicationAttempts: 0`)

## `_realtime` — root cause

**Classification:** Genuine platform-owned Realtime tenant-registry schema omitted from the freshness allowlist.

| Fact | Evidence |
|------|----------|
| Present on CLI 2.116.0 empty-workdir start | `option-d-runtime-evidence-2026-09-03e.md` / harness `freshDb.failures` |
| Relations observed | `extensions`, `feature_flags`, `schema_migrations`, `tenants` (kind `r`) |
| Authoritative role | Supabase Realtime DEVELOPERS.md: local compose creates `_realtime`; production uses a separate tenant DB |
| Owner expectation | Public dumps / issues: `OWNER TO supabase_admin` for tenants/extensions/schema_migrations; same Ecto registry for `feature_flags` |
| RLS | Internal registry tables — expect RLS disabled |
| Not Advisacor | Zero public app relations; empty Advisacor migration history on the blocked run |

**Remediation:** Exact inventory allow (`realtimeInternalSchemaPolicy`) — not `_realtime.*`. Extra/missing/misowned/app sentinel → fail closed. Verified CLI list: `2.116.0`.

## `auth.token_expired` — root cause

**Classification:** Overbroad static parser false positive — **not** a genuine startup prerequisite.

| Fact | Evidence |
|------|----------|
| Only Option D hit | `20260719000000_support_auto_file_engine.sql` order 80 |
| Match site | `COMMENT ON COLUMN … IS '… qbo.auth.token_expired …'` (taxonomy string) |
| Call site | None — no `auth.token_expired(` in assembled set |
| CLI 2.116.0 availability | Missing on genuine platform start (blocked-run platform failure) |
| Prior contract | `requiredFunctions` incorrectly included `auth.token_expired` via `knownFunctions` without requiring a call site / after string strip |

**Remediation:** Strip SQL string literals before scanning; require executable call sites for function deps; record taxonomy hits as `non_executing_reference` only. Do **not** fabricate `auth.token_expired`. Keep missing **real** required functions (e.g. `auth.uid`) fail-closed.
