# Apply runbook — GIT_BLOB_PINNED_SINGLE_VERSION_TX_APPLY (native PowerShell bootstrap)

**Status:** Tooling remediation (pre-Node PowerShell bootstrap + sealed standalone bundle); awaiting fresh independent operational re-review.  
**Production apply / dry-run:** NOT authorized by this tooling turn.

## Native entry (required trust root)

Do **not** execute a mutable worktree `.ps1` as authoritative without verification.

Operator procedure (Windows PowerShell / PowerShell, noninteractive, no-profile):

1. Resolve tip `TOOLING_AUTHORIZATION.json` → `authorized_pr_head` (tooling freeze) and `native_bootstrap` pins (`path`, `oid`, `sha256`, `bytes`).
2. Extract the sealed bootstrap with a binary-safe invocation:

```powershell
$Freeze = "<authorized_pr_head 40-hex>"
$BootPath = "scripts/security/bootstrap-credential-browser-containment.ps1"
# pins from tip TOOLING_AUTHORIZATION.native_bootstrap:
$ExpectedOid = "<oid>"
$ExpectedSha = "<sha256>"
$ExpectedBytes = <bytes>
$tmp = Join-Path $env:TEMP ("containment-boot-" + [guid]::NewGuid().ToString("N") + ".ps1")
$bytes = & git cat-file blob "${Freeze}:${BootPath}"
# Prefer .NET write of raw bytes from a ProcessStartInfo capture in production use;
# never skip OID / SHA-256 / length checks below.
$sha = [System.BitConverter]::ToString(
  [System.Security.Cryptography.SHA256]::Create().ComputeHash(
    [System.IO.File]::ReadAllBytes(( # after writing $bytes to $tmp
      # ...
    ))
  )
) # compare to $ExpectedSha; also compare OID + byte length
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $tmp `
  -PrHead $Freeze -Mode dry-run
Remove-Item -LiteralPath $tmp -Force
```

Convenience helper (also seal-verified via tip `native_entry` when used):  
`scripts/security/enter-containment-apply.ps1` materializes the freeze bootstrap, verifies pins, executes with `-NoProfile -NonInteractive`, and deletes the temp bootstrap on every outcome.

```
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass `
  -File scripts/security/enter-containment-apply.ps1 `
  -PrHead <authorized_tooling_freeze_40_hex> `
  -Mode dry-run
```

`--PrHead` / `-PrHead` must equal tip `authorized_pr_head` (executable tooling freeze).  
Do **not** pass the evidence tip SHA when it differs from the freeze.

### Bootstrap responsibilities (pre-Node)
1. Validate authorization inputs from tip Git blob
2. Reject prohibited Node argv (`--require`, `--import`, `--loader`, inspector, eval)
3. Strip inherited `NODE_OPTIONS`, `NODE_PATH`, `NODE_REPL_EXTERNAL_MODULE`, npm node-option injection vars from the child environment (boolean evidence only; never values)
4. Extract and verify the sealed standalone bundle from the freeze
5. Start Node with an explicit argv allowlist (bundle path first; no user Node flags preceding it)
6. Relay or wrap structured evidence; clean temporary files

The bootstrap never connects to PostgreSQL, never inspects `CONTAINMENT_APPLY_DATABASE_URL` values into evidence, never executes SQL, and does not load PowerShell profiles or third-party modules.

### Node resolution contract
Bootstrap resolves **`node.exe` only** via `Get-Command -Name node.exe -CommandType Application`, then uses that absolute path for both `-v` verification and child spawn. It does **not** invoke bare `node`, depend on `PATHEXT`, or accept `.cmd`/`.bat`/alias/function/script shims. No operator `-NodeExecutable` override. Evidence records only basename, version, and optional binary SHA-256 (no broad filesystem paths).

## Legacy Node launcher (defense-in-depth only)
```
node scripts/security/launch-credential-browser-containment-apply.js \
  --pr-head <authorized_tooling_freeze_40_hex> \
  --mode dry-run
```
Not sufficient alone against hostile inherited `NODE_OPTIONS` (preload runs before launcher JS). Prefer the PowerShell bootstrap.

## Database URL channel
- Env var only: `CONTAINMENT_APPLY_DATABASE_URL`
- Bootstrap passes it through to the child env without reading/logging/argv/temp-file/evidence serialization
- **Forbidden:** `--database-url`, generic `DATABASE_URL`, argv secrets
- No fallback to `DATABASE_URL`

## Apply mode
```
--mode apply \
--i-authorize-production-apply I_AUTHORIZE_CONTAINMENT_APPLY_20260908031736
```

Dry-run must not include the apply authorization token. Conflicting flags fail closed.

## Pins
See `TOOLING_AUTHORIZATION.json` (`native_bootstrap`, `native_entry`, `standalone_bundle`) and `STANDALONE_BUNDLE_MANIFEST.json` (`content_scan`).

## Advisory lock
`pg_advisory_xact_lock(0x43524243, 0x20260908)` — apply only (not dry-run).

## Indeterminate COMMIT
`INDETERMINATE_OUTCOME` + read-only reconciliation classifications. No automatic retry/rollback.

## Target #2
Always checked. `--skip-target2-check` is not available.

## Rebuild (seal publication only)
```
node scripts/security/build-containment-applicator-standalone-bundle.js
# or
node scripts/security/rebuild-stable-containment-bundle.js
```
Never run during production dry-run/apply. Bundle aliases `pg-native` to the fail-closed stub.
