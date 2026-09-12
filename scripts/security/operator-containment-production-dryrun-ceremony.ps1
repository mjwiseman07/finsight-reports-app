#Requires -Version 5.1
<#
.SYNOPSIS
  Operator-assisted production dry-run ceremony for Stage-1 containment.
  Hidden SecureString URL injection + reviewed native entry.
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
  [string]$EvidenceOutDir = ""
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

function Clear-ContainmentCredential {
  Remove-Item Env:CONTAINMENT_APPLY_DATABASE_URL -ErrorAction SilentlyContinue
  [Environment]::SetEnvironmentVariable("CONTAINMENT_APPLY_DATABASE_URL", $null, "Process")
  if (Test-Path Env:DATABASE_URL) { Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue }
}

function Sanitize-Text([string]$Text) {
  if (-not $Text) { return $Text }
  $t = [regex]::Replace($Text, "postgres(?:ql)?://[^\s`"']+", "postgres://***")
  $t = [regex]::Replace($t, "CONTAINMENT_APPLY_DATABASE_URL\s*[:=]\s*\S+", "CONTAINMENT_APPLY_DATABASE_URL=***")
  $t = [regex]::Replace($t, "password=[^&\s]+", "password=***")
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

if (-not $RepoRoot) {
  $RepoRoot = (git rev-parse --show-toplevel 2>$null)
  if (-not $RepoRoot) { throw "RepoRoot required" }
}
if (-not $EvidenceOutDir) {
  $EvidenceOutDir = Join-Path $env:TEMP "containment-prod-dryrun-ceremony"
}
New-Item -ItemType Directory -Force -Path $EvidenceOutDir | Out-Null

$Freeze = $PrHead
$secure = $null
$bstr = [IntPtr]::Zero
$plain = $null
$resultCode = "BLOCKED_CREDENTIAL_UNAVAILABLE"
$parsed = $null
$rawCapture = Join-Path $EvidenceOutDir "raw-child-stdout.frame.txt"
$evidencePath = Join-Path $EvidenceOutDir "PRODUCTION_DRY_RUN_EVIDENCE.json"
$entryTempDir = $null
$entryPath = $null

Clear-Host
Write-Host "PR containment production dry-run ceremony"
Write-Host "Freeze -PrHead: $Freeze"
Write-Host "Mode: dry-run (no apply token)"
Write-Host "Paste an already-known URL at the hidden prompt. Do not paste into chat."

try {
  # Resolve tip authorization and materialize sealed native_entry from freeze.
  $tip = Invoke-GitTextLocal @("rev-parse", "HEAD")
  $authJson = Invoke-GitTextLocal @("cat-file", "blob", "${tip}:docs/security/connection-credential-browser-containment/TOOLING_AUTHORIZATION.json")
  $auth = $authJson | ConvertFrom-Json
  if ([string]$auth.authorized_pr_head -ne $Freeze) {
    throw "PIN_MISMATCH: -PrHead must equal tip authorized_pr_head (tooling freeze)"
  }
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
  [System.IO.File]::WriteAllText((Join-Path $EvidenceOutDir "PROMPT_READY.txt"), "awaiting_securestring_input")
  $secure = Read-Host -Prompt "CONTAINMENT_APPLY_DATABASE_URL" -AsSecureString
  Remove-Item -LiteralPath (Join-Path $EvidenceOutDir "PROMPT_READY.txt") -Force -ErrorAction SilentlyContinue
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

  Write-Host "[2/3] Invoking sealed native entry (dry-run)..."
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $output = & powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass `
    -File $entryPath -PrHead $Freeze -Mode dry-run 2>&1
  $ErrorActionPreference = $prev
  $combined = ($output | ForEach-Object { "$_" }) -join "`n"
  # Persist raw frame capture only until validated extraction
  [System.IO.File]::WriteAllText($rawCapture, $combined)

  Write-Host "[3/3] Extracting CONTAINMENT_EVIDENCE_V1 frame..."
  $proto = Join-Path $EvidenceOutDir "containment-evidence-protocol.js"
  $tool = Join-Path $EvidenceOutDir "containment-evidence-frame-tool.js"
  Materialize-GitBlob "scripts/security/containment-evidence-protocol.js" $proto | Out-Null
  Materialize-GitBlob "scripts/security/containment-evidence-frame-tool.js" $tool | Out-Null

  $node = (Get-Command -Name node.exe -CommandType Application | Select-Object -First 1).Source
  $parseOut = & $node $tool parse-and-enrich $rawCapture 2>&1
  $parseText = ($parseOut | ForEach-Object { "$_" }) -join "`n"

  # Decode frame to JSON for local evidence persistence
  $decodeJs = @'
const { extractEvidenceFrame } = require(process.argv[1]);
const fs = require("fs");
const r = extractEvidenceFrame(fs.readFileSync(process.argv[2], "utf8"));
if (!r.ok) {
  console.log(JSON.stringify({ ok: false, code: r.code, phase: r.phase }));
  process.exit(2);
}
console.log(JSON.stringify({ ok: true, evidence: r.evidence }));
'@
  $decodeFile = Join-Path $EvidenceOutDir "decode-once.js"
  [IO.File]::WriteAllText($decodeFile, $decodeJs)
  $decoded = & $node $decodeFile $proto $rawCapture 2>&1
  $decodedText = ($decoded | ForEach-Object { "$_" }) -join "`n"
  $decodedObj = $decodedText | ConvertFrom-Json
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
  $resultCode = if ($_.Exception.Message -match "PIN_MISMATCH") { "BLOCKED_PIN_MISMATCH" } else { "BLOCKED_CREDENTIAL_UNAVAILABLE" }
  Write-Host ("STOPPED: " + (Sanitize-Text ([string]$_.Exception.Message))) -ForegroundColor Red
  if (-not $parsed) {
    $parsed = [pscustomobject]@{
      evidence_source = "native_wrapper_fallback"
      result_code = $resultCode
      reason_code = $resultCode
      phase = "ceremony"
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
      process_env_cleared_after = (-not [bool]$env:CONTAINMENT_APPLY_DATABASE_URL)
      securestring_zerofreed = $true
    }
    cleanup = [ordered]@{
      credential_cleared = (-not [bool]$env:CONTAINMENT_APPLY_DATABASE_URL)
      raw_stdout_removed = $false
      evidence_local_only = $true
    }
    generated_at_utc = [DateTime]::UtcNow.ToString("o")
  }

  # Only after schema-bearing parse: delete raw capture
  if (Test-Path -LiteralPath $rawCapture) {
    Remove-Item -LiteralPath $rawCapture -Force -ErrorAction SilentlyContinue
  }
  $evidence.cleanup.raw_stdout_removed = -not (Test-Path -LiteralPath $rawCapture)

  $json = Sanitize-Text (($evidence | ConvertTo-Json -Depth 20))
  [IO.File]::WriteAllText($evidencePath, $json)
  $sha = Get-Sha256Text $json
  [IO.File]::WriteAllText((Join-Path $EvidenceOutDir "PRODUCTION_DRY_RUN_SUMMARY.json"), (Sanitize-Text (([ordered]@{
    result_code = $resultCode
    evidence_source = $src
    evidence_sha256 = $sha
    databaseConnectionAttempts = $dbAttempts
    sqlApplicationAttempts = $sqlAttempts
    credential_cleared = (-not [bool]$env:CONTAINMENT_APPLY_DATABASE_URL)
  } | ConvertTo-Json))))
  [IO.File]::WriteAllText((Join-Path $EvidenceOutDir "CEREMONY_DONE.txt"), "result_code=$resultCode")

  foreach ($f in @("decode-once.js", "containment-evidence-protocol.js", "containment-evidence-frame-tool.js")) {
    $p = Join-Path $EvidenceOutDir $f
    if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Force -ErrorAction SilentlyContinue }
  }

  Write-Host "RESULT: $resultCode"
  Write-Host "evidence_sha256: $sha"
  Write-Host "Press Enter to close..."
  [void](Read-Host)
}

exit $(if ($resultCode -eq "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION") { 0 } else { 2 })
