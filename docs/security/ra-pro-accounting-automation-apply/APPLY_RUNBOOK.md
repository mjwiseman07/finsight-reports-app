# RA Pro accounting-automation migration applicator

## Scope

Applies these two sealed migrations **atomically** (one transaction), in order:

1. `20260917044537_ra_pro_weekly_completeness_findings`
2. `20260917180140_ra_pro_month_end_review_packages`

History contract: **188 → 190**.

## Authority split

| Mode | Required authority |
|---|---|
| **dry-run** | Committed bundle seals + published `precondition_publication` + sealed bootstrap→supervisor→entry→ceremony chain |
| **apply** | Bundle + precondition + published prior-dry-run + published pre-apply + sealed apply token |

Prior-dry-run / pre-apply pins remain **UNPUBLISHED/null** until a separately reviewed production dry run is sealed. Apply stays unreachable until then.

### Four-commit visible ceremony chain

| Identity | Auth field | Role |
|---|---|---|
| **Freeze** | `authorized_pr_head` | Executable freeze; ancestor of bootstrap_source |
| **Bootstrap source** | `bootstrap_source_commit` | Holds sealed `visible_ceremony_bootstrap` (+ native entry helper) |
| **Ceremony source** | `ceremony_source_commit` | Holds sealed supervise / enter-apply / operator ceremony |
| **Tip** | `HEAD` publication tip | Exact `-PrHead`; publishes all seals; pairwise distinct from freeze/bootstrap/ceremony sources |

Sealed artifacts (each with `path`, `source_commit`, `oid`, `sha256`, `bytes`, `line_endings=LF`):

- `visible_ceremony_bootstrap` (first-hop trust root bytes)
- `visible_ceremony_native_entry` (sealed bytes only; not an operator entrypoint; worktree `-File` is forbidden)
- `visible_ceremony_supervisor`
- `visible_ceremony_entry`
- `operator_ceremony`
- `standalone_bundle`

Gate order (fail-closed):

1. Mandatory standalone bundle authority (`git cat-file`)
2. Committed precondition evidence validation
3. Mode-specific authorization (dry-run skips apply pins; apply requires them)
4. Credential prompt / `RA_PRO_ACCOUNTING_AUTOMATION_APPLY_DATABASE_URL`
5. Node / database contact
6. SQL (apply only; dry-run executes **zero** migration SQL)

## Safety

- Credential channel: `RA_PRO_ACCOUNTING_AUTOMATION_APPLY_DATABASE_URL` only.
- Forbidden: `DATABASE_URL`, cutover / FRLS / containment apply URL envs.
- Production / ceremony hosts must bind to Supabase project `jzmdgwwiestcmmeuhhkr` (`DATABASE_PROJECT_REF_MISMATCH` otherwise). Loopback is forbidden outside an in-process harness input unavailable via CLI/argv/env/standalone.
- Never sets `ENABLE_RA_PRO_ACCOUNTING_AUTOMATION`.
- Advisory lock: `RA_PRO_ACCOUNTING_AUTOMATION_APPLY`.
- No automatic retry (one authorization → one attempt marker).
- Evidence and seals come from committed Git blobs only — never mutable worktree ceremony authority.
- Forbid argv/environment overrides of bootstrap, supervisor, entry, ceremony, bundle, evidence, or source/tip paths.
- Chain: tip-load auth → ancestry check → `git cat-file` materialize → verify OID/SHA/bytes/LF/UTF-8/no-BOM/non-reparse → launch **only** temporary materialized scripts.

## Operator (one authenticated launch)

There is exactly one supported launch: the Git-blob materialize below. It is not a repository script.

**Forbidden** — direct worktree `-File` of any of these (rejected before credentials, Node, DB, or SQL):

- `scripts/security/bootstrap-visible-ra-pro-accounting-automation-ceremony.ps1` (`BOOTSTRAP_DIRECT_EXEC_FORBIDDEN`)
- `scripts/security/enter-ra-pro-accounting-automation-ceremony.ps1` (`NATIVE_ENTRY_DIRECT_EXEC_FORBIDDEN`)
- `scripts/security/supervise-visible-ra-pro-accounting-automation-ceremony.ps1` (`SUPERVISOR_DIRECT_EXEC_FORBIDDEN`)
- `scripts/security/enter-ra-pro-accounting-automation-apply.ps1` (`ENTRY_DIRECT_EXEC_FORBIDDEN`)
- `scripts/security/operator-ra-pro-accounting-automation-production-dryrun-ceremony.ps1` (`CEREMONY_DIRECT_EXEC_FORBIDDEN`)

The native entry is not an operator entrypoint. Do not materialize or execute it.

```powershell
# DO NOT RUN
powershell -File scripts/security/bootstrap-visible-ra-pro-accounting-automation-ceremony.ps1 ...
powershell -File scripts/security/enter-ra-pro-accounting-automation-ceremony.ps1 ...
powershell -File scripts/security/supervise-visible-ra-pro-accounting-automation-ceremony.ps1 ...
powershell -File scripts/security/enter-ra-pro-accounting-automation-apply.ps1 ...
powershell -File scripts/security/operator-ra-pro-accounting-automation-production-dryrun-ceremony.ps1 ...
```

Supported launch (Windows PowerShell). `HEAD` must be the publication tip. Paste this block; do not `-File` a worktree script. Bootstrap and supervisor stay noninteractive. The entry opens the ceremony in a normal System32 PowerShell window for the SecureString prompt; that window is the only place to enter the Session Pooler URL. The prompt has its own 600-second input window, prints the UTC deadline and remaining time, and is not closed at 180 seconds. After a credential is acquired, the Node child still has a separate 120-second runtime limit. Parents wait at least 780 seconds so a prompt timeout, cancel, or close can write `PRODUCTION_DRY_RUN_EVIDENCE.json` before any forced termination. Cleanup removes raw output and temporary executables only; it does not delete that evidence file or the attempt marker. A direct URL is accepted only when the host is exactly `db.<project-ref>.supabase.co`, the effective port is 5432, the database is `postgres`, and the query is exactly one `sslmode` parameter whose value is `require`, `verify-full`, or `verify-ca`. An omitted port means PostgreSQL 5432; explicit 80, 443, or any other unauthorized port is rejected. A Session Pooler URL uses port 5432, and a Transaction Pooler URL uses explicit port 6543, only on an approved `*.pooler.supabase.com` host whose username is exactly `postgres.<project-ref>`. Duplicate, mixed-case, encoded, or extra query parameters are rejected. The Node client is built from those normalized fields and is not given the raw URL. A matching username on any other host is rejected, and evidence keeps only the sanitized class and booleans.

```powershell
$ErrorActionPreference = "Stop"
$env:GIT_CONFIG_COUNT = "1"
$env:GIT_CONFIG_KEY_0 = "safe.directory"
$env:GIT_CONFIG_VALUE_0 = ((Get-Location).Path -replace '\\','/')
$ExpectedBootstrapPath = "scripts/security/bootstrap-visible-ra-pro-accounting-automation-ceremony.ps1"
$Repo = [IO.Path]::GetFullPath((git rev-parse --show-toplevel).Trim())
$Tip = (git -C $Repo rev-parse --verify "HEAD^{commit}").Trim().ToLowerInvariant()
if ($Tip -notmatch '^[0-9a-f]{40}$') { throw "BLOCKED_PUBLICATION_TIP: HEAD not 40-hex" }
$AuthRel = "docs/security/ra-pro-accounting-automation-apply/TOOLING_AUTHORIZATION.json"
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
$authBytes = Invoke-GitBlob "${Tip}:${AuthRel}"
if ($authBytes.Length -ge 3 -and $authBytes[0] -eq 0xEF -and $authBytes[1] -eq 0xBB -and $authBytes[2] -eq 0xBF) { throw "auth UTF-8 BOM forbidden" }
$auth = [Text.Encoding]::UTF8.GetString($authBytes) | ConvertFrom-Json
$freeze = ([string]$auth.authorized_pr_head).ToLowerInvariant()
$bootSrc = ([string]$auth.bootstrap_source_commit).ToLowerInvariant()
$cerSrc = ([string]$auth.ceremony_source_commit).ToLowerInvariant()
$roleIds = @($Tip, $freeze, $bootSrc, $cerSrc)
if (@($roleIds | Select-Object -Unique).Count -ne 4) { throw "BLOCKED_PUBLICATION_TIP: freeze, bootstrap source, ceremony source, and tip must be pairwise distinct" }
foreach ($pair in @(@($freeze, $bootSrc), @($bootSrc, $cerSrc), @($cerSrc, $Tip))) {
  & git -C $Repo merge-base --is-ancestor $pair[0] $pair[1]
  if ($LASTEXITCODE -ne 0) { throw "BLOCKED_PUBLICATION_TIP: required ancestry failed" }
}
$seal = $auth.visible_ceremony_bootstrap
if ([string]$seal.path -ne $ExpectedBootstrapPath) { throw "bootstrap path mismatch" }
if (([string]$seal.source_commit).ToLowerInvariant() -ne $bootSrc) { throw "bootstrap source_commit mismatch" }
if ([string]$seal.line_endings -ne "LF") { throw "bootstrap line_endings must be LF" }
$oid = (git -C $Repo rev-parse --verify "${bootSrc}:${ExpectedBootstrapPath}").Trim()
if ($oid -ne [string]$seal.oid) { throw "bootstrap OID mismatch" }
$bytes = Invoke-GitBlob "${bootSrc}:${ExpectedBootstrapPath}"
if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) { throw "bootstrap UTF-8 BOM forbidden" }
if ([Array]::IndexOf($bytes, [byte]0x0D) -ge 0) { throw "bootstrap CR/CRLF forbidden" }
$sha256 = [Security.Cryptography.SHA256]::Create()
try { $sha = ([BitConverter]::ToString($sha256.ComputeHash($bytes)) -replace "-", "").ToLowerInvariant() }
finally { $sha256.Dispose() }
if ($sha -ne ([string]$seal.sha256).ToLowerInvariant()) { throw "bootstrap SHA-256 mismatch" }
if ($bytes.Length -ne [int]$seal.bytes) { throw "bootstrap bytes mismatch" }
$tmpDirFull = [IO.Path]::GetFullPath((New-Item -ItemType Directory -Path (Join-Path ([IO.Path]::GetTempPath()) ("ra-acct-boot-" + [guid]::NewGuid().ToString("N")))).FullName)
try {
  $bootFile = Join-Path $tmpDirFull "bootstrap-visible-ra-pro-accounting-automation-ceremony.ps1"
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
  & "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $resolved -Mode dry-run -PrHead $Tip -RepoRoot $Repo -SealedMaterialInvocation
  exit $LASTEXITCODE
} finally {
  if (Test-Path -LiteralPath $tmpDirFull) { Remove-Item -LiteralPath $tmpDirFull -Recurse -Force -ErrorAction SilentlyContinue }
}
```

Apply mode remains refuse-closed while prior/pre-apply pins are unpublished (`AUTHORIZATION_PINS_UNPUBLISHED`).

Offline seal verify (no DB):

```bash
node scripts/security/verify-ra-pro-accounting-automation-apply-authority.js
```

Reseal ceremony authority after reviewing source bytes (does not publish apply pins):

```bash
node scripts/security/reseal-ra-pro-accounting-automation-ceremony-auth.js \
  --freeze <freeze> --bootstrap-source <bootstrap_source> --ceremony-source <ceremony_source>
```

## Harness only

Disposable Docker apply rehearsals may pass `allowUnpublishedForHarness: true` to exercise apply SQL without publishing production prior/pre-apply pins. Dry-run Docker rehearsals use the real published precondition pins (no harness bypass required).
