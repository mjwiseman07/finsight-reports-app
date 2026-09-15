# RA Pro cutover operator decision — Git LF seal authority

**Authoritative artifact:** committed Git **LF** blob for

`docs/security/ra-pro-cutover-operator-decision.json`

Do **not** hash a Windows CRLF worktree checkout. Always:

```bash
git rev-parse HEAD:docs/security/ra-pro-cutover-operator-decision.json
git cat-file blob <oid> | openssl dgst -sha256
git cat-file blob <oid> | wc -c
```

`.gitattributes` forces `text eol=lf` for this path. Future apply tooling that
consumes this record must materialize or verify these committed bytes and **fail
closed** on CRLF derivatives or mismatched pins.

## Semantic binding (unchanged)

| Field | Value |
|-------|-------|
| Actions | **NO_CUTOVER × 4** |
| Link / create | 0 / 0 |
| Backfill | **false** |
| Mapping artifact SHA-256 | `93f6fe31360222ccd282e814a3764ccf07929e7cb91c25c70e10b750ec0ec953` |

## Superseded (non-authoritative)

| Label | SHA-256 | Bytes | Why superseded |
|-------|---------|------:|----------------|
| CRLF worktree / PowerShell smudge (tip `79729bfb`) | `8499dd36b0938f2c22a71e32a4fd50c2347fa887629e307f4c8590f12d811a43` | 1148 | Same JSON semantics; EOL-only expansion of the LF blob |

## Current tip seal (Git LF blob)

| Field | Value |
|-------|-------|
| Blob OID | `0dd39de5ffbfd2b35d3d73887dd0fa915a061c93` |
| SHA-256 | `f00039cb536b0ffef09ea41c0613ce83d7f52067b2bffc4ff27980f8e9bd46e1` |
| Bytes | `1122` |
