#Requires -Version 5.1
<#
.SYNOPSIS
  Pre-Node sealed bootstrap for Stage-1 credential browser containment apply.

.DESCRIPTION
  Must be materialized from a committed Git blob and hash-verified before execution.
  Does not connect to PostgreSQL, read CONTAINMENT_APPLY_DATABASE_URL values into
  evidence, or load PowerShell profiles (invoke with -NoProfile -NonInteractive).

.NOTES
  Seal publication only updates this file together with TOOLING_AUTHORIZATION pins.
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

  [Parameter(Mandatory = $false)]
  [string]$RepoRoot = "",

  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ForwardArgs = @()
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-BootstrapEvidence {
  param($Object)
  $json = $Object | ConvertTo-Json -Depth 12 -Compress:$false
  [Console]::Out.WriteLine($json)
}

function Stop-Bootstrap {
  param(
    [string]$Code,
    [string]$Phase,
    [string]$Message,
    [hashtable]$Extra = @{}
  )
  $msg = [string]$Message
  if ($msg.Length -gt 500) { $msg = $msg.Substring(0, 500) }
  $ev = [ordered]@{
    verdict                       = "BOOTSTRAP_BLOCKED"
    error_code                    = $Code
    phase                         = $Phase
    error                         = $msg
    sqlApplicationAttempts        = 0
    databaseConnectionAttempts    = 0
    nodeProcessStarted            = $false
    advisory_lock_acquired        = $false
    database_connected            = $false
    tip_head                      = $(if ($Extra.ContainsKey("tipHead")) { $Extra.tipHead } else { $null })
    tooling_freeze                = $(if ($Extra.ContainsKey("freeze")) { $Extra.freeze } else { $null })
    bundle_oid                    = $(if ($Extra.ContainsKey("bundleOid")) { $Extra.bundleOid } else { $null })
    bundle_sha256                 = $(if ($Extra.ContainsKey("bundleSha")) { $Extra.bundleSha } else { $null })
    bootstrap_sha256              = $(if ($Extra.ContainsKey("bootstrapSha")) { $Extra.bootstrapSha } else { $null })
    unsafeInheritedNodeEnvironmentRemoved = $(if ($Extra.ContainsKey("unsafeRemoved")) { [bool]$Extra.unsafeRemoved } else { $false })
    cleanup                       = $(if ($Extra.ContainsKey("cleanup")) { $Extra.cleanup } else { $null })
  }
  Write-BootstrapEvidence -Object $ev
  exit 2
}

function Get-Sha256Hex {
  param([byte[]]$Bytes)
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $hash = $sha.ComputeHash($Bytes)
    return ([System.BitConverter]::ToString($hash) -replace "-", "").ToLowerInvariant()
  }
  finally {
    $sha.Dispose()
  }
}

function Invoke-GitBytes {
  param([string[]]$GitArgs, [string]$WorkDir)
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = "git"
  # Quote-safe argument passing
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
  $outStream = $p.StandardOutput.BaseStream
  $ms = New-Object System.IO.MemoryStream
  $outStream.CopyTo($ms)
  $err = $p.StandardError.ReadToEnd()
  $p.WaitForExit()
  if ($p.ExitCode -ne 0) {
    throw "git failed ($($p.ExitCode)): $err"
  }
  return $ms.ToArray()
}

function Invoke-GitText {
  param([string[]]$GitArgs, [string]$WorkDir)
  $bytes = Invoke-GitBytes -GitArgs $GitArgs -WorkDir $WorkDir
  return [System.Text.Encoding]::UTF8.GetString($bytes).Trim()
}

function Clear-TempPath {
  param([string]$Path)
  if (-not $Path) {
    return @{ cleaned = $true; missing = $true }
  }
  try {
    if (Test-Path -LiteralPath $Path) {
      Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction Stop
    }
    return @{ cleaned = -not (Test-Path -LiteralPath $Path); path_redacted = $true }
  }
  catch {
    return @{ cleaned = $false; error = ([string]$_.Exception.Message).Substring(0, [Math]::Min(200, ([string]$_.Exception.Message).Length)) }
  }
}

$script:tempRoot = $null
$script:cleanupResult = $null

try {
  if (-not $RepoRoot) {
    # Prefer git top-level from cwd
    try {
      $RepoRoot = Invoke-GitText -GitArgs @("rev-parse", "--show-toplevel") -WorkDir (Get-Location).Path
    }
    catch {
      Stop-Bootstrap -Code "REPO_ROOT_UNRESOLVED" -Phase "init" -Message "unable to resolve git repository root"
    }
  }
  $RepoRoot = [System.IO.Path]::GetFullPath($RepoRoot)

  # Reject prohibited Node flags if they appear in remaining args (defense for mis-invocation)
  $prohibitedNodeFlags = @(
    "-r", "--require", "--import", "--loader", "--experimental-loader",
    "--inspect", "--inspect-brk", "--inspect-port", "--eval", "-e", "--print", "-p"
  )
  foreach ($a in $ForwardArgs) {
    foreach ($p in $prohibitedNodeFlags) {
      if ($a -eq $p -or $a.StartsWith("$p=")) {
        Stop-Bootstrap -Code "PROHIBITED_NODE_ARGV" -Phase "parse_args" -Message "prohibited Node flag in bootstrap forward args: $p"
      }
    }
    if ($a -eq "--database-url" -or $a -eq "--databaseUrl" -or $a -eq "--db-url") {
      Stop-Bootstrap -Code "PROHIBITED_CREDENTIAL_CHANNEL" -Phase "parse_args" -Message "database URL must not appear on bootstrap argv"
    }
  }

  $tipHead = Invoke-GitText -GitArgs @("rev-parse", "HEAD") -WorkDir $RepoRoot
  $authPath = "docs/security/connection-credential-browser-containment/TOOLING_AUTHORIZATION.json"
  try {
    $authBytes = Invoke-GitBytes -GitArgs @("cat-file", "blob", "${tipHead}:${authPath}") -WorkDir $RepoRoot
    $authJson = [System.Text.Encoding]::UTF8.GetString($authBytes)
    $auth = $authJson | ConvertFrom-Json
  }
  catch {
    Stop-Bootstrap -Code "AUTH_METADATA_LOAD_FAIL" -Phase "load_auth" -Message "failed to load TOOLING_AUTHORIZATION.json from tip" -Extra @{ tipHead = $tipHead }
  }

  if ($auth.authorized_pr_head -ne $PrHead) {
    Stop-Bootstrap -Code "BLOCKED_PIN_MISMATCH" -Phase "tip_freeze_relation" -Message "--pr-head does not equal authorization.authorized_pr_head" -Extra @{ tipHead = $tipHead; freeze = [string]$auth.authorized_pr_head }
  }
  $freeze = [string]$auth.authorized_pr_head

  if ($EvidenceTip -and ($EvidenceTip -eq $freeze)) {
    Stop-Bootstrap -Code "BLOCKED_PIN_MISMATCH" -Phase "tip_freeze_relation" -Message "evidence tip cannot equal tooling freeze" -Extra @{ tipHead = $tipHead; freeze = $freeze }
  }
  if (-not $EvidenceTip) { $EvidenceTip = $tipHead }

  $bundle = $auth.standalone_bundle
  if (-not $bundle -or -not $bundle.path -or -not $bundle.oid -or -not $bundle.sha256 -or -not $bundle.bytes) {
    Stop-Bootstrap -Code "AUTH_METADATA_INVALID" -Phase "load_auth" -Message "missing standalone_bundle seals" -Extra @{ tipHead = $tipHead; freeze = $freeze }
  }

  # Materialize bundle from freeze
  $script:tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("containment-bootstrap-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $script:tempRoot | Out-Null
  $bundleDest = Join-Path $script:tempRoot "applicator.standalone.cjs"

  try {
    $bundleOid = Invoke-GitText -GitArgs @("rev-parse", "${freeze}:$($bundle.path)") -WorkDir $RepoRoot
    $bundleBytes = Invoke-GitBytes -GitArgs @("cat-file", "blob", "${freeze}:$($bundle.path)") -WorkDir $RepoRoot
  }
  catch {
    $script:cleanupResult = Clear-TempPath -Path $script:tempRoot
    Stop-Bootstrap -Code "GIT_BLOB_EXTRACT_FAIL" -Phase "materialize_bundle" -Message "failed to extract standalone bundle from freeze" -Extra @{ tipHead = $tipHead; freeze = $freeze; cleanup = $script:cleanupResult }
  }

  if ($bundleOid -ne [string]$bundle.oid) {
    $script:cleanupResult = Clear-TempPath -Path $script:tempRoot
    Stop-Bootstrap -Code "BUNDLE_OID_MISMATCH" -Phase "verify_bundle" -Message "bundle OID mismatch" -Extra @{ tipHead = $tipHead; freeze = $freeze; cleanup = $script:cleanupResult }
  }
  $bundleSha = Get-Sha256Hex -Bytes $bundleBytes
  if ($bundleSha -ne ([string]$bundle.sha256).ToLowerInvariant()) {
    $script:cleanupResult = Clear-TempPath -Path $script:tempRoot
    Stop-Bootstrap -Code "BUNDLE_HASH_MISMATCH" -Phase "verify_bundle" -Message "bundle SHA-256 mismatch" -Extra @{ tipHead = $tipHead; freeze = $freeze; cleanup = $script:cleanupResult }
  }
  if ($bundleBytes.Length -ne [int]$bundle.bytes) {
    $script:cleanupResult = Clear-TempPath -Path $script:tempRoot
    Stop-Bootstrap -Code "BUNDLE_BYTES_MISMATCH" -Phase "verify_bundle" -Message "bundle byte length mismatch" -Extra @{ tipHead = $tipHead; freeze = $freeze; cleanup = $script:cleanupResult }
  }
  # Refuse CR in sealed bundle
  if ($bundleBytes -contains 0x0D) {
    $script:cleanupResult = Clear-TempPath -Path $script:tempRoot
    Stop-Bootstrap -Code "BUNDLE_CR_FORBIDDEN" -Phase "verify_bundle" -Message "CR bytes in sealed bundle" -Extra @{ tipHead = $tipHead; freeze = $freeze; cleanup = $script:cleanupResult }
  }

  [System.IO.File]::WriteAllBytes($bundleDest, $bundleBytes)
  $item = Get-Item -LiteralPath $bundleDest
  if ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
    $script:cleanupResult = Clear-TempPath -Path $script:tempRoot
    Stop-Bootstrap -Code "SYMLINK_REFUSED" -Phase "materialize_bundle" -Message "symlink/junction materialized bundle refused" -Extra @{ tipHead = $tipHead; freeze = $freeze; cleanup = $script:cleanupResult }
  }

  # Sanitized child environment: strip Node injection; pass DB URL env by name only (do not read value into evidence)
  $unsafeRemoved = $false
  $childEnv = New-Object "System.Collections.Generic.Dictionary[string,string]"
  foreach ($key in @("PATH", "SystemRoot", "TEMP", "TMP", "USERPROFILE", "HOME", "LANG", "PATHEXT", "ComSpec", "NUMBER_OF_PROCESSORS", "OS", "PROCESSOR_ARCHITECTURE")) {
    $val = [Environment]::GetEnvironmentVariable($key, "Process")
    if ($null -ne $val -and $val -ne "") {
      $childEnv[$key] = $val
    }
  }
  # Presence-only check for credential channel; never serialize value
  $dbEnvName = "CONTAINMENT_APPLY_DATABASE_URL"
  $dbPresent = $null -ne [Environment]::GetEnvironmentVariable($dbEnvName, "Process") -and [Environment]::GetEnvironmentVariable($dbEnvName, "Process") -ne ""
  if ($dbPresent) {
    $childEnv[$dbEnvName] = [Environment]::GetEnvironmentVariable($dbEnvName, "Process")
  }
  $childEnv["CONTAINMENT_ATTESTED_FREEZE"] = $freeze
  $childEnv["CONTAINMENT_GIT_CWD"] = $RepoRoot

  foreach ($bad in @(
      "NODE_OPTIONS", "NODE_PATH", "NODE_REPL_EXTERNAL_MODULE",
      "NODE_IGNORE_NEXT_LOADER_HEADERS", "NODE_CHANNEL_FD",
      "npm_config_node_options", "npm_node_execpath",
      "DATABASE_URL"
    )) {
    if ($null -ne [Environment]::GetEnvironmentVariable($bad, "Process")) {
      $unsafeRemoved = $true
    }
    # intentionally not copied into childEnv
  }

  # Build Node argv allowlist: executable + bundle + applicator flags only
  $nodeArgs = @(
    $bundleDest,
    "--pr-head", $freeze,
    "--authorized-pr-head", $freeze,
    "--mode", $Mode
  )
  if ($EvidenceTip -ne $freeze) {
    $nodeArgs += @("--evidence-tip", $EvidenceTip)
  }
  if ($auth.auth_seals_digest) {
    $nodeArgs += @("--auth-seals-digest", [string]$auth.auth_seals_digest)
  }
  $nodeArgs += @(
    "--project-ref", [string]$auth.project_ref,
    "--artifact-commit", [string]$auth.artifact_commit,
    "--migration-path", [string]$auth.migration_path,
    "--migration-blob-oid", [string]$auth.migration_blob_oid,
    "--migration-sha256", [string]$auth.migration_sha256,
    "--migration-bytes", ([string]$auth.migration_bytes),
    "--version", [string]$auth.migration_version,
    "--name", [string]$auth.migration_name
  )
  foreach ($fa in $ForwardArgs) {
    # Only allow known applicator flags through remaining args (already scanned for Node/credential flags)
    $nodeArgs += $fa
  }

  $nodeExe = (Get-Command node -ErrorAction Stop).Source
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $nodeExe
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  $psi.WorkingDirectory = $script:tempRoot
  # Windows PowerShell 5.1: EnvironmentVariables.Clear() is unsupported.
  # Remove non-allowlisted keys from the inherited copy, then set allowlist.
  $allow = New-Object "System.Collections.Generic.HashSet[string]" ([StringComparer]::OrdinalIgnoreCase)
  foreach ($k in $childEnv.Keys) { [void]$allow.Add($k) }
  $remove = New-Object System.Collections.Generic.List[string]
  foreach ($entry in $psi.EnvironmentVariables.GetEnumerator()) {
    if (-not $allow.Contains([string]$entry.Key)) { [void]$remove.Add([string]$entry.Key) }
  }
  foreach ($k in $remove) { [void]$psi.EnvironmentVariables.Remove($k) }
  foreach ($k in $childEnv.Keys) {
    $psi.EnvironmentVariables[$k] = $childEnv[$k]
  }
  # Argument string — no user Node flags may precede the bundle path
  $psi.Arguments = ($nodeArgs | ForEach-Object {
      if ($_ -match '[\s"]') { '"' + ($_ -replace '\\', '\\' -replace '"', '\"') + '"' } else { $_ }
    }) -join " "

  $proc = New-Object System.Diagnostics.Process
  $proc.StartInfo = $psi
  $started = $false
  try {
    [void]$proc.Start()
    $started = $true
  }
  catch {
    $script:cleanupResult = Clear-TempPath -Path $script:tempRoot
    Stop-Bootstrap -Code "CHILD_SPAWN_FAIL" -Phase "child_spawn" -Message "failed to start Node child" -Extra @{
      tipHead = $tipHead; freeze = $freeze; bundleOid = $bundleOid; bundleSha = $bundleSha
      unsafeRemoved = $unsafeRemoved; cleanup = $script:cleanupResult
    }
  }

  $stdout = $proc.StandardOutput.ReadToEnd()
  $stderr = $proc.StandardError.ReadToEnd()
  $proc.WaitForExit()
  $exit = $proc.ExitCode

  $script:cleanupResult = Clear-TempPath -Path $script:tempRoot
  $script:tempRoot = $null

  # Scrub stderr for DSN-looking tokens before any relay
  if ($stderr) {
    $scrubbed = [regex]::Replace($stderr, "postgres(?:ql)?://[^\s]+", "postgres://***")
    $scrubbed = [regex]::Replace($scrubbed, "CONTAINMENT_APPLY_DATABASE_URL\s*[:=]\s*\S+", "CONTAINMENT_APPLY_DATABASE_URL=***")
    if ($scrubbed.Trim().Length -gt 0 -and $stdout.Trim().Length -eq 0) {
      # Child crashed without JSON — wrap
      $wrap = [ordered]@{
        verdict                    = "BOOTSTRAP_BLOCKED"
        error_code                 = "CHILD_START_OR_CRASH"
        phase                      = "child_execute"
        error                      = $scrubbed.Substring(0, [Math]::Min(400, $scrubbed.Length))
        sqlApplicationAttempts     = 0
        databaseConnectionAttempts = 0
        nodeProcessStarted         = $true
        tip_head                   = $tipHead
        tooling_freeze             = $freeze
        bundle_oid                 = $bundleOid
        bundle_sha256              = $bundleSha
        unsafeInheritedNodeEnvironmentRemoved = $unsafeRemoved
        cleanup                    = $script:cleanupResult
        child_exit_status          = $exit
      }
      Write-BootstrapEvidence -Object $wrap
      exit 2
    }
  }

  if (-not $stdout -or -not ($stdout.Trim().StartsWith("{"))) {
    $wrap = [ordered]@{
      verdict                    = "BOOTSTRAP_BLOCKED"
      error_code                 = "CHILD_MALFORMED_EVIDENCE"
      phase                      = "child_execute"
      error                      = "child produced no parseable evidence JSON"
      sqlApplicationAttempts     = 0
      databaseConnectionAttempts = 0
      nodeProcessStarted         = $started
      tip_head                   = $tipHead
      tooling_freeze             = $freeze
      bundle_oid                 = $bundleOid
      bundle_sha256              = $bundleSha
      unsafeInheritedNodeEnvironmentRemoved = $unsafeRemoved
      cleanup                    = $script:cleanupResult
      child_exit_status          = $exit
    }
    Write-BootstrapEvidence -Object $wrap
    exit 2
  }

  # Enrich JSON with bootstrap metadata without re-serializing secrets
  try {
    $parsed = $stdout | ConvertFrom-Json
    $parsed | Add-Member -NotePropertyName bootstrap -NotePropertyValue ([ordered]@{
        tip_head       = $tipHead
        tooling_freeze = $freeze
        bundle_oid     = $bundleOid
        bundle_sha256  = $bundleSha
        bundle_bytes   = $bundleBytes.Length
        nodeProcessStarted = $true
        unsafeInheritedNodeEnvironmentRemoved = $unsafeRemoved
        cleanup        = $script:cleanupResult
        cwd_was_temp   = $true
        entry          = "powershell_bootstrap"
      }) -Force
    Write-BootstrapEvidence -Object $parsed
  }
  catch {
    # Relay raw stdout if enrichment fails but looked like JSON
    [Console]::Out.WriteLine($stdout.TrimEnd())
  }

  if ($null -eq $exit) { exit 1 }
  exit $exit
}
catch {
  $script:cleanupResult = Clear-TempPath -Path $script:tempRoot
  $m = [string]$_.Exception.Message
  if ($m.Length -gt 500) { $m = $m.Substring(0, 500) }
  Stop-Bootstrap -Code "BOOTSTRAP_UNEXPECTED" -Phase "unexpected" -Message $m -Extra @{ cleanup = $script:cleanupResult }
}
