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
- `visible_ceremony_native_entry` (optional helper that tip-loads and materializes bootstrap)
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

## Operator (authenticated first hop — required)

**Do not** `-File` worktree `bootstrap-*.ps1`, `supervise-*.ps1`, `enter-ra-pro-accounting-automation-apply.ps1`, or `operator-*-ceremony.ps1`.

Authenticated launch (Windows PowerShell). Requires `HEAD` = publication tip = `-PrHead`:

```powershell
$ErrorActionPreference = "Stop"
$Repo = (git rev-parse --show-toplevel).Trim()
$Tip  = (git -C $Repo rev-parse HEAD).Trim()   # must equal exact PR tip
$AuthRel = "docs/security/ra-pro-accounting-automation-apply/TOOLING_AUTHORIZATION.json"
$authJson = [Text.Encoding]::UTF8.GetString((& git -C $Repo cat-file blob "${Tip}:${AuthRel}"))
$auth = $authJson | ConvertFrom-Json
$bootSrc = [string]$auth.bootstrap_source_commit
$seal = $auth.visible_ceremony_bootstrap
# Verify tip pins: path/oid/sha256/bytes/LF — then materialize:
$tmpDir = Join-Path $env:TEMP ("ra-acct-boot-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null
$bootFile = Join-Path $tmpDir "bootstrap-visible-ra-pro-accounting-automation-ceremony.ps1"
$oid = (& git -C $Repo rev-parse "${bootSrc}:$($seal.path)").Trim()
if ($oid -ne [string]$seal.oid) { throw "bootstrap OID mismatch" }
$psi = New-Object Diagnostics.ProcessStartInfo
$psi.FileName = "git"; $psi.Arguments = "cat-file blob ${bootSrc}:$($seal.path)"
$psi.WorkingDirectory = $Repo; $psi.RedirectStandardOutput = $true; $psi.UseShellExecute = $false
$p = [Diagnostics.Process]::Start($psi)
$ms = New-Object IO.MemoryStream
$p.StandardOutput.BaseStream.CopyTo($ms); $p.WaitForExit()
$bytes = $ms.ToArray()
$sha = ([BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash($bytes)) -replace "-","").ToLowerInvariant()
if ($sha -ne ([string]$seal.sha256).ToLowerInvariant()) { throw "bootstrap SHA mismatch" }
if ($bytes.Length -ne [int]$seal.bytes) { throw "bootstrap bytes mismatch" }
if ([Array]::IndexOf($bytes, [byte]0x0d) -ge 0) { throw "bootstrap CRLF forbidden" }
[IO.File]::WriteAllBytes($bootFile, $bytes)
& "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass `
  -File $bootFile -Mode dry-run -PrHead $Tip -RepoRoot $Repo -SealedMaterialInvocation
Remove-Item -LiteralPath $tmpDir -Recurse -Force
```

Convenience helper (also tip-sealed as `visible_ceremony_native_entry`; materialize it the same way before use):

`scripts/security/enter-ra-pro-accounting-automation-ceremony.ps1` tip-loads auth and materializes the sealed bootstrap.

**Forbidden** (rejected: `BOOTSTRAP_DIRECT_EXEC_FORBIDDEN` / `SUPERVISOR_DIRECT_EXEC_FORBIDDEN` / `ENTRY_DIRECT_EXEC_FORBIDDEN` / `CEREMONY_DIRECT_EXEC_FORBIDDEN`):

```powershell
# DO NOT RUN
powershell -File scripts/security/bootstrap-visible-ra-pro-accounting-automation-ceremony.ps1 ...
powershell -File scripts/security/supervise-visible-ra-pro-accounting-automation-ceremony.ps1 ...
powershell -File scripts/security/enter-ra-pro-accounting-automation-apply.ps1 ...
powershell -File scripts/security/operator-ra-pro-accounting-automation-production-dryrun-ceremony.ps1 ...
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
