#Requires -Version 5.1
<#
.SYNOPSIS
  Operator ceremony for corrective production dry-run with byte-exact sealed evidence
  retention and fail-closed measured cleanup receipt.
  Never ConvertTo-Json the sealed applicator frame. Never --apply.
  Cleanup truth lives ONLY on CORRECTIVE_PRODUCTION_DRY_RUN_CEREMONY_RECEIPT.json.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-fA-F]{40}$')]
  [string]$PinTip,

  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-fA-F]{40}$')]
  [string]$DryRunAuthorizationPublication,

  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-fA-F]{40}$')]
  [string]$ExecutableAuthorityPublication,

  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-fA-F]{40}$')]
  [string]$ExpectExecutableAuthorityBlobOid,

  [Parameter(Mandatory = $false)]
  [string]$RepoRoot = "",

  [Parameter(Mandatory = $false)]
  [string]$EvidenceOutDir = "",

  # Set only after bootstrap tip-seal materialize. Direct worktree -File is forbidden.
  [Parameter(Mandatory = $false)]
  [switch]$SealedMaterialInvocation
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
try { Set-PSReadLineOption -HistorySaveStyle SaveNothing -ErrorAction SilentlyContinue | Out-Null } catch {}

if (-not $SealedMaterialInvocation) {
  throw "CEREMONY_DIRECT_EXEC_FORBIDDEN: materialize via corrective bootstrap Git-blob first hop only"
}

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = (git rev-parse --show-toplevel).Trim()
}
$RepoRoot = [IO.Path]::GetFullPath($RepoRoot)
$PinTip = $PinTip.ToLowerInvariant()
$DryRunAuthorizationPublication = $DryRunAuthorizationPublication.ToLowerInvariant()
$ExecutableAuthorityPublication = $ExecutableAuthorityPublication.ToLowerInvariant()
$ExpectExecutableAuthorityBlobOid = $ExpectExecutableAuthorityBlobOid.ToLowerInvariant()
$EvidenceAuthorityCommit = $PinTip
$ExpectedEvidenceAuthority = "f550842cd6dd837671599ee8c65bb6ba3932aa62"
$HistoricalRejectedExecutable = "9f31c3552a2a06fc3b851bd722aad9311dde40f8"
if ($EvidenceAuthorityCommit -ne $ExpectedEvidenceAuthority) {
  throw ("EVIDENCE_AUTHORITY_COMMIT_FORBIDDEN: expected " + $ExpectedEvidenceAuthority + " got " + $EvidenceAuthorityCommit)
}
$DbEnv = "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_APPLY_DATABASE_URL"
$AuthRel = "docs/security/ra-pro-accounting-automation-corrective-apply/TOOLING_AUTHORIZATION.json"
$BundleRel = "scripts/security/bundles/ra-pro-accounting-automation-corrective-applicator.standalone.cjs"
$EvidenceModRel = "scripts/security/ra-pro-accounting-automation-corrective-evidence.js"
$DecodeRel = "scripts/security/ra-pro-accounting-automation-corrective-evidence-decode-frame.js"
$ReceiptModRel = "scripts/security/ra-pro-accounting-automation-corrective-ceremony-receipt.js"
$CeremonyRel = "scripts/security/operator-ra-pro-accounting-automation-corrective-production-dryrun-ceremony.ps1"

$env:GIT_CONFIG_COUNT = "1"
$env:GIT_CONFIG_KEY_0 = "safe.directory"
$env:GIT_CONFIG_VALUE_0 = ($RepoRoot -replace '\\', '/')

@(
  "RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL",
  "DATABASE_URL",
  "RA_PRO_ACCOUNTING_AUTOMATION_APPLY_DATABASE_URL",
  "ENABLE_RA_PRO_ACCOUNTING_AUTOMATION",
  $DbEnv
) | ForEach-Object {
  $ep = "Env:" + $_
  if (Test-Path -LiteralPath $ep) { Remove-Item -LiteralPath $ep -Force }
}

function Get-GitBlobBytes([string]$Spec) {
  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = "git"
  $psi.Arguments = "cat-file blob $Spec"
  $psi.WorkingDirectory = $RepoRoot
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

function Get-Sha256Bytes([byte[]]$Bytes) {
  $sha = [Security.Cryptography.SHA256]::Create()
  try { return ([BitConverter]::ToString($sha.ComputeHash($Bytes)) -replace "-", "").ToLowerInvariant() }
  finally { $sha.Dispose() }
}

function Get-GitBlobOid([string]$Spec) {
  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = "git"
  $psi.Arguments = "rev-parse $Spec"
  $psi.WorkingDirectory = $RepoRoot
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.EnvironmentVariables["GIT_CONFIG_COUNT"] = "1"
  $psi.EnvironmentVariables["GIT_CONFIG_KEY_0"] = "safe.directory"
  $psi.EnvironmentVariables["GIT_CONFIG_VALUE_0"] = $env:GIT_CONFIG_VALUE_0
  $p = [Diagnostics.Process]::Start($psi)
  $out = $p.StandardOutput.ReadToEnd().Trim()
  $err = $p.StandardError.ReadToEnd()
  if (-not $p.WaitForExit(60000)) { try { $p.Kill() } catch {}; throw "git rev-parse timed out" }
  if ($p.ExitCode -ne 0) { throw ("git rev-parse failed: " + $err) }
  return $out.ToLowerInvariant()
}

function Count-CrBytes([byte[]]$Bytes) {
  $n = 0
  foreach ($b in $Bytes) { if ($b -eq 0x0d) { $n++ } }
  return $n
}

<#
  Tip-bound ceremony seal authority. Worktree CR count / bytes must match tip blob
  when reporting seals (regression for CRLF worktree substitution).
#>
function Get-CommittedCeremonySeal([string]$Tip, [string]$RelPath) {
  $spec = "${Tip}:${RelPath}"
  $blob = Get-GitBlobBytes $spec
  $oid = Get-GitBlobOid $spec
  $sha = Get-Sha256Bytes $blob
  $wtPath = Join-Path $RepoRoot ($RelPath -replace '/', [IO.Path]::DirectorySeparatorChar)
  if (Test-Path -LiteralPath $wtPath) {
    $wt = [IO.File]::ReadAllBytes($wtPath)
    $blobCr = Count-CrBytes $blob
    $wtCr = Count-CrBytes $wt
    if ($blobCr -ne $wtCr -or $blob.Length -ne $wt.Length) {
      throw ("CEREMONY_WORKTREE_CRLF_MISMATCH tip_bytes=" + $blob.Length +
        " tip_cr=" + $blobCr + " wt_bytes=" + $wt.Length + " wt_cr=" + $wtCr)
    }
  }
  return [ordered]@{
    path = $RelPath
    oid = $oid
    sha256 = $sha
    bytes = [int]$blob.Length
  }
}

function Add-CleanupError([System.Collections.Generic.List[string]]$List, [string]$Code) {
  if (-not [string]::IsNullOrWhiteSpace($Code) -and -not $List.Contains($Code)) {
    [void]$List.Add($Code)
  }
}

if ([string]::IsNullOrWhiteSpace($EvidenceOutDir)) {
  $EvidenceOutDir = Join-Path $env:TEMP ("ra-acct-corrective-dryrun-" + [guid]::NewGuid().ToString("N"))
}
New-Item -ItemType Directory -Force -Path $EvidenceOutDir | Out-Null
$EvidencePath = Join-Path $EvidenceOutDir "CORRECTIVE_PRODUCTION_DRY_RUN_EVIDENCE.json"
$ReceiptPath = Join-Path $EvidenceOutDir "CORRECTIVE_PRODUCTION_DRY_RUN_CEREMONY_RECEIPT.json"
$SummaryPath = Join-Path $EvidenceOutDir "CORRECTIVE_PRODUCTION_DRY_RUN_SUMMARY.json"
$RawPath = Join-Path $EvidenceOutDir "raw-child-stdout.frame.bin"
$MeasurementsPath = Join-Path $EvidenceOutDir "measurements.json"
$BundleDir = Join-Path $env:TEMP ("ra-acct-corrective-bundle-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $BundleDir | Out-Null
$BundleFile = Join-Path $BundleDir "corrective-applicator.standalone.cjs"
$DecodeFile = Join-Path $EvidenceOutDir "decode-frame.js"
$EvidenceModFile = Join-Path $EvidenceOutDir "corrective-evidence.js"
$ReceiptModFile = Join-Path $EvidenceOutDir "ceremony-receipt.js"

$secure = $null
$bstr = [IntPtr]::Zero
$plain = $null
$nodeExit = -1
$retainOk = $false
$retainedSha = $null
$retainedBytes = 0
$childPid = 0
$childProcess = $null
$cleanupErrors = New-Object 'System.Collections.Generic.List[string]'
$executionTip = $null
$ceremonySeal = $null
$bundleSeal = $null
$AuthorizationBlobOid = $null
$AttemptId = $null
$ExecutableCommit = $null

function New-CorrectiveDryRunMarkerAtomic(
  [string]$Executable,
  [string]$AttemptId,
  [string]$OutDir,
  [string]$ExecutableAuthorityPublication,
  [string]$ExecutableAuthorityBlobOid
) {
  if ($AttemptId -notmatch '^corr-dryrun-[0-9a-f]{12}-[0-9a-f]{32}$') {
    throw "DRY_RUN_ATTEMPT_ID_INVALID"
  }
  $name = $AttemptId + ".marker"
  $path = Join-Path $OutDir $name
  $body = "corrective-dry-run`n{0}`n{1}`n{2}`n{3}`n" -f $Executable, $AttemptId, $ExecutableAuthorityPublication, $ExecutableAuthorityBlobOid
  $bytes = [Text.Encoding]::UTF8.GetBytes($body)
  try {
    $fs = [IO.File]::Open($path, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    try { $fs.Write($bytes, 0, $bytes.Length) } finally { $fs.Dispose() }
  } catch [IO.IOException] {
    throw "CORRECTIVE_DRY_RUN_ATTEMPT_CONSUMED"
  }
  return $path
}

try {
  # Trust root 1: executable-authority publication (Git), before dry-run AUTH.
  $execAuthOid = (Get-GitBlobOid "${ExecutableAuthorityPublication}:${AuthRel}").ToLowerInvariant()
  if ($execAuthOid -ne $ExpectExecutableAuthorityBlobOid) {
    throw "EXECUTABLE_AUTHORITY_PIN_MISMATCH: blob oid"
  }
  $execAuthBytes = Get-GitBlobBytes "${ExecutableAuthorityPublication}:${AuthRel}"
  $execAuth = ([Text.Encoding]::UTF8.GetString($execAuthBytes)) | ConvertFrom-Json
  $execRecord = $execAuth.production_executable_authority
  if ($null -eq $execRecord -or [string]$execRecord.status -ne "AUTHORIZED" -or -not [bool]$execRecord.executable_authorized) {
    throw "EXECUTABLE_AUTHORITY_REMAINS_UNPUBLISHED: production_executable_authority is UNPUBLISHED"
  }
  $boundExecutable = ([string]$execRecord.authorized_executable_commit).ToLowerInvariant()
  if ($boundExecutable -notmatch '^[0-9a-f]{40}$') {
    throw "EXECUTABLE_AUTHORITY_SEAL_MISSING: authorized_executable_commit"
  }
  if ($boundExecutable -eq $HistoricalRejectedExecutable) {
    throw "EXECUTABLE_AUTHORITY_HISTORICAL_REJECTED: historical executable 9f31c355… lacks remediated sealed protocol"
  }
  if ($boundExecutable -eq $ExecutableAuthorityPublication) { throw "EXECUTABLE_AUTHORITY_CIRCULAR_TIP" }
  git -C $RepoRoot merge-base --is-ancestor $boundExecutable $ExecutableAuthorityPublication
  if ($LASTEXITCODE -ne 0) { throw "EXECUTABLE_AUTHORITY_ANCESTRY" }
  $execDelta = @(git -C $RepoRoot diff --name-only $boundExecutable $ExecutableAuthorityPublication)
  if ($execDelta.Count -ne 1 -or $execDelta[0] -ne $AuthRel) {
    throw ("EXECUTABLE_AUTHORITY_ALLOWLIST: " + ($execDelta -join ","))
  }
  $nodeExe = (Get-Command node.exe).Source
  $allowJs = Join-Path $RepoRoot "scripts/security/ra-pro-accounting-automation-corrective-executable-authority.js"
  $allowProbe = Start-Process -FilePath $nodeExe -ArgumentList @(
    "-e",
    "require(process.argv[1]).assertPublicationAllowlist({executable:process.argv[2],publication:process.argv[3],cwd:process.argv[4]})",
    $allowJs,
    $boundExecutable,
    $ExecutableAuthorityPublication,
    $RepoRoot
  ) -Wait -PassThru -NoNewWindow -WorkingDirectory $RepoRoot
  if ($allowProbe.ExitCode -ne 0) {
    throw "EXECUTABLE_AUTHORITY_ALLOWLIST: semantic delta rejected before SecureString"
  }

  # Trust root 2: dry-run authorization publication (Git), bound to executable-authority.
  $pubBytes = Get-GitBlobBytes "${DryRunAuthorizationPublication}:${AuthRel}"
  $pubAuth = ([Text.Encoding]::UTF8.GetString($pubBytes)) | ConvertFrom-Json
  $dryRecord = $pubAuth.production_dry_run_authorization
  if ($null -eq $dryRecord -or [string]$dryRecord.status -ne "AUTHORIZED" -or -not [bool]$dryRecord.dry_run_authorized) {
    throw "DRY_RUN_REMAINS_BLOCKED_BEFORE_CREDENTIALS: production_dry_run_authorization is UNPUBLISHED"
  }
  $ExecutableCommit = ([string]$dryRecord.authorized_executable_commit).ToLowerInvariant()
  $AttemptId = [string]$dryRecord.attempt_id
  if ($ExecutableCommit -ne $boundExecutable) {
    throw "DRY_RUN_EXECUTABLE_AUTHORITY_MISMATCH: dry-run authorized_executable_commit must match executable-authority"
  }
  $recordExecAuthCommit = ([string]$dryRecord.executable_authority_publication_commit).ToLowerInvariant()
  $recordExecAuthOid = ([string]$dryRecord.executable_authority_publication_blob_oid).ToLowerInvariant()
  if ($recordExecAuthCommit -ne $ExecutableAuthorityPublication -or $recordExecAuthOid -ne $ExpectExecutableAuthorityBlobOid) {
    throw "DRY_RUN_EXECUTABLE_AUTHORITY_MISMATCH: dry-run record executable-authority tuple mismatch"
  }
  if ($ExecutableCommit -notmatch '^[0-9a-f]{40}$') { throw "DRY_RUN_AUTHORIZATION_EXECUTABLE_INVALID" }
  if ($AttemptId -notmatch '^corr-dryrun-[0-9a-f]{12}-[0-9a-f]{32}$') { throw "DRY_RUN_ATTEMPT_ID_INVALID" }
  if ($ExecutableCommit -eq $DryRunAuthorizationPublication) { throw "DRY_RUN_AUTHORIZATION_CIRCULAR_TIP" }
  git -C $RepoRoot merge-base --is-ancestor $EvidenceAuthorityCommit $ExecutableCommit
  if ($LASTEXITCODE -ne 0) { throw "EVIDENCE_AUTHORITY_ANCESTRY" }
  git -C $RepoRoot merge-base --is-ancestor $ExecutableCommit $DryRunAuthorizationPublication
  if ($LASTEXITCODE -ne 0) { throw "DRY_RUN_AUTHORIZATION_ANCESTRY" }
  $deltaNames = @(git -C $RepoRoot diff --name-only $ExecutableCommit $DryRunAuthorizationPublication)
  if ($deltaNames.Count -ne 1 -or $deltaNames[0] -ne $AuthRel) {
    throw ("DRY_RUN_AUTHORIZATION_ALLOWLIST: " + ($deltaNames -join ","))
  }
  $dryAllowJs = Join-Path $RepoRoot "scripts/security/ra-pro-accounting-automation-corrective-dry-run-authorization.js"
  $dryAllowProbe = Start-Process -FilePath $nodeExe -ArgumentList @(
    "-e",
    "require(process.argv[1]).assertDryRunPublicationAllowlist({executable:process.argv[2],publication:process.argv[3],cwd:process.argv[4]})",
    $dryAllowJs,
    $ExecutableCommit,
    $DryRunAuthorizationPublication,
    $RepoRoot
  ) -Wait -PassThru -NoNewWindow -WorkingDirectory $RepoRoot
  if ($dryAllowProbe.ExitCode -ne 0) {
    throw "DRY_RUN_AUTHORIZATION_ALLOWLIST: semantic delta rejected before SecureString"
  }
  $AuthorizationBlobOid = (Get-GitBlobOid "${DryRunAuthorizationPublication}:${AuthRel}").ToLowerInvariant()
  $ExpectedBundleOid = ([string]$dryRecord.bundle.oid).ToLowerInvariant()

  # Executable tip is explicit — never infer authority from mutable HEAD.
  $executionTip = $ExecutableCommit
  $ceremonySeal = Get-CommittedCeremonySeal -Tip $ExecutableCommit -RelPath $CeremonyRel
  $bundleBytes = Get-GitBlobBytes "${ExecutableCommit}:${BundleRel}"
  $bundleOid = Get-GitBlobOid "${ExecutableCommit}:${BundleRel}"
  $bundleSha = Get-Sha256Bytes $bundleBytes
  if ($bundleOid.ToLowerInvariant() -ne $ExpectedBundleOid) {
    throw "DRY_RUN_AUTHORIZATION_BUNDLE_MISMATCH: publication seal does not match executable tip blob"
  }
  $bundleSeal = [ordered]@{
    path = $BundleRel
    oid = $bundleOid
    sha256 = $bundleSha
    bytes = [int]$bundleBytes.Length
  }

  [IO.File]::WriteAllBytes($BundleFile, $bundleBytes)
  $rb = [IO.File]::ReadAllBytes($BundleFile)
  if ((Get-Sha256Bytes $rb) -ne $bundleSha) { throw "BUNDLE_MATERIALIZE_MISMATCH" }

  [IO.File]::WriteAllBytes($EvidenceModFile, (Get-GitBlobBytes "${ExecutableCommit}:${EvidenceModRel}"))
  [IO.File]::WriteAllBytes($DecodeFile, (Get-GitBlobBytes "${ExecutableCommit}:${DecodeRel}"))
  [IO.File]::WriteAllBytes($ReceiptModFile, (Get-GitBlobBytes "${ExecutableCommit}:${ReceiptModRel}"))

  Write-Host "Paste Session Pooler URL into SecureString only. Never into chat."
  Write-Host ("Channel: " + $DbEnv)
  $secure = Read-Host -Prompt $DbEnv -AsSecureString
  if ($null -eq $secure -or $secure.Length -le 0) { throw "BLOCKED_CREDENTIAL_UNAVAILABLE" }

  # Marker only after SecureString acquisition, before credential transfer / Node / DB.
  $markerPath = New-CorrectiveDryRunMarkerAtomic -Executable $ExecutableCommit -AttemptId $AttemptId -OutDir $EvidenceOutDir -ExecutableAuthorityPublication $ExecutableAuthorityPublication -ExecutableAuthorityBlobOid $ExpectExecutableAuthorityBlobOid

  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  if ([string]::IsNullOrWhiteSpace($plain)) { throw "BLOCKED_CREDENTIAL_UNAVAILABLE" }
  Set-Item -Path ("Env:" + $DbEnv) -Value $plain

  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = (Get-Command node.exe).Source
  # --executable-commit / --expect-executable are rechecks only; trust came from exe-auth + dry-run pubs.
  $psi.Arguments = (
    "`"$BundleFile`" --dry-run" +
    " --executable-authority-publication $ExecutableAuthorityPublication" +
    " --expect-executable-authority-blob-oid $ExpectExecutableAuthorityBlobOid" +
    " --dry-run-authorization-publication $DryRunAuthorizationPublication" +
    " --expect-authorization-blob-oid $AuthorizationBlobOid" +
    " --expect-executable $ExecutableCommit" +
    " --expect-bundle-oid $ExpectedBundleOid" +
    " --expect-attempt-id $AttemptId"
  )
  $psi.WorkingDirectory = $RepoRoot
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  $psi.EnvironmentVariables[$DbEnv] = $plain
  $psi.EnvironmentVariables["GIT_CONFIG_COUNT"] = "1"
  $psi.EnvironmentVariables["GIT_CONFIG_KEY_0"] = "safe.directory"
  $psi.EnvironmentVariables["GIT_CONFIG_VALUE_0"] = $env:GIT_CONFIG_VALUE_0
  foreach ($f in @("DATABASE_URL", "RA_PRO_ACCOUNTING_AUTOMATION_APPLY_DATABASE_URL", "ENABLE_RA_PRO_ACCOUNTING_AUTOMATION")) {
    if ($psi.EnvironmentVariables.ContainsKey($f)) { [void]$psi.EnvironmentVariables.Remove($f) }
  }

  $childProcess = [Diagnostics.Process]::Start($psi)
  $childPid = [int]$childProcess.Id
  $ms = New-Object IO.MemoryStream
  $childProcess.StandardOutput.BaseStream.CopyTo($ms)
  $stderr = $childProcess.StandardError.ReadToEnd()
  if (-not $childProcess.WaitForExit(180000)) {
    try { $childProcess.Kill() } catch {}
    throw "NODE_DRY_RUN_TIMEOUT"
  }
  $nodeExit = $childProcess.ExitCode
  $stdoutBytes = $ms.ToArray()
  [IO.File]::WriteAllBytes($RawPath, $stdoutBytes)
  if (-not [string]::IsNullOrWhiteSpace($stderr)) {
    Write-Host ("STDERR_LEN=" + $stderr.Length)
  }

  $node = (Get-Command node.exe).Source
  $decodeOut = Join-Path $EvidenceOutDir "decode-out.json"
  $decodeErr = Join-Path $EvidenceOutDir "decode-err.txt"
  $decodeArgs = "`"$DecodeFile`" `"$EvidenceModFile`" `"$RawPath`" `"$EvidencePath`""
  $decode = Start-Process -FilePath $node -ArgumentList $decodeArgs -Wait -PassThru -NoNewWindow `
    -RedirectStandardOutput $decodeOut -RedirectStandardError $decodeErr
  $decodeJson = Get-Content -LiteralPath $decodeOut -Raw
  $decoded = $decodeJson | ConvertFrom-Json
  if (-not $decoded.ok) {
    throw ("CORRECTIVE_EVIDENCE_FRAME_INVALID:" + [string]$decoded.code)
  }
  $retainOk = $true
  $retainedSha = [string]$decoded.sha256
  $retainedBytes = [int]$decoded.bytes
  Write-Host ("EVIDENCE_PATH=" + $EvidencePath)
  Write-Host ("EVIDENCE_SHA256=" + $retainedSha)
  Write-Host ("EVIDENCE_BYTES=" + $retainedBytes)
  Write-Host ("NODE_EXIT=" + $nodeExit)
}
catch {
  Add-CleanupError $cleanupErrors ("CEREMONY_RUN:" + $_.Exception.Message)
  Write-Host ("CEREMONY_ERROR=" + $_.Exception.Message)
}
finally {
  # --- Measured cleanup (continue addressing all resources; never rewrite sealed evidence) ---
  $credentialCleared = $false
  $securestringZeroFreed = $false
  $rawStdoutRemoved = $false
  $temporaryBundleRemoved = $false
  $decodeSidecarRemoved = $false
  $childTerminated = $false
  $orphanCheckPassed = $false
  $finalEvidencePresent = $false
  $finalEvidenceShaUnchanged = $false
  $finalEvidenceBytesUnchanged = $false

  # Child termination
  try {
    if ($null -ne $childProcess) {
      if (-not $childProcess.HasExited) {
        try { $childProcess.Kill() } catch {
          Add-CleanupError $cleanupErrors "CHILD_KILL_FAILED"
        }
        Start-Sleep -Milliseconds 200
      }
      $childTerminated = [bool]$childProcess.HasExited
      if (-not $childTerminated) { Add-CleanupError $cleanupErrors "CHILD_NOT_TERMINATED" }
    } else {
      $childTerminated = $true
    }
  } catch {
    $childTerminated = $false
    Add-CleanupError $cleanupErrors "CHILD_TERMINATION_CHECK_FAILED"
  }

  # Credential / SecureString
  try {
    if ($bstr -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) | Out-Null
      $bstr = [IntPtr]::Zero
    }
    if ($null -ne $secure) { $secure.Dispose(); $secure = $null }
    $plain = $null
    $securestringZeroFreed = ($bstr -eq [IntPtr]::Zero -and $null -eq $secure)
  } catch {
    $securestringZeroFreed = $false
    Add-CleanupError $cleanupErrors "SECURESTRING_ZERO_FREE_FAILED"
  }
  try {
    $ep = "Env:" + $DbEnv
    if (Test-Path -LiteralPath $ep) { Remove-Item -LiteralPath $ep -Force }
    $credentialCleared = -not [bool][Environment]::GetEnvironmentVariable($DbEnv, "Process")
    if (-not $credentialCleared) { Add-CleanupError $cleanupErrors "CREDENTIAL_ENV_STILL_PRESENT" }
  } catch {
    $credentialCleared = $false
    Add-CleanupError $cleanupErrors "CREDENTIAL_CLEAR_FAILED"
  }

  # Raw stdout
  try {
    if (Test-Path -LiteralPath $RawPath) {
      Remove-Item -LiteralPath $RawPath -Force -ErrorAction Stop
    }
    $rawStdoutRemoved = -not (Test-Path -LiteralPath $RawPath)
    if (-not $rawStdoutRemoved) { Add-CleanupError $cleanupErrors "RAW_STDOUT_STILL_PRESENT" }
  } catch {
    $rawStdoutRemoved = $false
    Add-CleanupError $cleanupErrors "RAW_STDOUT_REMOVE_FAILED"
  }

  # Temp bundle dir
  try {
    if (Test-Path -LiteralPath $BundleDir) {
      Remove-Item -LiteralPath $BundleDir -Recurse -Force -ErrorAction Stop
    }
    $temporaryBundleRemoved = -not (Test-Path -LiteralPath $BundleDir)
    if (-not $temporaryBundleRemoved) { Add-CleanupError $cleanupErrors "TEMP_BUNDLE_STILL_PRESENT" }
  } catch {
    $temporaryBundleRemoved = $false
    Add-CleanupError $cleanupErrors "TEMP_BUNDLE_REMOVE_FAILED"
  }

  # Decode / evidence / receipt sidecars + measurements (non-authoritative)
  try {
    $sidecars = @(
      "decode-frame.js",
      "corrective-evidence.js",
      "ceremony-receipt.js",
      "decode-out.json",
      "decode-err.txt",
      "measurements.json"
    )
    foreach ($f in $sidecars) {
      $p = Join-Path $EvidenceOutDir $f
      if (Test-Path -LiteralPath $p) {
        Remove-Item -LiteralPath $p -Force -ErrorAction Stop
      }
    }
    $left = @()
    foreach ($f in $sidecars) {
      $p = Join-Path $EvidenceOutDir $f
      if (Test-Path -LiteralPath $p) { $left += $f }
    }
    $decodeSidecarRemoved = ($left.Count -eq 0)
    if (-not $decodeSidecarRemoved) { Add-CleanupError $cleanupErrors "DECODE_SIDECAR_STILL_PRESENT" }
  } catch {
    $decodeSidecarRemoved = $false
    Add-CleanupError $cleanupErrors "DECODE_SIDECAR_REMOVE_FAILED"
  }

  # Orphan check: tracked child pid must not remain
  try {
    if ($childPid -gt 0) {
      $still = Get-Process -Id $childPid -ErrorAction SilentlyContinue
      $orphanCheckPassed = ($null -eq $still)
      if (-not $orphanCheckPassed) { Add-CleanupError $cleanupErrors "ORPHAN_CHILD_PID_REMAINS" }
    } else {
      $orphanCheckPassed = $true
    }
  } catch {
    $orphanCheckPassed = $false
    Add-CleanupError $cleanupErrors "ORPHAN_CHECK_FAILED"
  }

  # Final evidence present + digest unchanged (never rewrite sealed evidence)
  try {
    if ($retainOk -and (Test-Path -LiteralPath $EvidencePath)) {
      $finalEvidencePresent = $true
      $evBytes = [IO.File]::ReadAllBytes($EvidencePath)
      $evSha = Get-Sha256Bytes $evBytes
      $finalEvidenceShaUnchanged = ($evSha -eq $retainedSha)
      $finalEvidenceBytesUnchanged = ($evBytes.Length -eq $retainedBytes)
      if (-not $finalEvidenceShaUnchanged) { Add-CleanupError $cleanupErrors "EVIDENCE_SHA_CHANGED" }
      if (-not $finalEvidenceBytesUnchanged) { Add-CleanupError $cleanupErrors "EVIDENCE_BYTES_CHANGED" }
    } else {
      $finalEvidencePresent = $false
      if ($retainOk) { Add-CleanupError $cleanupErrors "FINAL_EVIDENCE_MISSING" }
    }
  } catch {
    $finalEvidencePresent = $false
    $finalEvidenceShaUnchanged = $false
    $finalEvidenceBytesUnchanged = $false
    Add-CleanupError $cleanupErrors "FINAL_EVIDENCE_CHECK_FAILED"
  }

  $cleanupCompleted = (
    $credentialCleared -and
    $securestringZeroFreed -and
    $rawStdoutRemoved -and
    $temporaryBundleRemoved -and
    $decodeSidecarRemoved -and
    $childTerminated -and
    $orphanCheckPassed -and
    $finalEvidencePresent -and
    $finalEvidenceShaUnchanged -and
    $finalEvidenceBytesUnchanged -and
    ($cleanupErrors.Count -eq 0)
  )

  # Tip seals for reporting (from git cat-file only)
  if ($null -eq $ceremonySeal) {
    try { $ceremonySeal = Get-CommittedCeremonySeal -Tip $ExecutableCommit -RelPath $CeremonyRel } catch {
      Add-CleanupError $cleanupErrors ("CEREMONY_SEAL:" + $_.Exception.Message)
      $ceremonySeal = [ordered]@{ path = $CeremonyRel; oid = ("0" * 40); sha256 = ("0" * 64); bytes = 0 }
    }
  }
  if ($null -eq $bundleSeal) {
    try {
      $bb = Get-GitBlobBytes "${ExecutableCommit}:${BundleRel}"
      $bundleSeal = [ordered]@{
        path = $BundleRel
        oid = (Get-GitBlobOid "${ExecutableCommit}:${BundleRel}")
        sha256 = (Get-Sha256Bytes $bb)
        bytes = [int]$bb.Length
      }
    } catch {
      Add-CleanupError $cleanupErrors ("BUNDLE_SEAL:" + $_.Exception.Message)
      $bundleSeal = [ordered]@{ path = $BundleRel; oid = ("0" * 40); sha256 = ("0" * 64); bytes = 0 }
    }
  }
  if ([string]::IsNullOrWhiteSpace($executionTip)) {
    $executionTip = $ExecutableCommit
  }

  # Non-authoritative measurements for receipt CLI (written then removed as sidecar)
  $frameValid = [bool]($retainOk -and $finalEvidencePresent -and $finalEvidenceShaUnchanged -and $finalEvidenceBytesUnchanged)
  $measurements = [ordered]@{
    frame_valid = $frameValid
    sealed_evidence_sha256 = $(if ($retainedSha) { $retainedSha } else { ("0" * 64) })
    sealed_evidence_bytes = $(if ($retainedBytes -gt 0) { [int]$retainedBytes } else { 0 })
    execution_tip = $executionTip
    pin_tip = $EvidenceAuthorityCommit
    dry_run_authorization_publication_commit = $DryRunAuthorizationPublication
    dry_run_authorization_publication_blob_oid = $(if ($AuthorizationBlobOid) { $AuthorizationBlobOid } else { ("0" * 40) })
    executable_authority_publication_commit = $ExecutableAuthorityPublication
    executable_authority_publication_blob_oid = $ExpectExecutableAuthorityBlobOid
    dry_run_attempt_id = $(if ($AttemptId) { $AttemptId } else { "" })
    ceremony_path = [string]$ceremonySeal.path
    ceremony_oid = [string]$ceremonySeal.oid
    ceremony_sha256 = [string]$ceremonySeal.sha256
    ceremony_bytes = [int]$ceremonySeal.bytes
    bundle_path = [string]$bundleSeal.path
    bundle_oid = [string]$bundleSeal.oid
    bundle_sha256 = [string]$bundleSeal.sha256
    bundle_bytes = [int]$bundleSeal.bytes
    node_exit = [int]$nodeExit
    credential_cleared = [bool]$credentialCleared
    securestring_zero_freed = [bool]$securestringZeroFreed
    raw_stdout_removed = [bool]$rawStdoutRemoved
    temporary_bundle_removed = [bool]$temporaryBundleRemoved
    decode_sidecar_removed = [bool]$decodeSidecarRemoved
    child_terminated = [bool]$childTerminated
    orphan_check_passed = [bool]$orphanCheckPassed
    final_evidence_present = [bool]$finalEvidencePresent
    final_evidence_sha256_unchanged = [bool]$finalEvidenceShaUnchanged
    final_evidence_bytes_unchanged = [bool]$finalEvidenceBytesUnchanged
    cleanup_error_codes = @($cleanupErrors.ToArray())
    cleanup_completed = [bool]$cleanupCompleted
  }

  $pinReady = $false
  $receiptSha = $null
  $receiptBytes = 0

  # Receipt write requires tip-bound receipt module; re-materialize from executable tip if sidecar was removed
  try {
    $receiptJs = Join-Path $EvidenceOutDir "ceremony-receipt.js"
    if (-not (Test-Path -LiteralPath $receiptJs)) {
      [IO.File]::WriteAllBytes($receiptJs, (Get-GitBlobBytes "${ExecutableCommit}:${ReceiptModRel}"))
    }
    # Serialize measurements via Node for UTF-8 LF JSON (non-authoritative)
    $measTmpPs = Join-Path $EvidenceOutDir "measurements.ps.json"
    [IO.File]::WriteAllText($measTmpPs, (($measurements | ConvertTo-Json -Depth 8) + "`n"))
    $nodeExe = (Get-Command node.exe).Source
    $normalizeScript = @"
const fs = require('fs');
const raw = fs.readFileSync(process.argv[1], 'utf8').replace(/^\uFEFF/, '');
const obj = JSON.parse(raw);
fs.writeFileSync(process.argv[2], JSON.stringify(obj) + '\n', 'utf8');
"@
    $normFile = Join-Path $EvidenceOutDir "_normalize-meas.js"
    [IO.File]::WriteAllText($normFile, $normalizeScript)
    & $nodeExe $normFile $measTmpPs $MeasurementsPath | Out-Null
    Remove-Item -LiteralPath $normFile -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $measTmpPs -Force -ErrorAction SilentlyContinue

    if ($retainOk -and (Test-Path -LiteralPath $EvidencePath)) {
      $receiptOut = & $nodeExe $receiptJs write $MeasurementsPath $EvidencePath $ReceiptPath 2>&1
      $receiptLine = ($receiptOut | Select-Object -Last 1 | Out-String).Trim()
      try {
        $receiptResult = $receiptLine | ConvertFrom-Json
        $pinReady = [bool]$receiptResult.pin_ready
        if ($receiptResult.sha256) { $receiptSha = [string]$receiptResult.sha256 }
        if ($receiptResult.bytes) { $receiptBytes = [int]$receiptResult.bytes }
        if (-not $pinReady -and $receiptResult.code) {
          Add-CleanupError $cleanupErrors ([string]$receiptResult.code)
        }
        Write-Host ("RECEIPT_PIN_READY=" + $pinReady)
        Write-Host ("RECEIPT_SHA256=" + $receiptSha)
        Write-Host ("RECEIPT_BYTES=" + $receiptBytes)
      } catch {
        Add-CleanupError $cleanupErrors "RECEIPT_CLI_PARSE_FAILED"
        $pinReady = $false
      }
    } else {
      Add-CleanupError $cleanupErrors "RECEIPT_SKIPPED_NO_EVIDENCE"
      $pinReady = $false
    }
  } catch {
    Add-CleanupError $cleanupErrors ("RECEIPT_WRITE:" + $_.Exception.Message)
    $pinReady = $false
  }

  # Remove remaining sidecars used for receipt write (measurements, receipt module, normalize leftovers)
  foreach ($f in @("measurements.json", "ceremony-receipt.js", "_normalize-meas.js", "measurements.ps.json")) {
    $p = Join-Path $EvidenceOutDir $f
    if (Test-Path -LiteralPath $p) {
      try { Remove-Item -LiteralPath $p -Force -ErrorAction Stop } catch {
        Add-CleanupError $cleanupErrors "POST_RECEIPT_SIDECAR_REMOVE_FAILED"
        $pinReady = $false
      }
    }
  }

  # Optional non-authoritative SUMMARY — binds evidence + receipt hashes only (never sealed frame body)
  try {
    $summary = [ordered]@{
      protocol = "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_DRY_RUN_CEREMONY_SUMMARY_V1"
      sealed_evidence_path = $EvidencePath
      sealed_evidence_sha256 = $(if ($retainedSha) { $retainedSha } else { $null })
      sealed_evidence_bytes = $(if ($retainedBytes -gt 0) { [int]$retainedBytes } else { $null })
      ceremony_receipt_path = $ReceiptPath
      ceremony_receipt_sha256 = $receiptSha
      ceremony_receipt_bytes = $(if ($receiptBytes -gt 0) { [int]$receiptBytes } else { $null })
      pin_ready = [bool]$pinReady
      cleanup_completed = [bool]$cleanupCompleted
      node_exit = [int]$nodeExit
      pin_tip = $PinTip
      apply_authorized = $false
      production_apply_authorization_status = "UNPUBLISHED"
      note = "non-authoritative; authority is evidence frame + ceremony receipt bytes"
    }
    [IO.File]::WriteAllText($SummaryPath, (($summary | ConvertTo-Json -Depth 5) + "`n"))
  } catch {
    # Summary is optional / non-authoritative
  }

  # Console may print sanitized fields (non-authoritative)
  Write-Host ("CLEANUP_COMPLETED=" + $cleanupCompleted)
  Write-Host ("PIN_READY=" + $pinReady)
  if ($cleanupErrors.Count -gt 0) {
    Write-Host ("CLEANUP_ERROR_CODES=" + ($cleanupErrors -join ","))
  }

  # Exit: pin_ready => 0 (or node_exit if node failed). Any cleanup failure => nonzero.
  if ($pinReady) {
    if ($nodeExit -ne 0 -and $nodeExit -ne -1) { exit $nodeExit }
    exit 0
  }
  if (-not $retainOk) { exit 2 }
  if ($nodeExit -ne 0 -and $nodeExit -ne -1) { exit $nodeExit }
  exit 1
}
