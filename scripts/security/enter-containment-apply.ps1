#Requires -Version 5.1
<#
.SYNOPSIS
  Native entry trust-root helper for containment apply (pre-Node).

.DESCRIPTION
  Do not execute a mutable worktree copy as authoritative without verification.
  Preferred operator path (see APPLY_RUNBOOK.md): materialize the sealed bootstrap
  via git cat-file from the authorized freeze, hash-verify with .NET SHA256 against
  published pins, then invoke with:

    powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File <temp>

  This helper loads tip TOOLING_AUTHORIZATION.native_bootstrap pins, materializes
  the freeze bootstrap blob, verifies OID/SHA-256/bytes, executes it, and deletes
  the temporary bootstrap on every outcome. It never reads or logs
  CONTAINMENT_APPLY_DATABASE_URL values.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-fA-F]{40}$')]
  [string]$PrHead,

  [Parameter(Mandatory = $false)]
  [ValidatePattern('^[0-9a-fA-F]{40}$')]
  [string]$EvidenceTip = "",

  [Parameter(Mandatory = $false)]
  [ValidateSet("dry-run", "apply")]
  [string]$Mode = "dry-run",

  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ForwardArgs = @()
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function ConvertTo-Base64Url([byte[]]$Bytes) {
  $b64 = [Convert]::ToBase64String($Bytes)
  return (($b64.TrimEnd('=')) -replace '\+', '-' -replace '/', '_')
}

function Write-EntryEvidence {
  param($Object)
  # Emit exactly one CONTAINMENT_EVIDENCE_V1 frame. Do not probe missing
  # properties under StrictMode — callers must supply a complete object.
  $json = $Object | ConvertTo-Json -Depth 20 -Compress
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  [Console]::Out.WriteLine("CONTAINMENT_EVIDENCE_V1:" + (ConvertTo-Base64Url -Bytes $bytes))
}

function New-EntryFallbackObject {
  param(
    [string]$Code,
    [string]$Phase,
    [string]$Message,
    [hashtable]$Extra = @{}
  )
  $msg = [string]$Message
  if ($msg.Length -gt 500) { $msg = $msg.Substring(0, 500) }
  return [ordered]@{
    protocol_version           = 1
    schema_version             = 1
    result_code                = "BOOTSTRAP_BLOCKED"
    verdict                    = "BOOTSTRAP_BLOCKED"
    reason_code                = $Code
    error_code                 = $Code
    phase                      = $Phase
    evidence_source            = "native_wrapper_fallback"
    mode                       = $Mode
    read_only                  = $true
    error                      = $msg
    sqlApplicationAttempts     = 0
    databaseConnectionAttempts = 0
    nodeProcessStarted         = $(if ($Extra.ContainsKey("nodeProcessStarted")) { [bool]$Extra.nodeProcessStarted } else { $false })
    advisory_lock_acquired     = $false
    database_connected         = $false
    unsafeInheritedNodeEnvironmentRemoved = $(if ($Extra.ContainsKey("unsafeInheritedNodeEnvironmentRemoved")) { [bool]$Extra.unsafeInheritedNodeEnvironmentRemoved } else { $false })
    cleanup                    = $(if ($Extra.ContainsKey("cleanup") -and $null -ne $Extra.cleanup) { $Extra.cleanup } else { @{ completed = $true } })
    credential_redaction_confirmation = @{
      url_in_evidence    = $false
      url_in_argv        = $false
      values_undisclosed = $true
    }
    wrapper = [ordered]@{
      reason_code                   = $Code
      phase                         = $Phase
      nodeProcessStarted            = $(if ($Extra.ContainsKey("nodeProcessStarted")) { [bool]$Extra.nodeProcessStarted } else { $false })
      child_output_received         = $(if ($Extra.ContainsKey("child_output_received")) { [bool]$Extra.child_output_received } else { $false })
      counters_are_wrapper_observed = $true
    }
  }
}

function Stop-Entry {
  param([string]$Code, [string]$Phase, [string]$Message, [hashtable]$Extra = @{})
  Write-EntryEvidence -Object (New-EntryFallbackObject -Code $Code -Phase $Phase -Message $Message -Extra $Extra)
  exit 2
}

function Get-Sha256Hex([byte[]]$Bytes) {
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($sha.ComputeHash($Bytes)) -replace "-", "").ToLowerInvariant()
  }
  finally { $sha.Dispose() }
}

function Invoke-GitBytes([string[]]$GitArgs, [string]$WorkDir) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = "git"
  $psi.Arguments = ($GitArgs | ForEach-Object {
      if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
    }) -join " "
  $psi.WorkingDirectory = $WorkDir
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $p = New-Object System.Diagnostics.Process
  $p.StartInfo = $psi
  [void]$p.Start()
  $ms = New-Object System.IO.MemoryStream
  $p.StandardOutput.BaseStream.CopyTo($ms)
  $err = $p.StandardError.ReadToEnd()
  $p.WaitForExit()
  if ($p.ExitCode -ne 0) { throw "git failed ($($p.ExitCode)): $err" }
  return $ms.ToArray()
}

function Invoke-GitText([string[]]$GitArgs, [string]$WorkDir) {
  return [System.Text.Encoding]::UTF8.GetString((Invoke-GitBytes -GitArgs $GitArgs -WorkDir $WorkDir)).Trim()
}

function Clear-TempPath([string]$Path) {
  if (-not $Path) { return @{ cleaned = $true; missing = $true } }
  try {
    if (Test-Path -LiteralPath $Path) {
      Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
    }
    return @{ cleaned = -not (Test-Path -LiteralPath $Path); path_redacted = $true }
  }
  catch {
    $m = [string]$_.Exception.Message
    return @{ cleaned = $false; error = $m.Substring(0, [Math]::Min(200, $m.Length)) }
  }
}

function Test-ProhibitedNodeEnvPresent([string]$Name) {
  $fromEnvApi = [Environment]::GetEnvironmentVariable($Name, "Process")
  if ($null -ne $fromEnvApi -and $fromEnvApi -ne "") { return $true }
  $item = Get-Item -LiteralPath "Env:$Name" -ErrorAction SilentlyContinue
  if ($null -ne $item -and $null -ne $item.Value -and $item.Value -ne "") { return $true }
  return $false
}

$repo = Invoke-GitText -GitArgs @("rev-parse", "--show-toplevel") -WorkDir (Get-Location).Path
$tip = Invoke-GitText -GitArgs @("rev-parse", "HEAD") -WorkDir $repo
$authPath = "docs/security/connection-credential-browser-containment/TOOLING_AUTHORIZATION.json"
try {
  $auth = ([System.Text.Encoding]::UTF8.GetString((Invoke-GitBytes -GitArgs @("cat-file", "blob", "${tip}:${authPath}") -WorkDir $repo))) | ConvertFrom-Json
}
catch {
  Stop-Entry -Code "AUTH_METADATA_LOAD_FAIL" -Phase "entry_load_auth" -Message "failed to load tip TOOLING_AUTHORIZATION.json"
}

if ($auth.authorized_pr_head -ne $PrHead) {
  Stop-Entry -Code "BLOCKED_PIN_MISMATCH" -Phase "entry_tip_freeze" -Message "PrHead must equal authorized_pr_head (tooling freeze)"
}

$nb = $auth.native_bootstrap
if (-not $nb -or -not $nb.path -or -not $nb.sha256 -or -not $nb.bytes -or -not $nb.oid) {
  Stop-Entry -Code "AUTH_METADATA_INVALID" -Phase "entry_load_auth" -Message "missing native_bootstrap seals"
}

$freeze = [string]$auth.authorized_pr_head
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("containment-enter-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempDir | Out-Null
$bootFile = Join-Path $tempDir "bootstrap.ps1"
$cleanup = $null

try {
  $oid = Invoke-GitText -GitArgs @("rev-parse", "${freeze}:$($nb.path)") -WorkDir $repo
  $bytes = Invoke-GitBytes -GitArgs @("cat-file", "blob", "${freeze}:$($nb.path)") -WorkDir $repo
  if ($oid -ne [string]$nb.oid) { throw "bootstrap OID mismatch" }
  $sha = Get-Sha256Hex -Bytes $bytes
  if ($sha -ne ([string]$nb.sha256).ToLowerInvariant()) { throw "bootstrap SHA-256 mismatch" }
  if ($bytes.Length -ne [int]$nb.bytes) { throw "bootstrap bytes mismatch" }
  [System.IO.File]::WriteAllBytes($bootFile, $bytes)

  $argList = New-Object System.Collections.Generic.List[string]
  [void]$argList.Add("-NoProfile")
  [void]$argList.Add("-NonInteractive")
  [void]$argList.Add("-ExecutionPolicy")
  [void]$argList.Add("Bypass")
  [void]$argList.Add("-File")
  [void]$argList.Add($bootFile)
  [void]$argList.Add("-PrHead")
  [void]$argList.Add($PrHead)
  [void]$argList.Add("-Mode")
  [void]$argList.Add($Mode)
  [void]$argList.Add("-RepoRoot")
  [void]$argList.Add($repo)
  if ($EvidenceTip) {
    [void]$argList.Add("-EvidenceTip")
    [void]$argList.Add($EvidenceTip)
  }
  foreach ($fa in $ForwardArgs) { [void]$argList.Add($fa) }

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = "powershell.exe"
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  $psi.WorkingDirectory = $repo
  $psi.Arguments = ($argList | ForEach-Object {
      if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
    }) -join " "

  # Strip Node injection from nested PowerShell env (still pre-Node). Derive sanitization
  # sentinel from actual removals; overwrite any operator-supplied sentinel value.
  $removeKeys = @(
    "NODE_OPTIONS", "NODE_PATH", "NODE_REPL_EXTERNAL_MODULE",
    "NODE_IGNORE_NEXT_LOADER_HEADERS", "NODE_CHANNEL_FD",
    "npm_config_node_options", "npm_node_execpath", "DATABASE_URL",
    "NODE_TLS_REJECT_UNAUTHORIZED"
  )
  $stripped = $false
  foreach ($k in $removeKeys) {
    $wasPresent = $false
    if ($psi.EnvironmentVariables.ContainsKey($k)) {
      $v = $psi.EnvironmentVariables[$k]
      if ($null -ne $v -and $v -ne "") { $wasPresent = $true }
      [void]$psi.EnvironmentVariables.Remove($k)
    }
    elseif (Test-ProhibitedNodeEnvPresent -Name $k) {
      $wasPresent = $true
    }
    if ($wasPresent) { $stripped = $true }
  }
  $sentinelName = "CONTAINMENT_NATIVE_ENV_SANITIZED"
  if ($psi.EnvironmentVariables.ContainsKey($sentinelName)) {
    [void]$psi.EnvironmentVariables.Remove($sentinelName)
  }
  if ($stripped) {
    $psi.EnvironmentVariables[$sentinelName] = "1"
  }

  $proc = New-Object System.Diagnostics.Process
  $proc.StartInfo = $psi
  [void]$proc.Start()
  $stdout = $proc.StandardOutput.ReadToEnd()
  $stderr = $proc.StandardError.ReadToEnd()
  $proc.WaitForExit()
  $cleanup = Clear-TempPath -Path $tempDir
  $tempDir = $null

  if ($stdout) { [Console]::Out.WriteLine($stdout.TrimEnd()) }
  elseif ($stderr) {
    $scrub = [regex]::Replace($stderr, "postgres(?:ql)?://[^\s]+", "postgres://***")
    Write-EntryEvidence -Object (New-EntryFallbackObject -Code "ENTRY_CHILD_STDERR" -Phase "entry_execute" -Message $scrub.Substring(0, [Math]::Min(400, $scrub.Length)) -Extra @{
        cleanup                                   = $cleanup
        unsafeInheritedNodeEnvironmentRemoved     = $stripped
        child_output_received                     = $true
      })
    exit 2
  }
  exit $proc.ExitCode
}
catch {
  $cleanup = Clear-TempPath -Path $tempDir
  Stop-Entry -Code "ENTRY_BOOTSTRAP_MATERIALIZE_FAIL" -Phase "entry_materialize" -Message ([string]$_.Exception.Message) -Extra @{ cleanup = $cleanup }
}
finally {
  if ($tempDir) { [void](Clear-TempPath -Path $tempDir) }
}
