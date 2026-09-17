#Requires -Version 5.1
<#
.SYNOPSIS
  Operator-assisted production APPLY ceremony for RA Pro billing-company cutover (FRLS).
  Distinct from the dry-run ceremony. Hidden SecureString URL + sealed Mode apply
  with the exact reviewed apply-authorization token (never operator-supplied).
  Child evidence must be RA_PRO_CUTOVER_EVIDENCE_V1; never logs credentials.
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

  # Required once TOOLING_AUTHORIZATION publishes required_prior_dry_run_* pins.
  # Until those pins exist the apply ceremony blocks outright, so the parameter is
  # optional at the shell boundary and enforced against the sealed authorization.
  [Parameter(Mandatory = $false)]
  [string]$PriorDryRunEvidencePath = "",

  # Test harness only: loopback synthetic URL when RA_PRO_CUTOVER_CEREMONY_ALLOW_SYNTHETIC_URL=1
  [Parameter(Mandatory = $false)]
  [string]$TestSyntheticDatabaseUrl = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

try { Set-PSReadLineOption -HistorySaveStyle SaveNothing -ErrorAction SilentlyContinue | Out-Null } catch {}

# Sealed intent pin - never accept an operator-provided override of this value.
$script:ExactApplyToken = "I_AUTHORIZE_RA_PRO_BILLING_COMPANY_CUTOVER_APPLY_20260915004500"
# Gate module is materialized from freeze only — never $PSScriptRoot / worktree.
$script:FrlsGatesTempDir = $null
$script:FrlsGatesMaterializedPath = $null
$script:FrlsGatesLoaded = $false

function Get-Sha256Text([string]$Text) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($Text)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($sha.ComputeHash($bytes)) -replace "-", "").ToLowerInvariant()
  } finally { $sha.Dispose() }
}

function Clear-FrlsCredential {
  Remove-Item Env:RA_PRO_CUTOVER_APPLY_DATABASE_URL -ErrorAction SilentlyContinue
  [Environment]::SetEnvironmentVariable("RA_PRO_CUTOVER_APPLY_DATABASE_URL", $null, "Process")
  Remove-Item Env:RA_PRO_CUTOVER_APPLY_SSL_ROOTCERT -ErrorAction SilentlyContinue
  [Environment]::SetEnvironmentVariable("RA_PRO_CUTOVER_APPLY_SSL_ROOTCERT", $null, "Process")
  # Stage-1 containment channel is not an FRLS channel — never let it linger.
  Remove-Item Env:CONTAINMENT_APPLY_DATABASE_URL -ErrorAction SilentlyContinue
  [Environment]::SetEnvironmentVariable("CONTAINMENT_APPLY_DATABASE_URL", $null, "Process")
  if (Test-Path Env:DATABASE_URL) { Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue }
  if (Test-Path Env:NODE_TLS_REJECT_UNAUTHORIZED) {
    Remove-Item Env:NODE_TLS_REJECT_UNAUTHORIZED -ErrorAction SilentlyContinue
  }
}

function Sanitize-Text([string]$Text) {
  if (-not $Text) { return $Text }
  $t = [regex]::Replace($Text, "postgres(?:ql)?://[^\s`"']+", "postgres://***")
  $t = [regex]::Replace($t, "RA_PRO_CUTOVER_APPLY_DATABASE_URL\s*[:=]\s*[^\s`"']+", "RA_PRO_CUTOVER_APPLY_DATABASE_URL=***")
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

function Get-System32PowerShell {
  # Absolute System32 Windows PowerShell only — never a PATH-resolved shim.
  $sysRoot = [Environment]::GetEnvironmentVariable("SystemRoot", "Process")
  if ([string]::IsNullOrWhiteSpace($sysRoot)) { throw "BLOCKED_POWERSHELL_IDENTITY: SystemRoot missing" }
  $candidate = Join-Path $sysRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
  if (-not (Test-Path -LiteralPath $candidate)) {
    throw "BLOCKED_POWERSHELL_IDENTITY: System32 powershell.exe missing"
  }
  $item = Get-Item -LiteralPath $candidate -Force
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    throw "BLOCKED_POWERSHELL_IDENTITY: powershell.exe is a reparse point"
  }
  if ($item.Extension -ne ".exe") { throw "BLOCKED_POWERSHELL_IDENTITY: powershell path is not .exe" }
  return [IO.Path]::GetFullPath($candidate)
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
  if ($msg -match "TEST_BOUNDARY_STOP_AFTER_PRIOR_EVIDENCE") {
    return @{ code = "TEST_BOUNDARY_STOP_AFTER_PRIOR_EVIDENCE"; phase = "prior_dry_run_gate" }
  }
  if ($msg -match "BLOCKED_GATE_MODULE|GATE_MODULE") {
    return @{ code = "BLOCKED_GATE_MODULE"; phase = "gate_module_materialize" }
  }
  if ($msg -match "BLOCKED_PRIOR_DRY_RUN_PINS_UNPUBLISHED") {
    return @{ code = "BLOCKED_PRIOR_DRY_RUN_PINS_UNPUBLISHED"; phase = "prior_dry_run_pin_publication" }
  }
  if ($msg -match "PIN_MISMATCH|PRIOR_DRY_RUN|stale tip|stale freeze|BLOCKED_PRIOR") {
    return @{ code = "BLOCKED_PRIOR_DRY_RUN_EVIDENCE"; phase = "prior_dry_run_gate" }
  }
  if ($msg -match "BLOCKED_HARNESS_ENV_CONTAMINATION") {
    return @{ code = "BLOCKED_HARNESS_ENV_CONTAMINATION"; phase = "harness_contamination_gate" }
  }
  if ($msg -match "BLOCKED_RETIRED_CREDENTIAL_CHANNEL") {
    return @{ code = "BLOCKED_RETIRED_CREDENTIAL_CHANNEL"; phase = "credential_channel_gate" }
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
  if ($msg -match "decode|frame|JSON|evidence|extractEvidenceFrame|FRLS_LEAD_SESSION_EVIDENCE") {
    return @{ code = "CEREMONY_EVIDENCE_DECODE_FAIL"; phase = "ceremony_evidence_decode" }
  }
  if ($msg -match "BLOCKED_TLS_|TLS_CA|sslmode=no-verify|NODE_TLS_REJECT_UNAUTHORIZED") {
    return @{ code = "BLOCKED_TLS_POLICY"; phase = "tls_policy" }
  }
  return @{ code = "CEREMONY_FAILED"; phase = "ceremony" }
}

function Get-HarnessContaminationEnvNames {
  # RA Pro cutover has no fixture Target#2 world; harness channels are synthetic-URL and stop-after-prior only.
  return @(
    "RA_PRO_CUTOVER_CEREMONY_ALLOW_SYNTHETIC_URL",
    "RA_PRO_CUTOVER_CEREMONY_STOP_AFTER_PRIOR_EVIDENCE"
  )
}

function Assert-NoRetiredContainmentCredentialChannel {
  $stale = [Environment]::GetEnvironmentVariable("CONTAINMENT_APPLY_DATABASE_URL", "Process")
  if (-not [string]::IsNullOrWhiteSpace($stale)) {
    Remove-Item Env:CONTAINMENT_APPLY_DATABASE_URL -ErrorAction SilentlyContinue
    [Environment]::SetEnvironmentVariable("CONTAINMENT_APPLY_DATABASE_URL", $null, "Process")
    throw "BLOCKED_RETIRED_CREDENTIAL_CHANNEL: CONTAINMENT_APPLY_DATABASE_URL is not an FRLS channel"
  }
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

function Test-PriorDryRunPinsPublished([object]$Auth) {
  # Pins are published only after the first authorized production dry-run.
  $sha = [string]$Auth.required_prior_dry_run_evidence_sha256
  $freeze = [string]$Auth.required_prior_dry_run_freeze
  $tip = [string]$Auth.required_prior_dry_run_evidence_tip
  $bundleSource = [string]$Auth.required_prior_dry_run_bundle_source
  if ([string]::IsNullOrWhiteSpace($sha)) { return $false }
  if ([string]::IsNullOrWhiteSpace($freeze)) { return $false }
  if ([string]::IsNullOrWhiteSpace($tip)) { return $false }
  if ([string]::IsNullOrWhiteSpace($bundleSource)) { return $false }
  if ($sha -match '^(?i)pending') { return $false }
  if ($freeze -match '^(?i)pending') { return $false }
  if ($tip -match '^(?i)pending') { return $false }
  if ($bundleSource -match '^(?i)pending') { return $false }
  if ($sha.Length -ne 64) { return $false }
  if ($freeze -notmatch '^[0-9a-fA-F]{40}$') { return $false }
  if ($tip -notmatch '^[0-9a-fA-F]{40}$') { return $false }
  if ($bundleSource -notmatch '^[0-9a-fA-F]{40}$') { return $false }
  return $true
}

function Clear-FrlsMaterializedGates {
  $script:FrlsGatesMaterializedPath = $null
  $script:FrlsGatesLoaded = $false
  if ($script:FrlsGatesTempDir -and (Test-Path -LiteralPath $script:FrlsGatesTempDir)) {
    Remove-Item -LiteralPath $script:FrlsGatesTempDir -Recurse -Force -ErrorAction SilentlyContinue
  }
  $script:FrlsGatesTempDir = $null
}

function Import-RaProPriorDryRunGatesFromTip {
  param(
    [object]$Auth,
    [string]$PublicationTip
  )

  if ($script:FrlsGatesLoaded) { return }

  $seal = $Auth.prior_dry_run_gates
  if (-not $seal -or -not $seal.path -or -not $seal.oid -or -not $seal.sha256 -or -not $seal.bytes) {
    throw "BLOCKED_GATE_MODULE_SEAL: TOOLING_AUTHORIZATION.prior_dry_run_gates incomplete"
  }
  $rel = [string]$seal.path
  if ($rel -ne "scripts/security/ra-pro-cutover-prior-dry-run-gates.ps1") {
    throw "BLOCKED_GATE_MODULE_SEAL: unexpected prior_dry_run_gates.path"
  }
  if ([string]::IsNullOrWhiteSpace($PublicationTip) -or $PublicationTip -notmatch '^[0-9a-fA-F]{40}$') {
    throw "BLOCKED_GATE_MODULE_SEAL: publication tip identity required before gate materialization"
  }
  $tipResolved = Invoke-GitTextLocal @("rev-parse", "--verify", ($PublicationTip + "^{commit}"))
  if ($tipResolved.ToLowerInvariant() -ne $PublicationTip.ToLowerInvariant()) {
    throw "BLOCKED_GATE_MODULE_SEAL: publication tip did not resolve to itself"
  }

  $oid = Invoke-GitTextLocal @("rev-parse", "${PublicationTip}:${rel}")
  if ($oid -ne [string]$seal.oid) {
    throw "BLOCKED_GATE_MODULE_OID: tip gate module OID mismatch"
  }

  $script:FrlsGatesTempDir = Join-Path $EvidenceOutDir ("prior-gates-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $script:FrlsGatesTempDir | Out-Null
  $dest = Join-Path $script:FrlsGatesTempDir "ra-pro-cutover-prior-dry-run-gates.ps1"

  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = "git"
  $psi.Arguments = "cat-file blob ${PublicationTip}:${rel}"
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
  if ($p.ExitCode -ne 0) { throw ("BLOCKED_GATE_MODULE_BLOB: " + $err) }
  $blobBytes = $ms.ToArray()
  if ($blobBytes.Length -ne [int]$seal.bytes) {
    throw "BLOCKED_GATE_MODULE_BYTES: tip gate module byte count mismatch"
  }
  $sha = Get-Sha256Bytes -Bytes $blobBytes
  if ($sha -ne ([string]$seal.sha256).ToLowerInvariant()) {
    throw "BLOCKED_GATE_MODULE_SHA: tip gate module SHA-256 mismatch"
  }
  [IO.File]::WriteAllBytes($dest, $blobBytes)
  $item = Get-Item -LiteralPath $dest -Force
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    throw "BLOCKED_GATE_MODULE_REPARSE: materialized gate module is a reparse point"
  }
  $hashOid = Invoke-GitTextLocal @("hash-object", $dest)
  if ($hashOid -ne [string]$seal.oid) {
    throw "BLOCKED_GATE_MODULE_OID: materialized content OID mismatch"
  }

  $gateText = [IO.File]::ReadAllText($dest)
  $gateScript = $ExecutionContext.InvokeCommand.NewScriptBlock($gateText)
  . $gateScript
  foreach ($name in @(
      "Get-FrlsDryRunReadyAllowlist",
      "Test-FrlsDryRunReadyCode",
      "Assert-FrlsPriorDryRunReadyCodes",
      "Get-FrlsSha256Bytes",
      "Get-RaProRequiredString",
      "Get-RaProRequiredBoolean",
      "Get-RaProRequiredInt",
      "Assert-RaProRequiredBooleanEquals",
      "Get-OptionalRaProBundleSourceString",
      "Assert-PriorDryRunEvidence"
    )) {
    $cmd = Get-Command -Name $name -CommandType Function -ErrorAction SilentlyContinue
    if (-not $cmd) {
      throw ("BLOCKED_GATE_MODULE_LOAD: " + $name + " missing after sealed dotsource")
    }
    Set-Item -Path ("function:script:" + $name) -Value $cmd.ScriptBlock
  }
  if (-not (Get-Command -Name Assert-PriorDryRunEvidence -ErrorAction SilentlyContinue)) {
    throw "BLOCKED_GATE_MODULE_LOAD: Assert-PriorDryRunEvidence missing after sealed dotsource"
  }
  $script:FrlsGatesMaterializedPath = $dest
  $script:FrlsGatesLoaded = $true
}

function Materialize-TipPriorDryRunEvidence {
  param(
    [object]$Auth,
    [string]$PublicationTip
  )

  $hostile = [Environment]::GetEnvironmentVariable("RA_PRO_CUTOVER_PRIOR_DRY_RUN_EVIDENCE_PATH", "Process")
  if (-not [string]::IsNullOrWhiteSpace($hostile)) {
    throw "PRIOR_DRY_RUN_EVIDENCE_PATH_OVERRIDE_FORBIDDEN: RA_PRO_CUTOVER_PRIOR_DRY_RUN_EVIDENCE_PATH must not be set; tip-sealed fixture only"
  }
  if (-not [string]::IsNullOrWhiteSpace($PriorDryRunEvidencePath)) {
    throw "PRIOR_DRY_RUN_EVIDENCE_PATH_OVERRIDE_FORBIDDEN: -PriorDryRunEvidencePath is forbidden when tip pins are PUBLISHED; tip Git blob only"
  }

  $pub = $Auth.published_prior_dry_run
  if ($null -eq $pub -or [string]$pub.status -ine "PUBLISHED") {
    throw "BLOCKED_PRIOR_DRY_RUN_PINS_UNPUBLISHED: published_prior_dry_run.status is not PUBLISHED"
  }
  $rel = [string]$pub.evidence_fixture_path
  if ([string]::IsNullOrWhiteSpace($rel)) {
    throw "AUTH_METADATA_INVALID: published_prior_dry_run.evidence_fixture_path required"
  }
  if ($rel -ne "tests/security/helpers/fixtures/ra-pro-cutover-prior-production-dry-run-evidence.json") {
    throw "AUTH_METADATA_INVALID: unexpected prior dry-run evidence_fixture_path"
  }
  $expectedSha = ([string]$Auth.required_prior_dry_run_evidence_sha256).ToLowerInvariant()
  $expectedBytes = [int]$pub.evidence_bytes
  $expectedOid = [string]$pub.evidence_blob_oid
  if ($expectedBytes -le 0) {
    throw "AUTH_METADATA_INVALID: published_prior_dry_run.evidence_bytes required"
  }
  if ($expectedOid -notmatch '^[0-9a-fA-F]{40}$') {
    throw "AUTH_METADATA_INVALID: published_prior_dry_run.evidence_blob_oid required"
  }

  $oid = Invoke-GitTextLocal @("rev-parse", "${PublicationTip}:${rel}")
  if ($oid.ToLowerInvariant() -ne $expectedOid.ToLowerInvariant()) {
    throw "BLOCKED_PRIOR_DRY_RUN_OID: tip evidence fixture OID mismatch"
  }

  $tmp = Join-Path $EvidenceOutDir ("prior-ev-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $tmp | Out-Null
  $dest = Join-Path $tmp "ra-pro-cutover-prior-production-dry-run-evidence.json"

  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = "git"
  $psi.Arguments = "cat-file blob ${PublicationTip}:${rel}"
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
  if ($p.ExitCode -ne 0) {
    throw ("BLOCKED_PRIOR_DRY_RUN_BLOB: git cat-file failed for tip prior evidence: " + $err)
  }
  $bytes = $ms.ToArray()
  if ($bytes.Length -ne $expectedBytes) {
    throw "BLOCKED_PRIOR_DRY_RUN_BYTES: tip prior evidence byte count mismatch"
  }
  $sha = Get-Sha256Bytes -Bytes $bytes
  if ($sha -ne $expectedSha) {
    throw "BLOCKED_PRIOR_DRY_RUN_SHA_MISMATCH: tip prior evidence SHA-256 mismatch"
  }
  [IO.File]::WriteAllBytes($dest, $bytes)
  $item = Get-Item -LiteralPath $dest -Force
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    throw "BLOCKED_PRIOR_DRY_RUN_REPARSE: materialized prior evidence is a reparse point"
  }
  $hashOid = Invoke-GitTextLocal @("hash-object", $dest)
  if ($hashOid.ToLowerInvariant() -ne $expectedOid.ToLowerInvariant()) {
    throw "BLOCKED_PRIOR_DRY_RUN_OID: materialized prior evidence OID mismatch"
  }
  return $dest
}

if (-not $RepoRoot) {
  $RepoRoot = (git rev-parse --show-toplevel 2>$null)
  if (-not $RepoRoot) { throw "RepoRoot required" }
}
if (-not $EvidenceOutDir) {
  $EvidenceOutDir = Join-Path $env:TEMP "frls-prod-apply-ceremony"
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
  # Stage-1 containment credential channel must never drive an FRLS apply.
  Assert-NoRetiredContainmentCredentialChannel

  $tip = Invoke-GitTextLocal @("rev-parse", "HEAD")
  $authJson = Invoke-GitTextLocal @("cat-file", "blob", "${tip}:docs/security/ra-pro-cutover-apply/TOOLING_AUTHORIZATION.json")
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
  # Prior dry-run pins are published only after the first authorized production
  # dry-run. Until then this ceremony has nothing to bind to and must refuse.
  if (-not (Test-PriorDryRunPinsPublished -Auth $auth)) {
    throw "BLOCKED_PRIOR_DRY_RUN_PINS_UNPUBLISHED: required_prior_dry_run_* pins are not published in TOOLING_AUTHORIZATION"
  }
  Write-Host ("Prior dry-run evidence pin: " + [string]$auth.required_prior_dry_run_evidence_sha256)

  # Tip-owned gate module + tip-sealed prior evidence BEFORE credential prompt / DB.
  Import-RaProPriorDryRunGatesFromTip -Auth $auth -PublicationTip $tip
  Write-Host "Prior-dry-run gate module materialized and verified from publication tip."

  $priorPath = Materialize-TipPriorDryRunEvidence -Auth $auth -PublicationTip $tip
  $priorMeta = Assert-PriorDryRunEvidence -Path $priorPath -Auth $auth
  Write-Host ("Prior dry-run evidence SHA verified from tip blob: " + $priorMeta.sha256)

  # Harness-only boundary: accept tip prior evidence then refuse before credentials/DB.
  $stopAfterPrior = [Environment]::GetEnvironmentVariable("RA_PRO_CUTOVER_CEREMONY_STOP_AFTER_PRIOR_EVIDENCE", "Process") -eq "1"
  if ($stopAfterPrior) {
    Write-Host "TEST_BOUNDARY_PRIOR_EVIDENCE_ACCEPTED"
    $interactiveClose = $false
    $resultCode = "TEST_BOUNDARY_STOP_AFTER_PRIOR_EVIDENCE"
    $parsed = [pscustomobject]@{
      evidence_source = "ceremony_test_boundary"
      result_code = $resultCode
      reason_code = $resultCode
      phase = "prior_dry_run_gate"
      databaseConnectionAttempts = 0
      sqlApplicationAttempts = 0
      advisory_lock_acquired = $false
      wrapper_observed = $true
      prior_dry_run_evidence_sha256 = [string]$priorMeta.sha256
    }
    throw "TEST_BOUNDARY_STOP_AFTER_PRIOR_EVIDENCE: prior tip evidence accepted; refuse credentials/DB under harness boundary"
  }

  $ne = $auth.native_entry
  if (-not $ne -or -not $ne.path -or -not $ne.oid -or -not $ne.sha256 -or -not $ne.bytes) {
    throw "AUTH_METADATA_INVALID: missing native_entry seals"
  }
  $entryOid = Invoke-GitTextLocal @("rev-parse", "${Freeze}:$($ne.path)")
  if ($entryOid -ne [string]$ne.oid) { throw "native_entry OID mismatch" }
  $entryTempDir = Join-Path $EvidenceOutDir ("entry-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $entryTempDir | Out-Null
  $entryPath = Join-Path $entryTempDir "enter-ra-pro-cutover-apply.ps1"
  $entryBytes = Materialize-GitBlob -Rel ([string]$ne.path) -Dest $entryPath
  $entrySha = Get-Sha256Bytes -Bytes $entryBytes
  if ($entrySha -ne ([string]$ne.sha256).ToLowerInvariant()) { throw "native_entry SHA-256 mismatch" }
  if ($entryBytes.Length -ne [int]$ne.bytes) { throw "native_entry bytes mismatch" }

  Write-Host "[1/3] Hidden credential input..."
  $allowSyntheticGate = [Environment]::GetEnvironmentVariable("RA_PRO_CUTOVER_CEREMONY_ALLOW_SYNTHETIC_URL", "Process") -eq "1"
  $hasExplicitSyntheticUrl = -not [string]::IsNullOrWhiteSpace($TestSyntheticDatabaseUrl)
  $useSyntheticNonInteractivePath = $false

  if ($hasExplicitSyntheticUrl) {
    if (-not $allowSyntheticGate) {
      throw "SYNTHETIC_URL_NOT_ALLOWED: set RA_PRO_CUTOVER_CEREMONY_ALLOW_SYNTHETIC_URL=1 for harness only"
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
    $secure = Read-Host -Prompt "RA_PRO_CUTOVER_APPLY_DATABASE_URL" -AsSecureString
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
  $env:RA_PRO_CUTOVER_APPLY_DATABASE_URL = $plain
  $plain = $null
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()

  $hostileCa = [Environment]::GetEnvironmentVariable("RA_PRO_CUTOVER_APPLY_SSL_ROOTCERT", "Process")
  if (-not [string]::IsNullOrWhiteSpace($hostileCa)) {
    throw "BLOCKED_TLS_CA_PATH_FORBIDDEN: RA_PRO_CUTOVER_APPLY_SSL_ROOTCERT is retired; trust root is embedded"
  }

  # Mode apply + exact sealed token only. Never dry-run. Never operator token override.
  $forwardList = New-Object System.Collections.Generic.List[string]
  [void]$forwardList.Add("--i-authorize-production-apply")
  [void]$forwardList.Add($exactToken)

  # FRLS forwards the sealed token and nothing else — there is no fixture Target #2
  # world here, so no harness-derived argv ever reaches the native entry.
  if (-not $useSyntheticNonInteractivePath) {
    $stillContaminated = @(Get-PresentHarnessContaminationEnv)
    if ($stillContaminated.Count -gt 0) {
      Clear-HarnessContaminationEnv
      throw ("BLOCKED_HARNESS_ENV_CONTAMINATION: harness env present before native entry: " + ($stillContaminated -join ","))
    }
  }

  # Never inherit harness gates into native entry / Node applicator child.
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
  $entryRun = Invoke-ProcessCapture -FileName (Get-System32PowerShell) -Arguments $entryArgs -WorkingDirectory $RepoRoot
  [System.IO.File]::WriteAllText($rawCapture, [string]$entryRun.Stdout)

  Write-Host "[3/3] Extracting RA_PRO_CUTOVER_EVIDENCE_V1 frame..."
  $proto = Join-Path $EvidenceOutDir "ra-pro-cutover-evidence.js"
  $decodeHelper = Join-Path $EvidenceOutDir "ra-pro-cutover-evidence-decode-frame.js"
  Materialize-GitBlob "scripts/security/ra-pro-cutover-evidence.js" $proto | Out-Null
  Materialize-GitBlob "scripts/security/ra-pro-cutover-evidence-decode-frame.js" $decodeHelper | Out-Null
  # Shared framing primitives the FRLS evidence module requires as a sibling.
  Materialize-GitBlob "scripts/security/containment-evidence-protocol.js" (Join-Path $EvidenceOutDir "containment-evidence-protocol.js") | Out-Null

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
  Clear-FrlsCredential
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
  Clear-FrlsMaterializedGates
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
    harness_derived_forward_args = $false
    databaseConnectionAttempts = $dbAttempts
    sqlApplicationAttempts = $sqlAttempts
    advisory_lock_acquired = $(if ($parsed -and $null -ne $parsed.advisory_lock_acquired) { [bool]$parsed.advisory_lock_acquired } else { $false })
    credential_redaction_confirmation = [ordered]@{
      operator_hidden_securestring_input = $true
      url_in_chat = $false
      url_in_argv = $false
      url_in_evidence = $false
      url_printed = $false
      process_env_cleared_after = (-not [bool]$env:RA_PRO_CUTOVER_APPLY_DATABASE_URL)
      securestring_zerofreed = $true
      ca_path_channel_retired = $true
      ca_path_env_absent = (-not [bool]$env:RA_PRO_CUTOVER_APPLY_SSL_ROOTCERT)
      ca_contents_not_in_argv = $true
      embedded_official_ca_only = $true
      apply_token_operator_supplied = $false
      apply_token_from_sealed_auth_only = $true
      retired_containment_channel_absent = (-not [bool]$env:CONTAINMENT_APPLY_DATABASE_URL)
      harness_env_absent_after = [string]::IsNullOrWhiteSpace(
        [Environment]::GetEnvironmentVariable("RA_PRO_CUTOVER_CEREMONY_ALLOW_SYNTHETIC_URL", "Process")
      )
    }
    cleanup = [ordered]@{
      credential_cleared = (-not [bool]$env:RA_PRO_CUTOVER_APPLY_DATABASE_URL)
      ca_path_env_absent = (-not [bool]$env:RA_PRO_CUTOVER_APPLY_SSL_ROOTCERT)
      retired_containment_channel_absent = (-not [bool]$env:CONTAINMENT_APPLY_DATABASE_URL)
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
    prior_dry_run_evidence_sha256 = $(if ($priorMeta) { [string]$priorMeta.sha256 } else { $null })
    databaseConnectionAttempts = $dbAttempts
    sqlApplicationAttempts = $sqlAttempts
    credential_cleared = (-not [bool]$env:RA_PRO_CUTOVER_APPLY_DATABASE_URL)
  }
  [IO.File]::WriteAllText((Join-Path $EvidenceOutDir "PRODUCTION_APPLY_SUMMARY.json"), ($summaryObj | ConvertTo-Json))
  [IO.File]::WriteAllText((Join-Path $EvidenceOutDir "CEREMONY_DONE.txt"), "result_code=$resultCode")

  foreach ($f in @("ra-pro-cutover-evidence-decode-frame.js", "ra-pro-cutover-evidence.js", "ra-pro-cutover-evidence-frame-tool.js", "containment-evidence-protocol.js")) {
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
