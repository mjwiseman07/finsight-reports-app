#Requires -Version 5.1
<#
.SYNOPSIS
  Operator ceremony for corrective production dry-run with byte-exact sealed evidence retention.
  Never ConvertTo-Json the sealed applicator frame. Never --apply.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-fA-F]{40}$')]
  [string]$PinTip,

  [Parameter(Mandatory = $false)]
  [string]$RepoRoot = "",

  [Parameter(Mandatory = $false)]
  [string]$EvidenceOutDir = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
try { Set-PSReadLineOption -HistorySaveStyle SaveNothing -ErrorAction SilentlyContinue | Out-Null } catch {}

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
  $RepoRoot = (git rev-parse --show-toplevel).Trim()
}
$RepoRoot = [IO.Path]::GetFullPath($RepoRoot)
$PinTip = $PinTip.ToLowerInvariant()
$DbEnv = "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_APPLY_DATABASE_URL"
$BundleRel = "scripts/security/bundles/ra-pro-accounting-automation-corrective-applicator.standalone.cjs"
$EvidenceModRel = "scripts/security/ra-pro-accounting-automation-corrective-evidence.js"
$DecodeRel = "scripts/security/ra-pro-accounting-automation-corrective-evidence-decode-frame.js"

$env:GIT_CONFIG_COUNT = "1"
$env:GIT_CONFIG_KEY_0 = "safe.directory"
$env:GIT_CONFIG_VALUE_0 = ($RepoRoot -replace '\\', '/')

@(
  "RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL",
  "DATABASE_URL",
  "RA_PRO_ACCOUNTING_AUTOMATION_APPLY_DATABASE_URL",
  "ENABLE_RA_PRO_ACCOUNTING_AUTOMATION",
  $DbEnv
) | ForEach-Object { Remove-Item -Path ("Env:" + $_) -ErrorAction SilentlyContinue }

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

if ([string]::IsNullOrWhiteSpace($EvidenceOutDir)) {
  $EvidenceOutDir = Join-Path $env:TEMP ("ra-acct-corrective-dryrun-" + [guid]::NewGuid().ToString("N"))
}
New-Item -ItemType Directory -Force -Path $EvidenceOutDir | Out-Null
$EvidencePath = Join-Path $EvidenceOutDir "CORRECTIVE_PRODUCTION_DRY_RUN_EVIDENCE.json"
$SummaryPath = Join-Path $EvidenceOutDir "CORRECTIVE_PRODUCTION_DRY_RUN_SUMMARY.json"
$RawPath = Join-Path $EvidenceOutDir "raw-child-stdout.frame.bin"
$BundleDir = Join-Path $env:TEMP ("ra-acct-corrective-bundle-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $BundleDir | Out-Null
$BundleFile = Join-Path $BundleDir "corrective-applicator.standalone.cjs"
$DecodeFile = Join-Path $EvidenceOutDir "decode-frame.js"
$EvidenceModFile = Join-Path $EvidenceOutDir "corrective-evidence.js"

$secure = $null
$bstr = [IntPtr]::Zero
$plain = $null
$nodeExit = -1
$retainOk = $false

try {
  $bundleBytes = Get-GitBlobBytes "${PinTip}:${BundleRel}"
  [IO.File]::WriteAllBytes($BundleFile, $bundleBytes)
  $rb = [IO.File]::ReadAllBytes($BundleFile)
  if ((Get-Sha256Bytes $rb) -ne (Get-Sha256Bytes $bundleBytes)) { throw "BUNDLE_MATERIALIZE_MISMATCH" }

  [IO.File]::WriteAllBytes($EvidenceModFile, (Get-GitBlobBytes "${PinTip}:${EvidenceModRel}"))
  [IO.File]::WriteAllBytes($DecodeFile, (Get-GitBlobBytes "${PinTip}:${DecodeRel}"))

  Write-Host "Paste Session Pooler URL into SecureString only. Never into chat."
  Write-Host ("Channel: " + $DbEnv)
  $secure = Read-Host -Prompt $DbEnv -AsSecureString
  if ($null -eq $secure -or $secure.Length -le 0) { throw "BLOCKED_CREDENTIAL_UNAVAILABLE" }
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  if ([string]::IsNullOrWhiteSpace($plain)) { throw "BLOCKED_CREDENTIAL_UNAVAILABLE" }
  Set-Item -Path ("Env:" + $DbEnv) -Value $plain

  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = (Get-Command node.exe).Source
  $psi.Arguments = "`"$BundleFile`" --dry-run"
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

  $p = [Diagnostics.Process]::Start($psi)
  $ms = New-Object IO.MemoryStream
  $p.StandardOutput.BaseStream.CopyTo($ms)
  $stderr = $p.StandardError.ReadToEnd()
  if (-not $p.WaitForExit(180000)) { try { $p.Kill() } catch {}; throw "NODE_DRY_RUN_TIMEOUT" }
  $nodeExit = $p.ExitCode
  $stdoutBytes = $ms.ToArray()
  [IO.File]::WriteAllBytes($RawPath, $stdoutBytes)
  if (-not [string]::IsNullOrWhiteSpace($stderr)) {
    Write-Host ("STDERR_LEN=" + $stderr.Length)
  }

  $node = (Get-Command node.exe).Source
  $decodeArgs = "`"$DecodeFile`" `"$EvidenceModFile`" `"$RawPath`" `"$EvidencePath`""
  $decode = Start-Process -FilePath $node -ArgumentList $decodeArgs -Wait -PassThru -NoNewWindow -RedirectStandardOutput (Join-Path $EvidenceOutDir "decode-out.json") -RedirectStandardError (Join-Path $EvidenceOutDir "decode-err.txt")
  $decodeJson = Get-Content -LiteralPath (Join-Path $EvidenceOutDir "decode-out.json") -Raw
  $decoded = $decodeJson | ConvertFrom-Json
  if (-not $decoded.ok) {
    throw ("CORRECTIVE_EVIDENCE_FRAME_INVALID:" + [string]$decoded.code)
  }
  $retainOk = $true
  # Summary only — never reserialize sealed frame
  $summary = [ordered]@{
    protocol = "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_DRY_RUN_CEREMONY_SUMMARY_V1"
    sealed_evidence_path = $EvidencePath
    sealed_evidence_sha256 = [string]$decoded.sha256
    sealed_evidence_bytes = [int]$decoded.bytes
    node_exit = $nodeExit
    pin_tip = $PinTip
    apply_authorized = $false
  }
  [IO.File]::WriteAllText($SummaryPath, (($summary | ConvertTo-Json -Depth 5) + "`n"))
  Write-Host ("EVIDENCE_PATH=" + $EvidencePath)
  Write-Host ("EVIDENCE_SHA256=" + $decoded.sha256)
  Write-Host ("EVIDENCE_BYTES=" + $decoded.bytes)
  Write-Host ("NODE_EXIT=" + $nodeExit)
}
finally {
  if ($bstr -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) | Out-Null
    $bstr = [IntPtr]::Zero
  }
  if ($null -ne $secure) { $secure.Dispose(); $secure = $null }
  $plain = $null
  Remove-Item -Path ("Env:" + $DbEnv) -ErrorAction SilentlyContinue
  if (Test-Path -LiteralPath $RawPath) { Remove-Item -LiteralPath $RawPath -Force -ErrorAction SilentlyContinue }
  if (Test-Path -LiteralPath $BundleDir) { Remove-Item -LiteralPath $BundleDir -Recurse -Force -ErrorAction SilentlyContinue }
  foreach ($f in @("decode-frame.js", "corrective-evidence.js", "decode-out.json", "decode-err.txt")) {
    $p = Join-Path $EvidenceOutDir $f
    if (Test-Path -LiteralPath $p) { Remove-Item -LiteralPath $p -Force -ErrorAction SilentlyContinue }
  }
}

if (-not $retainOk) { exit 2 }
if ($nodeExit -ne 0) { exit $nodeExit }
exit 0
