#Requires -Version 5.1
<#
.SYNOPSIS
  Visible Windows PowerShell production dry-run ceremony for RA Pro accounting-automation.
  SecureString URL prompt. Never applies migrations. Never publishes prior/pre-apply pins.
  Dry-run authority = published precondition_publication only (not prior-dry-run / pre-apply).
  Guaranteed cleanup of raw stdout + materialized bundle; bounded child supervision.
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

  # Harness-only: non-interactive SecureString source when ALLOW_SYNTHETIC=1.
  # Must be a project-bound host (never localhost). Used only for ceremony unit tests.
  [Parameter(Mandatory = $false)]
  [string]$TestSyntheticDatabaseUrl = "",

  # Harness-only child behavior: success | hang | fail | malformed (requires ALLOW_SYNTHETIC=1).
  [Parameter(Mandatory = $false)]
  [ValidateSet("", "success", "hang", "fail", "malformed")]
  [string]$TestHarnessChildStub = "",

  # Bounded child wait (ms). Default 120s. Harness may lower for hang tests.
  [Parameter(Mandatory = $false)]
  [int]$ChildTimeoutMs = 120000,

  # Harness-only: force cleanup verification to fail closed.
  [Parameter(Mandatory = $false)]
  [switch]$TestForceCleanupFailure,

  # Harness-only: force child termination verification to fail closed.
  [Parameter(Mandatory = $false)]
  [switch]$TestForceTerminateFailure,

  # Harness-only: inject the pre-prompt null-index defect at a named site (requires ALLOW_SYNTHETIC=1).
  # Sites: empty_blob_index | envvars_null | pub_null_index
  [Parameter(Mandatory = $false)]
  [ValidateSet("", "empty_blob_index", "envvars_null", "pub_null_index")]
  [string]$TestForcePrePromptNullIndex = "",

  # Set only by sealed enter after tip/source blob materialize. Direct worktree launch is forbidden.
  [Parameter(Mandatory = $false)]
  [switch]$SealedMaterialInvocation
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
try { Set-PSReadLineOption -HistorySaveStyle SaveNothing -ErrorAction SilentlyContinue | Out-Null } catch {}

# Fail closed on direct worktree/operator ceremony execution unless sealed materialize or harness.
$allowDirectHarness = [Environment]::GetEnvironmentVariable("RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_DIRECT_HARNESS", "Process")
if (-not $SealedMaterialInvocation) {
  if ($allowDirectHarness -ne "1") {
    $blocked = [ordered]@{
      verdict = "BLOCKED"
      reason = "CEREMONY_DIRECT_EXEC_FORBIDDEN: launch only via sealed supervise/enter materialize path"
      mode = "dry-run"
      productionContact = $false
    } | ConvertTo-Json -Compress
    Write-Output $blocked
    exit 1
  }
  if ([Environment]::GetEnvironmentVariable("RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL", "Process") -ne "1") {
    $blocked = [ordered]@{
      verdict = "BLOCKED"
      reason = "CEREMONY_DIRECT_EXEC_FORBIDDEN: harness direct requires ALLOW_SYNTHETIC_URL=1"
      mode = "dry-run"
      productionContact = $false
    } | ConvertTo-Json -Compress
    Write-Output $blocked
    exit 1
  }
}

$DatabaseUrlEnv = "RA_PRO_ACCOUNTING_AUTOMATION_APPLY_DATABASE_URL"
$ExpectedProjectRef = "jzmdgwwiestcmmeuhhkr"
$AuthRel = "docs/security/ra-pro-accounting-automation-apply/TOOLING_AUTHORIZATION.json"
$BundleRel = "scripts/security/bundles/ra-pro-accounting-automation-applicator.standalone.cjs"
$script:PrePromptPhase = "init"
$script:PrePromptError = $null
$ForbiddenUrlEnvs = @(
  "DATABASE_URL",
  "RA_PRO_CUTOVER_APPLY_DATABASE_URL",
  "CONTAINMENT_APPLY_DATABASE_URL",
  "FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL"
)
$ForbiddenOverrideEnvs = @(
  "RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_PATH",
  "RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_SHA256",
  "RA_PRO_ACCOUNTING_AUTOMATION_ALLOW_LOCALHOST",
  "ALLOW_LOCALHOST_FOR_HARNESS",
  "RA_PRO_ACCOUNTING_AUTOMATION_ALLOW_LOCALHOST_FOR_HARNESS"
)

function Set-PrePromptPhase([string]$Phase) {
  $script:PrePromptPhase = $Phase
}

function Get-Sha256Bytes([byte[]]$Bytes) {
  if ($null -eq $Bytes) {
    throw "CEREMONY_BLOB_BYTES_NULL: Get-Sha256Bytes received null byte array"
  }
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($sha.ComputeHash($Bytes)) -replace "-", "").ToLowerInvariant()
  } finally { $sha.Dispose() }
}

function Set-ProcessGitSafeDirectory([Diagnostics.ProcessStartInfo]$Psi, [string]$Root) {
  if ($null -eq $Psi) {
    throw "CEREMONY_PROCESS_STARTINFO_UNAVAILABLE"
  }
  $Psi.UseShellExecute = $false
  $envMap = $Psi.EnvironmentVariables
  if ($null -eq $envMap) {
    throw "CEREMONY_PROCESS_ENV_UNAVAILABLE: ProcessStartInfo.EnvironmentVariables is null"
  }
  $envMap["GIT_CONFIG_COUNT"] = "1"
  $envMap["GIT_CONFIG_KEY_0"] = "safe.directory"
  $envMap["GIT_CONFIG_VALUE_0"] = ($Root -replace "\\", "/")
}

function ConvertTo-ByteArrayStrict($Value, [string]$Label) {
  if ($null -eq $Value) {
    throw "CEREMONY_BLOB_BYTES_NULL: $Label is null (byte[] unroll)"
  }
  if ($Value -is [byte[]]) {
    return $Value
  }
  try {
    return [byte[]]$Value
  } catch {
    throw "CEREMONY_BLOB_BYTES_INVALID: $Label could not be coerced to byte[] ($($_.Exception.Message))"
  }
}

function Test-BundleBytesContainCR([byte[]]$Bytes) {
  if ($null -eq $Bytes) {
    throw "CEREMONY_BLOB_BYTES_NULL: CRLF scan received null"
  }
  return ([Array]::IndexOf($Bytes, [byte]0x0d) -ge 0)
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

function Get-HostClass([string]$Url) {
  try {
    $u = [Uri]($Url -replace '^postgres(ql)?:', 'http:')
    $hostName = $u.Host
    if ($hostName -eq "127.0.0.1" -or $hostName -eq "localhost") {
      return @{ ok = $true; host_class = "loopback"; is_local = $true; matches = $false }
    }
    if ($hostName -and $hostName.Contains($ExpectedProjectRef)) {
      return @{ ok = $true; host_class = "expected_project"; is_local = $false; matches = $true }
    }
    return @{ ok = $true; host_class = "mismatched"; is_local = $false; matches = $false }
  } catch {
    return @{ ok = $false; host_class = "malformed"; is_local = $false; matches = $false }
  }
}

function Invoke-GitTextLocal([string[]]$GitArgs) {
  if ($null -eq $GitArgs -or $GitArgs.Count -eq 0) {
    throw "CEREMONY_GIT_ARGS_NULL"
  }
  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = "git"
  $psi.Arguments = ($GitArgs | ForEach-Object {
      if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
    }) -join " "
  $psi.WorkingDirectory = $RepoRoot
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  Set-ProcessGitSafeDirectory -Psi $psi -Root $RepoRoot
  if ($TestForcePrePromptNullIndex -eq "envvars_null") {
    # Exact production-class failure: index into a null EnvironmentVariables map.
    $nullMap = $null
    $nullMap["GIT_CONFIG_COUNT"] = "1"
  }
  $p = [Diagnostics.Process]::Start($psi)
  $out = $p.StandardOutput.ReadToEnd()
  $err = $p.StandardError.ReadToEnd()
  if (-not $p.WaitForExit(60000)) {
    try { $p.Kill() } catch {}
    throw "git timed out"
  }
  if ($p.ExitCode -ne 0) { throw "git failed: $err" }
  return $out.Trim()
}

function Get-GitBlobBytes([string]$Commit, [string]$Rel) {
  if ($TestForcePrePromptNullIndex -eq "empty_blob_index") {
    # Legacy defect: empty `return $ms.ToArray()` unrolls to $null; `$null[0]` throws
    # "Cannot index into a null array."
    $legacy = & {
      $msEmpty = New-Object IO.MemoryStream
      return $msEmpty.ToArray()
    }
    $null = $legacy[0]
  }
  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = "git"
  $psi.Arguments = "cat-file blob ${Commit}:${Rel}"
  $psi.WorkingDirectory = $RepoRoot
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  Set-ProcessGitSafeDirectory -Psi $psi -Root $RepoRoot
  $p = [Diagnostics.Process]::Start($psi)
  $ms = New-Object IO.MemoryStream
  $p.StandardOutput.BaseStream.CopyTo($ms)
  $err = $p.StandardError.ReadToEnd()
  if (-not $p.WaitForExit(60000)) {
    try { $p.Kill() } catch {}
    throw "git cat-file timed out"
  }
  if ($p.ExitCode -ne 0) { throw "git cat-file failed for ${Rel}: $err" }
  # Unary comma prevents PowerShell from unrolling byte[] (empty → $null; len=1 → scalar).
  return , $ms.ToArray()
}

function Get-ScopedOrphanPids([string]$Sentinel, [int]$ExcludePid) {
  $found = @()
  try {
    $procs = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue
    foreach ($proc in $procs) {
      if ($null -eq $proc) { continue }
      if ([int]$proc.ProcessId -eq $ExcludePid) { continue }
      $cmd = [string]$proc.CommandLine
      if ([string]::IsNullOrWhiteSpace($cmd)) { continue }
      if ($cmd.IndexOf($Sentinel, [StringComparison]::OrdinalIgnoreCase) -ge 0) {
        $found += [int]$proc.ProcessId
      }
    }
  } catch {}
  return $found
}

function Stop-CeremonyChildTree([Diagnostics.Process]$Proc, [string]$Sentinel) {
  $terminated = $false
  $confirmed = $false
  if ($null -eq $Proc) {
    return @{ terminated = $true; confirmed = $true; method = "no_child" }
  }
  $procId = 0
  try { $procId = [int]$Proc.Id } catch {}
  try {
    if (-not $Proc.HasExited) {
      # Kill process tree rooted at child PID only (scoped).
      $tk = Start-Process -FilePath "taskkill.exe" -ArgumentList @("/PID", "$procId", "/T", "/F") -Wait -PassThru -WindowStyle Hidden -ErrorAction SilentlyContinue
      $terminated = $true
      if ($null -ne $tk -and $tk.ExitCode -ne 0) {
        try { $Proc.Kill() } catch {}
      }
    } else {
      $terminated = $true
    }
  } catch {
    try { if (-not $Proc.HasExited) { $Proc.Kill() }; $terminated = $true } catch {}
  }
  try {
    if (-not $Proc.HasExited) { [void]$Proc.WaitForExit(15000) }
    $confirmed = [bool]$Proc.HasExited
  } catch {
    $confirmed = $false
  }
  # Also kill any remaining scoped orphans matching the ceremony sentinel.
  foreach ($op in (Get-ScopedOrphanPids -Sentinel $Sentinel -ExcludePid 0)) {
    try {
      Start-Process -FilePath "taskkill.exe" -ArgumentList @("/PID", "$op", "/T", "/F") -Wait -WindowStyle Hidden -ErrorAction SilentlyContinue | Out-Null
    } catch {}
  }
  return @{ terminated = $terminated; confirmed = $confirmed; method = "taskkill_tree"; pid = $procId }
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
$childPid = $null
$bundleTemp = $null
$ceremonySentinel = "ra-acct-dryrun-" + [guid]::NewGuid().ToString("N")
$rawCapture = Join-Path $EvidenceOutDir "raw-child-stdout.frame.txt"
$evidencePath = Join-Path $EvidenceOutDir "PRODUCTION_DRY_RUN_EVIDENCE.json"
$resultCode = "CEREMONY_FAILED"
$parsed = $null
$pre = $null
$bundleSeal = $null
$hostClass = $null
$timedOut = $false
$childTerminated = $false
$terminationConfirmed = $false
$orphanPids = @()
$orphanCheckCompleted = $false
$rawStdoutRemoved = $false
$materialRemoved = $false
$credentialCleared = $false
$secureZeroFreed = $false
$cleanupCompleted = $false
$stdout = ""
$stderr = ""
$combined = ""

Clear-Host
Write-Host "RA Pro accounting-automation production dry-run ceremony"
Write-Host "PrHead: $PrHead"
Write-Host "Mode: dry-run (precondition authority only; apply pins remain unpublished)"
Write-Host "Paste an already-known URL at the hidden prompt. Do not paste into chat."

try {
  Set-PrePromptPhase "forbidden_envs"
  if (-not [string]::IsNullOrWhiteSpace($TestForcePrePromptNullIndex)) {
    $allowSyntheticProbe = [Environment]::GetEnvironmentVariable("RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL", "Process")
    if ($allowSyntheticProbe -ne "1") {
      throw "SYNTHETIC_URL_NOT_ALLOWED"
    }
  }
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

  Set-PrePromptPhase "tip_rev_parse"
  $tip = Invoke-GitTextLocal @("rev-parse", "HEAD")
  if ($tip.ToLowerInvariant() -ne $PrHead.ToLowerInvariant()) {
    throw "WRONG_TIP: HEAD $tip does not match -PrHead $PrHead"
  }

  Set-PrePromptPhase "auth_blob"
  $authBytes = ConvertTo-ByteArrayStrict (Get-GitBlobBytes -Commit $tip -Rel $AuthRel) "auth_blob"
  Set-PrePromptPhase "auth_parse"
  $auth = ([Text.Encoding]::UTF8.GetString($authBytes)) | ConvertFrom-Json
  Set-PrePromptPhase "precondition"
  $pre = $auth.precondition_publication
  if ($null -eq $pre -or [string]$pre.status -ne "PUBLISHED") {
    throw "PRECONDITION_PINS_UNPUBLISHED: precondition_publication is not PUBLISHED"
  }
  Set-PrePromptPhase "publication_pin_note"
  $pub = $auth.publication
  # Null-safe: never index/dereference $pub when absent (restores guard removed at 03f0bc0c).
  if ($TestForcePrePromptNullIndex -eq "pub_null_index") {
    # Prove fixed path tolerates null publication without NullArray.
    $pub = $null
  }
  if (
    $null -ne $pub -and (
      $null -ne $pub.required_prior_dry_run_evidence_sha256 -or
      $null -ne $pub.required_pre_apply_live_evidence_sha256
    )
  ) {
    Write-Host "NOTE: prior/pre-apply pins are present; dry-run still does not consume apply authority."
  }

  Set-PrePromptPhase "bundle_seal"
  $bundleSeal = $auth.standalone_bundle
  if (-not $bundleSeal -or -not $bundleSeal.oid -or -not $bundleSeal.sha256 -or -not $bundleSeal.bytes) {
    throw "BUNDLE_AUTHORITY_UNPUBLISHED: standalone_bundle seals missing"
  }
  Set-PrePromptPhase "bundle_oid"
  $bundleOid = Invoke-GitTextLocal @("rev-parse", "${tip}:${BundleRel}")
  if ($bundleOid -ne [string]$bundleSeal.oid) {
    throw "BUNDLE_AUTHORITY_MISMATCH: tip bundle OID mismatch"
  }
  Set-PrePromptPhase "bundle_blob"
  $bundleBytes = ConvertTo-ByteArrayStrict (Get-GitBlobBytes -Commit $tip -Rel $BundleRel) "bundle_blob"
  Set-PrePromptPhase "bundle_sha"
  $bundleSha = Get-Sha256Bytes -Bytes $bundleBytes
  if ($bundleSha -ne ([string]$bundleSeal.sha256).ToLowerInvariant()) {
    throw "BUNDLE_AUTHORITY_MISMATCH: tip bundle SHA-256 mismatch"
  }
  Set-PrePromptPhase "bundle_len"
  if ($bundleBytes.Length -ne [int]$bundleSeal.bytes) {
    throw "BUNDLE_AUTHORITY_MISMATCH: tip bundle bytes mismatch"
  }
  Set-PrePromptPhase "bundle_crlf"
  if (Test-BundleBytesContainCR -Bytes $bundleBytes) {
    throw "BUNDLE_CRLF_FORBIDDEN"
  }

  Set-PrePromptPhase "attempt_marker"
  # One authorization → one attempt marker (no automatic retry).
  $attemptMarker = Join-Path $EvidenceOutDir ("attempt-" + $PrHead.Substring(0, 12) + "-" + [guid]::NewGuid().ToString("N") + ".marker")
  if (Test-Path -LiteralPath $attemptMarker) {
    throw "ATTEMPT_MARKER_COLLISION"
  }
  [IO.File]::WriteAllText($attemptMarker, ("dry-run`n{0}`n{1}`n" -f $PrHead, (Get-Date).ToUniversalTime().ToString("o")))

  Set-PrePromptPhase "credential_boundary"
  $allowSynthetic = [Environment]::GetEnvironmentVariable("RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL", "Process")
  if (-not [string]::IsNullOrWhiteSpace($TestSyntheticDatabaseUrl) -or -not [string]::IsNullOrWhiteSpace($TestHarnessChildStub)) {
    if ($allowSynthetic -ne "1") {
      throw "SYNTHETIC_URL_NOT_ALLOWED"
    }
  }

  if (-not [string]::IsNullOrWhiteSpace($TestSyntheticDatabaseUrl)) {
    $secure = ConvertTo-SecureString -String $TestSyntheticDatabaseUrl -AsPlainText -Force
  } else {
    if (-not [string]::IsNullOrWhiteSpace($allowSynthetic)) {
      throw "BLOCKED_HARNESS_ENV_CONTAMINATION: interactive path forbids synthetic harness env without TestSyntheticDatabaseUrl"
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

  $hostClass = Get-HostClass -Url $plain
  if (-not $hostClass.ok) {
    throw "MALFORMED_DATABASE_URL"
  }
  if ($hostClass.is_local -or -not $hostClass.matches) {
    throw "DATABASE_PROJECT_REF_MISMATCH: host must be bound to Supabase project $ExpectedProjectRef"
  }

  $bundleTemp = Join-Path $EvidenceOutDir ("bundle-" + $ceremonySentinel + ".cjs")
  if (-not [string]::IsNullOrWhiteSpace($TestHarnessChildStub) -and $allowSynthetic -eq "1") {
    $stubBody = switch ($TestHarnessChildStub) {
      "success" {
        @"
console.log(JSON.stringify({
  verdict: "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION",
  result_code: "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION",
  databaseConnectionAttempts: 0,
  sqlApplicationAttempts: 0,
  migration_sql_attempts: 0,
  harness_stub: true,
  ceremony_sentinel: "$ceremonySentinel"
}));
process.exit(0);
"@
      }
      "hang" {
        @"
setInterval(() => {}, 1000);
// hang until killed; sentinel=$ceremonySentinel
"@
      }
      "fail" {
        @"
console.log(JSON.stringify({
  verdict: "DRY_RUN_BLOCKED",
  result_code: "HARNESS_CHILD_FAIL",
  databaseConnectionAttempts: 0,
  sqlApplicationAttempts: 0,
  ceremony_sentinel: "$ceremonySentinel"
}));
process.exit(2);
"@
      }
      "malformed" {
        @"
console.log("NOT_JSON_EVIDENCE sentinel=$ceremonySentinel");
process.exit(0);
"@
      }
      default { throw "INVALID_HARNESS_STUB" }
    }
    [IO.File]::WriteAllText($bundleTemp, ($stubBody -replace "`r`n", "`n"))
  } else {
    [IO.File]::WriteAllBytes($bundleTemp, $bundleBytes)
  }

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
  $childEnv = $psi.EnvironmentVariables
  if ($null -eq $childEnv) {
    throw "CEREMONY_PROCESS_ENV_UNAVAILABLE: child EnvironmentVariables is null"
  }
  $childEnv[$DatabaseUrlEnv] = $plain
  foreach ($k in $ForbiddenUrlEnvs) {
    if ($childEnv.ContainsKey($k)) { $childEnv.Remove($k) }
  }
  $child = New-Object Diagnostics.Process
  $child.StartInfo = $psi
  [void]$child.Start()
  $childPid = [int]$child.Id

  # Async read so WaitForExit timeout cannot deadlock on full pipes.
  $outTask = $child.StandardOutput.ReadToEndAsync()
  $errTask = $child.StandardError.ReadToEndAsync()
  $exited = $child.WaitForExit([Math]::Max(1, $ChildTimeoutMs))
  if (-not $exited) {
    $timedOut = $true
    $stop = Stop-CeremonyChildTree -Proc $child -Sentinel $ceremonySentinel
    $childTerminated = [bool]$stop.terminated
    $terminationConfirmed = [bool]$stop.confirmed
    if ($TestForceTerminateFailure) {
      $terminationConfirmed = $false
      $childTerminated = $false
    }
    if (-not $terminationConfirmed) {
      throw "CEREMONY_CHILD_TERMINATION_FAILED: timed out and child tree not confirmed exited"
    }
    throw "CEREMONY_CHILD_TIMEOUT: child exceeded ${ChildTimeoutMs}ms"
  } else {
    $childTerminated = $true
    $terminationConfirmed = $true
    if ($TestForceTerminateFailure) {
      $terminationConfirmed = $false
      throw "CEREMONY_CHILD_TERMINATION_FAILED: forced harness termination failure"
    }
  }
  try { $stdout = [string]$outTask.Result } catch { $stdout = "" }
  try { $stderr = [string]$errTask.Result } catch { $stderr = "" }
  $combined = $stdout + "`n" + $stderr
  [IO.File]::WriteAllText($rawCapture, (Sanitize-Text $combined))

  # Zero-free credential material immediately after child completes.
  if ($bstr -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    $bstr = [IntPtr]::Zero
  }
  $secureZeroFreed = $true
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
}
catch {
  $msg = Sanitize-Text ([string]$_.Exception.Message)
  $failLine = 0
  $failStmt = ""
  $failPhase = [string]$script:PrePromptPhase
  try { $failLine = [int]$_.InvocationInfo.ScriptLineNumber } catch {}
  try {
    $failStmt = Sanitize-Text ([string]$_.InvocationInfo.Line).Trim()
    if ($failStmt.Length -gt 240) { $failStmt = $failStmt.Substring(0, 240) }
  } catch { $failStmt = "" }
  $script:PrePromptError = [ordered]@{
    phase = $failPhase
    script_line = $failLine
    statement = $failStmt
    exception_type = [string]$_.Exception.GetType().FullName
  }
  if ($resultCode -eq "CEREMONY_FAILED" -or $resultCode -eq "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION") {
    if ($msg -match '^(WRONG_TIP|SYNTHETIC_URL_NOT_ALLOWED|DATABASE_PROJECT_REF_MISMATCH|MALFORMED_DATABASE_URL|CEREMONY_CHILD_TIMEOUT|CEREMONY_CHILD_TERMINATION_FAILED|CEREMONY_EVIDENCE_DECODE_FAIL|BLOCKED_CREDENTIAL|PROHIBITED_CREDENTIAL|PRECONDITION_|BUNDLE_|ATTEMPT_|BLOCKED_HARNESS|CEREMONY_PROCESS_|CEREMONY_BLOB_|CEREMONY_GIT_)') {
      $resultCode = ($msg -split ":")[0]
    } else {
      $resultCode = "BLOCKED"
    }
  }
  if (-not $parsed) {
    $parsed = [ordered]@{
      verdict = "BLOCKED"
      reason = $msg
      productionContact = $false
      pre_prompt_phase = $failPhase
      pre_prompt_error = $script:PrePromptError
    }
  }
}
finally {
  # Guaranteed credential / SecureString cleanup
  try {
    if ($bstr -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) | Out-Null
      $bstr = [IntPtr]::Zero
      $secureZeroFreed = $true
    }
  } catch {}
  try {
    if ($null -ne $secure) { $secure.Dispose(); $secure = $null; $secureZeroFreed = $true }
  } catch {}
  $plain = $null
  Clear-AccountingCredentialChannels
  $credentialCleared = (-not [bool][Environment]::GetEnvironmentVariable($DatabaseUrlEnv, "Process"))

  # SecureString/BSTR: either never allocated, or must be zero-freed/disposed above.
  if ($bstr -eq [IntPtr]::Zero -and $null -eq $secure) {
    $secureZeroFreed = $true
  }

  # Terminate child tree if still alive
  if ($null -ne $child) {
    try {
      if (-not $child.HasExited) {
        $stop = Stop-CeremonyChildTree -Proc $child -Sentinel $ceremonySentinel
        $childTerminated = [bool]$stop.terminated
        $terminationConfirmed = [bool]$stop.confirmed
      } else {
        $childTerminated = $true
        $terminationConfirmed = $true
      }
    } catch {
      $terminationConfirmed = $false
    }
  } else {
    $childTerminated = $true
    $terminationConfirmed = $true
  }
  if ($TestForceTerminateFailure -and $null -ne $child) {
    $terminationConfirmed = $false
    $childTerminated = $false
  }

  # Remove raw stdout capture
  try {
    if (Test-Path -LiteralPath $rawCapture) {
      Remove-Item -LiteralPath $rawCapture -Force -ErrorAction Stop
    }
    $rawStdoutRemoved = -not (Test-Path -LiteralPath $rawCapture)
  } catch {
    $rawStdoutRemoved = $false
  }

  # Remove every materialized bundle-*.cjs in the evidence dir
  try {
    Get-ChildItem -LiteralPath $EvidenceOutDir -Filter "bundle-*.cjs" -ErrorAction SilentlyContinue | ForEach-Object {
      Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
    }
    if ($bundleTemp -and (Test-Path -LiteralPath $bundleTemp)) {
      Remove-Item -LiteralPath $bundleTemp -Force -ErrorAction SilentlyContinue
    }
    $left = @(Get-ChildItem -LiteralPath $EvidenceOutDir -Filter "bundle-*.cjs" -ErrorAction SilentlyContinue)
    $materialRemoved = ($left.Count -eq 0)
  } catch {
    $materialRemoved = $false
  }

  if ($TestForceCleanupFailure) {
    $rawStdoutRemoved = $false
    $materialRemoved = $false
  }

  # Scoped orphan check using ceremony sentinel (never kill unrelated node/pwsh)
  try {
    $orphanPids = @(Get-ScopedOrphanPids -Sentinel $ceremonySentinel -ExcludePid 0)
    $orphanCheckCompleted = $true
  } catch {
    $orphanPids = @()
    $orphanCheckCompleted = $false
  }

  $orphanFree = ($orphanCheckCompleted -and $orphanPids.Count -eq 0)
  $cleanupCompleted = (
    $credentialCleared -and
    $secureZeroFreed -and
    $rawStdoutRemoved -and
    $materialRemoved -and
    $terminationConfirmed -and
    $orphanCheckCompleted -and
    $orphanFree
  )

  # Prefer primary failure codes; only overwrite with cleanup faults when primary was success-like.
  $primaryCodes = @(
    "WRONG_TIP", "SYNTHETIC_URL_NOT_ALLOWED", "DATABASE_PROJECT_REF_MISMATCH", "MALFORMED_DATABASE_URL",
    "CEREMONY_CHILD_TIMEOUT", "CEREMONY_CHILD_TERMINATION_FAILED", "CEREMONY_EVIDENCE_DECODE_FAIL",
    "BLOCKED_CREDENTIAL_UNAVAILABLE", "PROHIBITED_CREDENTIAL_CHANNEL", "PRECONDITION_PINS_UNPUBLISHED",
    "PRECONDITION_EVIDENCE_ENV_OVERRIDE_FORBIDDEN", "BUNDLE_AUTHORITY_MISMATCH", "BUNDLE_AUTHORITY_UNPUBLISHED",
    "BUNDLE_CRLF_FORBIDDEN", "ATTEMPT_MARKER_COLLISION", "BLOCKED_HARNESS_ENV_CONTAMINATION",
    "DRY_RUN_BLOCKED", "HARNESS_CHILD_FAIL", "CEREMONY_CHILD_EXIT_MISMATCH", "BLOCKED"
  )
  if ($resultCode -notin $primaryCodes -and $resultCode -ne "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION") {
    # keep
  }
  if (-not $terminationConfirmed) {
    if ($resultCode -eq "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION" -or $resultCode -eq "CEREMONY_FAILED") {
      $resultCode = "CEREMONY_CHILD_TERMINATION_FAILED"
    } elseif ($TestForceTerminateFailure) {
      $resultCode = "CEREMONY_CHILD_TERMINATION_FAILED"
    }
  } elseif (-not $orphanFree -or -not $orphanCheckCompleted) {
    if ($resultCode -eq "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION" -or $resultCode -eq "CEREMONY_FAILED") {
      $resultCode = "CEREMONY_ORPHAN_PROCESSES_REMAIN"
    }
  } elseif (-not $rawStdoutRemoved -or -not $materialRemoved -or -not $cleanupCompleted) {
    if (
      $resultCode -eq "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION" -or
      $resultCode -eq "CEREMONY_FAILED" -or
      $TestForceCleanupFailure
    ) {
      $resultCode = "CEREMONY_CLEANUP_FAILED"
    }
  }

  $cleanup = [ordered]@{
    completed = [bool]$cleanupCompleted
    credential_cleared = [bool]$credentialCleared
    secure_string_zero_freed = [bool]$secureZeroFreed
    raw_stdout_removed = [bool]$rawStdoutRemoved
    material_removed = [bool]$materialRemoved
    child_terminated = [bool]$childTerminated -and [bool]$terminationConfirmed
    orphan_check_completed = [bool]$orphanCheckCompleted
  }
  $childSupervision = [ordered]@{
    child_pid = $childPid
    timed_out = [bool]$timedOut
    timeout_ms = [int]$ChildTimeoutMs
    termination_confirmed = [bool]$terminationConfirmed
    orphan_count = [int]$orphanPids.Count
    orphan_free = [bool]$orphanFree
    ceremony_sentinel = $ceremonySentinel
  }

  $wrapper = [ordered]@{
    protocol = "RA_PRO_ACCOUNTING_AUTOMATION_PRODUCTION_DRY_RUN_CEREMONY_V1"
    pr_tip = $PrHead
    mode = "dry-run"
    attempt_marker = $(if ($attemptMarker) { [IO.Path]::GetFileName($attemptMarker) } else { $null })
    precondition_sha256 = $(if ($pre) { [string]$pre.evidence_sha256 } else { $null })
    precondition_source_commit = $(if ($pre) { [string]$pre.evidence_source_commit } else { $null })
    bundle_oid = $(if ($bundleSeal) { [string]$bundleSeal.oid } else { $null })
    bundle_sha256 = $(if ($bundleSeal) { [string]$bundleSeal.sha256 } else { $null })
    bundle_bytes = $(if ($bundleSeal) { [int]$bundleSeal.bytes } else { $null })
    prior_dry_run_pins = "UNPUBLISHED"
    pre_apply_pins = "UNPUBLISHED"
    feature_flag_untouched = $true
    productionContact = $false
    pre_prompt_phase = $(if ($script:PrePromptPhase) { [string]$script:PrePromptPhase } else { $null })
    pre_prompt_error = $(if ($script:PrePromptError) { $script:PrePromptError } else { $null })
    uri_diagnostics = $(if ($hostClass) {
      [ordered]@{
        ok = [bool]$hostClass.ok
        host_class = [string]$hostClass.host_class
        is_local = [bool]$hostClass.is_local
        matches_expected_project_ref = [bool]$hostClass.matches
        expected_project_ref = $ExpectedProjectRef
      }
    } else { $null })
    cleanup = $cleanup
    child_supervision = $childSupervision
    child_exit_code = $(if ($null -ne $child) { try { $child.ExitCode } catch { $null } } else { $null })
    child_evidence = $parsed
    result_code = $resultCode
  }
  $json = ($wrapper | ConvertTo-Json -Depth 12 -Compress)
  $sanitized = Sanitize-Text $json
  try { [IO.File]::WriteAllText($evidencePath, ($sanitized + "`n")) } catch {}
  Write-Output $sanitized
}

if (
  $resultCode -eq "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION" -and
  $cleanupCompleted
) {
  exit 0
}
exit 1
