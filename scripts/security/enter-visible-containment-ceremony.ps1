#Requires -Version 5.1
<#
.SYNOPSIS
  External trust-root entry for the visible containment production dry-run ceremony.

.DESCRIPTION
  Preferred operator path:
    1) Materialize THIS script from tip git blob and verify against tip auth
       visible_ceremony_entry seals (OID/SHA-256/bytes).
    2) Invoke with absolute System32 powershell -File <materialized> -PrHead <freeze>.

  This entry:
    - loads tip TOOLING_AUTHORIZATION
    - requires -PrHead == authorized_pr_head (executable freeze)
    - materializes visible launcher + ceremony from freeze blobs
    - verifies OID/SHA-256/bytes against tip authorization
    - starts absolute trusted PowerShell executing only the verified launcher
    - never executes mutable worktree launcher/ceremony
    - never sets CONTAINMENT_APPLY_DATABASE_URL / never completes credential input

  Synthetic harness: -TestStubScript replaces ceremony materialization only AFTER
  tip/freeze/launcher seals pass (defense-in-depth still verifies launcher).

  When -WaitForPromptReady succeeds, this entry keeps waiting for the child to exit
  before clearing material-* (ceremony/stub may still need files until child exits).
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

  [Parameter(Mandatory = $false)]
  [switch]$WaitForPromptReady,

  [Parameter(Mandatory = $false)]
  [int]$PromptReadyTimeoutSec = 120,

  # Synthetic only — ceremony substitute after launcher seal verification.
  [Parameter(Mandatory = $false)]
  [string]$TestStubScript = "",

  # Optional supervisor correlation token (ignored by older launchers if unset).
  [Parameter(Mandatory = $false)]
  [string]$SupervisorSentinel = "",

  # Synthetic harness switches
  [Parameter(Mandatory = $false)]
  [switch]$TestForcePowerShellIdentityFail,

  [Parameter(Mandatory = $false)]
  [switch]$TestForceChildStartFail
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:materialRoot = $null
$script:childProc = $null
$script:PowerShellIdentity = $null

function ConvertTo-Base64Url([byte[]]$Bytes) {
  $b64 = [Convert]::ToBase64String($Bytes)
  return (($b64.TrimEnd('=')) -replace '\+', '-' -replace '/', '_')
}

function Get-Sha256Hex([byte[]]$Bytes) {
  $sha = [Security.Cryptography.SHA256]::Create()
  try {
    return ([BitConverter]::ToString($sha.ComputeHash($Bytes)) -replace "-", "").ToLowerInvariant()
  } finally { $sha.Dispose() }
}

function Write-EntryEvidence([hashtable]$Object) {
  $json = ($Object | ConvertTo-Json -Depth 20 -Compress)
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  [Console]::Out.WriteLine("CONTAINMENT_EVIDENCE_V1:" + (ConvertTo-Base64Url -Bytes $bytes))
  if ($EvidenceOutDir) {
    New-Item -ItemType Directory -Force -Path $EvidenceOutDir | Out-Null
    [IO.File]::WriteAllText((Join-Path $EvidenceOutDir "VISIBLE_ENTRY_EVIDENCE.json"), ($Object | ConvertTo-Json -Depth 20))
  }
}

function New-Blocked([string]$Code, [string]$Phase, [string]$Message, [hashtable]$Extra = @{}) {
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
      url_in_evidence    = $false
      url_in_argv        = $false
      values_undisclosed = $true
    }
  }
}

function Clear-MaterialRoot {
  if (-not $script:materialRoot) { return @{ cleaned = $true } }
  try {
    if (Test-Path -LiteralPath $script:materialRoot) {
      Remove-Item -LiteralPath $script:materialRoot -Recurse -Force -ErrorAction Stop
    }
    return @{ cleaned = -not (Test-Path -LiteralPath $script:materialRoot); path_redacted = $true }
  } catch {
    return @{ cleaned = $false; error = "cleanup_failed" }
  }
}

function Stop-ChildTree {
  if ($null -eq $script:childProc) { return @{ terminated = $true; had_child = $false } }
  try {
    if (-not $script:childProc.HasExited) {
      try { $script:childProc.Kill() } catch {}
      $tk = Join-Path $env:SystemRoot "System32\taskkill.exe"
      if (Test-Path -LiteralPath $tk) {
        Start-Process -FilePath $tk -ArgumentList @("/PID", [string]$script:childProc.Id, "/T", "/F") -WindowStyle Hidden -Wait -ErrorAction SilentlyContinue | Out-Null
      }
      try { [void]$script:childProc.WaitForExit(15000) } catch {}
    }
    return @{ terminated = [bool]$script:childProc.HasExited; had_child = $true }
  } catch {
    return @{ terminated = $false; had_child = $true }
  }
}

function Get-SanitizedPowerShellIdentity($Identity) {
  if ($null -eq $Identity) { return $null }
  return [ordered]@{
    basename            = $Identity.basename
    version             = $Identity.version
    authenticode_status = $Identity.authenticode_status
    signer_class        = $Identity.signer_class
    path_hijack_ignored = [bool]$Identity.path_hijack_ignored
  }
}

function Stop-Entry([string]$Code, [string]$Phase, [string]$Message, [hashtable]$Extra = @{}) {
  $child = Stop-ChildTree
  $mat = Clear-MaterialRoot
  if (-not $Extra.ContainsKey("powershell_identity")) {
    $Extra.powershell_identity = Get-SanitizedPowerShellIdentity $script:PowerShellIdentity
  }
  if (-not $Extra.ContainsKey("cleanup")) {
    $Extra.cleanup = @{ completed = $true; child = $child; materialization = $mat }
  }
  Write-EntryEvidence (New-Blocked -Code $Code -Phase $Phase -Message $Message -Extra $Extra)
  exit 2
}

function Assert-SafePath([string]$Name, [string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { Stop-Entry "BLOCKED_INPUT_INVALID" "input_validate" "$Name empty" }
  foreach ($ch in $Value.ToCharArray()) {
    $c = [int]$ch
    if ($c -eq 0 -or $c -eq 10 -or $c -eq 13) {
      Stop-Entry "BLOCKED_INPUT_INJECTION" "input_validate" "$Name control character"
    }
  }
}

function Format-Win32Argument([string]$Value) {
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
    if ($slashes -gt 0) { [void]$sb.Append([string]::new([char]92, $slashes)); $slashes = 0 }
    [void]$sb.Append($ch)
  }
  if ($slashes -gt 0) { [void]$sb.Append([string]::new([char]92, (2 * $slashes))) }
  [void]$sb.Append('"')
  return $sb.ToString()
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
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $p = New-Object Diagnostics.Process
  $p.StartInfo = $psi
  [void]$p.Start()
  $ms = New-Object IO.MemoryStream
  $p.StandardOutput.BaseStream.CopyTo($ms)
  $err = $p.StandardError.ReadToEnd()
  $p.WaitForExit()
  if ($p.ExitCode -ne 0) { throw "git failed: $err" }
  return $ms.ToArray()
}

function Invoke-GitText([string[]]$GitArgs, [string]$WorkDir) {
  return [Text.Encoding]::UTF8.GetString((Invoke-GitBytes -GitArgs $GitArgs -WorkDir $WorkDir)).Trim()
}

function Get-TrustedWindowsPowerShell {
  if ($TestForcePowerShellIdentityFail) {
    throw "synthetic powershell identity failure"
  }
  $sysRoot = [Environment]::GetEnvironmentVariable("SystemRoot", "Process")
  if ([string]::IsNullOrWhiteSpace($sysRoot)) { throw "SystemRoot missing" }
  $candidate = Join-Path $sysRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
  if (-not (Test-Path -LiteralPath $candidate)) { throw "System32 powershell.exe missing" }
  $item = Get-Item -LiteralPath $candidate -Force
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "powershell.exe reparse point" }
  if ($item.Extension -ne ".exe") { throw "powershell path is not .exe" }

  $pathResolved = $null
  try {
    $cmd = Get-Command -Name "powershell.exe" -CommandType Application -ErrorAction SilentlyContinue |
      Select-Object -First 1
    if ($cmd) { $pathResolved = [string]$cmd.Source }
  } catch {}
  $pathHijack = $false
  if ($pathResolved) {
    try {
      $pathHijack = ([IO.Path]::GetFullPath($pathResolved) -ne [IO.Path]::GetFullPath($candidate))
    } catch {
      $pathHijack = $true
    }
  }

  $sigStatus = "Unavailable"
  $sigSubjectClass = "unknown"
  $sig = Get-AuthenticodeSignature -FilePath $candidate
  $sigStatus = [string]$sig.Status
  if ($sig.SignerCertificate -and $sig.SignerCertificate.Subject) {
    if ($sig.SignerCertificate.Subject -match "Microsoft") { $sigSubjectClass = "microsoft" }
    else { $sigSubjectClass = "other" }
  }
  if ($sigStatus -eq "Valid" -and $sigSubjectClass -ne "microsoft") {
    throw "Authenticode signer is not Microsoft"
  }
  if ($sigStatus -eq "NotSigned" -or $sigStatus -eq "HashMismatch") {
    throw "Authenticode status=$sigStatus"
  }

  $ver = $null
  $fvi = [Diagnostics.FileVersionInfo]::GetVersionInfo($candidate)
  $ver = $fvi.FileVersion
  if ($fvi.CompanyName -and ($fvi.CompanyName -notmatch "Microsoft")) {
    throw "CompanyName is not Microsoft"
  }

  return [ordered]@{
    basename            = "powershell.exe"
    version             = $ver
    authenticode_status = $sigStatus
    signer_class        = $sigSubjectClass
    path_hijack_ignored = [bool]$pathHijack
    absolute_path       = $candidate
  }
}

function Assert-BlobSeal([string]$Freeze, [string]$Rel, $Seal, [string]$Dest, [string]$WorkDir) {
  if (-not $Seal -or -not $Seal.oid -or -not $Seal.sha256 -or -not $Seal.bytes -or -not $Seal.path) {
    throw "missing seal metadata for $Rel"
  }
  if ([string]$Seal.path -ne $Rel) { throw "seal path mismatch for $Rel" }
  $oid = Invoke-GitText -GitArgs @("rev-parse", "${Freeze}:${Rel}") -WorkDir $WorkDir
  if ($oid -ne [string]$Seal.oid) { throw "OID mismatch for $Rel" }
  $bytes = Invoke-GitBytes -GitArgs @("cat-file", "blob", "${Freeze}:${Rel}") -WorkDir $WorkDir
  if ($bytes.Length -ne [int]$Seal.bytes) { throw "bytes mismatch for $Rel" }
  $sha = Get-Sha256Hex -Bytes $bytes
  if ($sha -ne ([string]$Seal.sha256).ToLowerInvariant()) { throw "SHA-256 mismatch for $Rel" }
  [IO.File]::WriteAllBytes($Dest, $bytes)
  $item = Get-Item -LiteralPath $Dest -Force
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "materialized file is reparse point" }
  return @{ oid = $oid; sha256 = $sha; bytes = $bytes.Length }
}

# --- main ---
try {
  if (-not $RepoRoot) {
    $RepoRoot = Invoke-GitText -GitArgs @("rev-parse", "--show-toplevel") -WorkDir (Get-Location).Path
  }
  Assert-SafePath "RepoRoot" $RepoRoot
  if (-not $EvidenceOutDir) {
    $EvidenceOutDir = Join-Path $env:TEMP ("containment-prod-dryrun-" + [guid]::NewGuid().ToString("N"))
  }
  Assert-SafePath "EvidenceOutDir" $EvidenceOutDir
  New-Item -ItemType Directory -Force -Path $EvidenceOutDir | Out-Null

  Remove-Item Env:CONTAINMENT_APPLY_SSL_ROOTCERT -ErrorAction SilentlyContinue
  Remove-Item Env:NODE_TLS_REJECT_UNAUTHORIZED -ErrorAction SilentlyContinue
  Remove-Item Env:CONTAINMENT_APPLY_DATABASE_URL -ErrorAction SilentlyContinue

  $tip = Invoke-GitText -GitArgs @("rev-parse", "HEAD") -WorkDir $RepoRoot
  $authPath = "docs/security/connection-credential-browser-containment/TOOLING_AUTHORIZATION.json"
  $authJson = [Text.Encoding]::UTF8.GetString((Invoke-GitBytes -GitArgs @("cat-file", "blob", "${tip}:${authPath}") -WorkDir $RepoRoot))
  $auth = $authJson | ConvertFrom-Json

  if ([string]$auth.authorized_pr_head -ne $PrHead) {
    Stop-Entry "BLOCKED_PIN_MISMATCH" "tip_freeze_relation" "PrHead must equal authorized_pr_head (tooling freeze)"
  }
  if ([string]$authJson -match "PENDING_AFTER_COMMIT") {
    Stop-Entry "BLOCKED_PIN_MISMATCH" "tip_freeze_relation" "authorization still PENDING_AFTER_COMMIT"
  }

  $freeze = [string]$auth.authorized_pr_head
  $ve = $auth.visible_ceremony_entry
  $vl = $auth.visible_ceremony_launcher
  $oc = $auth.operator_ceremony
  if (-not $vl -or -not $oc) {
    Stop-Entry "AUTH_METADATA_INVALID" "load_auth" "missing visible_ceremony_launcher or operator_ceremony seals"
  }

  # Defense-in-depth: when tip publishes visible_ceremony_entry, verify this entry script.
  if ($ve -and $ve.sha256 -and $ve.bytes) {
    $entryPath = $PSCommandPath
    if ([string]::IsNullOrWhiteSpace($entryPath)) { $entryPath = $MyInvocation.MyCommand.Path }
    if ([string]::IsNullOrWhiteSpace($entryPath) -or -not (Test-Path -LiteralPath $entryPath)) {
      Stop-Entry "BLOCKED_SEAL_MISMATCH" "entry_self_verify" "entry path unavailable"
    }
    $entryItem = Get-Item -LiteralPath $entryPath -Force
    if ($entryItem.Attributes -band [IO.FileAttributes]::ReparsePoint) {
      Stop-Entry "BLOCKED_SEAL_MISMATCH" "entry_self_verify" "entry is a reparse point"
    }
    $entryBytes = [IO.File]::ReadAllBytes($entryPath)
    $entrySha = Get-Sha256Hex -Bytes $entryBytes
    if ($entrySha -ne ([string]$ve.sha256).ToLowerInvariant()) {
      Stop-Entry "BLOCKED_SEAL_MISMATCH" "entry_self_verify" "entry SHA-256 mismatch vs tip auth"
    }
    if ($entryBytes.Length -ne [int]$ve.bytes) {
      Stop-Entry "BLOCKED_SEAL_MISMATCH" "entry_self_verify" "entry bytes mismatch vs tip auth"
    }
  }

  $script:materialRoot = Join-Path $EvidenceOutDir ("material-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $script:materialRoot | Out-Null
  $launcherDest = Join-Path $script:materialRoot "launch-visible-containment-ceremony.ps1"
  $ceremonyDest = Join-Path $script:materialRoot "operator-containment-production-dryrun-ceremony.ps1"

  $launcherSeal = $null
  try {
    $launcherSeal = Assert-BlobSeal -Freeze $freeze -Rel "scripts/security/launch-visible-containment-ceremony.ps1" -Seal $vl -Dest $launcherDest -WorkDir $RepoRoot
  } catch {
    Stop-Entry "BLOCKED_SEAL_MISMATCH" "materialize_launcher" ([string]$_.Exception.Message)
  }

  $ceremonySha = [string]$oc.sha256
  $ceremonyBytes = [int]$oc.bytes
  if (-not [string]::IsNullOrWhiteSpace($TestStubScript)) {
    Assert-SafePath "TestStubScript" $TestStubScript
    if (-not (Test-Path -LiteralPath $TestStubScript)) {
      Stop-Entry "BLOCKED_INPUT_INVALID" "synthetic_stub" "TestStubScript missing"
    }
    # Copy stub into material root (never execute worktree path directly after copy).
    $ceremonyDest = Join-Path $script:materialRoot "synthetic-ceremony-stub.ps1"
    [IO.File]::WriteAllBytes($ceremonyDest, [IO.File]::ReadAllBytes($TestStubScript))
    $ceremonySha = Get-Sha256Hex -Bytes ([IO.File]::ReadAllBytes($ceremonyDest))
    $ceremonyBytes = ([IO.File]::ReadAllBytes($ceremonyDest)).Length
  } else {
    try {
      [void](Assert-BlobSeal -Freeze $freeze -Rel "scripts/security/operator-containment-production-dryrun-ceremony.ps1" -Seal $oc -Dest $ceremonyDest -WorkDir $RepoRoot)
    } catch {
      Stop-Entry "BLOCKED_SEAL_MISMATCH" "materialize_ceremony" ([string]$_.Exception.Message)
    }
  }

  try {
    $script:PowerShellIdentity = Get-TrustedWindowsPowerShell
  } catch {
    Stop-Entry "BLOCKED_POWERSHELL_IDENTITY" "powershell_resolve" ([string]$_.Exception.Message)
  }
  $psExe = [string]$script:PowerShellIdentity.absolute_path
  $psIdentitySanitized = Get-SanitizedPowerShellIdentity $script:PowerShellIdentity
  [IO.File]::WriteAllText(
    (Join-Path $EvidenceOutDir "VISIBLE_ENTRY_PS_IDENTITY.json"),
    ($psIdentitySanitized | ConvertTo-Json -Compress)
  )

  $launchArgs = @(
    (Format-Win32Argument "-NoProfile"),
    (Format-Win32Argument "-ExecutionPolicy"),
    (Format-Win32Argument "Bypass"),
    (Format-Win32Argument "-File"),
    (Format-Win32Argument $launcherDest),
    (Format-Win32Argument "-PrHead"),
    (Format-Win32Argument $freeze),
    (Format-Win32Argument "-RepoRoot"),
    (Format-Win32Argument $RepoRoot),
    (Format-Win32Argument "-EvidenceOutDir"),
    (Format-Win32Argument $EvidenceOutDir),
    (Format-Win32Argument "-CeremonyScriptPath"),
    (Format-Win32Argument $ceremonyDest),
    (Format-Win32Argument "-ExpectedCeremonySha256"),
    (Format-Win32Argument $ceremonySha),
    (Format-Win32Argument "-ExpectedCeremonyBytes"),
    (Format-Win32Argument ([string]$ceremonyBytes)),
    (Format-Win32Argument "-ExpectedLauncherSha256"),
    (Format-Win32Argument ([string]$launcherSeal.sha256)),
    (Format-Win32Argument "-ExpectedLauncherBytes"),
    (Format-Win32Argument ([string]$launcherSeal.bytes))
  )
  if ($WaitForPromptReady) {
    $launchArgs += (Format-Win32Argument "-WaitForPromptReady")
    $launchArgs += (Format-Win32Argument "-PromptReadyTimeoutSec")
    $launchArgs += (Format-Win32Argument ([string]$PromptReadyTimeoutSec))
  }
  if (-not [string]::IsNullOrWhiteSpace($SupervisorSentinel)) {
    Assert-SafePath "SupervisorSentinel" $SupervisorSentinel
    $launchArgs += (Format-Win32Argument "-SupervisorSentinel")
    $launchArgs += (Format-Win32Argument $SupervisorSentinel)
  }

  if ($TestForceChildStartFail) {
    Stop-Entry "BLOCKED_CHILD_START" "child_start" "synthetic child start failure" -Extra @{
      powershell_identity = $psIdentitySanitized
    }
  }

  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = $psExe
  $psi.Arguments = [string]::Join(" ", $launchArgs)
  $psi.WorkingDirectory = $RepoRoot
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $false

  try {
    $script:childProc = [Diagnostics.Process]::Start($psi)
  } catch {
    Stop-Entry "BLOCKED_CHILD_START" "child_start" ("Start failed: " + $_.Exception.Message) -Extra @{
      powershell_identity = $psIdentitySanitized
    }
  }
  if ($null -eq $script:childProc) {
    Stop-Entry "BLOCKED_CHILD_START" "child_start" "Process.Start returned null" -Extra @{
      powershell_identity = $psIdentitySanitized
    }
  }

  $started = ("pid={0}`n" -f $script:childProc.Id)
  if (-not [string]::IsNullOrWhiteSpace($SupervisorSentinel)) {
    $started += ("sentinel={0}`n" -f $SupervisorSentinel)
  }
  [IO.File]::WriteAllText((Join-Path $EvidenceOutDir "VISIBLE_ENTRY_STARTED.txt"), $started)

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
      $child = Stop-ChildTree
      $mat = Clear-MaterialRoot
      Write-EntryEvidence (New-Blocked -Code "BLOCKED_CHILD_EXIT" -Phase "prompt_wait" -Message ("child exited before PROMPT_READY exit=" + $script:childProc.ExitCode) -Extra @{
        powershell_identity = $psIdentitySanitized
        cleanup = @{ completed = $true; child = $child; materialization = $mat }
      })
      exit 2
    }
    Start-Sleep -Milliseconds 200
  }

  if (-not $sawReady) {
    $child = Stop-ChildTree
    $mat = Clear-MaterialRoot
    Write-EntryEvidence (New-Blocked -Code "BLOCKED_PROMPT_TIMEOUT" -Phase "prompt_wait" -Message "timeout waiting for PROMPT_READY" -Extra @{
      powershell_identity = $psIdentitySanitized
      cleanup = @{ completed = $true; child = $child; materialization = $mat }
    })
    exit 2
  }

  # Keep waiting for child exit before clearing material (stub/ceremony may still need files).
  while (-not $script:childProc.HasExited) {
    Start-Sleep -Milliseconds 200
  }
  try { [void]$script:childProc.WaitForExit(5000) } catch {}
  $exitCode = -1
  try { if ($script:childProc.HasExited) { $exitCode = [int]$script:childProc.ExitCode } } catch {}
  [IO.File]::WriteAllText((Join-Path $EvidenceOutDir "VISIBLE_ENTRY_EXIT_CODE.txt"), ([string]$exitCode))
  $mat = Clear-MaterialRoot
  if ($exitCode -ne 0) {
    Write-EntryEvidence (New-Blocked -Code "BLOCKED_CHILD_EXIT" -Phase "post_prompt" -Message ("child exit=" + $exitCode) -Extra @{
      powershell_identity = $psIdentitySanitized
      cleanup = @{ completed = $true; child = @{ terminated = $true; exit_code = $exitCode }; materialization = $mat }
    })
    exit 2
  }
  exit 0
}
catch {
  Stop-Entry "BLOCKED_VISIBLE_ENTRY" "entry" ([string]$_.Exception.Message)
}
