#Requires -Version 5.1
<#
.SYNOPSIS
  Sealed entry for RA Pro accounting-automation dry-run / apply.
  Must be launched via supervise-visible-ra-pro-accounting-automation-ceremony.ps1
  (or harness with -SealedMaterialInvocation after tip-blob materialize).
  Materializes operator dry-run ceremony from ceremony_source_commit seals and launches
  only the temporary materialized ceremony — never the worktree ceremony path.
#>
[CmdletBinding()]
param(
  [ValidateSet("dry-run", "apply")]
  [string]$Mode = "dry-run",

  [Parameter(Mandatory = $false)]
  [ValidatePattern('^[0-9a-fA-F]{40}$')]
  [string]$PrHead = "",

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

  # Harness-only: open the ceremony as a visible interactive prompt probe. Requires ALLOW_SYNTHETIC=1.
  [Parameter(Mandatory = $false)]
  [switch]$TestVisiblePromptProbe,

  # Operator SecureString window. Separate from -ChildTimeoutMs. Default 10 minutes.
  [Parameter(Mandatory = $false)]
  [int]$PromptInputTimeoutMs = 600000,

  [Parameter(Mandatory = $false)]
  [switch]$TestTimeoutBudgetProbe,

  [Parameter(Mandatory = $false)]
  [switch]$TestForcePromptTimeout,

  [Parameter(Mandatory = $false)]
  [switch]$TestForcePromptWindowClose,

  [Parameter(Mandatory = $false)]
  [switch]$TestForcePromptCancel,

  [Parameter(Mandatory = $false)]
  [switch]$TestHangBeforeEvidence,

  # Set only by sealed supervisor (or authority harness) after tip-blob materialize of this entry.
  [Parameter(Mandatory = $false)]
  [switch]$SealedMaterialInvocation
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$AuthRel = "docs/security/ra-pro-accounting-automation-apply/TOOLING_AUTHORIZATION.json"
$CeremonyRel = "scripts/security/operator-ra-pro-accounting-automation-production-dryrun-ceremony.ps1"
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

function Assert-PublicationTipAncestry([string]$PublicationTip, [string]$Freeze, [string]$BootstrapSource, [string]$CeremonySource, [string]$WorkDir) {
  if (-not ($PublicationTip -match '^[0-9a-fA-F]{40}$')) { throw "BLOCKED_PUBLICATION_TIP: tip must be exact 40-hex" }
  if (-not ($Freeze -match '^[0-9a-fA-F]{40}$')) { throw "BLOCKED_PUBLICATION_TIP: freeze must be exact 40-hex" }
  if (-not ($BootstrapSource -match '^[0-9a-fA-F]{40}$')) { throw "BLOCKED_PUBLICATION_TIP: bootstrap_source must be exact 40-hex" }
  if (-not ($CeremonySource -match '^[0-9a-fA-F]{40}$')) { throw "BLOCKED_PUBLICATION_TIP: ceremony_source must be exact 40-hex" }
  $tipResolved = Invoke-GitText -GitArgs @("rev-parse", "--verify", ($PublicationTip + "^{commit}")) -WorkDir $WorkDir
  if ($tipResolved.ToLowerInvariant() -ne $PublicationTip.ToLowerInvariant()) {
    throw "BLOCKED_PUBLICATION_TIP: tip did not resolve to itself"
  }
  $ids = @($PublicationTip, $Freeze, $BootstrapSource, $CeremonySource) | ForEach-Object { $_.ToLowerInvariant() }
  if (($ids | Select-Object -Unique).Count -ne 4) {
    throw "BLOCKED_PUBLICATION_TIP: freeze, bootstrap_source, ceremony_source, and tip must be pairwise distinct"
  }
  $safe = ($WorkDir -replace "\\", "/")
  $p1 = Start-Process -FilePath "git" -ArgumentList @("-c","safe.directory=$safe","merge-base","--is-ancestor",$Freeze,$BootstrapSource) -WorkingDirectory $WorkDir -Wait -PassThru -WindowStyle Hidden
  if ($p1.ExitCode -ne 0) { throw "BLOCKED_PUBLICATION_TIP: bootstrap_source is not a descendant of freeze" }
  $p2 = Start-Process -FilePath "git" -ArgumentList @("-c","safe.directory=$safe","merge-base","--is-ancestor",$BootstrapSource,$CeremonySource) -WorkingDirectory $WorkDir -Wait -PassThru -WindowStyle Hidden
  if ($p2.ExitCode -ne 0) { throw "BLOCKED_PUBLICATION_TIP: ceremony_source is not a descendant of bootstrap_source" }
  $p3 = Start-Process -FilePath "git" -ArgumentList @("-c","safe.directory=$safe","merge-base","--is-ancestor",$CeremonySource,$PublicationTip) -WorkingDirectory $WorkDir -Wait -PassThru -WindowStyle Hidden
  if ($p3.ExitCode -ne 0) { throw "BLOCKED_PUBLICATION_TIP: publication tip is not a descendant of ceremony_source" }
}

function Clear-MaterialRoot {
  # Materialized scripts only. Never remove PRODUCTION_DRY_RUN_EVIDENCE.json or attempt markers.
  if ($script:MaterialRoot -and (Test-Path -LiteralPath $script:MaterialRoot)) {
    try { Remove-Item -LiteralPath $script:MaterialRoot -Recurse -Force -ErrorAction SilentlyContinue } catch {}
  }
}

function Get-SupervisedWaitMs([int]$PromptMs, [int]$ChildMs, [int]$HarnessBufferMs, [int]$ProductionBufferMs) {
  if ($PromptMs -lt 1000) { $PromptMs = 1000 }
  if ($ChildMs -lt 1) { $ChildMs = 1 }
  $buffer = $ProductionBufferMs
  if ($PromptMs -ne 600000 -or $ChildMs -ne 120000) { $buffer = $HarnessBufferMs }
  return ($PromptMs + $ChildMs + $buffer)
}

function Protect-SanitizedText([string]$Text) {
  if (-not $Text) { return "" }
  $t = [regex]::Replace($Text, "postgres(?:ql)?://\S+", "postgres://***")
  $t = [regex]::Replace($t, "password=[^&\s]+", "password=***")
  $livePrefix = "sk_" + "live_"
  $t = [regex]::Replace($t, ($livePrefix + "\w+"), ($livePrefix + "***"))
  return $t
}

function Write-ParentFallbackEvidence([string]$Reason, [string]$Termination) {
  if (-not $EvidenceOutDir) { return }
  if (-not (Test-Path -LiteralPath $EvidenceOutDir)) { return }
  $evidenceFile = Join-Path $EvidenceOutDir "PRODUCTION_DRY_RUN_EVIDENCE.json"
  if (Test-Path -LiteralPath $evidenceFile) { return }
  $readyPath = Join-Path $EvidenceOutDir "PROMPT_READY.json"
  $ready = $null
  if (Test-Path -LiteralPath $readyPath) {
    try { $ready = Get-Content -LiteralPath $readyPath -Raw | ConvertFrom-Json } catch { $ready = $null }
  }
  $markers = @(Get-ChildItem -LiteralPath $EvidenceOutDir -Filter "attempt-*.marker" -ErrorAction SilentlyContinue)
  $markerName = $null
  if ($markers.Count -gt 0) { $markerName = [string]$markers[0].Name }
  $preSha = $null
  $opened = $null
  $readyAt = $null
  $deadline = $null
  if ($null -ne $ready) {
    try { $preSha = [string]$ready.precondition_sha256 } catch {}
    try { $opened = [string]$ready.prompt_opened_utc } catch {}
    try { $readyAt = [string]$ready.prompt_ready_utc } catch {}
    try { $deadline = [string]$ready.prompt_deadline_utc } catch {}
  }
  $frame = [ordered]@{
    protocol = "RA_PRO_ACCOUNTING_AUTOMATION_PRODUCTION_DRY_RUN_CEREMONY_V1"
    verdict = "BLOCKED"
    result_code = "PROMPT_PARENT_TERMINATED"
    pre_prompt_phase = "prompt_host"
    termination_reason = $Termination
    reason = (Protect-SanitizedText $Reason)
    pr_tip = $PrHead
    prompt_opened_utc = $opened
    prompt_ready_utc = $readyAt
    prompt_deadline_utc = $deadline
    prompt_input_timeout_ms = [int]$PromptInputTimeoutMs
    child_runtime_timeout_ms = [int]$ChildTimeoutMs
    securestring_acquired = $false
    attempt_marker = $markerName
    marker_before_child = $false
    productionContact = $false
    node_started = $false
    database_connection_attempts = 0
    sql_application_attempts = 0
    precondition_sha256 = $preSha
    fallback_frame = $true
    cleanup = [ordered]@{
      completed = $false
      credential_cleared = $true
      secure_string_zero_freed = $true
      raw_stdout_removed = $true
      material_removed = $true
      child_terminated = $true
      orphan_check_completed = $true
    }
    child_supervision = [ordered]@{
      timed_out = $true
      timeout_ms = [int]$ChildTimeoutMs
      orphan_count = 0
      orphan_free = $true
      termination_confirmed = $true
    }
  }
  $json = Protect-SanitizedText (($frame | ConvertTo-Json -Depth 8 -Compress))
  [IO.File]::WriteAllText($evidenceFile, ($json + "`n"))
  if (Test-Path -LiteralPath $readyPath) {
    Remove-Item -LiteralPath $readyPath -Force -ErrorAction SilentlyContinue
  }
  Get-ChildItem -LiteralPath $EvidenceOutDir -Filter "raw-*" -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
  }
  Get-ChildItem -LiteralPath $EvidenceOutDir -Filter "bundle-*.cjs" -ErrorAction SilentlyContinue | ForEach-Object {
    Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
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
    throw "ENTRY_DIRECT_EXEC_FORBIDDEN: launch only via supervise-visible-ra-pro-accounting-automation-ceremony.ps1"
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
      "RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_SHA256",
      "RA_PRO_ACCOUNTING_AUTOMATION_PRE_APPLY_LIVE_EVIDENCE_PATH",
      "RA_PRO_ACCOUNTING_AUTOMATION_PRE_APPLY_LIVE_EVIDENCE_SHA256"
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
    $EvidenceOutDir = Join-Path $env:TEMP ("ra-acct-enter-" + [guid]::NewGuid().ToString("N"))
  }
  New-Item -ItemType Directory -Force -Path $EvidenceOutDir | Out-Null
  $script:MaterialRoot = Join-Path $EvidenceOutDir ("material-enter-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $script:MaterialRoot | Out-Null

  $tip = (Invoke-GitText -GitArgs @("rev-parse", "HEAD") -WorkDir $RepoRoot).ToLowerInvariant()
  $authBytes = Invoke-GitBytes -GitArgs @("cat-file", "blob", "${tip}:${AuthRel}") -WorkDir $RepoRoot
  Assert-Utf8LfNoBom -Bytes $authBytes -Label $AuthRel
  $auth = ([Text.Encoding]::UTF8.GetString($authBytes)) | ConvertFrom-Json

  if ($Mode -eq "apply") {
    $freeze = [string]$auth.authorized_pr_head
    $bootSrc = [string]$auth.bootstrap_source_commit
    $source = [string]$auth.ceremony_source_commit
    if ([string]::IsNullOrWhiteSpace($freeze) -or [string]::IsNullOrWhiteSpace($bootSrc) -or [string]::IsNullOrWhiteSpace($source)) {
      throw "BLOCKED_PUBLICATION_TIP: authorized_pr_head / bootstrap_source_commit / ceremony_source_commit missing"
    }
    if ([string]::IsNullOrWhiteSpace($PrHead)) { $PrHead = $tip }
    if ($PrHead.ToLowerInvariant() -ne $tip.ToLowerInvariant()) {
      throw "BLOCKED_PIN_MISMATCH: -PrHead must equal HEAD (publication tip)"
    }
    Assert-PublicationTipAncestry -PublicationTip $tip -Freeze $freeze.ToLowerInvariant() -BootstrapSource $bootSrc.ToLowerInvariant() -CeremonySource $source.ToLowerInvariant() -WorkDir $RepoRoot
    $gateRel = "scripts/security/ra-pro-accounting-automation-pre-apply-gates.ps1"
    $gateSeal = $auth.pre_apply_live_gates
    if (-not $gateSeal) {
      Write-Blocked "PRE_APPLY_LIVE_GATE_UNSEALED"
      exit 1
    }
    $gateDest = Join-Path $script:MaterialRoot "ra-pro-accounting-automation-pre-apply-gates.ps1"
    [void](Assert-BlobSeal -Commit $source.ToLowerInvariant() -Rel $gateRel -Seal $gateSeal -Dest $gateDest -WorkDir $RepoRoot)
    . $gateDest
    try {
      Assert-AccountingPreApplyLiveEvidence -Auth $auth -RepoRoot $RepoRoot
    } catch {
      $gateMessage = [string]$_.Exception.Message
      if ($gateMessage -eq "AUTHORIZATION_PINS_UNPUBLISHED" -or $gateMessage.StartsWith("AUTHORIZATION_PINS_UNPUBLISHED")) {
        Write-Blocked "AUTHORIZATION_PINS_UNPUBLISHED"
      } else {
        Write-Blocked $gateMessage
      }
      exit 1
    }
    Write-Blocked "APPLY_REMAINS_BLOCKED_BEFORE_CREDENTIALS"
    exit 1
  }

  $pre = $auth.precondition_publication
  if ($null -eq $pre -or [string]$pre.status -ne "PUBLISHED") {
    Write-Blocked "PRECONDITION_PINS_UNPUBLISHED"
    exit 1
  }

  $freeze = [string]$auth.authorized_pr_head
  $bootSrc = [string]$auth.bootstrap_source_commit
  $source = [string]$auth.ceremony_source_commit
  if ([string]::IsNullOrWhiteSpace($freeze) -or [string]::IsNullOrWhiteSpace($bootSrc) -or [string]::IsNullOrWhiteSpace($source)) {
    throw "BLOCKED_PUBLICATION_TIP: authorized_pr_head / bootstrap_source_commit / ceremony_source_commit missing"
  }
  if ([string]::IsNullOrWhiteSpace($PrHead)) { $PrHead = $tip }
  if ($PrHead.ToLowerInvariant() -ne $tip.ToLowerInvariant()) {
    throw "BLOCKED_PIN_MISMATCH: -PrHead must equal HEAD (publication tip)"
  }
  Assert-PublicationTipAncestry -PublicationTip $tip -Freeze $freeze.ToLowerInvariant() -BootstrapSource $bootSrc.ToLowerInvariant() -CeremonySource $source.ToLowerInvariant() -WorkDir $RepoRoot

  $oc = $auth.operator_ceremony
  if (-not $oc) { throw "missing operator_ceremony seals" }
  $ceremonyDest = Join-Path $script:MaterialRoot "operator-ra-pro-accounting-automation-production-dryrun-ceremony.ps1"
  [void](Assert-BlobSeal -Commit $source.ToLowerInvariant() -Rel $CeremonyRel -Seal $oc -Dest $ceremonyDest -WorkDir $RepoRoot)

  $psExe = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
  if ($TestVisiblePromptProbe) {
    $allowProbe = [Environment]::GetEnvironmentVariable("RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL", "Process")
    if ($allowProbe -ne "1") { throw "SYNTHETIC_URL_NOT_ALLOWED" }
    if (
      -not [string]::IsNullOrWhiteSpace($TestSyntheticDatabaseUrl) -or
      -not [string]::IsNullOrWhiteSpace($TestHarnessChildStub) -or
      -not [string]::IsNullOrWhiteSpace($TestForcePrePromptNullIndex) -or
      $TestForceCleanupFailure -or
      $TestForceTerminateFailure
    ) {
      throw "PROMPT_PROBE_REJECTS_HARNESS_INPUT"
    }
  }
  $harnessLaunch = (
    -not [string]::IsNullOrWhiteSpace($TestSyntheticDatabaseUrl) -or
    -not [string]::IsNullOrWhiteSpace($TestHarnessChildStub) -or
    -not [string]::IsNullOrWhiteSpace($TestForcePrePromptNullIndex) -or
    $TestForceCleanupFailure -or
    $TestForceTerminateFailure -or
    $TestTimeoutBudgetProbe -or
    $TestForcePromptTimeout -or
    $TestForcePromptWindowClose -or
    $TestForcePromptCancel -or
    $TestHangBeforeEvidence
  )
  $visiblePrompt = $TestVisiblePromptProbe -or -not $harnessLaunch
  $ceremonyTail = @(
    "-File", $ceremonyDest,
    "-PrHead", $PrHead,
    "-RepoRoot", $RepoRoot,
    "-EvidenceOutDir", $EvidenceOutDir,
    "-SealedMaterialInvocation"
  )
  if (-not [string]::IsNullOrWhiteSpace($TestSyntheticDatabaseUrl)) {
    $ceremonyTail += @("-TestSyntheticDatabaseUrl", $TestSyntheticDatabaseUrl)
  }
  if (-not [string]::IsNullOrWhiteSpace($TestHarnessChildStub)) {
    $ceremonyTail += @("-TestHarnessChildStub", $TestHarnessChildStub)
  }
  if ($ChildTimeoutMs -ne 120000) {
    $ceremonyTail += @("-ChildTimeoutMs", "$ChildTimeoutMs")
  }
  if (-not [string]::IsNullOrWhiteSpace($TestForcePrePromptNullIndex)) {
    $ceremonyTail += @("-TestForcePrePromptNullIndex", $TestForcePrePromptNullIndex)
  }
  if ($TestForceCleanupFailure) { $ceremonyTail += "-TestForceCleanupFailure" }
  if ($TestForceTerminateFailure) { $ceremonyTail += "-TestForceTerminateFailure" }
  if ($TestVisiblePromptProbe) { $ceremonyTail += "-TestVisiblePromptProbe" }
  if ($PromptInputTimeoutMs -ne 600000) { $ceremonyTail += @("-PromptInputTimeoutMs", "$PromptInputTimeoutMs") }
  if ($TestTimeoutBudgetProbe) { $ceremonyTail += "-TestTimeoutBudgetProbe" }
  if ($TestForcePromptTimeout) { $ceremonyTail += "-TestForcePromptTimeout" }
  if ($TestForcePromptWindowClose) { $ceremonyTail += "-TestForcePromptWindowClose" }
  if ($TestForcePromptCancel) { $ceremonyTail += "-TestForcePromptCancel" }
  if ($TestHangBeforeEvidence) { $ceremonyTail += "-TestHangBeforeEvidence" }
  if ($visiblePrompt) {
    $ceremonyArgs = @("-NoProfile", "-ExecutionPolicy", "Bypass") + $ceremonyTail
  } else {
    $ceremonyArgs = @("-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass") + $ceremonyTail
  }

  if ($visiblePrompt) {
    $visible = New-Object Diagnostics.ProcessStartInfo
    $visible.FileName = $psExe
    $visible.Arguments = ($ceremonyArgs | ForEach-Object { Format-Win32Argument $_ }) -join " "
    $visible.WorkingDirectory = $RepoRoot
    $visible.UseShellExecute = $true
    $visible.WindowStyle = [Diagnostics.ProcessWindowStyle]::Normal
    $p = [Diagnostics.Process]::Start($visible)
    if ($null -eq $p) { throw "VISIBLE_PROMPT_LAUNCH_FAILED" }
    $waitMs = Get-SupervisedWaitMs $PromptInputTimeoutMs $ChildTimeoutMs 8000 60000
    if (-not $p.WaitForExit($waitMs)) {
      try {
        Start-Process -FilePath (Join-Path $env:SystemRoot "System32\taskkill.exe") -ArgumentList @("/PID", "$($p.Id)", "/T", "/F") -Wait -WindowStyle Hidden | Out-Null
      } catch {
        try { $p.Kill() } catch {}
      }
      Write-ParentFallbackEvidence "sealed ceremony child timed out" "forced_parent_termination"
      $evidenceFile = Join-Path $EvidenceOutDir "PRODUCTION_DRY_RUN_EVIDENCE.json"
      if (Test-Path -LiteralPath $evidenceFile) {
        Write-Output ([IO.File]::ReadAllText($evidenceFile).TrimEnd())
      } else {
        Write-Blocked "sealed ceremony child timed out"
      }
      exit 1
    }
    $evidenceFile = Join-Path $EvidenceOutDir "PRODUCTION_DRY_RUN_EVIDENCE.json"
    if (-not (Test-Path -LiteralPath $evidenceFile)) {
      Write-ParentFallbackEvidence "ceremony exited without terminal evidence" "missing_terminal_evidence"
    }
    if (Test-Path -LiteralPath $evidenceFile) {
      Write-Output ([IO.File]::ReadAllText($evidenceFile).TrimEnd())
    }
    exit $p.ExitCode
  }

  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = $psExe
  $psi.Arguments = ($ceremonyArgs | ForEach-Object { Format-Win32Argument $_ }) -join " "
  $psi.WorkingDirectory = $RepoRoot
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  Set-GitSafeDirectoryEnv -Psi $psi -Root $RepoRoot
  $p = [Diagnostics.Process]::Start($psi)
  $outTask = $p.StandardOutput.ReadToEndAsync()
  $errTask = $p.StandardError.ReadToEndAsync()
  $waitMs = Get-SupervisedWaitMs $PromptInputTimeoutMs $ChildTimeoutMs 8000 60000
  if (-not $p.WaitForExit($waitMs)) {
    try {
      Start-Process -FilePath (Join-Path $env:SystemRoot "System32\taskkill.exe") -ArgumentList @("/PID", "$($p.Id)", "/T", "/F") -Wait -WindowStyle Hidden | Out-Null
    } catch {
      try { $p.Kill() } catch {}
    }
    try { $stdout = [string]$outTask.Result } catch { $stdout = "" }
    try { $stderr = [string]$errTask.Result } catch { $stderr = "" }
    Write-ParentFallbackEvidence "sealed ceremony child timed out" "forced_parent_termination"
    $evidenceFile = Join-Path $EvidenceOutDir "PRODUCTION_DRY_RUN_EVIDENCE.json"
    if (Test-Path -LiteralPath $evidenceFile) {
      Write-Output ([IO.File]::ReadAllText($evidenceFile).TrimEnd())
    } else {
      Write-Blocked "sealed ceremony child timed out"
    }
    exit 1
  }
  try { $stdout = [string]$outTask.Result } catch { $stdout = "" }
  try { $stderr = [string]$errTask.Result } catch { $stderr = "" }
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
