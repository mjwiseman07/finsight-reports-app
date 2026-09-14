#Requires -Version 5.1
<#
.SYNOPSIS
  Pre-Node sealed bootstrap for Free Review lead-session apply.

.DESCRIPTION
  Must be materialized from a committed Git blob and hash-verified before execution.
  Does not connect to PostgreSQL, read FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL values into
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

function ConvertTo-Base64Url([byte[]]$Bytes) {
  $b64 = [Convert]::ToBase64String($Bytes)
  return (($b64.TrimEnd('=')) -replace '\+', '-' -replace '/', '_')
}

function Write-BootstrapEvidence {
  param($Object)
  # Emit exactly one FRLS_LEAD_SESSION_EVIDENCE_V1 frame on stdout.
  $json = $Object | ConvertTo-Json -Depth 20 -Compress
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $frame = "FRLS_LEAD_SESSION_EVIDENCE_V1:" + (ConvertTo-Base64Url -Bytes $bytes)
  [Console]::Out.WriteLine($frame)
}

function New-WrapperFallbackObject {
  param(
    [string]$Code,
    [string]$Phase,
    [string]$Message,
    [hashtable]$Extra = @{}
  )
  $msg = [string]$Message
  if ($msg.Length -gt 500) { $msg = $msg.Substring(0, 500) }
  return [ordered]@{
    protocol_version              = 1
    schema_version                = 1
    result_code                   = "BOOTSTRAP_BLOCKED"
    verdict                       = "BOOTSTRAP_BLOCKED"
    reason_code                   = $Code
    error_code                    = $Code
    phase                         = $Phase
    evidence_source               = "native_wrapper_fallback"
    mode                          = $Mode
    read_only                     = $true
    error                         = $msg
    sqlApplicationAttempts        = 0
    databaseConnectionAttempts    = 0
    nodeProcessStarted            = $(if ($Extra.ContainsKey("nodeProcessStarted")) { [bool]$Extra.nodeProcessStarted } else { $false })
    advisory_lock_acquired        = $false
    database_connected            = $false
    tip_head                      = $(if ($Extra.ContainsKey("tipHead")) { $Extra.tipHead } else { $null })
    tooling_freeze                = $(if ($Extra.ContainsKey("freeze")) { $Extra.freeze } else { $null })
    bundle_oid                    = $(if ($Extra.ContainsKey("bundleOid")) { $Extra.bundleOid } else { $null })
    bundle_sha256                 = $(if ($Extra.ContainsKey("bundleSha")) { $Extra.bundleSha } else { $null })
    bootstrap_sha256              = $(if ($Extra.ContainsKey("bootstrapSha")) { $Extra.bootstrapSha } else { $null })
    unsafeInheritedNodeEnvironmentRemoved = $(if ($Extra.ContainsKey("unsafeRemoved")) { [bool]$Extra.unsafeRemoved } else { $false })
    cleanup                       = $(if ($Extra.ContainsKey("cleanup")) { $Extra.cleanup } else { @{ completed = $true } })
    credential_redaction_confirmation = @{
      url_in_evidence = $false
      url_in_argv     = $false
      values_undisclosed = $true
    }
    wrapper = [ordered]@{
      reason_code                 = $Code
      phase                       = $Phase
      nodeProcessStarted          = $(if ($Extra.ContainsKey("nodeProcessStarted")) { [bool]$Extra.nodeProcessStarted } else { $false })
      child_output_received       = $(if ($Extra.ContainsKey("child_output_received")) { [bool]$Extra.child_output_received } else { $false })
      counters_are_wrapper_observed = $true
    }
  }
}

function Stop-Bootstrap {
  param(
    [string]$Code,
    [string]$Phase,
    [string]$Message,
    [hashtable]$Extra = @{}
  )
  Write-BootstrapEvidence -Object (New-WrapperFallbackObject -Code $Code -Phase $Phase -Message $Message -Extra $Extra)
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
  if ($null -eq $bytes -or $bytes.Length -eq 0) { return "" }
  return [System.Text.Encoding]::UTF8.GetString($bytes).Trim()
}

function Test-GitIsAncestor {
  param([string]$Ancestor, [string]$Descendant, [string]$WorkDir)
  # Exit-code only: merge-base --is-ancestor emits no stdout on success, which must not
  # be treated as failure under StrictMode empty-pipeline unwrapping.
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = "git"
  $psi.Arguments = "merge-base --is-ancestor $Ancestor $Descendant"
  $psi.WorkingDirectory = $WorkDir
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $p = New-Object System.Diagnostics.Process
  $p.StartInfo = $psi
  [void]$p.Start()
  [void]$p.StandardOutput.ReadToEnd()
  [void]$p.StandardError.ReadToEnd()
  $p.WaitForExit()
  return ($p.ExitCode -eq 0)
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

function Test-ProhibitedNodeEnvPresent {
  param([string]$Name)
  $fromEnvApi = [Environment]::GetEnvironmentVariable($Name, "Process")
  if ($null -ne $fromEnvApi -and $fromEnvApi -ne "") { return $true }
  $item = Get-Item -LiteralPath "Env:$Name" -ErrorAction SilentlyContinue
  if ($null -ne $item -and $null -ne $item.Value -and $item.Value -ne "") { return $true }
  return $false
}

function Resolve-SealedNodeExe {
  <#
    Application-only resolution of node.exe to an absolute path.
    Does not use bare "node", PATHEXT, aliases, functions, scripts, or .cmd/.bat shims.
  #>
  $cmds = @(Get-Command -Name "node.exe" -CommandType Application -ErrorAction SilentlyContinue)
  if (-not $cmds -or $cmds.Count -lt 1) {
    return @{ ok = $false; code = "NODE_EXE_NOT_FOUND"; message = "no Application node.exe on PATH" }
  }
  $src = [string]$cmds[0].Source
  if (-not $src) {
    return @{ ok = $false; code = "NODE_EXE_NOT_FOUND"; message = "node.exe Application source empty" }
  }
  $full = [System.IO.Path]::GetFullPath($src)
  $ext = [System.IO.Path]::GetExtension($full)
  if ($ext -ne ".exe") {
    return @{ ok = $false; code = "NODE_EXE_REJECTED_NON_EXE"; message = "resolved node path is not .exe" }
  }
  $base = [System.IO.Path]::GetFileName($full)
  if ($base -ne "node.exe") {
    return @{ ok = $false; code = "NODE_EXE_REJECTED_BASENAME"; message = "resolved basename is not node.exe" }
  }
  if (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
    return @{ ok = $false; code = "NODE_EXE_MISSING_FILE"; message = "resolved node.exe path does not exist" }
  }
  $item = Get-Item -LiteralPath $full -Force
  if ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
    return @{ ok = $false; code = "NODE_EXE_REJECTED_REPARSE"; message = "resolved node.exe is a reparse point" }
  }
  # Version probe with the same absolute path (no PATH / PATHEXT re-resolution)
  $verPsi = New-Object System.Diagnostics.ProcessStartInfo
  $verPsi.FileName = $full
  $verPsi.Arguments = "-v"
  $verPsi.UseShellExecute = $false
  $verPsi.RedirectStandardOutput = $true
  $verPsi.RedirectStandardError = $true
  $verPsi.CreateNoWindow = $true
  $verProc = New-Object System.Diagnostics.Process
  $verProc.StartInfo = $verPsi
  try {
    [void]$verProc.Start()
    $verOut = ($verProc.StandardOutput.ReadToEnd() + $verProc.StandardError.ReadToEnd()).Trim()
    $verProc.WaitForExit()
    if ($verProc.ExitCode -ne 0 -or -not ($verOut -match '^v\d+\.\d+\.\d+')) {
      return @{ ok = $false; code = "NODE_EXE_VERSION_FAIL"; message = "node.exe -v failed or malformed" }
    }
  }
  catch {
    return @{ ok = $false; code = "NODE_EXE_VERSION_FAIL"; message = "node.exe -v could not start" }
  }
  $sha = $null
  try {
    $bytes = [System.IO.File]::ReadAllBytes($full)
    $sha = Get-Sha256Hex -Bytes $bytes
  }
  catch {
    $sha = $null
  }
  return @{
    ok           = $true
    path         = $full
    basename     = "node.exe"
    version      = $verOut
    sha256       = $sha
  }
}

$script:tempRoot = $null
$script:cleanupResult = $null
$script:nodeProvenance = $null

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
    if ($a -eq "--bundle-source-commit" -or $a -eq "--bundleSourceCommit" -or $a -eq "-BundleSourceCommit" -or
        $a -eq "--bundle-oid" -or $a -eq "--bundle-sha256" -or $a -eq "--bundle-bytes") {
      Stop-Bootstrap -Code "PROHIBITED_BUNDLE_AUTHORITY_OVERRIDE" -Phase "parse_args" -Message "bundle source/seals cannot be overridden via argv"
    }
  }

  $tipHead = Invoke-GitText -GitArgs @("rev-parse", "HEAD") -WorkDir $RepoRoot
  $authPath = "docs/security/free-review-lead-session-apply/TOOLING_AUTHORIZATION.json"
  $authSource = "git_tip_blob"
  try {
    $authBytes = Invoke-GitBytes -GitArgs @("cat-file", "blob", "${tipHead}:${authPath}") -WorkDir $RepoRoot
    $authJson = [System.Text.Encoding]::UTF8.GetString($authBytes)
    $auth = $authJson | ConvertFrom-Json
  }
  catch {
    $authFile = Join-Path $RepoRoot $authPath
    if (-not (Test-Path -LiteralPath $authFile)) {
      Stop-Bootstrap -Code "AUTH_METADATA_LOAD_FAIL" -Phase "load_auth" -Message "failed to load TOOLING_AUTHORIZATION.json from tip or worktree" -Extra @{ tipHead = $tipHead }
    }
    $authJson = [System.IO.File]::ReadAllText($authFile)
    $auth = $authJson | ConvertFrom-Json
    $authSource = "worktree_fallback_pre_freeze"
  }

  if ([string]$authJson -match "PENDING_AFTER_COMMIT") {
    Stop-Bootstrap -Code "BLOCKED_PIN_MISMATCH" -Phase "tip_freeze_relation" -Message "authorization still PENDING_AFTER_COMMIT" -Extra @{ tipHead = $tipHead }
  }
  foreach ($badEnv in @(
      "FRLS_BUNDLE_SOURCE_COMMIT",
      "BUNDLE_SOURCE_COMMIT",
      "FRLS_STANDALONE_BUNDLE_OID",
      "FRLS_STANDALONE_BUNDLE_SHA256",
      "FRLS_STANDALONE_BUNDLE_BYTES"
    )) {
    $present = $null -ne [Environment]::GetEnvironmentVariable($badEnv, "Process") -and [Environment]::GetEnvironmentVariable($badEnv, "Process") -ne ""
    if ($present) {
      Stop-Bootstrap -Code "PROHIBITED_BUNDLE_AUTHORITY_OVERRIDE" -Phase "parse_args" -Message ("bundle source/seals cannot be overridden via environment: " + $badEnv) -Extra @{ tipHead = $tipHead }
    }
  }
  if ($auth.authorized_pr_head -ne $PrHead) {
    Stop-Bootstrap -Code "BLOCKED_PIN_MISMATCH" -Phase "tip_freeze_relation" -Message "--pr-head does not equal authorization.authorized_pr_head" -Extra @{ tipHead = $tipHead; freeze = [string]$auth.authorized_pr_head }
  }
  $freeze = [string]$auth.authorized_pr_head
  if (-not ($freeze -match '^[0-9a-fA-F]{40}$')) {
    Stop-Bootstrap -Code "AUTH_METADATA_INVALID" -Phase "load_auth" -Message "authorized_pr_head must be the 40-hex executable freeze" -Extra @{ tipHead = $tipHead }
  }

  # Two-authority model (non-circular):
  # - executable freeze (authorized_pr_head / -PrHead) = runtime/pin identity
  # - bundle_source_commit = immutable commit whose tree holds the finalized sealed bundle blob
  # Tip authorization seals the bundle; bootstrap materializes from bundle_source_commit, never from freeze.
  $bundleSource = [string]$auth.bundle_source_commit
  if (-not ($bundleSource -match '^[0-9a-fA-F]{40}$')) {
    Stop-Bootstrap -Code "AUTH_METADATA_INVALID" -Phase "load_auth" -Message "missing sealed bundle_source_commit" -Extra @{ tipHead = $tipHead; freeze = $freeze }
  }
  if ($bundleSource -eq $freeze) {
    Stop-Bootstrap -Code "BLOCKED_BUNDLE_SOURCE" -Phase "tip_freeze_relation" -Message "bundle_source_commit cannot equal executable freeze" -Extra @{ tipHead = $tipHead; freeze = $freeze; bundleSource = $bundleSource }
  }
  # Source must be an allowed descendant of the executable freeze in the publication chain.
  if (-not (Test-GitIsAncestor -Ancestor $freeze -Descendant $bundleSource -WorkDir $RepoRoot)) {
    Stop-Bootstrap -Code "BLOCKED_BUNDLE_SOURCE_ANCESTRY" -Phase "tip_freeze_relation" -Message "bundle_source_commit is not a descendant of the executable freeze" -Extra @{ tipHead = $tipHead; freeze = $freeze; bundleSource = $bundleSource }
  }
  # Final tip HEAD must equal the bundle source or be a descendant of it (tip-pin commit after bundle finalize).
  if ($tipHead -ne $bundleSource) {
    if (-not (Test-GitIsAncestor -Ancestor $bundleSource -Descendant $tipHead -WorkDir $RepoRoot)) {
      Stop-Bootstrap -Code "BLOCKED_TIP_BUNDLE_SOURCE" -Phase "tip_freeze_relation" -Message "HEAD tip is not the sealed bundle_source_commit or a descendant of it" -Extra @{ tipHead = $tipHead; freeze = $freeze; bundleSource = $bundleSource }
    }
  }

  if ($EvidenceTip -and ($EvidenceTip -eq $freeze)) {
    Stop-Bootstrap -Code "BLOCKED_PIN_MISMATCH" -Phase "tip_freeze_relation" -Message "evidence tip cannot equal tooling freeze" -Extra @{ tipHead = $tipHead; freeze = $freeze }
  }
  if (-not $EvidenceTip) { $EvidenceTip = $tipHead }

  $bundle = $auth.standalone_bundle
  if (-not $bundle -or -not $bundle.path -or -not $bundle.oid -or -not $bundle.sha256 -or -not $bundle.bytes) {
    Stop-Bootstrap -Code "AUTH_METADATA_INVALID" -Phase "load_auth" -Message "missing standalone_bundle seals" -Extra @{ tipHead = $tipHead; freeze = $freeze; bundleSource = $bundleSource }
  }
  if ([string]$bundle.path -ne "scripts/security/bundles/free-review-lead-session-applicator.standalone.cjs") {
    Stop-Bootstrap -Code "AUTH_METADATA_INVALID" -Phase "load_auth" -Message "unexpected standalone_bundle.path" -Extra @{ tipHead = $tipHead; freeze = $freeze; bundleSource = $bundleSource }
  }

  # Materialize finalized bundle from sealed bundle_source_commit (not freeze).
  $script:tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("frls-bootstrap-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $script:tempRoot | Out-Null
  $bundleDest = Join-Path $script:tempRoot "applicator.standalone.cjs"

  # Prove freeze-tree stale bundle is never selected when tip seals differ.
  try {
    $freezeBundleOid = Invoke-GitText -GitArgs @("rev-parse", "${freeze}:$($bundle.path)") -WorkDir $RepoRoot
  } catch {
    $freezeBundleOid = $null
  }

  try {
    $bundleOid = Invoke-GitText -GitArgs @("rev-parse", "${bundleSource}:$($bundle.path)") -WorkDir $RepoRoot
    $bundleBytes = Invoke-GitBytes -GitArgs @("cat-file", "blob", "${bundleSource}:$($bundle.path)") -WorkDir $RepoRoot
  }
  catch {
    $script:cleanupResult = Clear-TempPath -Path $script:tempRoot
    Stop-Bootstrap -Code "GIT_BLOB_EXTRACT_FAIL" -Phase "materialize_bundle" -Message "failed to extract standalone bundle from bundle_source_commit" -Extra @{ tipHead = $tipHead; freeze = $freeze; bundleSource = $bundleSource; cleanup = $script:cleanupResult }
  }

  if ($bundleOid -ne [string]$bundle.oid) {
    $script:cleanupResult = Clear-TempPath -Path $script:tempRoot
    Stop-Bootstrap -Code "BUNDLE_OID_MISMATCH" -Phase "verify_bundle" -Message "bundle OID mismatch against tip authorization" -Extra @{ tipHead = $tipHead; freeze = $freeze; bundleSource = $bundleSource; freezeBundleOid = $freezeBundleOid; cleanup = $script:cleanupResult }
  }
  $bundleSha = Get-Sha256Hex -Bytes $bundleBytes
  if ($bundleSha -ne ([string]$bundle.sha256).ToLowerInvariant()) {
    $script:cleanupResult = Clear-TempPath -Path $script:tempRoot
    Stop-Bootstrap -Code "BUNDLE_HASH_MISMATCH" -Phase "verify_bundle" -Message "bundle SHA-256 mismatch" -Extra @{ tipHead = $tipHead; freeze = $freeze; bundleSource = $bundleSource; cleanup = $script:cleanupResult }
  }
  if ($bundleBytes.Length -ne [int]$bundle.bytes) {
    $script:cleanupResult = Clear-TempPath -Path $script:tempRoot
    Stop-Bootstrap -Code "BUNDLE_BYTES_MISMATCH" -Phase "verify_bundle" -Message "bundle byte length mismatch" -Extra @{ tipHead = $tipHead; freeze = $freeze; bundleSource = $bundleSource; cleanup = $script:cleanupResult }
  }
  # Refuse CR in sealed bundle
  if ($bundleBytes -contains 0x0D) {
    $script:cleanupResult = Clear-TempPath -Path $script:tempRoot
    Stop-Bootstrap -Code "BUNDLE_CR_FORBIDDEN" -Phase "verify_bundle" -Message "CR bytes in sealed bundle" -Extra @{ tipHead = $tipHead; freeze = $freeze; bundleSource = $bundleSource; cleanup = $script:cleanupResult }
  }

  # Embedded FRLS AUTHORIZED_TOOLING_FREEZE must equal the executable freeze (not tip, not PENDING).
  $bundleText = [System.Text.Encoding]::UTF8.GetString($bundleBytes)
  $frlsFreezeMatch = [regex]::Match(
    $bundleText,
    'free-review-lead-session-apply-constants\.js[\s\S]{0,4000}?AUTHORIZED_TOOLING_FREEZE = "([0-9a-fA-F]{40}|PENDING_AFTER_COMMIT)"'
  )
  if (-not $frlsFreezeMatch.Success) {
    $script:cleanupResult = Clear-TempPath -Path $script:tempRoot
    Stop-Bootstrap -Code "BUNDLE_EMBEDDED_FREEZE_MISSING" -Phase "verify_bundle" -Message "FRLS AUTHORIZED_TOOLING_FREEZE constant missing from bundle" -Extra @{ tipHead = $tipHead; freeze = $freeze; bundleSource = $bundleSource; cleanup = $script:cleanupResult }
  }
  $embeddedFreeze = [string]$frlsFreezeMatch.Groups[1].Value
  if ($embeddedFreeze -eq "PENDING_AFTER_COMMIT") {
    $script:cleanupResult = Clear-TempPath -Path $script:tempRoot
    Stop-Bootstrap -Code "BUNDLE_EMBEDDED_FREEZE_PENDING" -Phase "verify_bundle" -Message "FRLS AUTHORIZED_TOOLING_FREEZE still PENDING_AFTER_COMMIT" -Extra @{ tipHead = $tipHead; freeze = $freeze; bundleSource = $bundleSource; cleanup = $script:cleanupResult }
  }
  if ($embeddedFreeze.ToLowerInvariant() -ne $freeze.ToLowerInvariant()) {
    $script:cleanupResult = Clear-TempPath -Path $script:tempRoot
    Stop-Bootstrap -Code "BUNDLE_EMBEDDED_FREEZE_MISMATCH" -Phase "verify_bundle" -Message "embedded AUTHORIZED_TOOLING_FREEZE does not equal executable freeze" -Extra @{ tipHead = $tipHead; freeze = $freeze; bundleSource = $bundleSource; embeddedFreeze = $embeddedFreeze; cleanup = $script:cleanupResult }
  }

  [System.IO.File]::WriteAllBytes($bundleDest, $bundleBytes)
  $item = Get-Item -LiteralPath $bundleDest
  if ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
    $script:cleanupResult = Clear-TempPath -Path $script:tempRoot
    Stop-Bootstrap -Code "SYMLINK_REFUSED" -Phase "materialize_bundle" -Message "symlink/junction materialized bundle refused" -Extra @{ tipHead = $tipHead; freeze = $freeze; bundleSource = $bundleSource; cleanup = $script:cleanupResult }
  }
  if ($item.PSIsContainer) {
    $script:cleanupResult = Clear-TempPath -Path $script:tempRoot
    Stop-Bootstrap -Code "BUNDLE_TYPE_INVALID" -Phase "materialize_bundle" -Message "materialized bundle must be a regular file" -Extra @{ tipHead = $tipHead; freeze = $freeze; bundleSource = $bundleSource; cleanup = $script:cleanupResult }
  }

  # Sanitized child environment: strip Node injection; pass DB URL env by name only (do not read value into evidence)
  # Do not synthesize PATHEXT. Resolution of node.exe is Application-absolute and does not depend on PATHEXT.
  $unsafeRemovedLocal = $false
  $childEnv = New-Object "System.Collections.Generic.Dictionary[string,string]"
  foreach ($key in @("PATH", "SystemRoot", "TEMP", "TMP", "USERPROFILE", "HOME", "LANG", "ComSpec", "NUMBER_OF_PROCESSORS", "OS", "PROCESSOR_ARCHITECTURE")) {
    $val = [Environment]::GetEnvironmentVariable($key, "Process")
    if ($null -ne $val -and $val -ne "") {
      $childEnv[$key] = $val
    }
  }
  # Presence-only check for credential channel; never serialize value
  $dbEnvName = "FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL"
  $dbPresent = $null -ne [Environment]::GetEnvironmentVariable($dbEnvName, "Process") -and [Environment]::GetEnvironmentVariable($dbEnvName, "Process") -ne ""
  if ($dbPresent) {
    $childEnv[$dbEnvName] = [Environment]::GetEnvironmentVariable($dbEnvName, "Process")
  }
  # Retired CA-path channel: fail closed if present (trust root is embedded in sealed bundle).
  $caEnvName = "FREE_REVIEW_LEAD_SESSION_APPLY_SSL_ROOTCERT"
  $caPresent = $null -ne [Environment]::GetEnvironmentVariable($caEnvName, "Process") -and [Environment]::GetEnvironmentVariable($caEnvName, "Process") -ne ""
  if ($caPresent) {
    $script:cleanupResult = Clear-TempPath -Path $script:tempRoot
    Stop-Bootstrap -Code "BLOCKED_TLS_CA_PATH_FORBIDDEN" -Phase "tls_policy" -Message "FREE_REVIEW_LEAD_SESSION_APPLY_SSL_ROOTCERT is retired; trust root is embedded" -Extra @{ tipHead = $tipHead; freeze = $freeze; cleanup = $script:cleanupResult }
  }
  # Fail closed: never forward TLS bypass
  if ([Environment]::GetEnvironmentVariable("NODE_TLS_REJECT_UNAUTHORIZED", "Process") -eq "0") {
    $script:cleanupResult = Clear-TempPath -Path $script:tempRoot
    Stop-Bootstrap -Code "BLOCKED_TLS_BYPASS" -Phase "tls_policy" -Message "NODE_TLS_REJECT_UNAUTHORIZED=0 forbidden" -Extra @{ tipHead = $tipHead; freeze = $freeze; cleanup = $script:cleanupResult }
  }
  $childEnv["FRLS_ATTESTED_FREEZE"] = $freeze
  $childEnv["FRLS_GIT_CWD"] = $RepoRoot

  $containmentDbPresent = $null -ne [Environment]::GetEnvironmentVariable("CONTAINMENT_APPLY_DATABASE_URL", "Process") -and [Environment]::GetEnvironmentVariable("CONTAINMENT_APPLY_DATABASE_URL", "Process") -ne ""
  if ($containmentDbPresent) {
    $script:cleanupResult = Clear-TempPath -Path $script:tempRoot
    Stop-Bootstrap -Code "PROHIBITED_CREDENTIAL_CHANNEL" -Phase "uri_validate" -Message "CONTAINMENT_APPLY_DATABASE_URL is forbidden for FRLS applicator" -Extra @{ tipHead = $tipHead; freeze = $freeze; cleanup = $script:cleanupResult }
  }
  $prohibitedNodeEnv = @(
    "NODE_OPTIONS", "NODE_PATH", "NODE_REPL_EXTERNAL_MODULE",
    "NODE_IGNORE_NEXT_LOADER_HEADERS", "NODE_CHANNEL_FD",
    "npm_config_node_options", "npm_node_execpath",
    "DATABASE_URL", "CONTAINMENT_APPLY_DATABASE_URL", "NODE_TLS_REJECT_UNAUTHORIZED"
  )
  foreach ($bad in $prohibitedNodeEnv) {
    if (Test-ProhibitedNodeEnvPresent -Name $bad) {
      $unsafeRemovedLocal = $true
    }
    # intentionally not copied into childEnv
  }

  # Entry-derived sentinel: trusted entry overwrites this; bootstrap ORs with local detection.
  # Never pass the sentinel to the Node child.
  $entrySanitized = $false
  $sentinelName = "FRLS_NATIVE_ENV_SANITIZED"
  if ([Environment]::GetEnvironmentVariable($sentinelName, "Process") -eq "1") {
    $entrySanitized = $true
  }
  $unsafeRemoved = [bool]($unsafeRemovedLocal -or $entrySanitized)

  # Resolve node.exe once (Application-only); same absolute path for version check and child spawn
  $nodeRes = Resolve-SealedNodeExe
  if (-not $nodeRes.ok) {
    $script:cleanupResult = Clear-TempPath -Path $script:tempRoot
    Stop-Bootstrap -Code $nodeRes.code -Phase "resolve_node_exe" -Message $nodeRes.message -Extra @{
      tipHead = $tipHead; freeze = $freeze; bundleOid = $bundleOid; bundleSha = $bundleSha
      unsafeRemoved = $unsafeRemoved; cleanup = $script:cleanupResult
    }
  }
  $nodeExe = [string]$nodeRes.path
  $script:nodeProvenance = @{
    basename = [string]$nodeRes.basename
    version  = [string]$nodeRes.version
    sha256   = $(if ($nodeRes.sha256) { [string]$nodeRes.sha256 } else { $null })
  }

  # Build Node argv allowlist: absolute node.exe + bundle + applicator flags only (no user Node flags before bundle)
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

  # Scrub stderr for DSN-looking tokens (stderr only; never persist raw stdout after parse)
  $scrubbedStderr = ""
  if ($stderr) {
    $scrubbedStderr = [regex]::Replace($stderr, "postgres(?:ql)?://[^\s]+", "postgres://***")
    $scrubbedStderr = [regex]::Replace($scrubbedStderr, "FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL\s*[:=]\s*\S+", "FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL=***")
  }

  # Materialize frame tool from freeze into a fresh temp for parse/enrich (not the cleaned child dir)
  $parseDir = Join-Path ([System.IO.Path]::GetTempPath()) ("frls-evparse-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $parseDir | Out-Null
  $stdoutFile = Join-Path $parseDir "child-stdout.txt"
  $enrichFile = Join-Path $parseDir "enrich.json"
  $protoFile = Join-Path $parseDir "free-review-lead-session-evidence.js"
  $toolFile = Join-Path $parseDir "free-review-lead-session-evidence-frame-tool.js"
  try {
    [System.IO.File]::WriteAllText($stdoutFile, [string]$stdout)
    $protoBytes = Invoke-GitBytes -GitArgs @("cat-file", "blob", "${freeze}:scripts/security/free-review-lead-session-evidence.js") -WorkDir $RepoRoot
    $toolBytes = Invoke-GitBytes -GitArgs @("cat-file", "blob", "${freeze}:scripts/security/free-review-lead-session-evidence-frame-tool.js") -WorkDir $RepoRoot
    [System.IO.File]::WriteAllBytes($protoFile, $protoBytes)
    [System.IO.File]::WriteAllBytes($toolFile, $toolBytes)

    $bootMeta = [ordered]@{
      tip_head                              = $tipHead
      tooling_freeze                        = $freeze
      bundle_oid                            = $bundleOid
      bundle_sha256                         = $bundleSha
      bundle_bytes                          = $bundleBytes.Length
      nodeProcessStarted                    = $true
      unsafeInheritedNodeEnvironmentRemoved = $unsafeRemoved
      node                                  = $script:nodeProvenance
      cleanup                               = $script:cleanupResult
      cwd_was_temp                          = $true
      entry                                 = "powershell_bootstrap"
      child_exit_status                     = $exit
    }
    $bootMetaJson = ($bootMeta | ConvertTo-Json -Depth 8 -Compress)
    [System.IO.File]::WriteAllText($enrichFile, $bootMetaJson)

    $parsePsi = New-Object System.Diagnostics.ProcessStartInfo
    $parsePsi.FileName = $nodeExe
    $parsePsi.Arguments = "`"$toolFile`" parse-and-enrich `"$stdoutFile`" `"$enrichFile`""
    $parsePsi.WorkingDirectory = $parseDir
    $parsePsi.UseShellExecute = $false
    $parsePsi.RedirectStandardOutput = $true
    $parsePsi.RedirectStandardError = $true
    $parsePsi.CreateNoWindow = $true
    # Never let hostile inherited NODE_* affect the frame-tool Node process
    foreach ($k in @(
        "NODE_OPTIONS", "NODE_PATH", "NODE_REPL_EXTERNAL_MODULE",
        "NODE_IGNORE_NEXT_LOADER_HEADERS", "NODE_CHANNEL_FD",
        "npm_config_node_options", "npm_node_execpath"
      )) {
      if ($parsePsi.EnvironmentVariables.ContainsKey($k)) {
        [void]$parsePsi.EnvironmentVariables.Remove($k)
      }
    }
    $parseProc = New-Object System.Diagnostics.Process
    $parseProc.StartInfo = $parsePsi
    [void]$parseProc.Start()
    $frameOut = $parseProc.StandardOutput.ReadToEnd()
    $parseErr = $parseProc.StandardError.ReadToEnd()
    $parseProc.WaitForExit()

    if (-not $frameOut -or -not $frameOut.Trim().StartsWith("FRLS_LEAD_SESSION_EVIDENCE_V1:")) {
      Write-BootstrapEvidence -Object (New-WrapperFallbackObject -Code "APPLICATOR_EVIDENCE_MISSING" -Phase "evidence_extract" -Message "frame tool produced no evidence frame" -Extra @{
          tipHead = $tipHead; freeze = $freeze; bundleOid = $bundleOid; bundleSha = $bundleSha
          unsafeRemoved = $unsafeRemoved; cleanup = $script:cleanupResult
          nodeProcessStarted = $true; child_output_received = [bool]$stdout
        })
      exit 2
    }

    [Console]::Out.WriteLine($frameOut.TrimEnd())
    # Nonzero child exit must not suppress valid structured evidence (already emitted)
    if ($null -eq $exit) { exit 1 }
    exit $exit
  }
  finally {
    try {
      if (Test-Path -LiteralPath $parseDir) {
        Remove-Item -LiteralPath $parseDir -Recurse -Force -ErrorAction SilentlyContinue
      }
    } catch {}
  }
}
catch {
  $script:cleanupResult = Clear-TempPath -Path $script:tempRoot
  $m = [string]$_.Exception.Message
  if ($m.Length -gt 500) { $m = $m.Substring(0, 500) }
  Stop-Bootstrap -Code "BOOTSTRAP_UNEXPECTED" -Phase "unexpected" -Message $m -Extra @{ cleanup = $script:cleanupResult }
}
