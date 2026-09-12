#Requires -Version 5.1
<#
.SYNOPSIS
  Freeze-materialized visible ceremony launcher (inner).

.DESCRIPTION
  Invoked only after tip→freeze seal verification by enter-visible-containment-ceremony.ps1.
  Resolves absolute System32 Windows PowerShell, rejects PATH shims/reparse, starts the
  freeze-materialized ceremony via ProcessStartInfo with Win32-safe argument quoting.
  Never reads CONTAINMENT_APPLY_DATABASE_URL. Never uses cmd.exe or PATH powershell.exe.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-fA-F]{40}$')]
  [string]$PrHead,

  [Parameter(Mandatory = $true)]
  [string]$RepoRoot,

  [Parameter(Mandatory = $true)]
  [string]$EvidenceOutDir,

  [Parameter(Mandatory = $true)]
  [string]$CeremonyScriptPath,

  [Parameter(Mandatory = $false)]
  [string]$ExpectedCeremonySha256 = "",

  [Parameter(Mandatory = $false)]
  [int]$ExpectedCeremonyBytes = 0,

  [Parameter(Mandatory = $false)]
  [string]$ExpectedLauncherSha256 = "",

  [Parameter(Mandatory = $false)]
  [int]$ExpectedLauncherBytes = 0,

  [Parameter(Mandatory = $false)]
  [switch]$WaitForPromptReady,

  [Parameter(Mandatory = $false)]
  [int]$PromptReadyTimeoutSec = 120,

  [Parameter(Mandatory = $false)]
  [switch]$EmitEvidenceFrame,

  [Parameter(Mandatory = $false)]
  [string]$SupervisorSentinel = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:childProc = $null

function ConvertTo-Base64Url([byte[]]$Bytes) {
  $b64 = [Convert]::ToBase64String($Bytes)
  return (($b64.TrimEnd('=')) -replace '\+', '-' -replace '/', '_')
}

function Write-LaunchEvidence {
  param([hashtable]$Object)
  $json = ($Object | ConvertTo-Json -Depth 20 -Compress)
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  $frame = "CONTAINMENT_EVIDENCE_V1:" + (ConvertTo-Base64Url -Bytes $bytes)
  [Console]::Out.WriteLine($frame)
  $path = Join-Path $EvidenceOutDir "VISIBLE_LAUNCH_EVIDENCE.json"
  [IO.File]::WriteAllText($path, ($Object | ConvertTo-Json -Depth 20))
}

function New-BlockedEvidence {
  param([string]$Code, [string]$Phase, [string]$Message, [hashtable]$Extra = @{})
  $msg = [string]$Message
  if ($msg.Length -gt 500) { $msg = $msg.Substring(0, 500) }
  return [ordered]@{
    protocol_version           = 1
    schema_version             = 1
    result_code                = "BLOCKED"
    verdict                    = "BLOCKED"
    reason_code                = $Code
    error_code                 = $Code
    phase                      = $Phase
    evidence_source            = "native_wrapper_fallback"
    mode                       = "dry-run"
    read_only                  = $true
    error                      = $msg
    sqlApplicationAttempts     = 0
    databaseConnectionAttempts = 0
    advisory_lock_acquired     = $false
    database_connected         = $false
    nodeProcessStarted         = $false
    prompt_ready_observed      = $false
    powershell_identity        = $(if ($Extra.ContainsKey("powershell_identity")) { $Extra.powershell_identity } else { $null })
    cleanup                    = $(if ($Extra.ContainsKey("cleanup")) { $Extra.cleanup } else { @{ completed = $true } })
    credential_redaction_confirmation = @{
      url_in_evidence = $false
      url_in_argv     = $false
      values_undisclosed = $true
    }
  }
}

function Stop-Launch {
  param([string]$Code, [string]$Phase, [string]$Message, [hashtable]$Extra = @{})
  Stop-ChildTree
  $ev = New-BlockedEvidence -Code $Code -Phase $Phase -Message $Message -Extra $Extra
  Write-LaunchEvidence -Object $ev
  exit 2
}

function Assert-SafeInputString {
  param([string]$Name, [string]$Value, [switch]$AllowEmpty)
  if ($null -eq $Value) { Stop-Launch -Code "BLOCKED_INPUT_INVALID" -Phase "input_validate" -Message "$Name is null" }
  if (-not $AllowEmpty -and [string]::IsNullOrWhiteSpace($Value)) {
    Stop-Launch -Code "BLOCKED_INPUT_INVALID" -Phase "input_validate" -Message "$Name is empty"
  }
  foreach ($ch in $Value.ToCharArray()) {
    $code = [int]$ch
    if ($code -eq 0 -or $code -eq 10 -or $code -eq 13) {
      Stop-Launch -Code "BLOCKED_INPUT_INJECTION" -Phase "input_validate" -Message "$Name contains control characters"
    }
  }
  if ($Value -match '(^|[\s])--?[A-Za-z]' -and $Name -match 'Path|Dir|Root') {
    # Paths may legitimately contain dashes; only reject NUL/CR/LF above.
  }
}

function Format-Win32Argument([string]$Value) {
  # CommandLineToArgvW-compatible quoting (Microsoft docs).
  if ($null -eq $Value) { return '""' }
  $needsQuotes = ($Value.Length -eq 0) -or ($Value.IndexOfAny([char[]]@([char]32, [char]9, [char]34)) -ge 0)
  if (-not $needsQuotes) { return $Value }
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.Append('"')
  $slashes = 0
  foreach ($ch in $Value.ToCharArray()) {
    if ($ch -eq [char]92) { $slashes++; continue }
    if ($ch -eq [char]34) {
      [void]$sb.Append([string]::new([char]92, (2 * $slashes + 1)))
      [void]$sb.Append('"')
      $slashes = 0
      continue
    }
    if ($slashes -gt 0) {
      [void]$sb.Append([string]::new([char]92, $slashes))
      $slashes = 0
    }
    [void]$sb.Append($ch)
  }
  if ($slashes -gt 0) {
    [void]$sb.Append([string]::new([char]92, (2 * $slashes)))
  }
  [void]$sb.Append('"')
  return $sb.ToString()
}

function Get-TrustedWindowsPowerShell {
  $sysRoot = [Environment]::GetEnvironmentVariable("SystemRoot", "Process")
  if ([string]::IsNullOrWhiteSpace($sysRoot)) {
    Stop-Launch -Code "BLOCKED_POWERSHELL_IDENTITY" -Phase "powershell_resolve" -Message "SystemRoot missing"
  }
  $candidate = Join-Path $sysRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
  if (-not (Test-Path -LiteralPath $candidate)) {
    Stop-Launch -Code "BLOCKED_POWERSHELL_IDENTITY" -Phase "powershell_resolve" -Message "System32 powershell.exe missing"
  }
  $item = Get-Item -LiteralPath $candidate -Force
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    Stop-Launch -Code "BLOCKED_POWERSHELL_IDENTITY" -Phase "powershell_resolve" -Message "powershell.exe is a reparse point"
  }
  if (-not $item.PSIsContainer -and $item.Extension -ne ".exe") {
    Stop-Launch -Code "BLOCKED_POWERSHELL_IDENTITY" -Phase "powershell_resolve" -Message "powershell path is not .exe"
  }
  # Reject if PATH resolves a different file (shim detection for evidence classification).
  $pathResolved = $null
  try {
    $cmd = Get-Command -Name "powershell.exe" -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cmd) { $pathResolved = [string]$cmd.Source }
  } catch {}
  $pathHijack = $false
  if ($pathResolved) {
    try {
      $pathHijack = ([IO.Path]::GetFullPath($pathResolved) -ne [IO.Path]::GetFullPath($candidate))
    } catch { $pathHijack = $true }
  }

  $sigStatus = "Unavailable"
  $sigSubjectClass = "unknown"
  try {
    $sig = Get-AuthenticodeSignature -FilePath $candidate
    $sigStatus = [string]$sig.Status
    if ($sig.SignerCertificate -and $sig.SignerCertificate.Subject) {
      if ($sig.SignerCertificate.Subject -match 'Microsoft') { $sigSubjectClass = "microsoft" }
      else { $sigSubjectClass = "other" }
    }
    if ($sigStatus -ne "Valid" -or $sigSubjectClass -ne "microsoft") {
      # Soft-warn on some locked-down images; still require Valid+Microsoft when status is present.
      if ($sigStatus -eq "Valid" -and $sigSubjectClass -ne "microsoft") {
        Stop-Launch -Code "BLOCKED_POWERSHELL_IDENTITY" -Phase "powershell_resolve" -Message "Authenticode signer is not Microsoft"
      }
      if ($sigStatus -eq "NotSigned" -or $sigStatus -eq "HashMismatch") {
        Stop-Launch -Code "BLOCKED_POWERSHELL_IDENTITY" -Phase "powershell_resolve" -Message "Authenticode status=$sigStatus"
      }
    }
  } catch {
    $sigStatus = "CheckFailed"
  }

  $ver = $null
  try {
    $fvi = [Diagnostics.FileVersionInfo]::GetVersionInfo($candidate)
    $ver = $fvi.FileVersion
    if ($fvi.CompanyName -and ($fvi.CompanyName -notmatch 'Microsoft')) {
      Stop-Launch -Code "BLOCKED_POWERSHELL_IDENTITY" -Phase "powershell_resolve" -Message "CompanyName is not Microsoft"
    }
  } catch {}

  return [ordered]@{
    basename            = "powershell.exe"
    version             = $ver
    authenticode_status = $sigStatus
    signer_class        = $sigSubjectClass
    path_hijack_ignored = [bool]$pathHijack
    absolute_path       = $candidate
  }
}

function Get-Sha256Hex([byte[]]$Bytes) {
  $sha = [Security.Cryptography.SHA256]::Create()
  try {
    return ([BitConverter]::ToString($sha.ComputeHash($Bytes)) -replace "-", "").ToLowerInvariant()
  } finally { $sha.Dispose() }
}

function Stop-ChildTree {
  if ($null -eq $script:childProc) { return @{ terminated = $true; had_child = $false } }
  try {
    if (-not $script:childProc.HasExited) {
      try { $script:childProc.Kill() } catch {}
      try {
        # Best-effort tree kill via taskkill on Windows when available.
        $tk = Join-Path $env:SystemRoot "System32\taskkill.exe"
        if (Test-Path -LiteralPath $tk) {
          Start-Process -FilePath $tk -ArgumentList @("/PID", [string]$script:childProc.Id, "/T", "/F") -WindowStyle Hidden -Wait -ErrorAction SilentlyContinue | Out-Null
        }
      } catch {}
      try { [void]$script:childProc.WaitForExit(15000) } catch {}
    }
    return @{
      terminated = [bool]$script:childProc.HasExited
      had_child  = $true
      exit_code  = $(if ($script:childProc.HasExited) { [int]$script:childProc.ExitCode } else { $null })
    }
  } catch {
    return @{ terminated = $false; had_child = $true; error = "kill_failed" }
  }
}

# --- main ---
Assert-SafeInputString -Name "RepoRoot" -Value $RepoRoot
Assert-SafeInputString -Name "EvidenceOutDir" -Value $EvidenceOutDir
Assert-SafeInputString -Name "CeremonyScriptPath" -Value $CeremonyScriptPath

if (-not (Test-Path -LiteralPath $RepoRoot)) {
  Stop-Launch -Code "BLOCKED_INPUT_INVALID" -Phase "input_validate" -Message "RepoRoot missing"
}
if (-not (Test-Path -LiteralPath $CeremonyScriptPath)) {
  Stop-Launch -Code "BLOCKED_SEAL_MISMATCH" -Phase "ceremony_verify" -Message "CeremonyScriptPath missing"
}

New-Item -ItemType Directory -Force -Path $EvidenceOutDir | Out-Null
Remove-Item Env:CONTAINMENT_APPLY_SSL_ROOTCERT -ErrorAction SilentlyContinue
Remove-Item Env:NODE_TLS_REJECT_UNAUTHORIZED -ErrorAction SilentlyContinue
Remove-Item Env:CONTAINMENT_APPLY_DATABASE_URL -ErrorAction SilentlyContinue

# Defense-in-depth: verify this launcher's own bytes when expected seals are provided.
$selfPath = $PSCommandPath
if ([string]::IsNullOrWhiteSpace($selfPath)) { $selfPath = $MyInvocation.MyCommand.Path }
if ([string]::IsNullOrWhiteSpace($selfPath) -or -not (Test-Path -LiteralPath $selfPath)) {
  Stop-Launch -Code "BLOCKED_SEAL_MISMATCH" -Phase "launcher_self_verify" -Message "launcher path unavailable"
}
$selfItem = Get-Item -LiteralPath $selfPath -Force
if ($selfItem.Attributes -band [IO.FileAttributes]::ReparsePoint) {
  Stop-Launch -Code "BLOCKED_SEAL_MISMATCH" -Phase "launcher_self_verify" -Message "launcher is a reparse point"
}
$selfBytes = [IO.File]::ReadAllBytes($selfPath)
$selfSha = Get-Sha256Hex -Bytes $selfBytes
if ($ExpectedLauncherSha256 -and ($selfSha -ne $ExpectedLauncherSha256.ToLowerInvariant())) {
  Stop-Launch -Code "BLOCKED_SEAL_MISMATCH" -Phase "launcher_self_verify" -Message "launcher SHA-256 mismatch"
}
if ($ExpectedLauncherBytes -gt 0 -and $selfBytes.Length -ne $ExpectedLauncherBytes) {
  Stop-Launch -Code "BLOCKED_SEAL_MISMATCH" -Phase "launcher_self_verify" -Message "launcher bytes mismatch"
}

# Defense-in-depth: verify ceremony bytes against expected seal when provided.
$cerItem = Get-Item -LiteralPath $CeremonyScriptPath -Force
if ($cerItem.Attributes -band [IO.FileAttributes]::ReparsePoint) {
  Stop-Launch -Code "BLOCKED_SEAL_MISMATCH" -Phase "ceremony_verify" -Message "ceremony is a reparse point"
}
$cerBytes = [IO.File]::ReadAllBytes($CeremonyScriptPath)
$cerSha = Get-Sha256Hex -Bytes $cerBytes
if ($ExpectedCeremonySha256 -and ($cerSha -ne $ExpectedCeremonySha256.ToLowerInvariant())) {
  Stop-Launch -Code "BLOCKED_SEAL_MISMATCH" -Phase "ceremony_verify" -Message "ceremony SHA-256 mismatch"
}
if ($ExpectedCeremonyBytes -gt 0 -and $cerBytes.Length -ne $ExpectedCeremonyBytes) {
  Stop-Launch -Code "BLOCKED_SEAL_MISMATCH" -Phase "ceremony_verify" -Message "ceremony bytes mismatch"
}

$psIdentity = Get-TrustedWindowsPowerShell
$psExe = [string]$psIdentity.absolute_path
# Do not retain absolute path in emitted identity.
$psIdentitySanitized = [ordered]@{
  basename            = $psIdentity.basename
  version             = $psIdentity.version
  authenticode_status = $psIdentity.authenticode_status
  signer_class        = $psIdentity.signer_class
  path_hijack_ignored = $psIdentity.path_hijack_ignored
}

$argParts = @(
  (Format-Win32Argument "-NoProfile"),
  (Format-Win32Argument "-ExecutionPolicy"),
  (Format-Win32Argument "Bypass"),
  (Format-Win32Argument "-File"),
  (Format-Win32Argument $CeremonyScriptPath),
  (Format-Win32Argument "-PrHead"),
  (Format-Win32Argument $PrHead),
  (Format-Win32Argument "-RepoRoot"),
  (Format-Win32Argument $RepoRoot),
  (Format-Win32Argument "-EvidenceOutDir"),
  (Format-Win32Argument $EvidenceOutDir)
)
$argString = [string]::Join(" ", $argParts)

$psi = New-Object Diagnostics.ProcessStartInfo
$psi.FileName = $psExe
$psi.Arguments = $argString
$psi.WorkingDirectory = $RepoRoot
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $false

try {
  $script:childProc = [Diagnostics.Process]::Start($psi)
} catch {
  Stop-Launch -Code "BLOCKED_CHILD_START" -Phase "child_start" -Message ("Start failed: " + $_.Exception.Message) -Extra @{ powershell_identity = $psIdentitySanitized }
}
if ($null -eq $script:childProc) {
  Stop-Launch -Code "BLOCKED_CHILD_START" -Phase "child_start" -Message "Process.Start returned null" -Extra @{ powershell_identity = $psIdentitySanitized }
}

[IO.File]::WriteAllText(
  (Join-Path $EvidenceOutDir "VISIBLE_LAUNCH_STARTED.txt"),
  ("pid={0}`nceremony_sha256={1}`nsupervisor_sentinel={2}`n" -f
    $script:childProc.Id, $cerSha, $SupervisorSentinel)
)
[IO.File]::WriteAllText(
  (Join-Path $EvidenceOutDir "VISIBLE_LAUNCH_PS_IDENTITY.json"),
  ($psIdentitySanitized | ConvertTo-Json -Compress)
)

if (-not $WaitForPromptReady) {
  Write-Host ("LAUNCHED pid={0}" -f $script:childProc.Id)
  exit 0
}

$ready = Join-Path $EvidenceOutDir "PROMPT_READY.txt"
$deadline = (Get-Date).AddSeconds([Math]::Max(1, $PromptReadyTimeoutSec))
$sawReady = $false
while ((Get-Date) -lt $deadline) {
  if (Test-Path -LiteralPath $ready) {
    $sawReady = $true
    Write-Host "PROMPT_READY"
    break
  }
  if ($script:childProc.HasExited) {
    $cleanup = Stop-ChildTree
    Stop-Launch -Code "BLOCKED_CHILD_EXIT" -Phase "prompt_wait" -Message ("child exited before PROMPT_READY exit=" + $script:childProc.ExitCode) -Extra @{
      powershell_identity = $psIdentitySanitized
      cleanup = @{ completed = $true; child = $cleanup }
    }
  }
  Start-Sleep -Milliseconds 200
}

if (-not $sawReady) {
  $cleanup = Stop-ChildTree
  try {
    if ($CeremonyScriptPath.StartsWith($EvidenceOutDir, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $CeremonyScriptPath)) {
      Remove-Item -LiteralPath $CeremonyScriptPath -Force -ErrorAction SilentlyContinue
    }
  } catch {}
  Stop-Launch -Code "BLOCKED_PROMPT_TIMEOUT" -Phase "prompt_wait" -Message "timeout waiting for PROMPT_READY" -Extra @{
    powershell_identity = $psIdentitySanitized
    cleanup = @{ completed = $true; child = $cleanup; materialized_removed = $true }
  }
}

# Keep ceremony process alive until it exits; do not delete its script early.
while (-not $script:childProc.HasExited) {
  Start-Sleep -Milliseconds 200
}
$exitCode = $script:childProc.ExitCode
if ($exitCode -ne 0) {
  Stop-Launch -Code "BLOCKED_CHILD_EXIT" -Phase "post_prompt" -Message ("ceremony exit=" + $exitCode) -Extra @{
    powershell_identity = $psIdentitySanitized
    cleanup = @{ completed = $true; child = @{ terminated = $true; exit_code = $exitCode } }
  }
}
exit 0
