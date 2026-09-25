#Requires -Version 5.1
<#
.SYNOPSIS
  Sealed first-hop bootstrap for RA Pro accounting-automation CORRECTIVE dry-run.
  Materialized only from reviewed Git blob seals (see APPLY_RUNBOOK.md).
  Direct worktree -File is rejected. Never contacts production by itself.
  Requires validated executable-authority publication pins before dry-run AUTH.
#>
[CmdletBinding()]
param(
  # All pins are validated in-body AFTER SealedMaterialInvocation so direct
  # worktree -File returns BOOTSTRAP_DIRECT_EXEC_FORBIDDEN before param binding errors.
  [Parameter(Mandatory = $false)]
  [string]$PrHead = "",

  [Parameter(Mandatory = $false)]
  [string]$OuterLaunchBindingPublication = "",

  [Parameter(Mandatory = $false)]
  [string]$ExpectOuterLaunchBindingBlobOid = "",

  [Parameter(Mandatory = $false)]
  [string]$ExpectOuterLaunchBindingBlobSha256 = "",

  [Parameter(Mandatory = $false)]
  [int]$ExpectOuterLaunchBindingBlobBytes = 0,

  [Parameter(Mandatory = $false)]
  [string]$ExecutableAuthorityPublication = "",

  [Parameter(Mandatory = $false)]
  [string]$ExpectExecutableAuthorityBlobOid = "",

  [Parameter(Mandatory = $false)]
  [string]$ExpectExecutableAuthorityBlobSha256 = "",

  [Parameter(Mandatory = $false)]
  [int]$ExpectExecutableAuthorityBlobBytes = 0,

  [Parameter(Mandatory = $false)]
  [string]$RepoRoot = "",

  [Parameter(Mandatory = $false)]
  [string]$EvidenceOutDir = "",

  # Set only after tip-seal materialize of this bootstrap (authenticated operator path).
  [Parameter(Mandatory = $false)]
  [switch]$SealedMaterialInvocation,

  # Harness-only disposable publication override (never production argv trust).
  [Parameter(Mandatory = $false)]
  [string]$TestPublicationCommit = "",

  # Harness-only: stop at VISIBLE_PROMPT_READY after gates, before SecureString.
  [Parameter(Mandatory = $false)]
  [switch]$TestVisiblePromptProbe
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# DIRECT_EXEC must run before mandatory-parameter validation.
if (-not $SealedMaterialInvocation) {
  throw "BOOTSTRAP_DIRECT_EXEC_FORBIDDEN: materialize from tip seals via APPLY_RUNBOOK authenticated launch only"
}

if ($PrHead -notmatch '^[0-9a-fA-F]{40}$') {
  throw "BOOTSTRAP_PARAM_REQUIRED: PrHead"
}
if ($OuterLaunchBindingPublication -notmatch '^[0-9a-fA-F]{40}$') {
  throw "EXECUTABLE_AUTHORITY_EXPECTED_EXECUTABLE_REQUIRED: OuterLaunchBindingPublication"
}
if ($ExpectOuterLaunchBindingBlobOid -notmatch '^[0-9a-fA-F]{40}$') {
  throw "EXECUTABLE_AUTHORITY_EXPECTED_EXECUTABLE_REQUIRED: ExpectOuterLaunchBindingBlobOid"
}
if ($ExecutableAuthorityPublication -notmatch '^[0-9a-fA-F]{40}$') {
  throw "BOOTSTRAP_PARAM_REQUIRED: ExecutableAuthorityPublication"
}
if ($ExpectExecutableAuthorityBlobOid -notmatch '^[0-9a-fA-F]{40}$') {
  throw "BOOTSTRAP_PARAM_REQUIRED: ExpectExecutableAuthorityBlobOid"
}
if (-not [string]::IsNullOrWhiteSpace($ExpectExecutableAuthorityBlobSha256) -and $ExpectExecutableAuthorityBlobSha256 -notmatch '^[0-9a-fA-F]{64}$') {
  throw "BOOTSTRAP_PARAM_REQUIRED: ExpectExecutableAuthorityBlobSha256"
}
if (-not [string]::IsNullOrWhiteSpace($ExpectOuterLaunchBindingBlobSha256) -and $ExpectOuterLaunchBindingBlobSha256 -notmatch '^[0-9a-fA-F]{64}$') {
  throw "BOOTSTRAP_PARAM_REQUIRED: ExpectOuterLaunchBindingBlobSha256"
}

$AuthRel = "docs/security/ra-pro-accounting-automation-corrective-apply/TOOLING_AUTHORIZATION.json"
$OuterBindingRel = "docs/security/ra-pro-accounting-automation-corrective-apply/OUTER_LAUNCH_BINDING.json"
$CeremonyRel = "scripts/security/operator-ra-pro-accounting-automation-corrective-production-dryrun-ceremony.ps1"
$ExpectedEvidenceAuthority = "f550842cd6dd837671599ee8c65bb6ba3932aa62"
$HistoricalRejectedExecutable = "9f31c3552a2a06fc3b851bd722aad9311dde40f8"
$script:MaterialRoot = $null

function Get-Sha256Hex([byte[]]$Bytes) {
  $sha = [Security.Cryptography.SHA256]::Create()
  try {
    return ([BitConverter]::ToString($sha.ComputeHash($Bytes)) -replace "-", "").ToLowerInvariant()
  } finally { $sha.Dispose() }
}

function Set-GitSafeDirectoryEnv([Diagnostics.ProcessStartInfo]$Psi, [string]$Root) {
  $Psi.UseShellExecute = $false
  $envMap = $Psi.EnvironmentVariables
  if ($null -eq $envMap) { throw "CEREMONY_PROCESS_ENV_UNAVAILABLE" }
  $envMap["GIT_CONFIG_COUNT"] = "1"
  $envMap["GIT_CONFIG_KEY_0"] = "safe.directory"
  $envMap["GIT_CONFIG_VALUE_0"] = ($Root -replace "\\", "/")
}

function Invoke-GitBytes([string[]]$GitArgs, [string]$WorkDir) {
  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = "git"
  $psi.Arguments = ($GitArgs | ForEach-Object {
      if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
    }) -join " "
  $psi.WorkingDirectory = $WorkDir
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  Set-GitSafeDirectoryEnv -Psi $psi -Root $WorkDir
  $p = [Diagnostics.Process]::Start($psi)
  $ms = New-Object IO.MemoryStream
  $p.StandardOutput.BaseStream.CopyTo($ms)
  $err = $p.StandardError.ReadToEnd()
  if (-not $p.WaitForExit(120000)) { try { $p.Kill() } catch {}; throw "git timed out" }
  if ($p.ExitCode -ne 0) { throw ("git failed: " + $err) }
  return , $ms.ToArray()
}

function Assert-Utf8LfNoBom([byte[]]$Bytes, [string]$Label) {
  if ($Bytes.Length -ge 3 -and $Bytes[0] -eq 0xef -and $Bytes[1] -eq 0xbb -and $Bytes[2] -eq 0xbf) {
    throw ("{0}: UTF-8 BOM forbidden" -f $Label)
  }
  if ([Array]::IndexOf($Bytes, [byte]0x0d) -ge 0) {
    throw ("{0}: CR/CRLF bytes forbidden; require LF-only" -f $Label)
  }
  $null = [Text.Encoding]::UTF8.GetString($Bytes)
}

function Assert-BlobSeal([string]$Commit, [string]$Rel, $Seal, [string]$Dest, [string]$WorkDir) {
  if ($null -eq $Seal) { throw "CEREMONY_SEAL_MISSING: $Rel" }
  $path = [string]$Seal.path
  $oid = ([string]$Seal.oid).ToLowerInvariant()
  $sha = ([string]$Seal.sha256).ToLowerInvariant()
  $bytesExpected = [int]$Seal.bytes
  if ($path -ne $Rel) { throw "CEREMONY_SEAL_PATH_MISMATCH: $Rel" }
  $blob = Invoke-GitBytes -GitArgs @("cat-file", "blob", "${Commit}:${Rel}") -WorkDir $WorkDir
  Assert-Utf8LfNoBom -Bytes $blob -Label $Rel
  $gotOid = ([Text.Encoding]::UTF8.GetString((Invoke-GitBytes -GitArgs @("rev-parse", "${Commit}:${Rel}") -WorkDir $WorkDir))).Trim().ToLowerInvariant()
  $gotSha = Get-Sha256Hex $blob
  if ($gotOid -ne $oid) { throw "CEREMONY_SEAL_OID_MISMATCH: $Rel" }
  if ($gotSha -ne $sha) { throw "CEREMONY_SEAL_SHA_MISMATCH: $Rel" }
  if ($blob.Length -ne $bytesExpected) { throw "CEREMONY_SEAL_BYTES_MISMATCH: $Rel" }
  $dir = [IO.Path]::GetDirectoryName($Dest)
  if (-not (Test-Path -LiteralPath $dir)) { [void][IO.Directory]::CreateDirectory($dir) }
  [IO.File]::WriteAllBytes($Dest, $blob)
  $item = Get-Item -LiteralPath $Dest -Force
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "materialized file is reparse point" }
  $dirItem = Get-Item -LiteralPath $dir -Force
  if ($dirItem.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "materialized dir is reparse point" }
  $rb = [IO.File]::ReadAllBytes($Dest)
  if ((Get-Sha256Hex $rb) -ne $sha -or $rb.Length -ne $bytesExpected) { throw "CEREMONY_MATERIALIZE_MISMATCH: $Rel" }
  return $Dest
}

function Clear-MaterialRoot {
  if ([string]::IsNullOrWhiteSpace($script:MaterialRoot)) { return }
  if (Test-Path -LiteralPath $script:MaterialRoot) {
    try { Remove-Item -LiteralPath $script:MaterialRoot -Recurse -Force -ErrorAction Stop } catch {}
  }
}

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = (git rev-parse --show-toplevel).Trim()
}
$RepoRoot = [IO.Path]::GetFullPath($RepoRoot)
$PrHead = $PrHead.ToLowerInvariant()
$ExecutableAuthorityPublication = $ExecutableAuthorityPublication.ToLowerInvariant()
$ExpectExecutableAuthorityBlobOid = $ExpectExecutableAuthorityBlobOid.ToLowerInvariant()

$publication = $PrHead
if (-not [string]::IsNullOrWhiteSpace($TestPublicationCommit)) {
  throw "BOOTSTRAP_TEST_PUBLICATION_FORBIDDEN: harness publication overrides are not accepted on bootstrap"
}

# --- Outer-launch binding (trusted expected executable) before exe-auth ---
$OuterLaunchBindingPublication = $OuterLaunchBindingPublication.ToLowerInvariant()
$ExpectOuterLaunchBindingBlobOid = $ExpectOuterLaunchBindingBlobOid.ToLowerInvariant()
$ExecutableAuthorityPublication = $ExecutableAuthorityPublication.ToLowerInvariant()
$ExpectExecutableAuthorityBlobOid = $ExpectExecutableAuthorityBlobOid.ToLowerInvariant()
$PrHead = $PrHead.ToLowerInvariant()

$outerBytes = Invoke-GitBytes -GitArgs @("cat-file", "blob", "${OuterLaunchBindingPublication}:${OuterBindingRel}") -WorkDir $RepoRoot
Assert-Utf8LfNoBom -Bytes $outerBytes -Label $OuterBindingRel
$outerOid = ([Text.Encoding]::UTF8.GetString((Invoke-GitBytes -GitArgs @("rev-parse", "${OuterLaunchBindingPublication}:${OuterBindingRel}") -WorkDir $RepoRoot))).Trim().ToLowerInvariant()
if ($outerOid -ne $ExpectOuterLaunchBindingBlobOid) {
  throw "OUTER_LAUNCH_BINDING_PIN_MISMATCH: blob oid"
}
if (-not [string]::IsNullOrWhiteSpace($ExpectOuterLaunchBindingBlobSha256)) {
  $gotOuterSha = Get-Sha256Hex $outerBytes
  if ($gotOuterSha -ne $ExpectOuterLaunchBindingBlobSha256.ToLowerInvariant()) {
    throw "OUTER_LAUNCH_BINDING_PIN_MISMATCH: blob sha256"
  }
}
if ($ExpectOuterLaunchBindingBlobBytes -gt 0 -and $outerBytes.Length -ne $ExpectOuterLaunchBindingBlobBytes) {
  throw "OUTER_LAUNCH_BINDING_PIN_MISMATCH: blob bytes"
}
$outerBinding = ([Text.Encoding]::UTF8.GetString($outerBytes)) | ConvertFrom-Json
if ([string]$outerBinding.protocol -ne "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_OUTER_LAUNCH_BINDING_V1") {
  throw "OUTER_LAUNCH_BINDING_PROTOCOL_MISSING"
}
if ([string]$outerBinding.status -ne "BOUND") {
  throw "EXECUTABLE_AUTHORITY_EXPECTED_EXECUTABLE_REQUIRED: outer binding not BOUND"
}
$expectedExecutable = ([string]$outerBinding.expected_executable_commit).ToLowerInvariant()
if ($expectedExecutable -notmatch '^[0-9a-f]{40}$') {
  throw "EXECUTABLE_AUTHORITY_EXPECTED_EXECUTABLE_REQUIRED: expected_executable_commit"
}
if ($expectedExecutable -eq $OuterLaunchBindingPublication) {
  throw "EXECUTABLE_AUTHORITY_EXPECTED_EXECUTABLE_REQUIRED: launcher tip cannot be the expected executable"
}

# --- Executable authority first (before dry-run AUTH) ---
$execAuthBytes = Invoke-GitBytes -GitArgs @("cat-file", "blob", "${ExecutableAuthorityPublication}:${AuthRel}") -WorkDir $RepoRoot
Assert-Utf8LfNoBom -Bytes $execAuthBytes -Label $AuthRel
$execAuthOid = ([Text.Encoding]::UTF8.GetString((Invoke-GitBytes -GitArgs @("rev-parse", "${ExecutableAuthorityPublication}:${AuthRel}") -WorkDir $RepoRoot))).Trim().ToLowerInvariant()
if ($execAuthOid -ne $ExpectExecutableAuthorityBlobOid) {
  throw "EXECUTABLE_AUTHORITY_PIN_MISMATCH: blob oid"
}
if (-not [string]::IsNullOrWhiteSpace($ExpectExecutableAuthorityBlobSha256)) {
  $gotSha = Get-Sha256Hex $execAuthBytes
  if ($gotSha -ne $ExpectExecutableAuthorityBlobSha256.ToLowerInvariant()) {
    throw "EXECUTABLE_AUTHORITY_PIN_MISMATCH: blob sha256"
  }
}
if ($ExpectExecutableAuthorityBlobBytes -gt 0 -and $execAuthBytes.Length -ne $ExpectExecutableAuthorityBlobBytes) {
  throw "EXECUTABLE_AUTHORITY_PIN_MISMATCH: blob bytes"
}
$execAuth = ([Text.Encoding]::UTF8.GetString($execAuthBytes)) | ConvertFrom-Json
$execRecord = $execAuth.production_executable_authority
if ($null -eq $execRecord -or [string]$execRecord.status -ne "AUTHORIZED" -or -not [bool]$execRecord.executable_authorized) {
  throw "EXECUTABLE_AUTHORITY_REMAINS_UNPUBLISHED: production_executable_authority is UNPUBLISHED"
}
$executable = ([string]$execRecord.authorized_executable_commit).ToLowerInvariant()
if ($executable -notmatch '^[0-9a-f]{40}$') {
  throw "EXECUTABLE_AUTHORITY_SEAL_MISSING: authorized_executable_commit"
}
if ($executable -ne $expectedExecutable) {
  throw "EXECUTABLE_AUTHORITY_IMMUTABLE_MISMATCH: authorized_executable_commit must equal outer expected executable"
}
if ($executable -eq $HistoricalRejectedExecutable) {
  throw "EXECUTABLE_AUTHORITY_HISTORICAL_REJECTED: historical executable 9f31c355… lacks remediated sealed protocol"
}
if ($executable -eq $ExecutableAuthorityPublication) { throw "EXECUTABLE_AUTHORITY_CIRCULAR_TIP" }
git -C $RepoRoot merge-base --is-ancestor $executable $ExecutableAuthorityPublication
if ($LASTEXITCODE -ne 0) { throw "EXECUTABLE_AUTHORITY_ANCESTRY" }
$execDelta = @(git -C $RepoRoot diff --name-only $executable $ExecutableAuthorityPublication)
if ($execDelta.Count -ne 1 -or $execDelta[0] -ne $AuthRel) {
  throw ("EXECUTABLE_AUTHORITY_ALLOWLIST: " + ($execDelta -join ","))
}
# Semantic allowlist + outer expected binding (identical to Node) before materializing ceremony.
$nodeExe = (Get-Command node.exe).Source
$allowJs = Join-Path $RepoRoot "scripts/security/ra-pro-accounting-automation-corrective-executable-authority.js"
$allowArgs = @(
  "-e",
  "require(process.argv[1]).assertExecutableAuthorityBeforeCredentials({publicationCommit:process.argv[2],expectBlobOid:process.argv[3],outerLaunchBindingPublication:process.argv[4],expectOuterLaunchBindingBlobOid:process.argv[5],cwd:process.argv[6]})",
  $allowJs,
  $ExecutableAuthorityPublication,
  $ExpectExecutableAuthorityBlobOid,
  $OuterLaunchBindingPublication,
  $ExpectOuterLaunchBindingBlobOid,
  $RepoRoot
)
$allow = Start-Process -FilePath $nodeExe -ArgumentList $allowArgs -Wait -PassThru -NoNewWindow `
  -WorkingDirectory $RepoRoot -RedirectStandardError (Join-Path $env:TEMP ("ra-exeauth-allow-err-" + [guid]::NewGuid().ToString("N") + ".txt"))
if ($allow.ExitCode -ne 0) {
  throw "EXECUTABLE_AUTHORITY_ALLOWLIST: semantic delta or outer expected binding rejected before ceremony materialize"
}

# --- Dry-run authorization (must match executable tip) ---
$authBytes = Invoke-GitBytes -GitArgs @("cat-file", "blob", "${publication}:${AuthRel}") -WorkDir $RepoRoot
Assert-Utf8LfNoBom -Bytes $authBytes -Label $AuthRel
$authJson = [Text.Encoding]::UTF8.GetString($authBytes)
$auth = $authJson | ConvertFrom-Json

$record = $auth.production_dry_run_authorization
if ($null -eq $record -or [string]$record.status -ne "AUTHORIZED" -or -not [bool]$record.dry_run_authorized) {
  throw "DRY_RUN_REMAINS_BLOCKED_BEFORE_CREDENTIALS: production_dry_run_authorization is UNPUBLISHED"
}

$dryExecutable = ([string]$record.authorized_executable_commit).ToLowerInvariant()
if ($dryExecutable -ne $executable) {
  throw "DRY_RUN_EXECUTABLE_AUTHORITY_MISMATCH: dry-run authorized_executable_commit must match executable-authority"
}
if ($dryExecutable -notmatch '^[0-9a-f]{40}$') { throw "DRY_RUN_AUTHORIZATION_EXECUTABLE_INVALID" }
if ($dryExecutable -eq $publication) { throw "DRY_RUN_AUTHORIZATION_CIRCULAR_TIP" }

git -C $RepoRoot merge-base --is-ancestor $dryExecutable $publication
if ($LASTEXITCODE -ne 0) { throw "DRY_RUN_AUTHORIZATION_ANCESTRY" }
$names = @(git -C $RepoRoot diff --name-only $dryExecutable $publication)
if ($names.Count -ne 1 -or $names[0] -ne $AuthRel) {
  throw ("DRY_RUN_AUTHORIZATION_ALLOWLIST: " + ($names -join ","))
}
$dryAllowJs = Join-Path $RepoRoot "scripts/security/ra-pro-accounting-automation-corrective-dry-run-authorization.js"
$dryAllowArgs = @(
  "-e",
  "require(process.argv[1]).assertDryRunPublicationAllowlist({executable:process.argv[2],publication:process.argv[3],cwd:process.argv[4]})",
  $dryAllowJs,
  $dryExecutable,
  $publication,
  $RepoRoot
)
$dryAllow = Start-Process -FilePath $nodeExe -ArgumentList $dryAllowArgs -Wait -PassThru -NoNewWindow `
  -WorkingDirectory $RepoRoot -RedirectStandardError (Join-Path $env:TEMP ("ra-dry-allow-err-" + [guid]::NewGuid().ToString("N") + ".txt"))
if ($dryAllow.ExitCode -ne 0) {
  throw "DRY_RUN_AUTHORIZATION_ALLOWLIST: semantic delta rejected before ceremony materialize"
}

$evPin = $record.evidence_pin_authority
if ($null -eq $evPin -or ([string]$evPin.commit).ToLowerInvariant() -ne $ExpectedEvidenceAuthority) {
  throw "DRY_RUN_AUTHORIZATION_EVIDENCE_AUTHORITY: commit"
}

$ceremonySeal = $record.ceremony
if ($null -eq $ceremonySeal) { throw "DRY_RUN_AUTHORIZATION_SEAL_MISSING: ceremony" }

$tmp = Join-Path $env:TEMP ("ra-acct-corr-boot-" + [guid]::NewGuid().ToString("N"))
[void][IO.Directory]::CreateDirectory($tmp)
$script:MaterialRoot = $tmp
$cerDest = Join-Path $tmp "ceremony.ps1"

try {
  [void](Assert-BlobSeal -Commit $executable -Rel $CeremonyRel -Seal $ceremonySeal -Dest $cerDest -WorkDir $RepoRoot)
  if ([string]::IsNullOrWhiteSpace($EvidenceOutDir)) {
    $EvidenceOutDir = Join-Path $env:TEMP ("ra-acct-corrective-dryrun-" + [guid]::NewGuid().ToString("N"))
  }
  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
  $psi.Arguments = @(
    "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
    "-File", "`"$cerDest`"",
    "-PinTip", $ExpectedEvidenceAuthority,
    "-DryRunAuthorizationPublication", $publication,
    "-OuterLaunchBindingPublication", $OuterLaunchBindingPublication,
    "-ExpectOuterLaunchBindingBlobOid", $ExpectOuterLaunchBindingBlobOid,
    "-ExecutableAuthorityPublication", $ExecutableAuthorityPublication,
    "-ExpectExecutableAuthorityBlobOid", $ExpectExecutableAuthorityBlobOid,
    "-RepoRoot", "`"$RepoRoot`"",
    "-EvidenceOutDir", "`"$EvidenceOutDir`"",
    "-SealedMaterialInvocation"
  ) -join " "
  if ($TestVisiblePromptProbe) {
    $psi.Arguments = $psi.Arguments + " -TestVisiblePromptProbe"
  }
  $psi.WorkingDirectory = $RepoRoot
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $false
  $psi.RedirectStandardError = $false
  $p = [Diagnostics.Process]::Start($psi)
  $p.WaitForExit()
  exit $p.ExitCode
} finally {
  Clear-MaterialRoot
}
