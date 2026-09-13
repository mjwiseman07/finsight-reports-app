#Requires -Version 5.1
<#
.SYNOPSIS
  Operator-assisted production APPLY ceremony for Stage-1 containment.
  Distinct from the dry-run ceremony. Hidden SecureString URL + sealed Mode apply
  with the exact reviewed apply-authorization token (never operator-supplied).
  Child evidence must be CONTAINMENT_EVIDENCE_V1; never logs credentials.
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

  [Parameter(Mandatory = $true)]
  [string]$PriorDryRunEvidencePath,

  # Test harness only: loopback synthetic URL when CONTAINMENT_CEREMONY_ALLOW_SYNTHETIC_URL=1
  [Parameter(Mandatory = $false)]
  [string]$TestSyntheticDatabaseUrl = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

try { Set-PSReadLineOption -HistorySaveStyle SaveNothing -ErrorAction SilentlyContinue | Out-Null } catch {}

# Sealed intent pin - never accept an operator-provided override of this value.
$script:ExactApplyToken = "I_AUTHORIZE_CONTAINMENT_APPLY_20260908031736"

function Get-Sha256Text([string]$Text) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($sha.ComputeHash($bytes)) -replace "-", "").ToLowerInvariant()
  } finally { $sha.Dispose() }
}

function Clear-ContainmentCredential {
  Remove-Item Env:CONTAINMENT_APPLY_DATABASE_URL -ErrorAction SilentlyContinue
  [Environment]::SetEnvironmentVariable("CONTAINMENT_APPLY_DATABASE_URL", $null, "Process")
  Remove-Item Env:CONTAINMENT_APPLY_SSL_ROOTCERT -ErrorAction SilentlyContinue
  [Environment]::SetEnvironmentVariable("CONTAINMENT_APPLY_SSL_ROOTCERT", $null, "Process")
  if (Test-Path Env:DATABASE_URL) { Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue }
  if (Test-Path Env:NODE_TLS_REJECT_UNAUTHORIZED) {
    Remove-Item Env:NODE_TLS_REJECT_UNAUTHORIZED -ErrorAction SilentlyContinue
  }
}

function Sanitize-Text([string]$Text) {
  if (-not $Text) { return $Text }
  $t = [regex]::Replace($Text, "postgres(?:ql)?://[^\s`"']+", "postgres://***")
  $t = [regex]::Replace($t, "CONTAINMENT_APPLY_DATABASE_URL\s*[:=]\s*[^\s`"']+", "CONTAINMENT_APPLY_DATABASE_URL=***")
  $t = [regex]::Replace($t, "password=[^&\s`"']+", "password=***")
  return $t
}

function Get-Sha256Bytes([byte[]]$Bytes) {
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($sha.ComputeHash($Bytes)) -replace "-", "").ToLowerInvariant()
  } finally { $sha.Dispose() }
}

function Materialize-GitBlob([string]$Rel, [string]$Dest) {
  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = "git"
  $psi.Arguments = "cat-file blob ${Freeze}:${Rel}"
  $psi.WorkingDirectory = $RepoRoot
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $p = [Diagnostics.Process]::Start($psi)
  $ms = New-Object IO.MemoryStream
  $p.StandardOutput.BaseStream.CopyTo($ms)
  $err = $p.StandardError.ReadToEnd()
  $p.WaitForExit()
  if ($p.ExitCode -ne 0) { throw "failed to materialize ${Rel}: $err" }
  [IO.File]::WriteAllBytes($Dest, $ms.ToArray())
  return $ms.ToArray()
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
  $p = [Diagnostics.Process]::Start($psi)
  $out = $p.StandardOutput.ReadToEnd()
  $err = $p.StandardError.ReadToEnd()
  $p.WaitForExit()
  if ($p.ExitCode -ne 0) { throw "git failed: $err" }
  return $out.Trim()
}

function Invoke-ProcessCapture {
  param(
    [string]$FileName,
    [string]$Arguments,
    [string]$WorkingDirectory,
    [hashtable]$ExtraEnv = @{}
  )
  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = $FileName
  $psi.Arguments = $Arguments
  $psi.WorkingDirectory = $WorkingDirectory
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  foreach ($k in $ExtraEnv.Keys) {
    if ($psi.EnvironmentVariables.ContainsKey($k)) {
      $psi.EnvironmentVariables[$k] = [string]$ExtraEnv[$k]
    } else {
      $psi.EnvironmentVariables.Add($k, [string]$ExtraEnv[$k])
    }
  }
  $p = New-Object Diagnostics.Process
  $p.StartInfo = $psi
  [void]$p.Start()
  $stdout = $p.StandardOutput.ReadToEnd()
  $stderr = $p.StandardError.ReadToEnd()
  $p.WaitForExit()
  return @{
    ExitCode = $p.ExitCode
    Stdout   = $stdout
    Stderr   = $stderr
  }
}

function Classify-CeremonyFailure([string]$Message) {
  $msg = [string]$Message
  if ($msg -match "PIN_MISMATCH|PRIOR_DRY_RUN|stale tip|stale freeze|BLOCKED_PRIOR") {
    return @{ code = "BLOCKED_PRIOR_DRY_RUN_EVIDENCE"; phase = "prior_dry_run_gate" }
  }
  if ($msg -match "BLOCKED_HARNESS_ENV_CONTAMINATION|BLOCKED_TARGET2_OVERRIDE|fixture Target2|TARGET2_OVERRIDE") {
    return @{ code = "BLOCKED_HARNESS_ENV_CONTAMINATION"; phase = "harness_contamination_gate" }
  }
  if ($msg -match "APPLY_TOKEN|token mismatch|MODE_CONFUSION|wrong mode") {
    return @{ code = "BLOCKED_MODE_TOKEN_CONTRACT"; phase = "apply_token_contract" }
  }
  if ($msg -match "No URL provided by operator|Empty URL after SecureString|TEST_URL_NOT_LOOPBACK|SYNTHETIC_URL_NOT_ALLOWED") {
    return @{ code = "BLOCKED_CREDENTIAL_UNAVAILABLE"; phase = "ceremony_credential_input" }
  }
  if ($msg -match "native_entry|OID mismatch|SHA-256 mismatch|bytes mismatch|AUTH_METADATA|failed to materialize") {
    return @{ code = "CEREMONY_ENTRY_MATERIALIZE_FAIL"; phase = "ceremony_entry_materialize" }
  }
  if ($msg -match "decode|frame|JSON|evidence|extractEvidenceFrame|CONTAINMENT_EVIDENCE") {
    return @{ code = "CEREMONY_EVIDENCE_DECODE_FAIL"; phase = "ceremony_evidence_decode" }
  }
  if ($msg -match "BLOCKED_TLS_|TLS_CA|sslmode=no-verify|NODE_TLS_REJECT_UNAUTHORIZED") {
    return @{ code = "BLOCKED_TLS_POLICY"; phase = "tls_policy" }
  }
  return @{ code = "CEREMONY_FAILED"; phase = "ceremony" }
}

function Get-HarnessContaminationEnvNames {
  return @(
    "CONTAINMENT_CEREMONY_ALLOW_SYNTHETIC_URL",
    "CONTAINMENT_CEREMONY_TEST_FIXTURE_TARGET2"
  )
}

function Clear-HarnessContaminationEnv {
  foreach ($k in Get-HarnessContaminationEnvNames) {
    Remove-Item "Env:$k" -ErrorAction SilentlyContinue
    [Environment]::SetEnvironmentVariable($k, $null, "Process")
  }
}

function Get-PresentHarnessContaminationEnv {
  $present = New-Object System.Collections.Generic.List[string]
  foreach ($k in Get-HarnessContaminationEnvNames) {
    $v = [Environment]::GetEnvironmentVariable($k, "Process")
    if (-not [string]::IsNullOrWhiteSpace($v)) {
      [void]$present.Add($k)
    }
  }
  return $present
}

function Assert-InteractivePathFreeOfHarnessContamination {
  $present = @(Get-PresentHarnessContaminationEnv)
  if ($present.Count -gt 0) {
    Clear-HarnessContaminationEnv
    $script:interactiveClose = $false
    throw ("BLOCKED_HARNESS_ENV_CONTAMINATION: interactive SecureString path forbids harness env: " + ($present -join ","))
  }
}

function Test-IsSyntheticLoopbackUrl([string]$Url) {
  return [bool]($Url -match '^postgres(?:ql)?://.+@127\.0\.0\.1(?::\d+)?/')
}

function Assert-NoTarget2OverridesInForwardArgs([System.Collections.Generic.List[string]]$ArgsList) {
  foreach ($a in $ArgsList) {
    if ([string]$a -match '^--target2-') {
      throw "BLOCKED_TARGET2_OVERRIDE_ON_INTERACTIVE: production SecureString path forbids --target2-* overrides"
    }
  }
}

function Assert-PriorDryRunEvidence {
  param(
    [string]$Path,
    [object]$Auth
  )
  if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path -LiteralPath $Path)) {
    throw "BLOCKED_PRIOR_DRY_RUN_MISSING: PriorDryRunEvidencePath required"
  }
  $item = Get-Item -LiteralPath $Path -Force
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    throw "BLOCKED_PRIOR_DRY_RUN_INVALID: PriorDryRunEvidencePath is a reparse point"
  }
  $bytes = [IO.File]::ReadAllBytes($Path)
  $sha = Get-Sha256Bytes -Bytes $bytes
  $expectedSha = [string]$Auth.required_prior_dry_run_evidence_sha256
  if ([string]::IsNullOrWhiteSpace($expectedSha) -or $expectedSha.Length -ne 64) {
    throw "AUTH_METADATA_INVALID: missing required_prior_dry_run_evidence_sha256"
  }
  if ($sha -ne $expectedSha.ToLowerInvariant()) {
    throw "BLOCKED_PRIOR_DRY_RUN_SHA_MISMATCH: evidence SHA-256 does not match authorization pin"
  }
  $expectedFreeze = [string]$Auth.required_prior_dry_run_freeze
  $expectedTip = [string]$Auth.required_prior_dry_run_evidence_tip
  if (-not ($expectedFreeze -match '^[0-9a-fA-F]{40}$')) {
    throw "AUTH_METADATA_INVALID: missing required_prior_dry_run_freeze"
  }
  if (-not ($expectedTip -match '^[0-9a-fA-F]{40}$')) {
    throw "AUTH_METADATA_INVALID: missing required_prior_dry_run_evidence_tip"
  }
  $json = [Text.Encoding]::UTF8.GetString($bytes)
  $ev = $json | ConvertFrom-Json
  $app = $ev.applicator
  if (-not $app) { throw "BLOCKED_PRIOR_DRY_RUN_INVALID: missing applicator evidence" }

  $verdict = [string]$(if ($app.verdict) { $app.verdict } else { $app.result_code })
  if ($verdict -ne "DRY_RUN_READY") {
    throw "BLOCKED_PRIOR_DRY_RUN_NOT_READY: applicator verdict must be DRY_RUN_READY"
  }
  $wrapper = [string]$ev.result_code
  if ($wrapper -ne "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION" -and $wrapper -ne "DRY_RUN_READY") {
    throw "BLOCKED_PRIOR_DRY_RUN_NOT_READY: wrapper result_code not ready for apply"
  }
  if ([string]$ev.mode -ne "dry-run") {
    throw "BLOCKED_PRIOR_DRY_RUN_INVALID: mode must be dry-run"
  }
  if ([bool]$app.read_only -ne $true) {
    throw "BLOCKED_PRIOR_DRY_RUN_INVALID: read_only must be true"
  }
  $evFreeze = [string]$(if ($app.authorized_tooling_freeze) { $app.authorized_tooling_freeze } elseif ($app.pr_head) { $app.pr_head } else { $ev.freeze })
  $evTip = [string]$app.evidence_tip
  if ($evFreeze.ToLowerInvariant() -ne $expectedFreeze.ToLowerInvariant()) {
    throw "BLOCKED_PRIOR_DRY_RUN_STALE_FREEZE: evidence freeze does not match required_prior_dry_run_freeze"
  }
  if ($evTip.ToLowerInvariant() -ne $expectedTip.ToLowerInvariant()) {
    throw "BLOCKED_PRIOR_DRY_RUN_STALE_TIP: evidence tip does not match required_prior_dry_run_evidence_tip"
  }
  $hist = $null
  if ($null -ne $app.prior_history_count) { $hist = [int]$app.prior_history_count }
  if ($hist -ne 185) {
    throw "BLOCKED_PRIOR_DRY_RUN_HISTORY: prior_history_count must be 185"
  }
  $t2 = $app.target2
  if (-not $t2) { throw "BLOCKED_PRIOR_DRY_RUN_TARGET2: missing target2 block" }
  if ([int]$t2.eligible_rows -ne 2) { throw "BLOCKED_PRIOR_DRY_RUN_TARGET2: eligible_rows" }
  if ([int]$t2.target_row_fp_matches -ne 1) { throw "BLOCKED_PRIOR_DRY_RUN_TARGET2: target_row_fp_matches" }
  if ([int]$t2.target_binding_matches -ne 1) { throw "BLOCKED_PRIOR_DRY_RUN_TARGET2: target_binding_matches" }
  if ([int]$t2.target_combined_matches -ne 1) { throw "BLOCKED_PRIOR_DRY_RUN_TARGET2: target_combined_matches" }
  if ([int]$t2.excluded_us_matches -ne 1) { throw "BLOCKED_PRIOR_DRY_RUN_TARGET2: excluded_us_matches" }
  if ([int]$t2.excluded_collision_matches -ne 0) { throw "BLOCKED_PRIOR_DRY_RUN_TARGET2: excluded_collision_matches" }
  $sql = 0
  if ($null -ne $ev.sqlApplicationAttempts) { $sql = [int]$ev.sqlApplicationAttempts }
  elseif ($null -ne $app.sqlApplicationAttempts) { $sql = [int]$app.sqlApplicationAttempts }
  if ($sql -ne 0) { throw "BLOCKED_PRIOR_DRY_RUN_INVALID: sqlApplicationAttempts must be 0" }
  $adv = $false
  if ($null -ne $ev.advisory_lock_acquired) { $adv = [bool]$ev.advisory_lock_acquired }
  elseif ($null -ne $app.advisory_lock_acquired) { $adv = [bool]$app.advisory_lock_acquired }
  if ($adv) { throw "BLOCKED_PRIOR_DRY_RUN_INVALID: advisory_lock_acquired must be false" }
  $cleanup = $ev.cleanup
  if (-not $cleanup -or [bool]$cleanup.credential_cleared -ne $true) {
    throw "BLOCKED_PRIOR_DRY_RUN_CLEANUP: credential_cleared required"
  }
  if ([bool]$cleanup.ca_path_env_absent -ne $true) {
    throw "BLOCKED_PRIOR_DRY_RUN_CLEANUP: ca_path_env_absent required"
  }
  return @{
    sha256 = $sha
    freeze = $evFreeze
    tip    = $evTip
  }
}

if (-not $RepoRoot) {
  $RepoRoot = (git rev-parse --show-toplevel 2>$null)
  if (-not $RepoRoot) { throw "RepoRoot required" }
}
if (-not $EvidenceOutDir) {
  $EvidenceOutDir = Join-Path $env:TEMP "containment-prod-apply-ceremony"
}
New-Item -ItemType Directory -Force -Path $EvidenceOutDir | Out-Null

$Freeze = $PrHead
$secure = $null
$bstr = [IntPtr]::Zero
$plain = $null
$resultCode = "CEREMONY_FAILED"
$parsed = $null
$rawCapture = Join-Path $EvidenceOutDir "raw-child-stdout.frame.txt"
$evidencePath = Join-Path $EvidenceOutDir "PRODUCTION_APPLY_EVIDENCE.json"
$entryTempDir = $null
$entryPath = $null
$interactiveClose = $true
$priorMeta = $null
$exactToken = $null
$forwardedFixtureTarget2 = $false
$useSyntheticNonInteractivePath = $false

Clear-Host
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host "  PRODUCTION APPLY CEREMONY - MUTATING DATABASE PRIVILEGES" -ForegroundColor Yellow
Write-Host "  This is NOT a dry-run. One authorized apply attempt only." -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host "Freeze -PrHead: $Freeze"
Write-Host "Mode: apply (exact sealed authorization token)"
Write-Host "Paste Session Pooler URL only into the hidden SecureString prompt."
Write-Host "Verified TLS uses the freeze-sealed embedded official Supabase CA (no CA path)."

try {
  $tip = Invoke-GitTextLocal @("rev-parse", "HEAD")
  $authJson = Invoke-GitTextLocal @("cat-file", "blob", "${tip}:docs/security/connection-credential-browser-containment/TOOLING_AUTHORIZATION.json")
  $auth = $authJson | ConvertFrom-Json
  if ([string]$auth.authorized_pr_head -ne $Freeze) {
    throw "PIN_MISMATCH: -PrHead must equal tip authorized_pr_head (tooling freeze)"
  }
  if ([string]$authJson -match "PENDING_AFTER_COMMIT") {
    throw "PIN_MISMATCH: authorization still PENDING_AFTER_COMMIT"
  }

  $exactToken = [string]$auth.apply_authorization_token
  if ($exactToken -ne $script:ExactApplyToken) {
    throw "APPLY_TOKEN_MISMATCH: tip apply_authorization_token is not the reviewed constant"
  }

  Write-Host ("Project: " + [string]$auth.project_ref)
  Write-Host ("Migration version: " + [string]$auth.migration_version)
  Write-Host ("Prior dry-run evidence pin: " + [string]$auth.required_prior_dry_run_evidence_sha256)

  $priorMeta = Assert-PriorDryRunEvidence -Path $PriorDryRunEvidencePath -Auth $auth
  Write-Host ("Prior dry-run evidence SHA verified: " + $priorMeta.sha256)

  $ne = $auth.native_entry
  if (-not $ne -or -not $ne.path -or -not $ne.oid -or -not $ne.sha256 -or -not $ne.bytes) {
    throw "AUTH_METADATA_INVALID: missing native_entry seals"
  }
  $entryOid = Invoke-GitTextLocal @("rev-parse", "${Freeze}:$($ne.path)")
  if ($entryOid -ne [string]$ne.oid) { throw "native_entry OID mismatch" }
  $entryTempDir = Join-Path $EvidenceOutDir ("entry-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $entryTempDir | Out-Null
  $entryPath = Join-Path $entryTempDir "enter-containment-apply.ps1"
  $entryBytes = Materialize-GitBlob -Rel ([string]$ne.path) -Dest $entryPath
  $entrySha = Get-Sha256Bytes -Bytes $entryBytes
  if ($entrySha -ne ([string]$ne.sha256).ToLowerInvariant()) { throw "native_entry SHA-256 mismatch" }
  if ($entryBytes.Length -ne [int]$ne.bytes) { throw "native_entry bytes mismatch" }

  Write-Host "[1/3] Hidden credential input..."
  $allowSyntheticGate = [Environment]::GetEnvironmentVariable("CONTAINMENT_CEREMONY_ALLOW_SYNTHETIC_URL", "Process") -eq "1"
  $fixtureTarget2Gate = [Environment]::GetEnvironmentVariable("CONTAINMENT_CEREMONY_TEST_FIXTURE_TARGET2", "Process") -eq "1"
  $hasExplicitSyntheticUrl = -not [string]::IsNullOrWhiteSpace($TestSyntheticDatabaseUrl)
  $useSyntheticNonInteractivePath = $false

  if ($hasExplicitSyntheticUrl) {
    if (-not $allowSyntheticGate) {
      throw "SYNTHETIC_URL_NOT_ALLOWED: set CONTAINMENT_CEREMONY_ALLOW_SYNTHETIC_URL=1 for harness only"
    }
    if (-not (Test-IsSyntheticLoopbackUrl -Url $TestSyntheticDatabaseUrl)) {
      throw "TEST_URL_NOT_LOOPBACK: synthetic ceremony URL must target 127.0.0.1"
    }
    $interactiveClose = $false
    $useSyntheticNonInteractivePath = $true
    $secure = ConvertTo-SecureString -String $TestSyntheticDatabaseUrl -AsPlainText -Force
  } else {
    # Interactive production SecureString path: harness env alone is contamination.
    Assert-InteractivePathFreeOfHarnessContamination
    [System.IO.File]::WriteAllText((Join-Path $EvidenceOutDir "PROMPT_READY.txt"), "awaiting_securestring_input")
    $secure = Read-Host -Prompt "CONTAINMENT_APPLY_DATABASE_URL" -AsSecureString
    Remove-Item -LiteralPath (Join-Path $EvidenceOutDir "PROMPT_READY.txt") -Force -ErrorAction SilentlyContinue
  }
  if ($null -eq $secure -or $secure.Length -le 0) { throw "No URL provided by operator" }

  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally {
    if ($bstr -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
      $bstr = [IntPtr]::Zero
    }
  }
  if ([string]::IsNullOrWhiteSpace($plain)) { throw "Empty URL after SecureString conversion" }
  $env:CONTAINMENT_APPLY_DATABASE_URL = $plain
  $plain = $null
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()

  $hostileCa = [Environment]::GetEnvironmentVariable("CONTAINMENT_APPLY_SSL_ROOTCERT", "Process")
  if (-not [string]::IsNullOrWhiteSpace($hostileCa)) {
    throw "BLOCKED_TLS_CA_PATH_FORBIDDEN: CONTAINMENT_APPLY_SSL_ROOTCERT is retired; trust root is embedded"
  }

  # Mode apply + exact sealed token only. Never dry-run. Never operator token override.
  $forwardList = New-Object System.Collections.Generic.List[string]
  [void]$forwardList.Add("--i-authorize-production-apply")
  [void]$forwardList.Add($exactToken)

  # Fixture Target #2 overrides: ONLY complete disposable synthetic path.
  # Env flags alone never authorize overrides; interactive SecureString never gets them.
  $forwardedFixtureTarget2 = $false
  if (
    $useSyntheticNonInteractivePath -and
    ($interactiveClose -eq $false) -and
    $allowSyntheticGate -and
    $fixtureTarget2Gate -and
    $hasExplicitSyntheticUrl -and
    (Test-IsSyntheticLoopbackUrl -Url $TestSyntheticDatabaseUrl)
  ) {
    $node = (Get-Command -Name node.exe -CommandType Application | Select-Object -First 1).Source
    $helper = Join-Path $RepoRoot "tests/security/helpers/print-fixture-target2-args.js"
    if (-not (Test-Path -LiteralPath $helper)) {
      throw "CEREMONY_FAILED: missing harness print-fixture-target2-args.js"
    }
    $pinRun = Invoke-ProcessCapture -FileName $node -Arguments ("`"$helper`"") -WorkingDirectory $RepoRoot
    if ($pinRun.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($pinRun.Stdout)) {
      throw "CEREMONY_FAILED: unable to resolve harness fixture Target2 forward args"
    }
    foreach ($line in ([string]$pinRun.Stdout).Split([char]10)) {
      $t = $line.Trim()
      if ($t.Length -gt 0) { [void]$forwardList.Add($t) }
    }
    $forwardedFixtureTarget2 = $true
  } elseif ($fixtureTarget2Gate -and -not $useSyntheticNonInteractivePath) {
    throw "BLOCKED_HARNESS_ENV_CONTAMINATION: CONTAINMENT_CEREMONY_TEST_FIXTURE_TARGET2 requires complete synthetic non-interactive path"
  }

  if (-not $useSyntheticNonInteractivePath) {
    Assert-NoTarget2OverridesInForwardArgs -ArgsList $forwardList
    $stillContaminated = @(Get-PresentHarnessContaminationEnv)
    if ($stillContaminated.Count -gt 0) {
      Clear-HarnessContaminationEnv
      throw ("BLOCKED_HARNESS_ENV_CONTAMINATION: harness env present before native entry: " + ($stillContaminated -join ","))
    }
    if ($forwardedFixtureTarget2) {
      throw "BLOCKED_TARGET2_OVERRIDE_ON_INTERACTIVE: fixture Target2 must not reach interactive production path"
    }
  }

  # Never inherit harness fixture gates into native entry / Node applicator child.
  Clear-HarnessContaminationEnv

  Write-Host "[2/3] Invoking sealed native entry (apply)..."
  $entryArgParts = New-Object System.Collections.Generic.List[string]
  foreach ($a in @("-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", $entryPath, "-PrHead", $Freeze, "-Mode", "apply")) {
    if ($a -match '[\s"]') { [void]$entryArgParts.Add('"' + ($a -replace '"', '\"') + '"') }
    else { [void]$entryArgParts.Add($a) }
  }
  foreach ($fa in $forwardList) {
    if ($fa -match '[\s"]') { [void]$entryArgParts.Add('"' + ($fa -replace '"', '\"') + '"') }
    else { [void]$entryArgParts.Add($fa) }
  }
  $entryArgs = [string]::Join(" ", $entryArgParts.ToArray())
  $entryRun = Invoke-ProcessCapture -FileName "powershell.exe" -Arguments $entryArgs -WorkingDirectory $RepoRoot
  [System.IO.File]::WriteAllText($rawCapture, [string]$entryRun.Stdout)

  Write-Host "[3/3] Extracting CONTAINMENT_EVIDENCE_V1 frame..."
  $proto = Join-Path $EvidenceOutDir "containment-evidence-protocol.js"
  $decodeHelper = Join-Path $EvidenceOutDir "containment-evidence-decode-frame.js"
  Materialize-GitBlob "scripts/security/containment-evidence-protocol.js" $proto | Out-Null
  Materialize-GitBlob "scripts/security/containment-evidence-decode-frame.js" $decodeHelper | Out-Null

  $nodeExe = (Get-Command -Name node.exe -CommandType Application | Select-Object -First 1).Source
  $decodeArgs = "`"$decodeHelper`" `"$proto`" `"$rawCapture`""
  $decodedRun = Invoke-ProcessCapture -FileName $nodeExe -Arguments $decodeArgs -WorkingDirectory $EvidenceOutDir
  $decodedText = ([string]$decodedRun.Stdout).Trim()
  if ([string]::IsNullOrWhiteSpace($decodedText)) {
    $err = Sanitize-Text ([string]$decodedRun.Stderr)
    throw "CEREMONY_EVIDENCE_DECODE_FAIL: empty decode stdout: $err"
  }
  try {
    $decodedObj = $decodedText | ConvertFrom-Json
  } catch {
    throw "CEREMONY_EVIDENCE_DECODE_FAIL: decode stdout was not JSON"
  }
  if (-not $decodedObj.ok) {
    $resultCode = "APPLY_BLOCKED"
    $parsed = [pscustomobject]@{
      evidence_source = "native_wrapper_fallback"
      result_code = "APPLY_BLOCKED"
      reason_code = [string]$decodedObj.code
      phase = [string]$decodedObj.phase
      databaseConnectionAttempts = $null
      sqlApplicationAttempts = $null
      advisory_lock_acquired = $false
      wrapper_observed = $true
    }
  } else {
    $parsed = $decodedObj.evidence
    if ($parsed.result_code -eq "APPLY_COMMITTED" -or $parsed.verdict -eq "APPLY_COMMITTED") {
      $resultCode = "APPLY_COMMITTED"
    } elseif ($parsed.result_code) {
      $resultCode = [string]$parsed.result_code
    } elseif ($parsed.verdict) {
      $resultCode = [string]$parsed.verdict
    } else {
      $resultCode = "APPLY_BLOCKED"
    }
  }
}
catch {
  $classified = Classify-CeremonyFailure ([string]$_.Exception.Message)
  $resultCode = [string]$classified.code
  Write-Host ("STOPPED: " + (Sanitize-Text ([string]$_.Exception.Message))) -ForegroundColor Red
  if (-not $parsed) {
    $parsed = [pscustomobject]@{
      evidence_source = "native_wrapper_fallback"
      result_code = $resultCode
      reason_code = $resultCode
      phase = [string]$classified.phase
      databaseConnectionAttempts = $null
      sqlApplicationAttempts = $null
      advisory_lock_acquired = $false
      wrapper_observed = $true
      error = (Sanitize-Text ([string]$_.Exception.Message))
    }
  }
}
finally {
  Clear-ContainmentCredential
  Clear-HarnessContaminationEnv
  $plain = $null
  $exactToken = $null
  if ($null -ne $secure) { try { $secure.Dispose() } catch {}; $secure = $null }
  if ($bstr -ne [IntPtr]::Zero) {
    try { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) } catch {}
    $bstr = [IntPtr]::Zero
  }
  if ($entryTempDir -and (Test-Path -LiteralPath $entryTempDir)) {
    Remove-Item -LiteralPath $entryTempDir -Recurse -Force -ErrorAction SilentlyContinue
  }
  $entryPath = $null
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()

  $src = if ($parsed -and $parsed.evidence_source) { [string]$parsed.evidence_source } else { "native_wrapper_fallback" }
  $dbAttempts = $null
  $sqlAttempts = $null
  if ($parsed -and $null -ne $parsed.databaseConnectionAttempts) { $dbAttempts = [int]$parsed.databaseConnectionAttempts }
  if ($parsed -and $null -ne $parsed.sqlApplicationAttempts) { $sqlAttempts = [int]$parsed.sqlApplicationAttempts }

  $evidence = [ordered]@{
    authorization_scope = "operator_assisted_production_apply_one_shot"
    ceremony_kind = "apply"
    result_code = $resultCode
    evidence_source = $src
    applicator = $parsed
    mode = "apply"
    freeze = $Freeze
    prior_dry_run_evidence_sha256 = $(if ($priorMeta) { [string]$priorMeta.sha256 } else { $null })
    fixture_target2_overrides_forwarded = [bool]$forwardedFixtureTarget2
    sealed_production_target2_handles_expected = (-not [bool]$forwardedFixtureTarget2)
    databaseConnectionAttempts = $dbAttempts
    sqlApplicationAttempts = $sqlAttempts
    advisory_lock_acquired = $(if ($parsed -and $null -ne $parsed.advisory_lock_acquired) { [bool]$parsed.advisory_lock_acquired } else { $false })
    credential_redaction_confirmation = [ordered]@{
      operator_hidden_securestring_input = $true
      url_in_chat = $false
      url_in_argv = $false
      url_in_evidence = $false
      url_printed = $false
      process_env_cleared_after = (-not [bool]$env:CONTAINMENT_APPLY_DATABASE_URL)
      securestring_zerofreed = $true
      ca_path_channel_retired = $true
      ca_path_env_absent = (-not [bool]$env:CONTAINMENT_APPLY_SSL_ROOTCERT)
      ca_contents_not_in_argv = $true
      embedded_official_ca_only = $true
      apply_token_operator_supplied = $false
      apply_token_from_sealed_auth_only = $true
      harness_env_absent_after = (
        [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable("CONTAINMENT_CEREMONY_ALLOW_SYNTHETIC_URL", "Process")) -and
        [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable("CONTAINMENT_CEREMONY_TEST_FIXTURE_TARGET2", "Process"))
      )
    }
    cleanup = [ordered]@{
      credential_cleared = (-not [bool]$env:CONTAINMENT_APPLY_DATABASE_URL)
      ca_path_env_absent = (-not [bool]$env:CONTAINMENT_APPLY_SSL_ROOTCERT)
      raw_stdout_removed = $false
      evidence_local_only = $true
    }
    generated_at_utc = [DateTime]::UtcNow.ToString("o")
  }

  if (Test-Path -LiteralPath $rawCapture) {
    Remove-Item -LiteralPath $rawCapture -Force -ErrorAction SilentlyContinue
  }
  $evidence.cleanup.raw_stdout_removed = -not (Test-Path -LiteralPath $rawCapture)

  $json = ($evidence | ConvertTo-Json -Depth 20)
  [IO.File]::WriteAllText($evidencePath, $json)
  $sha = Get-Sha256Text $json
  $summaryObj = [ordered]@{
    result_code = $resultCode
    evidence_source = $src
    evidence_sha256 = $sha
    databaseConnectionAttempts = $dbAttempts
    sqlApplicationAttempts = $sqlAttempts
    credential_cleared = (-not [bool]$env:CONTAINMENT_APPLY_DATABASE_URL)
  }
  [IO.File]::WriteAllText((Join-Path $EvidenceOutDir "PRODUCTION_APPLY_SUMMARY.json"), ($summaryObj | ConvertTo-Json))
  [IO.File]::WriteAllText((Join-Path $EvidenceOutDir "CEREMONY_DONE.txt"), "result_code=$resultCode")

  foreach ($f in @("containment-evidence-decode-frame.js", "containment-evidence-protocol.js", "containment-evidence-frame-tool.js")) {
    $p = Join-Path $EvidenceOutDir $f
    if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Force -ErrorAction SilentlyContinue }
  }

  Write-Host "RESULT: $resultCode"
  Write-Host "evidence_sha256: $sha"
  if ($interactiveClose) {
    Write-Host "Press Enter to close..."
    [void](Read-Host)
  }
}

exit $(if ($resultCode -eq "APPLY_COMMITTED") { 0 } else { 2 })
