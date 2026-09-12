#Requires -Version 5.1
<#
.SYNOPSIS
  External supervisor for the visible containment ceremony.

.DESCRIPTION
  Remains alive independently of the visible enter/ceremony window.
  Loads tip TOOLING_AUTHORIZATION, materializes the sealed entry blob into
  EvidenceOutDir/material-supervisor-*/enter-visible-containment-ceremony.ps1,
  and starts that entry under a Windows Job Object with ONLY
  JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE (0x2000). BREAKAWAY is never enabled.

  Residual: if THIS supervisor is hard-killed, no CONTAINMENT_EVIDENCE_V1 can
  be written; closing the job handle still terminates the process tree via
  KILL_ON_JOB_CLOSE. SUPERVISOR_ORPHAN_CHECK.json / missing evidence diagnose
  that condition on a subsequent run.

  Never sets CONTAINMENT_APPLY_DATABASE_URL. Synthetic -TestStubScript only.
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

  [Parameter(Mandatory = $false)]
  [string]$TestStubScript = "",

  [Parameter(Mandatory = $false)]
  [switch]$TestForcePowerShellIdentityFail,

  [Parameter(Mandatory = $false)]
  [switch]$TestForceChildStartFail
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:JobHandle = [IntPtr]::Zero
$script:EnterProcess = $null
$script:SupervisorMaterialRoot = $null
$script:SentinelToken = [guid]::NewGuid().ToString("N")
$script:EvidenceWritten = $false
$script:Completing = $false
$script:PowerShellIdentity = $null
$script:PromptReadyObserved = $false

# Fixed type name so callers always use [ContainmentVisible.JobApi]::Method
if (-not ("ContainmentVisible.JobApi" -as [type])) {
  Add-Type -TypeDefinition @"
using System;
using System.Text;
using System.Runtime.InteropServices;

namespace ContainmentVisible {
  public static class JobApi {
    public const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;
    public const int JobObjectExtendedLimitInformation = 9;
    public const uint CREATE_SUSPENDED = 0x00000004;

    [StructLayout(LayoutKind.Sequential)]
    public struct IO_COUNTERS {
      public UInt64 ReadOperationCount;
      public UInt64 WriteOperationCount;
      public UInt64 OtherOperationCount;
      public UInt64 ReadTransferCount;
      public UInt64 WriteTransferCount;
      public UInt64 OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct JOBOBJECT_BASIC_LIMIT_INFORMATION {
      public Int64 PerProcessUserTimeLimit;
      public Int64 PerJobUserTimeLimit;
      public UInt32 LimitFlags;
      public UIntPtr MinimumWorkingSetSize;
      public UIntPtr MaximumWorkingSetSize;
      public UInt32 ActiveProcessLimit;
      public UIntPtr Affinity;
      public UInt32 PriorityClass;
      public UInt32 SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION {
      public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
      public IO_COUNTERS IoInfo;
      public UIntPtr ProcessMemoryLimit;
      public UIntPtr JobMemoryLimit;
      public UIntPtr PeakProcessMemoryUsed;
      public UIntPtr PeakJobMemoryUsed;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct STARTUPINFO {
      public UInt32 cb;
      public string lpReserved;
      public string lpDesktop;
      public string lpTitle;
      public UInt32 dwX;
      public UInt32 dwY;
      public UInt32 dwXSize;
      public UInt32 dwYSize;
      public UInt32 dwXCountChars;
      public UInt32 dwYCountChars;
      public UInt32 dwFillAttribute;
      public UInt32 dwFlags;
      public UInt16 wShowWindow;
      public UInt16 cbReserved2;
      public IntPtr lpReserved2;
      public IntPtr hStdInput;
      public IntPtr hStdOutput;
      public IntPtr hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct PROCESS_INFORMATION {
      public IntPtr hProcess;
      public IntPtr hThread;
      public UInt32 dwProcessId;
      public UInt32 dwThreadId;
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern IntPtr CreateJobObject(IntPtr lpJobAttributes, string lpName);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool SetInformationJobObject(
      IntPtr hJob, int JobObjectInfoClass, IntPtr lpJobObjectInfo, UInt32 cbJobObjectInfoLength);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool TerminateJobObject(IntPtr hJob, UInt32 uExitCode);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CloseHandle(IntPtr hObject);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern UInt32 ResumeThread(IntPtr hThread);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    public static extern bool CreateProcess(
      string lpApplicationName,
      StringBuilder lpCommandLine,
      IntPtr lpProcessAttributes,
      IntPtr lpThreadAttributes,
      bool bInheritHandles,
      UInt32 dwCreationFlags,
      IntPtr lpEnvironment,
      string lpCurrentDirectory,
      ref STARTUPINFO lpStartupInfo,
      out PROCESS_INFORMATION lpProcessInformation);
  }
}
"@
}

function ConvertTo-Base64Url([byte[]]$Bytes) {
  $b64 = [Convert]::ToBase64String($Bytes)
  return (($b64.TrimEnd("=")) -replace "\+", "-" -replace "/", "_")
}

function Get-Sha256Hex([byte[]]$Bytes) {
  $sha = [Security.Cryptography.SHA256]::Create()
  try {
    return ([BitConverter]::ToString($sha.ComputeHash($Bytes)) -replace "-", "").ToLowerInvariant()
  } finally {
    $sha.Dispose()
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

function Assert-SafePath([string]$Name, [string]$Value) {
  if ([string]::IsNullOrWhiteSpace($Value)) { throw "$Name empty" }
  foreach ($ch in $Value.ToCharArray()) {
    $c = [int]$ch
    if ($c -eq 0 -or $c -eq 10 -or $c -eq 13) { throw "$Name control character" }
  }
}

function Invoke-GitBytes([string[]]$GitArgs, [string]$WorkDir) {
  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = "git"
  $psi.Arguments = [string]::Join(" ", @($GitArgs | ForEach-Object { Format-Win32Argument $_ }))
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

function Get-TrustedWindowsPowerShellIdentity {
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

function New-KillOnCloseJob {
  $h = [ContainmentVisible.JobApi]::CreateJobObject([IntPtr]::Zero, $null)
  if ($h -eq [IntPtr]::Zero) {
    throw "CreateJobObject failed err=$([Runtime.InteropServices.Marshal]::GetLastWin32Error())"
  }
  $info = New-Object "ContainmentVisible.JobApi+JOBOBJECT_EXTENDED_LIMIT_INFORMATION"
  $basic = $info.BasicLimitInformation
  # ONLY kill-on-close — never BREAKAWAY / silent breakaway flags.
  $basic.LimitFlags = [ContainmentVisible.JobApi]::JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
  $info.BasicLimitInformation = $basic
  $size = [Runtime.InteropServices.Marshal]::SizeOf($info)
  $ptr = [Runtime.InteropServices.Marshal]::AllocHGlobal($size)
  try {
    [Runtime.InteropServices.Marshal]::StructureToPtr($info, $ptr, $false)
    $ok = [ContainmentVisible.JobApi]::SetInformationJobObject(
      $h,
      [ContainmentVisible.JobApi]::JobObjectExtendedLimitInformation,
      $ptr,
      [uint32]$size
    )
    if (-not $ok) {
      throw "SetInformationJobObject failed err=$([Runtime.InteropServices.Marshal]::GetLastWin32Error())"
    }
  } catch {
    try { [void][ContainmentVisible.JobApi]::CloseHandle($h) } catch {}
    throw
  } finally {
    [Runtime.InteropServices.Marshal]::FreeHGlobal($ptr)
  }
  return $h
}

function Start-SuspendedInJob {
  param(
    [IntPtr]$Job,
    [string]$Exe,
    [string]$CommandLine,
    [string]$WorkDir
  )
  if ($TestForceChildStartFail) {
    throw "synthetic child start failure"
  }
  $si = New-Object "ContainmentVisible.JobApi+STARTUPINFO"
  $si.cb = [uint32][Runtime.InteropServices.Marshal]::SizeOf($si)
  $pi = New-Object "ContainmentVisible.JobApi+PROCESS_INFORMATION"
  $cmd = New-Object System.Text.StringBuilder
  [void]$cmd.Append($CommandLine)
  $flags = [ContainmentVisible.JobApi]::CREATE_SUSPENDED
  $ok = [ContainmentVisible.JobApi]::CreateProcess(
    $Exe,
    $cmd,
    [IntPtr]::Zero,
    [IntPtr]::Zero,
    $false,
    $flags,
    [IntPtr]::Zero,
    $WorkDir,
    [ref]$si,
    [ref]$pi
  )
  if (-not $ok) {
    throw "CreateProcess failed err=$([Runtime.InteropServices.Marshal]::GetLastWin32Error())"
  }
  try {
    $assigned = [ContainmentVisible.JobApi]::AssignProcessToJobObject($Job, $pi.hProcess)
    if (-not $assigned) {
      throw "AssignProcessToJobObject failed err=$([Runtime.InteropServices.Marshal]::GetLastWin32Error())"
    }
    $resume = [ContainmentVisible.JobApi]::ResumeThread($pi.hThread)
    if ($resume -eq [uint32]::MaxValue) {
      throw "ResumeThread failed err=$([Runtime.InteropServices.Marshal]::GetLastWin32Error())"
    }
  } catch {
    try { [void][ContainmentVisible.JobApi]::TerminateJobObject($Job, 1) } catch {}
    try { [void][ContainmentVisible.JobApi]::CloseHandle($pi.hThread) } catch {}
    try { [void][ContainmentVisible.JobApi]::CloseHandle($pi.hProcess) } catch {}
    throw
  }
  try { [void][ContainmentVisible.JobApi]::CloseHandle($pi.hThread) } catch {}
  $proc = [Diagnostics.Process]::GetProcessById([int]$pi.dwProcessId)
  try { [void][ContainmentVisible.JobApi]::CloseHandle($pi.hProcess) } catch {}
  return $proc
}

function Close-JobAndConfirm {
  $jobClosed = $false
  $terminated = $false
  if ($script:JobHandle -ne [IntPtr]::Zero) {
    try {
      [void][ContainmentVisible.JobApi]::TerminateJobObject($script:JobHandle, 1)
    } catch {}
    try {
      [void][ContainmentVisible.JobApi]::CloseHandle($script:JobHandle)
      $jobClosed = $true
    } catch {}
    $script:JobHandle = [IntPtr]::Zero
  }
  if ($null -ne $script:EnterProcess) {
    try {
      if (-not $script:EnterProcess.HasExited) {
        try { $script:EnterProcess.Kill() } catch {}
      }
      [void]$script:EnterProcess.WaitForExit(20000)
      $terminated = [bool]$script:EnterProcess.HasExited
    } catch {
      $terminated = $false
    }
  } else {
    $terminated = $true
  }

  $sentinelAlive = $false
  try {
    $token = $script:SentinelToken
    $q = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
      Where-Object { $_.CommandLine -and ($_.CommandLine -match [regex]::Escape($token)) }
    if ($q) { $sentinelAlive = $true }
  } catch {}

  return @{
    job_handle_closed = $jobClosed
    enter_terminated  = $terminated
    sentinel_alive    = $sentinelAlive
    kill_on_job_close = $true
  }
}

function Clear-AllMaterial {
  $removed = @()
  $failed = @()
  if ($EvidenceOutDir -and (Test-Path -LiteralPath $EvidenceOutDir)) {
    Get-ChildItem -LiteralPath $EvidenceOutDir -Directory -Filter "material-*" -ErrorAction SilentlyContinue |
      ForEach-Object {
        try {
          Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction Stop
          $removed += $_.Name
        } catch {
          $failed += $_.Name
        }
      }
  }
  return @{
    removed = $removed
    failed  = $failed
    cleaned = ($failed.Count -eq 0)
  }
}

function Write-SupervisorEvidence([hashtable]$Object) {
  if ($script:EvidenceWritten) { return }
  $script:EvidenceWritten = $true
  $json = ($Object | ConvertTo-Json -Depth 20 -Compress)
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  [Console]::Out.WriteLine("CONTAINMENT_EVIDENCE_V1:" + (ConvertTo-Base64Url -Bytes $bytes))
  if ($EvidenceOutDir) {
    New-Item -ItemType Directory -Force -Path $EvidenceOutDir | Out-Null
    [IO.File]::WriteAllText(
      (Join-Path $EvidenceOutDir "VISIBLE_SUPERVISOR_EVIDENCE.json"),
      ($Object | ConvertTo-Json -Depth 20)
    )
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
    prompt_ready_observed      = $(
      if ($Extra.ContainsKey("prompt_ready_observed")) {
        [bool]$Extra.prompt_ready_observed
      } else {
        [bool]$script:PromptReadyObserved
      }
    )
    powershell_identity        = $(
      if ($Extra.ContainsKey("powershell_identity")) {
        $Extra.powershell_identity
      } else {
        Get-SanitizedPowerShellIdentity $script:PowerShellIdentity
      }
    )
    job_object                 = $(if ($Extra.ContainsKey("job_object")) { $Extra.job_object } else { $null })
    cleanup                    = $(if ($Extra.ContainsKey("cleanup")) { $Extra.cleanup } else { @{ completed = $true } })
    supervisor_sentinel        = $script:SentinelToken
    credential_redaction_confirmation = @{
      url_in_evidence    = $false
      url_in_argv        = $false
      values_undisclosed = $true
    }
  }
}

function Write-OrphanCheck([hashtable]$Job, [hashtable]$Mat, [hashtable]$Extra = @{}) {
  if (-not $EvidenceOutDir) { return }
  $obj = [ordered]@{
    sentinel_token   = $script:SentinelToken
    sentinel_alive   = $Job.sentinel_alive
    enter_terminated = $Job.enter_terminated
    material_cleaned = $Mat.cleaned
  }
  foreach ($k in $Extra.Keys) { $obj[$k] = $Extra[$k] }
  [IO.File]::WriteAllText(
    (Join-Path $EvidenceOutDir "SUPERVISOR_ORPHAN_CHECK.json"),
    ($obj | ConvertTo-Json -Compress)
  )
}

function Complete-Blocked([string]$Code, [string]$Phase, [string]$Message, [hashtable]$Extra = @{}) {
  if ($script:Completing) { exit 2 }
  $script:Completing = $true
  $job = Close-JobAndConfirm
  $mat = Clear-AllMaterial
  $cleanup = @{
    completed       = [bool]($job.enter_terminated -and -not $job.sentinel_alive -and $mat.cleaned)
    job             = $job
    materialization = $mat
  }
  if (-not $Extra.ContainsKey("cleanup")) { $Extra.cleanup = $cleanup }
  if (-not $Extra.ContainsKey("job_object")) {
    $Extra.job_object = @{
      kill_on_job_close = $true
      breakaway_enabled = $false
      handle_closed     = $job.job_handle_closed
    }
  }
  Write-OrphanCheck -Job $job -Mat $mat
  Write-SupervisorEvidence (New-Blocked -Code $Code -Phase $Phase -Message $Message -Extra $Extra)
  exit 2
}

function Assert-BlobSeal([string]$Commit, [string]$Rel, $Seal, [string]$Dest, [string]$WorkDir) {
  if (-not $Seal -or -not $Seal.oid -or -not $Seal.sha256 -or -not $Seal.bytes -or -not $Seal.path) {
    throw "missing seal metadata for $Rel"
  }
  if ([string]$Seal.path -ne $Rel) { throw "seal path mismatch for $Rel" }
  $oid = Invoke-GitText -GitArgs @("rev-parse", "${Commit}:${Rel}") -WorkDir $WorkDir
  if ($oid -ne [string]$Seal.oid) { throw "OID mismatch for $Rel" }
  $bytes = Invoke-GitBytes -GitArgs @("cat-file", "blob", "${Commit}:${Rel}") -WorkDir $WorkDir
  if ($bytes.Length -ne [int]$Seal.bytes) { throw "bytes mismatch for $Rel" }
  $sha = Get-Sha256Hex -Bytes $bytes
  if ($sha -ne ([string]$Seal.sha256).ToLowerInvariant()) { throw "SHA-256 mismatch for $Rel" }
  [IO.File]::WriteAllBytes($Dest, $bytes)
  $item = Get-Item -LiteralPath $Dest -Force
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "materialized file is reparse point" }
  return @{ oid = $oid; sha256 = $sha; bytes = $bytes.Length }
}

trap {
  try {
    Complete-Blocked "BLOCKED_OPERATOR_CANCEL" "supervisor_cancel" ("operator cancel/trap: " + $_.ToString())
  } catch {}
  exit 2
}

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

  [IO.File]::WriteAllText(
    (Join-Path $EvidenceOutDir "SUPERVISOR_SENTINEL.txt"),
    ("token={0}`npid={1}`n" -f $script:SentinelToken, $PID)
  )

  $tip = Invoke-GitText -GitArgs @("rev-parse", "HEAD") -WorkDir $RepoRoot
  $authPath = "docs/security/connection-credential-browser-containment/TOOLING_AUTHORIZATION.json"
  $authJson = [Text.Encoding]::UTF8.GetString(
    (Invoke-GitBytes -GitArgs @("cat-file", "blob", "${tip}:${authPath}") -WorkDir $RepoRoot)
  )
  $auth = $authJson | ConvertFrom-Json

  if ([string]$auth.authorized_pr_head -ne $PrHead) {
    Complete-Blocked "BLOCKED_PIN_MISMATCH" "tip_freeze_relation" "PrHead must equal authorized_pr_head (tooling freeze)"
  }
  if ($authJson -match "PENDING_AFTER_COMMIT") {
    Complete-Blocked "BLOCKED_PIN_MISMATCH" "tip_freeze_relation" "authorization still PENDING_AFTER_COMMIT"
  }

  $vs = $auth.visible_ceremony_supervisor
  $ve = $auth.visible_ceremony_entry
  if (-not $ve) {
    Complete-Blocked "BLOCKED_SEAL_MISMATCH" "load_auth" "missing visible_ceremony_entry seal"
  }

  # Defense-in-depth only: never treat worktree supervisor as tip authority.
  if ($vs -and $vs.sha256 -and $vs.bytes) {
    $selfPath = $PSCommandPath
    if ([string]::IsNullOrWhiteSpace($selfPath)) { $selfPath = $MyInvocation.MyCommand.Path }
    if ($selfPath -and (Test-Path -LiteralPath $selfPath)) {
      $selfBytes = [IO.File]::ReadAllBytes($selfPath)
      $selfSha = Get-Sha256Hex -Bytes $selfBytes
      if ($selfSha -ne ([string]$vs.sha256).ToLowerInvariant() -or $selfBytes.Length -ne [int]$vs.bytes) {
        Complete-Blocked "BLOCKED_SEAL_MISMATCH" "supervisor_self_verify" "supervisor SHA/bytes mismatch vs tip auth"
      }
    }
  }

  $script:SupervisorMaterialRoot = Join-Path $EvidenceOutDir ("material-supervisor-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $script:SupervisorMaterialRoot | Out-Null
  $entryDest = Join-Path $script:SupervisorMaterialRoot "enter-visible-containment-ceremony.ps1"

  # Trust root: materialize entry from TIP blob only (never execute worktree entry as authority).
  try {
    [void](Assert-BlobSeal -Commit $tip -Rel "scripts/security/enter-visible-containment-ceremony.ps1" -Seal $ve -Dest $entryDest -WorkDir $RepoRoot)
  } catch {
    Complete-Blocked "BLOCKED_SEAL_MISMATCH" "materialize_entry" ([string]$_.Exception.Message)
  }

  try {
    $script:PowerShellIdentity = Get-TrustedWindowsPowerShellIdentity
  } catch {
    Complete-Blocked "BLOCKED_POWERSHELL_IDENTITY" "powershell_resolve" ([string]$_.Exception.Message)
  }
  $psExe = [string]$script:PowerShellIdentity.absolute_path
  $psIdentitySanitized = Get-SanitizedPowerShellIdentity $script:PowerShellIdentity
  [IO.File]::WriteAllText(
    (Join-Path $EvidenceOutDir "VISIBLE_SUPERVISOR_PS_IDENTITY.json"),
    ($psIdentitySanitized | ConvertTo-Json -Compress)
  )

  try {
    $script:JobHandle = New-KillOnCloseJob
  } catch {
    Complete-Blocked "BLOCKED_JOB_OBJECT" "job_create" ([string]$_.Exception.Message) -Extra @{
      powershell_identity = $psIdentitySanitized
    }
  }

  $argParts = @(
    (Format-Win32Argument $psExe),
    (Format-Win32Argument "-NoProfile"),
    (Format-Win32Argument "-ExecutionPolicy"),
    (Format-Win32Argument "Bypass"),
    (Format-Win32Argument "-File"),
    (Format-Win32Argument $entryDest),
    (Format-Win32Argument "-PrHead"),
    (Format-Win32Argument $PrHead),
    (Format-Win32Argument "-RepoRoot"),
    (Format-Win32Argument $RepoRoot),
    (Format-Win32Argument "-EvidenceOutDir"),
    (Format-Win32Argument $EvidenceOutDir),
    (Format-Win32Argument "-SupervisorSentinel"),
    (Format-Win32Argument $script:SentinelToken)
  )
  if ($WaitForPromptReady) {
    $argParts += (Format-Win32Argument "-WaitForPromptReady")
    $argParts += (Format-Win32Argument "-PromptReadyTimeoutSec")
    $argParts += (Format-Win32Argument ([string]$PromptReadyTimeoutSec))
  }
  if (-not [string]::IsNullOrWhiteSpace($TestStubScript)) {
    Assert-SafePath "TestStubScript" $TestStubScript
    $argParts += (Format-Win32Argument "-TestStubScript")
    $argParts += (Format-Win32Argument $TestStubScript)
  }
  if ($TestForcePowerShellIdentityFail) {
    $argParts += (Format-Win32Argument "-TestForcePowerShellIdentityFail")
  }
  if ($TestForceChildStartFail) {
    $argParts += (Format-Win32Argument "-TestForceChildStartFail")
  }
  $cmdLine = [string]::Join(" ", $argParts)

  try {
    $script:EnterProcess = Start-SuspendedInJob -Job $script:JobHandle -Exe $psExe -CommandLine $cmdLine -WorkDir $RepoRoot
  } catch {
    Complete-Blocked "BLOCKED_CHILD_START" "child_start" ([string]$_.Exception.Message) -Extra @{
      powershell_identity = $psIdentitySanitized
    }
  }

  [IO.File]::WriteAllText(
    (Join-Path $EvidenceOutDir "VISIBLE_SUPERVISOR_STARTED.txt"),
    ("supervisor_pid={0}`nenter_pid={1}`nsentinel={2}`n" -f $PID, $script:EnterProcess.Id, $script:SentinelToken)
  )

  if (-not $WaitForPromptReady) {
    Write-Host ("SUPERVISOR_LAUNCHED enter_pid={0}" -f $script:EnterProcess.Id)
    while (-not $script:EnterProcess.HasExited) { Start-Sleep -Milliseconds 200 }
    $exitCode = $script:EnterProcess.ExitCode
    $job = Close-JobAndConfirm
    $mat = Clear-AllMaterial
    Write-OrphanCheck -Job $job -Mat $mat -Extra @{ enter_exit_code = $exitCode }
    if ($exitCode -ne 0) {
      Write-SupervisorEvidence (New-Blocked -Code "BLOCKED_CHILD_EXIT" -Phase "supervise" -Message ("enter exit=" + $exitCode) -Extra @{
        powershell_identity = $psIdentitySanitized
        cleanup = @{
          completed       = [bool]($job.enter_terminated -and -not $job.sentinel_alive -and $mat.cleaned)
          job             = $job
          materialization = $mat
        }
        job_object = @{ kill_on_job_close = $true; breakaway_enabled = $false; handle_closed = $job.job_handle_closed }
      })
      exit 2
    }
    Write-SupervisorEvidence ([ordered]@{
      protocol_version           = 1
      schema_version             = 1
      result_code                = "OK"
      verdict                    = "OK"
      reason_code                = "SUPERVISOR_COMPLETE"
      phase                      = "supervise"
      evidence_source            = "native_wrapper_fallback"
      mode                       = "dry-run"
      read_only                  = $true
      sqlApplicationAttempts     = 0
      databaseConnectionAttempts = 0
      advisory_lock_acquired     = $false
      database_connected         = $false
      nodeProcessStarted         = $false
      prompt_ready_observed      = $false
      powershell_identity        = $psIdentitySanitized
      job_object                 = @{ kill_on_job_close = $true; breakaway_enabled = $false; handle_closed = $job.job_handle_closed }
      cleanup                    = @{
        completed       = [bool]($job.enter_terminated -and -not $job.sentinel_alive -and $mat.cleaned)
        job             = $job
        materialization = $mat
      }
      supervisor_sentinel        = $script:SentinelToken
      credential_redaction_confirmation = @{
        url_in_evidence    = $false
        url_in_argv        = $false
        values_undisclosed = $true
      }
    })
    exit 0
  }

  $ready = Join-Path $EvidenceOutDir "PROMPT_READY.txt"
  $deadline = (Get-Date).AddSeconds([Math]::Max(1, $PromptReadyTimeoutSec))
  $sawReady = $false
  while ((Get-Date) -lt $deadline) {
    if (Test-Path -LiteralPath $ready) {
      $sawReady = $true
      $script:PromptReadyObserved = $true
      Write-Host "PROMPT_READY"
      break
    }
    if ($script:EnterProcess.HasExited) {
      Complete-Blocked "BLOCKED_ENTER_TERMINATED" "prompt_wait" ("enter exited before PROMPT_READY exit=" + $script:EnterProcess.ExitCode) -Extra @{
        powershell_identity = $psIdentitySanitized
      }
    }
    Start-Sleep -Milliseconds 200
  }

  if (-not $sawReady) {
    Complete-Blocked "BLOCKED_PROMPT_TIMEOUT" "prompt_wait" "timeout waiting for PROMPT_READY" -Extra @{
      powershell_identity = $psIdentitySanitized
    }
  }

  # After PROMPT_READY keep supervising until enter exits (stub ends or operator finishes).
  while (-not $script:EnterProcess.HasExited) {
    Start-Sleep -Milliseconds 200
  }

  $exitCode = $script:EnterProcess.ExitCode
  $job = Close-JobAndConfirm
  $mat = Clear-AllMaterial
  Write-OrphanCheck -Job $job -Mat $mat -Extra @{
    prompt_ready    = $true
    enter_exit_code = $exitCode
  }
  if ($exitCode -ne 0) {
    Write-SupervisorEvidence (New-Blocked -Code "BLOCKED_CHILD_EXIT" -Phase "post_prompt" -Message ("enter exit=" + $exitCode) -Extra @{
      powershell_identity   = $psIdentitySanitized
      prompt_ready_observed = $true
      cleanup = @{
        completed       = [bool]($job.enter_terminated -and -not $job.sentinel_alive -and $mat.cleaned)
        job             = $job
        materialization = $mat
      }
      job_object = @{ kill_on_job_close = $true; breakaway_enabled = $false; handle_closed = $job.job_handle_closed }
    })
    exit 2
  }

  Write-SupervisorEvidence ([ordered]@{
    protocol_version           = 1
    schema_version             = 1
    result_code                = "OK"
    verdict                    = "OK"
    reason_code                = "SUPERVISOR_COMPLETE"
    phase                      = "post_prompt"
    evidence_source            = "native_wrapper_fallback"
    mode                       = "dry-run"
    read_only                  = $true
    sqlApplicationAttempts     = 0
    databaseConnectionAttempts = 0
    advisory_lock_acquired     = $false
    database_connected         = $false
    nodeProcessStarted         = $false
    prompt_ready_observed      = $true
    powershell_identity        = $psIdentitySanitized
    job_object                 = @{ kill_on_job_close = $true; breakaway_enabled = $false; handle_closed = $job.job_handle_closed }
    cleanup                    = @{
      completed       = [bool]($job.enter_terminated -and -not $job.sentinel_alive -and $mat.cleaned)
      job             = $job
      materialization = $mat
    }
    supervisor_sentinel        = $script:SentinelToken
    credential_redaction_confirmation = @{
      url_in_evidence    = $false
      url_in_argv        = $false
      values_undisclosed = $true
    }
  })
  exit 0
}
catch {
  try {
    Complete-Blocked "BLOCKED_VISIBLE_SUPERVISOR" "supervisor" ([string]$_.Exception.Message)
  } catch {
    exit 2
  }
}
