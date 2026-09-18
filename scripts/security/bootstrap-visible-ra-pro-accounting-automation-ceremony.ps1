#Requires -Version 5.1
<#
.SYNOPSIS
  Sealed first-hop bootstrap for RA Pro accounting-automation dry-run.
  Tip-loads TOOLING_AUTHORIZATION, validates freeze/bootstrap_source/ceremony_source/tip,
  materializes visible_ceremony_supervisor from ceremony_source_commit seals via git cat-file,
  launches only the temporary materialized supervisor.
  Never executes the worktree supervisor.
  Operator must invoke THIS script only after tip-seal materialize (see APPLY_RUNBOOK.md);
  direct worktree -File of this script is not the authenticated operator path.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-fA-F]{40}$')]
  [string]$PrHead,

  [Parameter(Mandatory = $false)]
  [ValidateSet("dry-run", "apply")]
  [string]$Mode = "dry-run",

  [Parameter(Mandatory = $false)]
  [string]$RepoRoot = "",

  [Parameter(Mandatory = $false)]
  [string]$EvidenceOutDir = "",

  [Parameter(Mandatory = $false)]
  [string]$TestSyntheticDatabaseUrl = "",

  [Parameter(Mandatory = $false)]
  [ValidateSet("", "success", "hang", "fail", "malformed")]
  [string]$TestHarnessChildStub = "",

  [Parameter(Mandatory = $false)]
  [int]$ChildTimeoutMs = 120000,

  [Parameter(Mandatory = $false)]
  [ValidateSet("", "empty_blob_index", "envvars_null", "pub_null_index")]
  [string]$TestForcePrePromptNullIndex = "",

  [Parameter(Mandatory = $false)]
  [switch]$TestForceCleanupFailure,

  [Parameter(Mandatory = $false)]
  [switch]$TestForceTerminateFailure,

  # Set only after tip-seal materialize of this bootstrap (authenticated operator/harness path).
  [Parameter(Mandatory = $false)]
  [switch]$SealedMaterialInvocation
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$AuthRel = "docs/security/ra-pro-accounting-automation-apply/TOOLING_AUTHORIZATION.json"
$SupervisorRel = "scripts/security/supervise-visible-ra-pro-accounting-automation-ceremony.ps1"
$script:MaterialRoot = $null

function Get-Sha256Hex([byte[]]$Bytes) {
  if ($null -eq $Bytes) { throw "CEREMONY_BLOB_BYTES_NULL" }
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
  if ($p.ExitCode -ne 0) { throw "git failed: $err" }
  return , $ms.ToArray()
}

function Invoke-GitText([string[]]$GitArgs, [string]$WorkDir) {
  $bytes = Invoke-GitBytes -GitArgs $GitArgs -WorkDir $WorkDir
  return [Text.Encoding]::UTF8.GetString($bytes).Trim()
}

function Assert-Utf8LfNoBom([byte[]]$Bytes, [string]$Label) {
  if ($null -eq $Bytes) { throw ("{0}: null bytes" -f $Label) }
  if ($Bytes.Length -ge 3 -and $Bytes[0] -eq 0xef -and $Bytes[1] -eq 0xbb -and $Bytes[2] -eq 0xbf) {
    throw ("{0}: UTF-8 BOM forbidden" -f $Label)
  }
  if ([Array]::IndexOf($Bytes, [byte]0x0d) -ge 0) {
    throw ("{0}: CR/CRLF bytes forbidden; require LF-only" -f $Label)
  }
  $null = [Text.Encoding]::UTF8.GetString($Bytes)
}

function Format-Win32Argument([string]$Value) {
  if ($null -eq $Value) { return '""' }
  if ($Value -match '[\s"]') {
    return '"' + ($Value -replace '"', '\"') + '"'
  }
  return $Value
}

function Assert-BlobSeal([string]$Commit, [string]$Rel, $Seal, [string]$Dest, [string]$WorkDir) {
  if (-not ($Commit -match '^[0-9a-fA-F]{40}$')) { throw "commit identity must be exact 40-hex for $Rel" }
  if (-not $Seal -or -not $Seal.oid -or -not $Seal.sha256 -or -not $Seal.bytes -or -not $Seal.path) {
    throw "missing seal metadata for $Rel"
  }
  if ([string]$Seal.path -ne $Rel) { throw "seal path mismatch for $Rel" }
  if ($Seal.PSObject.Properties["source_commit"] -and $Seal.source_commit) {
    if ([string]$Seal.source_commit.ToLowerInvariant() -ne $Commit.ToLowerInvariant()) {
      throw "seal source_commit mismatch for $Rel"
    }
  }
  if ($Seal.PSObject.Properties["line_endings"] -and [string]$Seal.line_endings -ne "LF") {
    throw "seal line_endings must be LF for $Rel"
  }
  $resolved = Invoke-GitText -GitArgs @("rev-parse", "--verify", ($Commit + "^{commit}")) -WorkDir $WorkDir
  if ($resolved.ToLowerInvariant() -ne $Commit.ToLowerInvariant()) {
    throw ("commit not fully resolved for " + $Rel + ": " + $Commit)
  }
  $oid = Invoke-GitText -GitArgs @("rev-parse", "${Commit}:${Rel}") -WorkDir $WorkDir
  if ($oid -ne [string]$Seal.oid) { throw "OID mismatch for $Rel" }
  $bytes = Invoke-GitBytes -GitArgs @("cat-file", "blob", "${Commit}:${Rel}") -WorkDir $WorkDir
  Assert-Utf8LfNoBom -Bytes $bytes -Label $Rel
  if ($bytes.Length -ne [int]$Seal.bytes) { throw "bytes mismatch for $Rel" }
  $sha = Get-Sha256Hex -Bytes $bytes
  if ($sha -ne ([string]$Seal.sha256).ToLowerInvariant()) { throw "SHA-256 mismatch for $Rel" }
  $parent = Split-Path -Parent $Dest
  if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
  [IO.File]::WriteAllBytes($Dest, $bytes)
  $item = Get-Item -LiteralPath $Dest -Force
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "materialized file is reparse point" }
  return @{ oid = $oid; sha256 = $sha; bytes = $bytes.Length; commit = $Commit.ToLowerInvariant() }
}

function Assert-FourCommitAncestry([string]$Tip, [string]$Freeze, [string]$BootstrapSource, [string]$CeremonySource, [string]$WorkDir) {
  foreach ($pair in @(
      @{ n = "tip"; v = $Tip },
      @{ n = "freeze"; v = $Freeze },
      @{ n = "bootstrap_source"; v = $BootstrapSource },
      @{ n = "ceremony_source"; v = $CeremonySource }
    )) {
    if (-not ($pair.v -match '^[0-9a-fA-F]{40}$')) {
      throw ("BLOCKED_PUBLICATION_TIP: {0} must be exact 40-hex" -f $pair.n)
    }
  }
  $ids = @($Tip, $Freeze, $BootstrapSource, $CeremonySource) | ForEach-Object { $_.ToLowerInvariant() }
  if (($ids | Select-Object -Unique).Count -ne 4) {
    throw "BLOCKED_PUBLICATION_TIP: freeze, bootstrap_source, ceremony_source, and tip must be pairwise distinct"
  }
  $tipResolved = Invoke-GitText -GitArgs @("rev-parse", "--verify", ($Tip + "^{commit}")) -WorkDir $WorkDir
  if ($tipResolved.ToLowerInvariant() -ne $Tip.ToLowerInvariant()) {
    throw "BLOCKED_PUBLICATION_TIP: tip did not resolve to itself"
  }
  $safe = ($WorkDir -replace "\\", "/")
  $checks = @(
    @($Freeze, $BootstrapSource, "bootstrap_source is not a descendant of freeze"),
    @($BootstrapSource, $CeremonySource, "ceremony_source is not a descendant of bootstrap_source"),
    @($CeremonySource, $Tip, "publication tip is not a descendant of ceremony_source")
  )
  foreach ($c in $checks) {
    $p = Start-Process -FilePath "git" -ArgumentList @("-c","safe.directory=$safe","merge-base","--is-ancestor",$c[0],$c[1]) -WorkingDirectory $WorkDir -Wait -PassThru -WindowStyle Hidden
    if ($p.ExitCode -ne 0) { throw ("BLOCKED_PUBLICATION_TIP: " + $c[2]) }
  }
}

function Clear-MaterialRoot {
  if ($script:MaterialRoot -and (Test-Path -LiteralPath $script:MaterialRoot)) {
    try { Remove-Item -LiteralPath $script:MaterialRoot -Recurse -Force -ErrorAction SilentlyContinue } catch {}
  }
}

function Write-Blocked([string]$Reason) {
  $payload = [ordered]@{
    verdict = "BLOCKED"
    reason = $Reason
    mode = $Mode
    productionContact = $false
    featureFlagTouched = $false
  } | ConvertTo-Json -Compress
  Write-Output $payload
}

try {
  if (-not $SealedMaterialInvocation) {
    throw "BOOTSTRAP_DIRECT_EXEC_FORBIDDEN: materialize from tip seals via APPLY_RUNBOOK authenticated launch only"
  }

  foreach ($forbiddenEnv in @(
      "RA_PRO_ACCOUNTING_AUTOMATION_BOOTSTRAP_PATH",
      "RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_PATH",
      "RA_PRO_ACCOUNTING_AUTOMATION_ENTRY_PATH",
      "RA_PRO_ACCOUNTING_AUTOMATION_SUPERVISOR_PATH",
      "RA_PRO_ACCOUNTING_AUTOMATION_SOURCE_COMMIT",
      "RA_PRO_ACCOUNTING_AUTOMATION_BOOTSTRAP_SOURCE_COMMIT",
      "RA_PRO_ACCOUNTING_AUTOMATION_PUBLICATION_TIP",
      "RA_PRO_ACCOUNTING_AUTOMATION_BUNDLE_PATH",
      "RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_PATH",
      "RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_SHA256"
    )) {
    if (-not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($forbiddenEnv, "Process"))) {
      throw "BLOCKED_INPUT_INVALID: forbidden env $forbiddenEnv"
    }
  }

  if (-not $RepoRoot) {
    $RepoRoot = [string](Resolve-Path (Join-Path $PSScriptRoot "..\.."))
  }
  $RepoRoot = [IO.Path]::GetFullPath($RepoRoot)

  if (-not $EvidenceOutDir) {
    $EvidenceOutDir = Join-Path $env:TEMP ("ra-acct-boot-" + [guid]::NewGuid().ToString("N"))
  }
  New-Item -ItemType Directory -Force -Path $EvidenceOutDir | Out-Null
  $script:MaterialRoot = Join-Path $EvidenceOutDir ("material-boot-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $script:MaterialRoot | Out-Null

  $tip = (Invoke-GitText -GitArgs @("rev-parse", "HEAD") -WorkDir $RepoRoot).ToLowerInvariant()
  if ($PrHead.ToLowerInvariant() -ne $tip) {
    throw "BLOCKED_PIN_MISMATCH: -PrHead must equal HEAD (publication tip)"
  }

  $authBytes = Invoke-GitBytes -GitArgs @("cat-file", "blob", "${tip}:${AuthRel}") -WorkDir $RepoRoot
  Assert-Utf8LfNoBom -Bytes $authBytes -Label $AuthRel
  $auth = ([Text.Encoding]::UTF8.GetString($authBytes)) | ConvertFrom-Json

  $freeze = [string]$auth.authorized_pr_head
  $bootSrc = [string]$auth.bootstrap_source_commit
  $cerSrc = [string]$auth.ceremony_source_commit
  if ([string]::IsNullOrWhiteSpace($freeze) -or [string]::IsNullOrWhiteSpace($bootSrc) -or [string]::IsNullOrWhiteSpace($cerSrc)) {
    throw "BLOCKED_PUBLICATION_TIP: authorized_pr_head / bootstrap_source_commit / ceremony_source_commit missing"
  }
  Assert-FourCommitAncestry -Tip $tip -Freeze $freeze.ToLowerInvariant() -BootstrapSource $bootSrc.ToLowerInvariant() -CeremonySource $cerSrc.ToLowerInvariant() -WorkDir $RepoRoot

  $vs = $auth.visible_ceremony_supervisor
  if (-not $vs) { throw "missing visible_ceremony_supervisor seals" }
  $supDest = Join-Path $script:MaterialRoot "supervise-visible-ra-pro-accounting-automation-ceremony.ps1"
  [void](Assert-BlobSeal -Commit $cerSrc.ToLowerInvariant() -Rel $SupervisorRel -Seal $vs -Dest $supDest -WorkDir $RepoRoot)

  $psExe = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
  $supArgs = @(
    "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
    "-File", $supDest,
    "-Mode", $Mode,
    "-PrHead", $PrHead,
    "-EvidenceOutDir", $EvidenceOutDir,
    "-SealedMaterialInvocation"
  )
  if (-not [string]::IsNullOrWhiteSpace($TestSyntheticDatabaseUrl)) {
    $supArgs += @("-TestSyntheticDatabaseUrl", $TestSyntheticDatabaseUrl)
  }
  if (-not [string]::IsNullOrWhiteSpace($TestHarnessChildStub)) {
    $supArgs += @("-TestHarnessChildStub", $TestHarnessChildStub)
  }
  if ($ChildTimeoutMs -ne 120000) {
    $supArgs += @("-ChildTimeoutMs", "$ChildTimeoutMs")
  }
  if (-not [string]::IsNullOrWhiteSpace($TestForcePrePromptNullIndex)) {
    $supArgs += @("-TestForcePrePromptNullIndex", $TestForcePrePromptNullIndex)
  }
  if ($TestForceCleanupFailure) { $supArgs += "-TestForceCleanupFailure" }
  if ($TestForceTerminateFailure) { $supArgs += "-TestForceTerminateFailure" }

  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = $psExe
  $psi.Arguments = ($supArgs | ForEach-Object { Format-Win32Argument $_ }) -join " "
  $psi.WorkingDirectory = $RepoRoot
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  Set-GitSafeDirectoryEnv -Psi $psi -Root $RepoRoot
  $p = [Diagnostics.Process]::Start($psi)
  $stdout = $p.StandardOutput.ReadToEnd()
  $stderr = $p.StandardError.ReadToEnd()
  if (-not $p.WaitForExit([Math]::Max(60000, $ChildTimeoutMs + 60000))) {
    try { $p.Kill() } catch {}
    throw "sealed supervisor child timed out"
  }
  if (-not [string]::IsNullOrWhiteSpace($stdout)) { Write-Output $stdout.TrimEnd() }
  if (-not [string]::IsNullOrWhiteSpace($stderr)) { [Console]::Error.WriteLine($stderr.TrimEnd()) }
  exit $p.ExitCode
}
catch {
  Write-Blocked ([string]$_.Exception.Message)
  exit 1
}
finally {
  Clear-MaterialRoot
}
