# RA Pro accounting-automation CORRECTIVE apply

## Scope

Applies **only** the sealed corrective migration:

- `20260922003200_ra_pro_accounting_automation_service_role_least_privilege`

History contract: **190 → 191**.

## Never re-run the originals

The dual migrations below are already **committed in production** (history 190):

1. `20260917044537_ra_pro_weekly_completeness_findings`
2. `20260917180140_ra_pro_month_end_review_packages`

Do **not** modify those SQL files. Do **not** re-include or re-execute their statements through this corrective package. Corrective tooling refuses any apply target that names those versions.

The consumed dual-package attempt id `apply-b9926961e32c-8aecb1bd2f5f17dec0483dd550bb395f` must never be reused.

## Authority

| Mode | Required authority |
|---|---|
| **evidence collection** | Published `production_collection_authorization` (AUTHORIZED) naming `authorized_executable_commit` as a strict ancestor executable tip; AUTH-object-only descendant publication; contracts/schema/gates/collector/bundle seals loaded from the executable tip via `git cat-file` |
| **dry-run** | Validated `production_dry_run_authorization` publication (`RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_ONE_ATTEMPT_DRY_RUN_AUTHORIZATION_V1`) that is a strict AUTH-only descendant of the immutable executable tip, naming `authorized_executable_commit` + unique `corr-dryrun-<12>-<32>` attempt id + bootstrap/ceremony/bundle seals + evidence pin authority `f550842c…` (AUTH blob `5f3845b1…`). `--executable-commit` / `-ExecutableCommit` is recheck-only and never independently selects trusted code. Worktree `TOOLING_AUTHORIZATION.json` is never authority. |
| **apply** | Separate `production_apply_authorization` (still **UNPUBLISHED**). Dry-run authorization cannot authorize apply. Future apply uses its own protocol, attempt id, and marker namespace. |

Corrective evidence gates (`RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRECONDITION_EVIDENCE_V1` and `RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRE_APPLY_LIVE_EVIDENCE_V1`) are schema v3 and bind `authorized_executable_commit` + `authorization_publication_commit` + `authorization_publication_blob_oid`. Free-form attestations such as `collection_tooling_tip` are never authority.

`production_collection_authorization` is **AUTHORIZED** for immutable executable tip `2617f2e4…` via AUTH-only publication `15732f70…` (blob `cd94d9bd…`). Tip `dbdce968…` remains rejected/stale and must never authorize collection.

Non-circular model: the immutable executable tip never stores its own SHA as a dry-run or apply publication head. A later one-object dry-run publication may change only `production_dry_run_authorization`, name the already-known executable tip and one attempt id, and must not embed the publication commit SHA (Git blob OID is the immutable publication-data identity). Removing that AUTH object must leave the publication JSON byte/semantically identical to the executable-tip JSON for all other keys.

`precondition_publication` and `pre_apply_live_publication` are **PUBLISHED** from evidence source commit `a055228c…` with byte-exact independently reviewed fresh artifacts and the collection-authority triad (executable `2617f2e4…` / publication `15732f70…` / blob `cd94d9bd…`). Prior identities from `5e368e70…` are superseded and must not satisfy active gates. Pin publication does **not** authorize credentials, dry-run DB contact, apply, merge, deploy, env changes, or automation. Dual-package and cutover evidence protocols remain forbidden substitutions. Evidence may expire; do not extend or fabricate pins — collect a fresh evidence cycle before any later production execution.

`production_dry_run_authorization` remains **UNPUBLISHED** (`dry_run_authorized: false`, `authorized_executable_commit: null`, `attempt_id: null`, all seal fields null) until a separately reviewed one-object publication.

`production_apply_authorization` remains **UNPUBLISHED** (`apply_authorized: false`, `attempt_id: null`). It stays unpublished until a separate reviewed publication. Evidence pins, dry-run authorization, and the apply token alone do not authorize apply. Apply fails closed with `APPLY_REMAINS_BLOCKED_BEFORE_CREDENTIALS` before any database URL is resolved.

### Marker namespaces

| Mode | Attempt / marker | Body |
|---|---|---|
| corrective dry-run | `corr-dryrun-<12hex>-<32hex>.marker` | `corrective-dry-run\n{executable}\n{attemptId}\n` |
| corrective apply (future) | `apply-<12hex>-<32hex>.marker` | apply body; never satisfied by dry-run marker |
| dual (historical) | `attempt-*.marker` / consumed `apply-b9926961…` | never reuse |

Marker is created atomically only after SecureString acquisition and before credential transfer / Node / DB. Collision → consumed/refused. Cancel/timeout/pre-prompt failure → no marker. Once created, never cleared or reused; the attempt is terminal.

## Safety

- Credential channel: `RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_APPLY_DATABASE_URL` only.
- Forbidden: `DATABASE_URL`, `RA_PRO_ACCOUNTING_AUTOMATION_APPLY_DATABASE_URL`, cutover / FRLS / containment apply URL envs.
- Never sets `ENABLE_RA_PRO_ACCOUNTING_AUTOMATION` — automation stays disabled.
- Advisory lock: `RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_APPLY`.
- Corrective SQL only revokes excess `service_role` table DML and re-asserts SELECT+INSERT. It does not drop policies/RLS/functions or touch provider/invoice data.
- Harness / disposable paths require in-process `testOnlyHarnessContext`; argv/env cannot enable them.
- Production bundle entry requires the complete validated dry-run authorization pin (publication + blob OID + executable + bundle OID + attempt id).

## Authenticated first-hop launch (sole supported production dry-run entry)

There is exactly one supported dry-run launch: the Git-blob materialize below. It is not a repository script. Direct worktree `-File` of bootstrap, ceremony, entry, or bundle paths is forbidden (`BOOTSTRAP_DIRECT_EXEC_FORBIDDEN` / `CEREMONY_DIRECT_EXEC_FORBIDDEN`).

While `production_dry_run_authorization` is **UNPUBLISHED**, this paste fails closed before materialize / SecureString / marker / Node / DB.

When a later AUTHORIZED dry-run publication exists at `HEAD` (AUTH-only descendant of the reviewed executable tip), paste this block. It materializes bootstrap only from the publication-selected executable tip’s Git blob seals, never from worktree bytes or a publication self-seal.

```powershell
$ErrorActionPreference = "Stop"
$env:GIT_CONFIG_COUNT = "1"
$env:GIT_CONFIG_KEY_0 = "safe.directory"
$env:GIT_CONFIG_VALUE_0 = ((Get-Location).Path -replace '\\','/')
$ExpectedBootstrapPath = "scripts/security/bootstrap-ra-pro-accounting-automation-corrective-dryrun.ps1"
$ExpectedCeremonyPath = "scripts/security/operator-ra-pro-accounting-automation-corrective-production-dryrun-ceremony.ps1"
$ExpectedEvidenceAuthority = "f550842cd6dd837671599ee8c65bb6ba3932aa62"
$AuthRel = "docs/security/ra-pro-accounting-automation-corrective-apply/TOOLING_AUTHORIZATION.json"
$Repo = [IO.Path]::GetFullPath((git rev-parse --show-toplevel).Trim())
$Publication = (git -C $Repo rev-parse --verify "HEAD^{commit}").Trim().ToLowerInvariant()
if ($Publication -notmatch '^[0-9a-f]{40}$') { throw "BLOCKED_PUBLICATION_TIP: HEAD not 40-hex" }
function Invoke-GitBlob([string]$Spec) {
  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = "git"
  $psi.Arguments = "cat-file blob $Spec"
  $psi.WorkingDirectory = $Repo
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.EnvironmentVariables["GIT_CONFIG_COUNT"] = "1"
  $psi.EnvironmentVariables["GIT_CONFIG_KEY_0"] = "safe.directory"
  $psi.EnvironmentVariables["GIT_CONFIG_VALUE_0"] = $env:GIT_CONFIG_VALUE_0
  $p = [Diagnostics.Process]::Start($psi)
  $ms = New-Object IO.MemoryStream
  $p.StandardOutput.BaseStream.CopyTo($ms)
  $err = $p.StandardError.ReadToEnd()
  if (-not $p.WaitForExit(120000)) { try { $p.Kill() } catch {}; throw "git cat-file timed out" }
  if ($p.ExitCode -ne 0) { throw ("git cat-file failed: " + $err) }
  return , $ms.ToArray()
}
function Get-Sha256Hex([byte[]]$Bytes) {
  $sha = [Security.Cryptography.SHA256]::Create()
  try { return ([BitConverter]::ToString($sha.ComputeHash($Bytes)) -replace "-", "").ToLowerInvariant() }
  finally { $sha.Dispose() }
}
$authBytes = Invoke-GitBlob "${Publication}:${AuthRel}"
if ($authBytes.Length -ge 3 -and $authBytes[0] -eq 0xEF -and $authBytes[1] -eq 0xBB -and $authBytes[2] -eq 0xBF) { throw "auth UTF-8 BOM forbidden" }
if ([Array]::IndexOf($authBytes, [byte]0x0D) -ge 0) { throw "auth CR/CRLF forbidden" }
$auth = [Text.Encoding]::UTF8.GetString($authBytes) | ConvertFrom-Json
$record = $auth.production_dry_run_authorization
if ($null -eq $record -or [string]$record.status -ne "AUTHORIZED" -or -not [bool]$record.dry_run_authorized) {
  throw "DRY_RUN_REMAINS_BLOCKED_BEFORE_CREDENTIALS: production_dry_run_authorization is UNPUBLISHED"
}
$Executable = ([string]$record.authorized_executable_commit).ToLowerInvariant()
if ($Executable -notmatch '^[0-9a-f]{40}$') { throw "DRY_RUN_AUTHORIZATION_EXECUTABLE_INVALID" }
if ($Executable -eq $Publication) { throw "DRY_RUN_AUTHORIZATION_CIRCULAR_TIP" }
& git -C $Repo merge-base --is-ancestor $Executable $Publication
if ($LASTEXITCODE -ne 0) { throw "DRY_RUN_AUTHORIZATION_ANCESTRY" }
$delta = @(git -C $Repo diff --name-only $Executable $Publication | Where-Object { $_ })
if ($delta.Count -ne 1 -or $delta[0] -ne $AuthRel) { throw "DRY_RUN_AUTHORIZATION_ALLOWLIST" }
$evPin = $record.evidence_pin_authority
if ($null -eq $evPin -or ([string]$evPin.commit).ToLowerInvariant() -ne $ExpectedEvidenceAuthority) {
  throw "DRY_RUN_AUTHORIZATION_EVIDENCE_AUTHORITY"
}
$seal = $record.bootstrap
if ($null -eq $seal -or [string]$seal.path -ne $ExpectedBootstrapPath) { throw "DRY_RUN_AUTHORIZATION_SEAL_MISSING: bootstrap" }
if ([string]$seal.line_endings -ne "LF") { throw "bootstrap line_endings must be LF" }
$oid = (git -C $Repo rev-parse --verify "${Executable}:${ExpectedBootstrapPath}").Trim().ToLowerInvariant()
if ($oid -ne ([string]$seal.oid).ToLowerInvariant()) { throw "bootstrap OID mismatch" }
$bytes = Invoke-GitBlob "${Executable}:${ExpectedBootstrapPath}"
if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) { throw "bootstrap UTF-8 BOM forbidden" }
if ([Array]::IndexOf($bytes, [byte]0x0D) -ge 0) { throw "bootstrap CR/CRLF forbidden" }
$sha = Get-Sha256Hex $bytes
if ($sha -ne ([string]$seal.sha256).ToLowerInvariant()) { throw "bootstrap SHA-256 mismatch" }
if ($bytes.Length -ne [int]$seal.bytes) { throw "bootstrap bytes mismatch" }
$cerSeal = $record.ceremony
if ($null -eq $cerSeal -or [string]$cerSeal.path -ne $ExpectedCeremonyPath) { throw "DRY_RUN_AUTHORIZATION_SEAL_MISSING: ceremony" }
$tmpDirFull = [IO.Path]::GetFullPath((New-Item -ItemType Directory -Path (Join-Path ([IO.Path]::GetTempPath()) ("ra-acct-corr-boot-" + [guid]::NewGuid().ToString("N")))).FullName)
try {
  $bootFile = Join-Path $tmpDirFull "bootstrap-ra-pro-accounting-automation-corrective-dryrun.ps1"
  [IO.File]::WriteAllBytes($bootFile, $bytes)
  $resolved = [IO.Path]::GetFullPath($bootFile)
  $tmpPrefix = $tmpDirFull.TrimEnd('\') + '\'
  if (-not $resolved.StartsWith($tmpPrefix, [StringComparison]::OrdinalIgnoreCase)) { throw "materialized path escaped private temp directory" }
  $fileItem = Get-Item -LiteralPath $resolved -Force
  if ($fileItem.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "materialized file is reparse point" }
  $dirItem = Get-Item -LiteralPath $tmpDirFull -Force
  if ($dirItem.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "material directory is reparse point" }
  $readBack = [IO.File]::ReadAllBytes($resolved)
  if ($readBack.Length -ne $bytes.Length) { throw "materialized file is not byte-identical to Git blob" }
  for ($i = 0; $i -lt $bytes.Length; $i++) {
    if ($readBack[$i] -ne $bytes[$i]) { throw "materialized file is not byte-identical to Git blob" }
  }
  & "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $resolved -PrHead $Publication -RepoRoot $Repo -SealedMaterialInvocation
  exit $LASTEXITCODE
} finally {
  if (Test-Path -LiteralPath $tmpDirFull) { Remove-Item -LiteralPath $tmpDirFull -Recurse -Force -ErrorAction SilentlyContinue }
}
```

Do **not** substitute:

```powershell
powershell -File scripts/security/bootstrap-ra-pro-accounting-automation-corrective-dryrun.ps1 ...
powershell -File scripts/security/operator-ra-pro-accounting-automation-corrective-production-dryrun-ceremony.ps1 ...
```

## Commands (offline / harness)

```bash
node scripts/security/verify-ra-pro-accounting-automation-corrective-apply-authority.js
node scripts/security/assemble-ra-pro-accounting-automation-corrective-applicator-standalone-bundle.js
node scripts/security/apply-ra-pro-accounting-automation-corrective.js --dry-run
```

Bare `--dry-run` / `--executable-commit` alone fails closed with `DRY_RUN_AUTHORIZATION_REQUIRED` before credentials.

### Dry-run evidence retention (mandatory)

Dry-run stdout is exactly one sealed **applicator frame**:

`RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_DRY_RUN_EVIDENCE_V1:<base64url>`

#### Frame vs receipt hierarchy

| Artifact | Authority | Contains |
| --- | --- | --- |
| `CORRECTIVE_PRODUCTION_DRY_RUN_EVIDENCE.json` | Sealed applicator bytes (immutable after retain) | Dry-run verdict, bundle/migration seals, pins, CA, counters, dry-run authorization publication/blob/attempt identities. **No `cleanup` field.** |
| `CORRECTIVE_PRODUCTION_DRY_RUN_CEREMONY_RECEIPT.json` | Fail-closed ceremony measurements | Credential/material disposal, child termination, orphan check, evidence digest unchanged, `pin_ready`, dry-run authorization publication/blob/attempt identities. |
| `CORRECTIVE_PRODUCTION_DRY_RUN_SUMMARY.json` (optional) | Non-authoritative | Binds evidence + receipt by SHA-256/bytes only — never reserializes the sealed frame. |

**Pin-ready requires both:** a schema-valid retained evidence frame **and** a ceremony receipt with `pin_ready: true` (all mandatory cleanup bools true, empty `cleanup_error_codes`, evidence digest unchanged). Frame alone is never pin-ready.

The retained evidence file must be the **exact decoded canonical JSON payload bytes** (UTF-8, LF-only, one trailing LF, no BOM). Capture stdout binary-safe; extract/retain via `ra-pro-accounting-automation-corrective-evidence-decode-frame.js`. **Never** `ConvertFrom-Json` / `ConvertTo-Json` the sealed frame.

Ceremony / bundle / evidence-module seals for reporting come from **`git cat-file` / `git rev-parse tip:path` only** — never from worktree bytes. A CRLF worktree copy of the ceremony script must not substitute for the tip blob.

Rejected / non-pin-ready: any prior CRLF or PowerShell-reserialized artifact (e.g. temp dry-run `bec0a81f…` / 4701 bytes with CR). Do not normalize it — require a new authorized dry run after this tooling passes review.

Do not run apply against production until authorization is separately published after review.
