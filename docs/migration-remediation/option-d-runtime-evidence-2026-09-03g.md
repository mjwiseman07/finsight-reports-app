# Option D local runtime evidence (BLOCKED — pre-Docker auth mismatch)

**Date:** 2026-09-03 / UTC 2026-09-04  
**Overall:** `BLOCKED`  
**Stopped on:** authorized manifest SHA-256 / byte length do **not** match the committed git blob  
**sqlApplicationAttempts:** `0`  
**Docker started:** no  
**SQL applied:** no  

## Authorization pins (requested)

| Input | Authorized value |
|-------|------------------|
| PR #313 commit | `e0f0ea9976e339fa6ac1600ec7ae184401f9103e` |
| Manifest path | `docs/migration-remediation/option-d-replay-manifest.json` |
| Manifest SHA-256 | `f1e837f6d0dfb96f591724750aa5dfbe560822f5ec9e60a4101f987f41420026` |
| Byte length | `115891` |
| Entries / assembled SQL | **149** / **149** (assembledSha256 verify **0** failures) |
| PR #312 pin | `f65730b3d38e9cb3b192e54f62c798c74a07a1c2` (draft) |
| Suite blob | `6dfc99e23b8206d3d70b19c8a7d4758d22e0f770` (blob, 19389 bytes; not materialized) |
| CLI | `2.116.0` |

## Preflight that matched

| Check | Result |
|-------|--------|
| `git rev-parse HEAD` | `e0f0ea9976e339fa6ac1600ec7ae184401f9103e` |
| PR #313 draft / head | draft / `e0f0ea99…` |
| PR #312 draft / head | draft / `f65730b3…` |
| Supabase CLI | `2.116.0` |
| Suite blob exists | yes (`blob`, size 19389) |
| Assembled entry/file hashes | 149/149, **0** failures |

## Mismatch (hard stop)

| Field | Authorized (session) | Actual `git cat-file blob HEAD:…` |
|-------|----------------------|-----------------------------------|
| Byte length | `115891` | **`113577`** |
| SHA-256 | `f1e837f6…20026` | **`6167fe3140cff39a84cadf11025358f50e8d5f83e9d2420de58b4c211c0140c6`** |
| Git object id | — | `e1fb75455e7628897b1448e94c028187f046b919` |

**Diagnosis:** The authorized SHA-256/byte length equal a **CRLF expansion** of the true LF git blob (Δ = 2314 newlines). Reproducing CRLF from the LF blob yields exactly `115891` bytes and `f1e837f6…`. That was an agent reporting error from PowerShell pipe smudge, not the committed artifact the harness hashes.

Per authorization: **stop with `sqlApplicationAttempts: 0`**. No Docker, no ephemeral workdir, no SQL, no remediation.

## Distinct scopes

| Scope | Result |
|-------|--------|
| Candidate replay | **FAIL** (auth pin mismatch before apply) |
| Security / immutability | **BLOCKED** |
| PR #312 RPC validation | **BLOCKED** |
| Production dashboard parity | `unresolved` |
| Overall | **BLOCKED** |

## Correct pins for a future authorize (LF git blob)

| Field | Value |
|-------|--------|
| HEAD | `e0f0ea9976e339fa6ac1600ec7ae184401f9103e` |
| Manifest SHA-256 | `6167fe3140cff39a84cadf11025358f50e8d5f83e9d2420de58b4c211c0140c6` |
| Byte length | `113577` |
| Entries | `149` |

Restore LF bytes with Node `git cat-file` spawn (not PowerShell `>` / pipe) before hashing.

## Cleanup

No Docker/stack/workdir/suite files were created. See `option-d-runtime-cleanup-2026-09-03g.json`.
