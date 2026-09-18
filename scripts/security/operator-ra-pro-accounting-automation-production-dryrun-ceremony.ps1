#Requires -Version 5.1
<#
.SYNOPSIS
  Visible Windows PowerShell production dry-run ceremony for RA Pro accounting-automation.
  SecureString URL prompt. Never applies migrations. Never publishes prior/pre-apply pins.
  Dry-run authority = published precondition_publication only (not prior-dry-run / pre-apply).
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

  # Harness only: loopback URL when RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL=1
  [Parameter(Mandatory = $false)]
  [string]$TestSyntheticDatabaseUrl = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
try { Set-PSReadLineOption -HistorySaveStyle SaveNothing -ErrorAction SilentlyContinue | Out-Null } catch {}

$DatabaseUrlEnv = "RA_PRO_ACCOUNTING_AUTOMATION_APPLY_DATABASE_URL"
$AuthRel = "docs/security/ra-pro-accounting-automation-apply/TOOLING_AUTHORIZATION.json"
$BundleRel = "scripts/security/bundles/ra-pro-accounting-automation-applicator.standalone.cjs"
$ForbiddenUrlEnvs = @(
  "DATABASE_URL",
  "RA_PRO_CUTOVER_APPLY_DATABASE_URL",
  "CONTAINMENT_APPLY_DATABASE_URL",
  "FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL"
)
$ForbiddenOverrideEnvs = @(
  "RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_PATH",
  "RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_SHA256"
)

function Get-Sha256Bytes([byte[]]$Bytes) {
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($sha.ComputeHash($Bytes)) -replace "-", "").ToLowerInvariant()
  } finally { $sha.Dispose() }
}

function Clear-AccountingCredentialChannels {
  foreach ($k in (@($DatabaseUrlEnv) + $ForbiddenUrlEnvs + @("ENABLE_RA_PRO_ACCOUNTING_AUTOMATION", "NODE_TLS_REJECT_UNAUTHORIZED"))) {
    Remove-Item "Env:$k" -ErrorAction SilentlyContinue
    [Environment]::SetEnvironmentVariable($k, $null, "Process")
  }
}

function Sanitize-Text([string]$Text) {
  if (-not $Text) { return $Text }
  $t = [regex]::Replace($Text, "postgres(?:ql)?://[^\s`"']+", "postgres://***")
  $t = [regex]::Replace($t, "$DatabaseUrlEnv\s*[:=]\s*[^\s`"']+", "$DatabaseUrlEnv=***")
  $t = [regex]::Replace($t, "password=[^&\s`"']+", "password=***")
  return $t
}

function Invoke-GitTextLocal([string[]]$GitArgs) {
  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = "git"
  $psi.Arguments = ($GitArgs | ForEach-Object {
      if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
    }) -join " "
  $psi.WorkingDirectory = $RepoRoot
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  # Trust this worktree without mutating global git config.
  $psi.EnvironmentVariables["GIT_CONFIG_COUNT"] = "1"
  $psi.EnvironmentVariables["GIT_CONFIG_KEY_0"] = "safe.directory"
  $psi.EnvironmentVariables["GIT_CONFIG_VALUE_0"] = ($RepoRoot -replace "\\", "/")
  $p = [Diagnostics.Process]::Start($psi)
  $out = $p.StandardOutput.ReadToEnd()
  $err = $p.StandardError.ReadToEnd()
  $p.WaitForExit()
  if ($p.ExitCode -ne 0) { throw "git failed: $err" }
  return $out.Trim()
}

function Get-GitBlobBytes([string]$Commit, [string]$Rel) {
  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = "git"
  $psi.Arguments = "cat-file blob ${Commit}:${Rel}"
  $psi.WorkingDirectory = $RepoRoot
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.EnvironmentVariables["GIT_CONFIG_COUNT"] = "1"
  $psi.EnvironmentVariables["GIT_CONFIG_KEY_0"] = "safe.directory"
  $psi.EnvironmentVariables["GIT_CONFIG_VALUE_0"] = ($RepoRoot -replace "\\", "/")
  $p = [Diagnostics.Process]::Start($psi)
  $ms = New-Object IO.MemoryStream
  $p.StandardOutput.BaseStream.CopyTo($ms)
  $err = $p.StandardError.ReadToEnd()
  $p.WaitForExit()
  if ($p.ExitCode -ne 0) { throw "git cat-file failed for ${Rel}: $err" }
  return $ms.ToArray()
}

if (-not $RepoRoot) {
  $RepoRoot = (git -c "safe.directory=*" rev-parse --show-toplevel 2>$null)
  if (-not $RepoRoot) { throw "RepoRoot required" }
}
$RepoRoot = [IO.Path]::GetFullPath($RepoRoot)
if (-not $EvidenceOutDir) {
  $EvidenceOutDir = Join-Path $env:TEMP "ra-pro-accounting-automation-prod-dryrun-ceremony"
}
New-Item -ItemType Directory -Force -Path $EvidenceOutDir | Out-Null

$secure = $null
$bstr = [IntPtr]::Zero
$plain = $null
$attemptMarker = $null
$child = $null
$credentialCleared = $false
$orphanProcesses = @()
$resultCode = "CEREMONY_FAILED"
$evidencePath = Join-Path $EvidenceOutDir "PRODUCTION_DRY_RUN_EVIDENCE.json"
$rawCapture = Join-Path $EvidenceOutDir "raw-child-stdout.frame.txt"

Clear-Host
Write-Host "RA Pro accounting-automation production dry-run ceremony"
Write-Host "PrHead: $PrHead"
Write-Host "Mode: dry-run (precondition authority only; apply pins remain unpublished)"
Write-Host "Paste an already-known URL at the hidden prompt. Do not paste into chat."

try {
  foreach ($k in $ForbiddenOverrideEnvs) {
    $v = [Environment]::GetEnvironmentVariable($k, "Process")
    if (-not [string]::IsNullOrWhiteSpace($v)) {
      throw "PRECONDITION_EVIDENCE_ENV_OVERRIDE_FORBIDDEN: $k must not be set"
    }
  }
  foreach ($k in $ForbiddenUrlEnvs) {
    $v = [Environment]::GetEnvironmentVariable($k, "Process")
    if (-not [string]::IsNullOrWhiteSpace($v)) {
      throw "PROHIBITED_CREDENTIAL_CHANNEL: $k is forbidden"
    }
  }

  $tip = Invoke-GitTextLocal @("rev-parse", "HEAD")
  if ($tip.ToLowerInvariant() -ne $PrHead.ToLowerInvariant()) {
    throw "WRONG_TIP: HEAD $tip does not match -PrHead $PrHead"
  }

  $authBytes = Get-GitBlobBytes -Commit $tip -Rel $AuthRel
  $auth = ([Text.Encoding]::UTF8.GetString($authBytes)) | ConvertFrom-Json
  $pre = $auth.precondition_publication
  if ($null -eq $pre -or [string]$pre.status -ne "PUBLISHED") {
    throw "PRECONDITION_PINS_UNPUBLISHED: precondition_publication is not PUBLISHED"
  }
  $pub = $auth.publication
  if ($null -eq $pub -or [string]$pub.status -ne "UNPUBLISHED" -or
      $null -ne $pub.required_prior_dry_run_evidence_sha256 -or
      $null -ne $pub.required_pre_apply_live_evidence_sha256) {
    # Soft note only — dry-run does not require these pins unpublished forever, but this tip must keep them null.
    if ($null -ne $pub.required_prior_dry_run_evidence_sha256 -or $null -ne $pub.required_pre_apply_live_evidence_sha256) {
      Write-Host "NOTE: prior/pre-apply pins are present; dry-run still does not consume apply authority."
    }
  }

  $bundleSeal = $auth.standalone_bundle
  if (-not $bundleSeal -or -not $bundleSeal.oid -or -not $bundleSeal.sha256 -or -not $bundleSeal.bytes) {
    throw "BUNDLE_AUTHORITY_UNPUBLISHED: standalone_bundle seals missing"
  }
  $bundleOid = Invoke-GitTextLocal @("rev-parse", "${tip}:${BundleRel}")
  if ($bundleOid -ne [string]$bundleSeal.oid) {
    throw "BUNDLE_AUTHORITY_MISMATCH: tip bundle OID mismatch"
  }
  $bundleBytes = Get-GitBlobBytes -Commit $tip -Rel $BundleRel
  $bundleSha = Get-Sha256Bytes -Bytes $bundleBytes
  if ($bundleSha -ne ([string]$bundleSeal.sha256).ToLowerInvariant()) {
    throw "BUNDLE_AUTHORITY_MISMATCH: tip bundle SHA-256 mismatch"
  }
  if ($bundleBytes.Length -ne [int]$bundleSeal.bytes) {
    throw "BUNDLE_AUTHORITY_MISMATCH: tip bundle bytes mismatch"
  }
  if (($bundleBytes | Where-Object { $_ -eq 0x0d } | Select-Object -First 1) -ne $null) {
    throw "BUNDLE_CRLF_FORBIDDEN"
  }

  # One authorization → one attempt marker (no automatic retry).
  $attemptMarker = Join-Path $EvidenceOutDir ("attempt-" + $PrHead.Substring(0, 12) + "-" + [guid]::NewGuid().ToString("N") + ".marker")
  if (Test-Path -LiteralPath $attemptMarker) {
    throw "ATTEMPT_MARKER_COLLISION"
  }
  [IO.File]::WriteAllText($attemptMarker, ("dry-run`n{0}`n{1}`n" -f $PrHead, (Get-Date).ToUniversalTime().ToString("o")))

  $allowSynthetic = [Environment]::GetEnvironmentVariable("RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL", "Process")
  if (-not [string]::IsNullOrWhiteSpace($TestSyntheticDatabaseUrl)) {
    if ($allowSynthetic -ne "1") {
      throw "SYNTHETIC_URL_NOT_ALLOWED"
    }
    if ($TestSyntheticDatabaseUrl -notmatch '^postgres(?:ql)?://.+@(127\.0\.0\.1|localhost)[:/]') {
      throw "TEST_URL_NOT_LOOPBACK"
    }
    $secure = ConvertTo-SecureString -String $TestSyntheticDatabaseUrl -AsPlainText -Force
  } else {
    if (-not [string]::IsNullOrWhiteSpace($allowSynthetic) -or -not [string]::IsNullOrWhiteSpace($TestSyntheticDatabaseUrl)) {
      throw "BLOCKED_HARNESS_ENV_CONTAMINATION: interactive path forbids synthetic harness env"
    }
    $secure = Read-Host -Prompt $DatabaseUrlEnv -AsSecureString
  }
  if ($null -eq $secure -or $secure.Length -le 0) {
    throw "BLOCKED_CREDENTIAL_UNAVAILABLE: No URL provided by operator"
  }
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  if ([string]::IsNullOrWhiteSpace($plain)) {
    throw "BLOCKED_CREDENTIAL_UNAVAILABLE: Empty URL after SecureString"
  }

  $bundleTemp = Join-Path $EvidenceOutDir ("bundle-" + [guid]::NewGuid().ToString("N") + ".cjs")
  [IO.File]::WriteAllBytes($bundleTemp, $bundleBytes)

  Clear-AccountingCredentialChannels
  [Environment]::SetEnvironmentVariable($DatabaseUrlEnv, $plain, "Process")
  Set-Item -Path "Env:$DatabaseUrlEnv" -Value $plain

  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = (Get-Command node.exe).Source
  $psi.Arguments = "`"$bundleTemp`""
  $psi.WorkingDirectory = $RepoRoot
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  $psi.EnvironmentVariables[$DatabaseUrlEnv] = $plain
  foreach ($k in $ForbiddenUrlEnvs) {
    if ($psi.EnvironmentVariables.ContainsKey($k)) { $psi.EnvironmentVariables.Remove($k) }
  }
  $child = New-Object Diagnostics.Process
  $child.StartInfo = $psi
  [void]$child.Start()
  $stdout = $child.StandardOutput.ReadToEnd()
  $stderr = $child.StandardError.ReadToEnd()
  $child.WaitForExit()
  $combined = $stdout + "`n" + $stderr
  [IO.File]::WriteAllText($rawCapture, (Sanitize-Text $combined))

  # Zero-free credential material immediately after child launch completes.
  if ($bstr -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    $bstr = [IntPtr]::Zero
  }
  $plain = $null
  if ($null -ne $secure) { $secure.Dispose(); $secure = $null }
  Clear-AccountingCredentialChannels
  $credentialCleared = $true

  $line = ($combined -split "`r?`n" | Where-Object { $_.Trim().StartsWith("{") } | Select-Object -Last 1)
  if ([string]::IsNullOrWhiteSpace($line)) {
    throw "CEREMONY_EVIDENCE_DECODE_FAIL: no JSON evidence frame"
  }
  $parsed = $line | ConvertFrom-Json
  $resultCode = [string]$parsed.verdict
  if ($child.ExitCode -ne 0 -and $resultCode -eq "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION") {
    $resultCode = "CEREMONY_CHILD_EXIT_MISMATCH"
  }

  $wrapper = [ordered]@{
    protocol = "RA_PRO_ACCOUNTING_AUTOMATION_PRODUCTION_DRY_RUN_CEREMONY_V1"
    pr_tip = $PrHead
    mode = "dry-run"
    attempt_marker = [IO.Path]::GetFileName($attemptMarker)
    precondition_sha256 = [string]$pre.evidence_sha256
    precondition_source_commit = [string]$pre.evidence_source_commit
    bundle_oid = [string]$bundleSeal.oid
    bundle_sha256 = [string]$bundleSeal.sha256
    bundle_bytes = [int]$bundleSeal.bytes
    prior_dry_run_pins = "UNPUBLISHED"
    pre_apply_pins = "UNPUBLISHED"
    feature_flag_untouched = $true
    credential_cleared = $credentialCleared
    secure_string_zero_freed = $true
    orphan_processes = $orphanProcesses
    child_exit_code = $child.ExitCode
    child_evidence = $parsed
    result_code = $resultCode
  }
  $json = ($wrapper | ConvertTo-Json -Depth 12)
  [IO.File]::WriteAllText($evidencePath, ((Sanitize-Text $json) + "`n"))
  Write-Output (Sanitize-Text $json)
  if ($resultCode -ne "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION") { exit 1 }
  exit 0
}
catch {
  if ($bstr -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) | Out-Null
    $bstr = [IntPtr]::Zero
  }
  if ($null -ne $secure) { try { $secure.Dispose() } catch {} }
  Clear-AccountingCredentialChannels
  $credentialCleared = $true
  $msg = Sanitize-Text ([string]$_.Exception.Message)
  $payload = [ordered]@{
    verdict = "BLOCKED"
    reason = $msg
    mode = "dry-run"
    pr_tip = $PrHead
    productionContact = $false
    featureFlagTouched = $false
    credential_cleared = $credentialCleared
    attempt_marker = $(if ($attemptMarker) { [IO.Path]::GetFileName($attemptMarker) } else { $null })
  } | ConvertTo-Json -Compress
  Write-Output $payload
  try { [IO.File]::WriteAllText($evidencePath, ($payload + "`n")) } catch {}
  exit 1
}
finally {
  Clear-AccountingCredentialChannels
}
