#Requires -Version 5.1
<#
.SYNOPSIS
  Sealed first-hop bootstrap for RA Pro accounting-automation CORRECTIVE dry-run.
  Materialized only from reviewed Git blob seals (see APPLY_RUNBOOK.md).
  Direct worktree -File is rejected. Never contacts production by itself.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-fA-F]{40}$')]
  [string]$PrHead,

  [Parameter(Mandatory = $false)]
  [string]$RepoRoot = "",

  [Parameter(Mandatory = $false)]
  [string]$EvidenceOutDir = "",

  # Set only after tip-seal materialize of this bootstrap (authenticated operator path).
  [Parameter(Mandatory = $false)]
  [switch]$SealedMaterialInvocation,

  # Harness-only disposable publication override (never production argv trust).
  [Parameter(Mandatory = $false)]
  [string]$TestPublicationCommit = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$AuthRel = "docs/security/ra-pro-accounting-automation-corrective-apply/TOOLING_AUTHORIZATION.json"
$CeremonyRel = "scripts/security/operator-ra-pro-accounting-automation-corrective-production-dryrun-ceremony.ps1"
$ExpectedEvidenceAuthority = "f550842cd6dd837671599ee8c65bb6ba3932aa62"
$script:MaterialRoot = $null

try {
  if (-not $SealedMaterialInvocation) {
    throw "BOOTSTRAP_DIRECT_EXEC_FORBIDDEN: materialize from tip seals via APPLY_RUNBOOK authenticated launch only"
  }
} catch {
  if ($_.Exception.Message -like "BOOTSTRAP_DIRECT_EXEC_FORBIDDEN*") { throw }
  throw "BOOTSTRAP_DIRECT_EXEC_FORBIDDEN: materialize from tip seals via APPLY_RUNBOOK authenticated launch only"
}

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

$publication = $PrHead
if (-not [string]::IsNullOrWhiteSpace($TestPublicationCommit)) {
  throw "BOOTSTRAP_TEST_PUBLICATION_FORBIDDEN: harness publication overrides are not accepted on bootstrap"
}

$authBytes = Invoke-GitBytes -GitArgs @("cat-file", "blob", "${publication}:${AuthRel}") -WorkDir $RepoRoot
Assert-Utf8LfNoBom -Bytes $authBytes -Label $AuthRel
$authJson = [Text.Encoding]::UTF8.GetString($authBytes)
$auth = $authJson | ConvertFrom-Json

$record = $auth.production_dry_run_authorization
if ($null -eq $record -or [string]$record.status -ne "AUTHORIZED" -or -not [bool]$record.dry_run_authorized) {
  throw "DRY_RUN_REMAINS_BLOCKED_BEFORE_CREDENTIALS: production_dry_run_authorization is UNPUBLISHED"
}

$executable = ([string]$record.authorized_executable_commit).ToLowerInvariant()
if ($executable -notmatch '^[0-9a-f]{40}$') { throw "DRY_RUN_AUTHORIZATION_EXECUTABLE_INVALID" }
if ($executable -eq $publication) { throw "DRY_RUN_AUTHORIZATION_CIRCULAR_TIP" }

git -C $RepoRoot merge-base --is-ancestor $executable $publication
if ($LASTEXITCODE -ne 0) { throw "DRY_RUN_AUTHORIZATION_ANCESTRY" }
$names = @(git -C $RepoRoot diff --name-only $executable $publication)
if ($names.Count -ne 1 -or $names[0] -ne $AuthRel) {
  throw ("DRY_RUN_AUTHORIZATION_ALLOWLIST: " + ($names -join ","))
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
    "-RepoRoot", "`"$RepoRoot`"",
    "-EvidenceOutDir", "`"$EvidenceOutDir`"",
    "-SealedMaterialInvocation"
  ) -join " "
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
