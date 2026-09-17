#Requires -Version 5.1
<#
.SYNOPSIS
  Operator-assisted production dry-run ceremony for RA Pro billing-company cutover (FRLS).
  Hidden SecureString URL injection + reviewed native entry.
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

  # Test harness only: loopback synthetic URL when RA_PRO_CUTOVER_CEREMONY_ALLOW_SYNTHETIC_URL=1
  [Parameter(Mandatory = $false)]
  [string]$TestSyntheticDatabaseUrl = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

try { Set-PSReadLineOption -HistorySaveStyle SaveNothing -ErrorAction SilentlyContinue | Out-Null } catch {}

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
  # Retired channel — clear if a hostile process left it set.
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
  # Never run over serialized JSON with greedy \S+ — it eats closing quotes.
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
  if ($msg -match "PIN_MISMATCH") {
    return @{ code = "BLOCKED_PIN_MISMATCH"; phase = "ceremony_pin" }
  }
  if ($msg -match "PRECONDITION_PINS_UNPUBLISHED|PRECONDITION_EVIDENCE_|BLOCKED_PRECONDITION_GATE") {
    return @{ code = "PRECONDITION_PINS_UNPUBLISHED"; phase = "precondition_gate" }
  }
  if ($msg -match "BLOCKED_HARNESS_ENV_CONTAMINATION") {
    return @{ code = "BLOCKED_HARNESS_ENV_CONTAMINATION"; phase = "harness_contamination_gate" }
  }
  if ($msg -match "BLOCKED_RETIRED_CREDENTIAL_CHANNEL") {
    return @{ code = "BLOCKED_RETIRED_CREDENTIAL_CHANNEL"; phase = "credential_channel_gate" }
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
  # RA Pro cutover has no fixture Target#2 world; synthetic-URL gate (+ optional harness URL) are the only harness channels.
  return @(
    "RA_PRO_CUTOVER_CEREMONY_ALLOW_SYNTHETIC_URL",
    "RA_PRO_CUTOVER_CEREMONY_TEST_SYNTHETIC_DATABASE_URL"
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

if (-not $RepoRoot) {
  $RepoRoot = (git rev-parse --show-toplevel 2>$null)
  if (-not $RepoRoot) { throw "RepoRoot required" }
}
if (-not $EvidenceOutDir) {
  $EvidenceOutDir = Join-Path $env:TEMP "frls-prod-dryrun-ceremony"
}
New-Item -ItemType Directory -Force -Path $EvidenceOutDir | Out-Null

$Freeze = $PrHead
$secure = $null
$bstr = [IntPtr]::Zero
$plain = $null
$resultCode = "CEREMONY_FAILED"
$parsed = $null
$rawCapture = Join-Path $EvidenceOutDir "raw-child-stdout.frame.txt"
$evidencePath = Join-Path $EvidenceOutDir "PRODUCTION_DRY_RUN_EVIDENCE.json"
$entryTempDir = $null
$entryPath = $null
$interactiveClose = $true

Clear-Host
Write-Host "FRLS lead-session production dry-run ceremony"
Write-Host "Freeze -PrHead: $Freeze"
Write-Host "Mode: dry-run (no apply token)"
Write-Host "Paste an already-known URL at the hidden prompt. Do not paste into chat."
Write-Host "Verified TLS uses the freeze-sealed embedded official Supabase CA (no CA path)."

$script:RaProPreconditionGatesTempDir = $null
$script:RaProPreconditionGatesLoaded = $false

function Clear-RaProPreconditionGates {
  $script:RaProPreconditionGatesLoaded = $false
  if ($script:RaProPreconditionGatesTempDir -and (Test-Path -LiteralPath $script:RaProPreconditionGatesTempDir)) {
    Remove-Item -LiteralPath $script:RaProPreconditionGatesTempDir -Recurse -Force -ErrorAction SilentlyContinue
  }
  $script:RaProPreconditionGatesTempDir = $null
}

function Import-RaProPreconditionGatesFromFreeze {
  param([object]$Auth)

  if ($script:RaProPreconditionGatesLoaded) { return }

  $seal = $Auth.precondition_gates
  if (-not $seal -or -not $seal.path -or -not $seal.oid -or -not $seal.sha256 -or -not $seal.bytes) {
    throw "BLOCKED_PRECONDITION_GATE_MODULE_SEAL: TOOLING_AUTHORIZATION.precondition_gates incomplete"
  }
  $rel = [string]$seal.path
  if ($rel -ne "scripts/security/ra-pro-cutover-precondition-gates.ps1") {
    throw "BLOCKED_PRECONDITION_GATE_MODULE_SEAL: unexpected precondition_gates.path"
  }
  if ([string]::IsNullOrWhiteSpace($Freeze) -or $Freeze -notmatch '^[0-9a-fA-F]{40}$') {
    throw "BLOCKED_PRECONDITION_GATE_MODULE_SEAL: freeze identity required before gate materialization"
  }

  $oid = Invoke-GitTextLocal @("rev-parse", "${Freeze}:${rel}")
  if ($oid -ne [string]$seal.oid) {
    throw "BLOCKED_PRECONDITION_GATE_MODULE_OID: freeze gate module OID mismatch"
  }

  $script:RaProPreconditionGatesTempDir = Join-Path $EvidenceOutDir ("precond-gates-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $script:RaProPreconditionGatesTempDir | Out-Null
  $dest = Join-Path $script:RaProPreconditionGatesTempDir "ra-pro-cutover-precondition-gates.ps1"
  $blobBytes = Materialize-GitBlob -Rel $rel -Dest $dest
  $sha = Get-Sha256Bytes -Bytes $blobBytes
  if ($sha -ne ([string]$seal.sha256).ToLowerInvariant()) {
    throw "BLOCKED_PRECONDITION_GATE_MODULE_SHA: freeze gate module SHA-256 mismatch"
  }
  if ($blobBytes.Length -ne [int]$seal.bytes) {
    throw "BLOCKED_PRECONDITION_GATE_MODULE_BYTES: freeze gate module byte count mismatch"
  }
  $item = Get-Item -LiteralPath $dest -Force
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    throw "BLOCKED_PRECONDITION_GATE_MODULE_REPARSE: materialized gate module is a reparse point"
  }
  if ($item.PSIsContainer -or $item.Extension -ne ".ps1") {
    throw "BLOCKED_PRECONDITION_GATE_MODULE_TYPE: materialized gate module must be a .ps1 file"
  }
  $hashOid = Invoke-GitTextLocal @("hash-object", $dest)
  if ($hashOid -ne [string]$seal.oid) {
    throw "BLOCKED_PRECONDITION_GATE_MODULE_OID: materialized content OID mismatch"
  }

  $gateText = [IO.File]::ReadAllText($dest)
  $gateScript = $ExecutionContext.InvokeCommand.NewScriptBlock($gateText)
  . $gateScript
  foreach ($name in @(
      "Assert-RaProPreconditionEvidencePublished",
      "Assert-RaProPreconditionEvidence"
    )) {
    $cmd = Get-Command -Name $name -CommandType Function -ErrorAction SilentlyContinue
    if (-not $cmd) {
      throw ("BLOCKED_PRECONDITION_GATE_MODULE_LOAD: " + $name + " missing after sealed dotsource")
    }
    Set-Item -Path ("function:script:" + $name) -Value $cmd.ScriptBlock
  }
  $script:RaProPreconditionGatesLoaded = $true
}

try {
  # Stage-1 containment credential channel must never drive an FRLS ceremony.
  Assert-NoRetiredContainmentCredentialChannel

  # Resolve tip authorization and materialize sealed native_entry from freeze.
  $tip = Invoke-GitTextLocal @("rev-parse", "HEAD")
  $authJson = Invoke-GitTextLocal @("cat-file", "blob", "${tip}:docs/security/ra-pro-cutover-apply/TOOLING_AUTHORIZATION.json")
  $auth = $authJson | ConvertFrom-Json
  if ([string]$auth.authorized_pr_head -ne $Freeze) {
    throw "PIN_MISMATCH: -PrHead must equal tip authorized_pr_head (tooling freeze)"
  }

  # Fresh precondition pins: refuse before SecureString / Node / DB when unpublished.
  # Distinct from prior-dry-run pins (apply-only). Materialize gate module from freeze seals.
  # Evidence bytes come only from tip-sealed fixture path (git cat-file), never env/argv/worktree authority.
  Import-RaProPreconditionGatesFromFreeze -Auth $auth
  Assert-RaProPreconditionEvidencePublished -Auth $auth

  $hostilePrecondPath = [Environment]::GetEnvironmentVariable("RA_PRO_CUTOVER_PRECONDITION_EVIDENCE_PATH", "Process")
  if (-not [string]::IsNullOrWhiteSpace($hostilePrecondPath)) {
    throw "PRECONDITION_EVIDENCE_PATH_OVERRIDE_FORBIDDEN: RA_PRO_CUTOVER_PRECONDITION_EVIDENCE_PATH must not be set; tip-sealed fixture only"
  }

  $pubPre = $auth.published_precondition_evidence
  if ($null -eq $pubPre) {
    throw "PRECONDITION_EVIDENCE_INVALID: published_precondition_evidence missing"
  }
  $precondRel = [string]$pubPre.evidence_fixture_path
  if ([string]::IsNullOrWhiteSpace($precondRel)) {
    throw "PRECONDITION_EVIDENCE_INVALID: published_precondition_evidence.evidence_fixture_path required"
  }
  if ($precondRel -ne "tests/security/helpers/fixtures/ra-pro-cutover-precondition-evidence.json") {
    throw "PRECONDITION_EVIDENCE_INVALID: unexpected evidence_fixture_path"
  }
  $expectedPrecondSha = ([string]$auth.required_precondition_evidence_sha256).ToLowerInvariant()
  $expectedPrecondBytes = [int]$pubPre.evidence_bytes
  if ($expectedPrecondBytes -le 0) {
    throw "PRECONDITION_EVIDENCE_INVALID: published_precondition_evidence.evidence_bytes required"
  }

  $precondTempDir = Join-Path $EvidenceOutDir ("precond-ev-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $precondTempDir | Out-Null
  $precondPath = Join-Path $precondTempDir "ra-pro-cutover-precondition-evidence.json"

  $psiPre = New-Object Diagnostics.ProcessStartInfo
  $psiPre.FileName = "git"
  $psiPre.Arguments = "cat-file blob ${tip}:$precondRel"
  $psiPre.WorkingDirectory = $RepoRoot
  $psiPre.RedirectStandardOutput = $true
  $psiPre.RedirectStandardError = $true
  $psiPre.UseShellExecute = $false
  $psiPre.CreateNoWindow = $true
  $pPre = [Diagnostics.Process]::Start($psiPre)
  $msPre = New-Object IO.MemoryStream
  $pPre.StandardOutput.BaseStream.CopyTo($msPre)
  $errPre = $pPre.StandardError.ReadToEnd()
  $pPre.WaitForExit()
  if ($pPre.ExitCode -ne 0) {
    throw ("BLOCKED_PRECONDITION_EVIDENCE_BLOB: git cat-file failed for tip evidence fixture: " + $errPre)
  }
  $precondBytes = $msPre.ToArray()
  if ($precondBytes.Length -ne $expectedPrecondBytes) {
    throw "PRECONDITION_EVIDENCE_SHA_MISMATCH: tip evidence fixture byte count mismatch"
  }
  $precondSha = Get-Sha256Bytes -Bytes $precondBytes
  if ($precondSha -ne $expectedPrecondSha) {
    throw "PRECONDITION_EVIDENCE_SHA_MISMATCH: tip evidence fixture SHA-256 mismatch"
  }
  [IO.File]::WriteAllBytes($precondPath, $precondBytes)
  $precondItem = Get-Item -LiteralPath $precondPath -Force
  if ($precondItem.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    throw "PRECONDITION_EVIDENCE_INVALID: materialized evidence path is a reparse point"
  }

  Assert-RaProPreconditionEvidence -Path $precondPath -Auth $auth

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
  $envSyntheticUrl = [Environment]::GetEnvironmentVariable("RA_PRO_CUTOVER_CEREMONY_TEST_SYNTHETIC_DATABASE_URL", "Process")
  $hasExplicitSyntheticUrl = -not [string]::IsNullOrWhiteSpace($TestSyntheticDatabaseUrl)
  $hasEnvSyntheticUrl = -not [string]::IsNullOrWhiteSpace($envSyntheticUrl)
  if ($hasExplicitSyntheticUrl -or $hasEnvSyntheticUrl) {
    if (-not $allowSyntheticGate) {
      throw "SYNTHETIC_URL_NOT_ALLOWED: set RA_PRO_CUTOVER_CEREMONY_ALLOW_SYNTHETIC_URL=1 for harness only"
    }
    $interactiveClose = $false
    $syntheticUrl = $(if ($hasExplicitSyntheticUrl) { $TestSyntheticDatabaseUrl } else { $envSyntheticUrl })
    if ($syntheticUrl -notmatch '^postgres(?:ql)?://.+@127\.0\.0\.1(?::\d+)?/') {
      throw "TEST_URL_NOT_LOOPBACK: synthetic ceremony URL must target 127.0.0.1"
    }
    # Visible-path WaitForPromptReady observes this marker; synthetic harness never blocks on Read-Host.
    [System.IO.File]::WriteAllText((Join-Path $EvidenceOutDir "PROMPT_READY.txt"), "synthetic_harness_ready")
    $secure = ConvertTo-SecureString -String $syntheticUrl -AsPlainText -Force
  } else {
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

  # Fail closed if retired CA-path channel is present (trust root is embedded).
  $hostileCa = [Environment]::GetEnvironmentVariable("RA_PRO_CUTOVER_APPLY_SSL_ROOTCERT", "Process")
  if (-not [string]::IsNullOrWhiteSpace($hostileCa)) {
    throw "BLOCKED_TLS_CA_PATH_FORBIDDEN: RA_PRO_CUTOVER_APPLY_SSL_ROOTCERT is retired; trust root is embedded"
  }

  # Never inherit harness fixture gates into native entry / Node applicator child.
  Clear-HarnessContaminationEnv

  Write-Host "[2/3] Invoking sealed native entry (dry-run)..."
  # Separate stdout/stderr — never merge with 2>&1 (pollutes RA_PRO_CUTOVER_EVIDENCE_V1 frame)
  $entryArgs = @(
    "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
    "-File", "`"$entryPath`"",
    "-PrHead", $Freeze,
    "-Mode", "dry-run"
  ) -join " "
  $entryRun = Invoke-ProcessCapture -FileName (Get-System32PowerShell) -Arguments $entryArgs -WorkingDirectory $RepoRoot
  [System.IO.File]::WriteAllText($rawCapture, [string]$entryRun.Stdout)

  Write-Host "[3/3] Extracting RA_PRO_CUTOVER_EVIDENCE_V1 frame..."
  $proto = Join-Path $EvidenceOutDir "ra-pro-cutover-evidence.js"
  $decodeHelper = Join-Path $EvidenceOutDir "ra-pro-cutover-evidence-decode-frame.js"
  Materialize-GitBlob "scripts/security/ra-pro-cutover-evidence.js" $proto | Out-Null
  Materialize-GitBlob "scripts/security/ra-pro-cutover-evidence-decode-frame.js" $decodeHelper | Out-Null
  # Shared framing primitives the FRLS evidence module requires as a sibling.
  Materialize-GitBlob "scripts/security/containment-evidence-protocol.js" (Join-Path $EvidenceOutDir "containment-evidence-protocol.js") | Out-Null

  $node = (Get-Command -Name node.exe -CommandType Application | Select-Object -First 1).Source
  $decodeArgs = "`"$decodeHelper`" `"$proto`" `"$rawCapture`""
  $decodedRun = Invoke-ProcessCapture -FileName $node -Arguments $decodeArgs -WorkingDirectory $EvidenceOutDir
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
    $resultCode = "DRY_RUN_BLOCKED"
    $parsed = [pscustomobject]@{
      evidence_source = "native_wrapper_fallback"
      result_code = "DRY_RUN_BLOCKED"
      reason_code = [string]$decodedObj.code
      phase = [string]$decodedObj.phase
      databaseConnectionAttempts = $null
      sqlApplicationAttempts = $null
      advisory_lock_acquired = $false
      wrapper_observed = $true
    }
  } else {
    $parsed = $decodedObj.evidence
    if ($parsed.result_code -eq "DRY_RUN_READY" -or $parsed.verdict -eq "DRY_RUN_READY") {
      $resultCode = "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION"
    } elseif ($parsed.result_code) {
      $resultCode = [string]$parsed.result_code
    } else {
      $resultCode = "DRY_RUN_BLOCKED"
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
  Clear-RaProPreconditionGates
  $plain = $null
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
    authorization_scope = "operator_assisted_production_dry_run_only"
    result_code = $resultCode
    evidence_source = $src
    applicator = $parsed
    mode = "dry-run"
    freeze = $Freeze
    databaseConnectionAttempts = $dbAttempts
    sqlApplicationAttempts = $sqlAttempts
    advisory_lock_acquired = $(if ($parsed -and $null -ne $parsed.advisory_lock_acquired) { [bool]$parsed.advisory_lock_acquired } else { $false })
    credential_redaction_confirmation = [ordered]@{
      operator_hidden_securestring_input = $true
      url_in_chat = $false
      url_in_argv = $false
      url_in_evidence = $false
      url_printed = $false
      values_undisclosed = $true
      process_env_cleared_after = (-not [bool]$env:RA_PRO_CUTOVER_APPLY_DATABASE_URL)
      securestring_zerofreed = $true
      ca_path_channel_retired = $true
      ca_path_env_absent = (-not [bool]$env:RA_PRO_CUTOVER_APPLY_SSL_ROOTCERT)
      ca_contents_not_in_argv = $true
      embedded_official_ca_only = $true
      retired_containment_channel_absent = (-not [bool]$env:CONTAINMENT_APPLY_DATABASE_URL)
    }
    cleanup = [ordered]@{
      credential_cleared = (-not [bool]$env:RA_PRO_CUTOVER_APPLY_DATABASE_URL)
      ca_path_env_absent = (-not [bool]$env:RA_PRO_CUTOVER_APPLY_SSL_ROOTCERT)
      retired_containment_channel_absent = (-not [bool]$env:CONTAINMENT_APPLY_DATABASE_URL)
      raw_stdout_removed = $false
      evidence_local_only = $true
      completed = $true
    }
    generated_at_utc = [DateTime]::UtcNow.ToString("o")
  }

  if (Test-Path -LiteralPath $rawCapture) {
    Remove-Item -LiteralPath $rawCapture -Force -ErrorAction SilentlyContinue
  }
  $evidence.cleanup.raw_stdout_removed = -not (Test-Path -LiteralPath $rawCapture)

  # Applicator evidence is already recursively sanitized. Do not regex-rewrite the
  # full JSON document (prior \S+ scrub ate closing quotes and broke parsers).
  $json = ($evidence | ConvertTo-Json -Depth 20)
  [IO.File]::WriteAllText($evidencePath, $json)
  $sha = Get-Sha256Text $json
  $summaryObj = [ordered]@{
    result_code = $resultCode
    evidence_source = $src
    evidence_sha256 = $sha
    databaseConnectionAttempts = $dbAttempts
    sqlApplicationAttempts = $sqlAttempts
    credential_cleared = (-not [bool]$env:RA_PRO_CUTOVER_APPLY_DATABASE_URL)
  }
  [IO.File]::WriteAllText((Join-Path $EvidenceOutDir "PRODUCTION_DRY_RUN_SUMMARY.json"), ($summaryObj | ConvertTo-Json))
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

exit $(if ($resultCode -eq "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION") { 0 } else { 2 })
