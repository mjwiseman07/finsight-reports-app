#Requires -Version 5.1
<#
.SYNOPSIS
  External trust-root entry for the visible RA Pro cutover ceremony (dry-run or apply).

.DESCRIPTION
  Preferred operator path:
    1) Materialize THIS script from tip git blob and verify against tip auth
       visible_ceremony_entry seals (OID/SHA-256/bytes).
    2) Invoke with absolute System32 powershell -File <materialized>
       -PrHead <freeze> -CeremonyKind <dry-run|apply>.

  This entry:
    - loads tip TOOLING_AUTHORIZATION from the exact resolved publication tip (HEAD)
    - requires -PrHead == authorized_pr_head (executable freeze)
    - requires exact 40-hex publication tip and freeze←bundle_source←tip ancestry
    - requires explicit -CeremonyKind (missing/unknown fails before PROMPT_READY)
    - Mixed authority map (explicit):
        * publication tip: TOOLING_AUTHORIZATION, visible_ceremony_entry (self),
          operator_ceremony (dry-run) when tip-published
        * executable freeze: visible_ceremony_launcher, operator_apply_ceremony,
          native_entry/bootstrap (via ceremony), precondition_gates (via dry-run ceremony)
        * bundle source: standalone applicator .cjs (via bootstrap)
    - materializes dry-run operator_ceremony from ${PublicationTip}:path only
    - materializes launcher + apply ceremony from freeze blobs
    - when precondition evidence is PUBLISHED, never falls back to freeze ceremony
    - verifies OID/SHA-256/bytes/non-reparse against tip/freeze seals before execution
    - starts absolute trusted PowerShell executing only the verified launcher
    - never executes mutable worktree launcher/ceremony
    - never sets RA_PRO_CUTOVER_APPLY_DATABASE_URL / never completes credential input
    - rejects argv/env/ref-name/abbrev-SHA ceremony or publication-tip substitutions

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

  [Parameter(Mandatory = $true)]
  [ValidateSet("dry-run", "apply")]
  [string]$CeremonyKind,

  [Parameter(Mandatory = $false)]
  [string]$RepoRoot = "",

  [Parameter(Mandatory = $false)]
  [string]$EvidenceOutDir = "",

  [Parameter(Mandatory = $false)]
  [string]$PriorDryRunEvidencePath = "",

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
  [Console]::Out.WriteLine("RA_PRO_CUTOVER_EVIDENCE_V1:" + (ConvertTo-Base64Url -Bytes $bytes))
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

function Test-PriorDryRunPinsPublished([object]$Auth) {
  # Pins are published only after the first authorized production dry-run.
  foreach ($v in @(
      [string]$Auth.required_prior_dry_run_evidence_sha256,
      [string]$Auth.required_prior_dry_run_freeze,
      [string]$Auth.required_prior_dry_run_evidence_tip,
      [string]$Auth.required_prior_dry_run_bundle_source
    )) {
    if ([string]::IsNullOrWhiteSpace($v)) { return $false }
    if ($v -match '^(?i)pending') { return $false }
  }
  if ([string]$Auth.required_prior_dry_run_evidence_sha256 -notmatch '^[0-9a-fA-F]{64}$') { return $false }
  if ([string]$Auth.required_prior_dry_run_freeze -notmatch '^[0-9a-fA-F]{40}$') { return $false }
  if ([string]$Auth.required_prior_dry_run_evidence_tip -notmatch '^[0-9a-fA-F]{40}$') { return $false }
  if ([string]$Auth.required_prior_dry_run_bundle_source -notmatch '^[0-9a-fA-F]{40}$') { return $false }
  return $true
}

function Assert-BlobSeal([string]$Commit, [string]$Rel, $Seal, [string]$Dest, [string]$WorkDir) {
  if (-not ($Commit -match '^[0-9a-fA-F]{40}$')) {
    throw "commit identity must be exact 40-hex for $Rel"
  }
  if (-not $Seal -or -not $Seal.oid -or -not $Seal.sha256 -or -not $Seal.bytes -or -not $Seal.path) {
    throw "missing seal metadata for $Rel"
  }
  if ([string]$Seal.path -ne $Rel) { throw "seal path mismatch for $Rel" }
  $resolved = Invoke-GitText -GitArgs @("rev-parse", "--verify", ($Commit + "^{commit}")) -WorkDir $WorkDir
  if ($resolved.ToLowerInvariant() -ne $Commit.ToLowerInvariant()) {
    throw ("commit not fully resolved for " + $Rel + ": " + $Commit)
  }
  $oid = Invoke-GitText -GitArgs @("rev-parse", "${Commit}:${Rel}") -WorkDir $WorkDir
  if ($oid -ne [string]$Seal.oid) { throw "OID mismatch for $Rel" }
  $bytes = Invoke-GitBytes -GitArgs @("cat-file", "blob", "${Commit}:${Rel}") -WorkDir $WorkDir
  if ($bytes.Length -ne [int]$Seal.bytes) { throw "bytes mismatch for $Rel" }
  $sha = Get-Sha256Hex -Bytes $bytes
  if ($sha -ne ([string]$Seal.sha256).ToLowerInvariant()) { throw "SHA-256 mismatch for $Rel" }
  [IO.File]::WriteAllBytes($Dest, $bytes)
  $item = Get-Item -LiteralPath $Dest -Force
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "materialized file is reparse point" }
  return @{ oid = $oid; sha256 = $sha; bytes = $bytes.Length; commit = $Commit.ToLowerInvariant() }
}

function Test-PreconditionEvidencePublished([object]$Auth) {
  $status = $null
  if ($null -ne $Auth.PSObject.Properties["published_precondition_evidence"] -and $null -ne $Auth.published_precondition_evidence) {
    if ($null -ne $Auth.published_precondition_evidence.PSObject.Properties["status"]) {
      $status = [string]$Auth.published_precondition_evidence.status
    }
  }
  if ([string]::IsNullOrWhiteSpace($status) -or $status -ine "PUBLISHED") { return $false }
  foreach ($v in @(
      [string]$Auth.required_precondition_evidence_sha256,
      [string]$Auth.required_precondition_freeze,
      [string]$Auth.required_precondition_evidence_tip,
      [string]$Auth.required_precondition_bundle_source
    )) {
    if ([string]::IsNullOrWhiteSpace($v)) { return $false }
  }
  return $true
}

function Assert-PublicationTipAncestry([string]$PublicationTip, [string]$Freeze, [string]$BundleSource, [string]$WorkDir) {
  if (-not ($PublicationTip -match '^[0-9a-fA-F]{40}$')) {
    throw "BLOCKED_PUBLICATION_TIP: publication tip must be exact 40-hex"
  }
  if (-not ($Freeze -match '^[0-9a-fA-F]{40}$')) {
    throw "BLOCKED_PUBLICATION_TIP: freeze must be exact 40-hex"
  }
  if (-not ($BundleSource -match '^[0-9a-fA-F]{40}$')) {
    throw "BLOCKED_PUBLICATION_TIP: bundle_source must be exact 40-hex"
  }
  $tipResolved = Invoke-GitText -GitArgs @("rev-parse", "--verify", ($PublicationTip + "^{commit}")) -WorkDir $WorkDir
  if ($tipResolved.ToLowerInvariant() -ne $PublicationTip.ToLowerInvariant()) {
    throw "BLOCKED_PUBLICATION_TIP: tip did not resolve to itself (abbrev/ref substitution rejected)"
  }
  if ($PublicationTip.ToLowerInvariant() -eq $Freeze.ToLowerInvariant()) {
    throw "BLOCKED_PUBLICATION_TIP: publication tip must not equal executable freeze"
  }
  if ($PublicationTip.ToLowerInvariant() -eq $BundleSource.ToLowerInvariant()) {
    throw "BLOCKED_PUBLICATION_TIP: publication tip must not equal bundle_source"
  }
  if ($Freeze.ToLowerInvariant() -eq $BundleSource.ToLowerInvariant()) {
    throw "BLOCKED_PUBLICATION_TIP: freeze must not equal bundle_source"
  }
  $psi1 = New-Object Diagnostics.ProcessStartInfo
  $psi1.FileName = "git"
  $psi1.Arguments = "merge-base --is-ancestor $Freeze $BundleSource"
  $psi1.WorkingDirectory = $WorkDir
  $psi1.RedirectStandardOutput = $true
  $psi1.RedirectStandardError = $true
  $psi1.UseShellExecute = $false
  $psi1.CreateNoWindow = $true
  $p1 = [Diagnostics.Process]::Start($psi1)
  [void]$p1.StandardOutput.ReadToEnd()
  [void]$p1.StandardError.ReadToEnd()
  $p1.WaitForExit()
  if ($p1.ExitCode -ne 0) {
    throw "BLOCKED_PUBLICATION_TIP: bundle_source is not a descendant of freeze"
  }
  $psi2 = New-Object Diagnostics.ProcessStartInfo
  $psi2.FileName = "git"
  $psi2.Arguments = "merge-base --is-ancestor $BundleSource $PublicationTip"
  $psi2.WorkingDirectory = $WorkDir
  $psi2.RedirectStandardOutput = $true
  $psi2.RedirectStandardError = $true
  $psi2.UseShellExecute = $false
  $psi2.CreateNoWindow = $true
  $p2 = [Diagnostics.Process]::Start($psi2)
  [void]$p2.StandardOutput.ReadToEnd()
  [void]$p2.StandardError.ReadToEnd()
  $p2.WaitForExit()
  if ($p2.ExitCode -ne 0) {
    throw "BLOCKED_PUBLICATION_TIP: publication tip is not a descendant of bundle_source"
  }
}

# --- main ---
try {
  if (-not $RepoRoot) {
    $RepoRoot = Invoke-GitText -GitArgs @("rev-parse", "--show-toplevel") -WorkDir (Get-Location).Path
  }
  Assert-SafePath "RepoRoot" $RepoRoot
  if (-not $EvidenceOutDir) {
    $EvidenceOutDir = Join-Path $env:TEMP ("frls-prod-dryrun-" + [guid]::NewGuid().ToString("N"))
  }
  Assert-SafePath "EvidenceOutDir" $EvidenceOutDir
  New-Item -ItemType Directory -Force -Path $EvidenceOutDir | Out-Null

  Remove-Item Env:RA_PRO_CUTOVER_APPLY_SSL_ROOTCERT -ErrorAction SilentlyContinue
  Remove-Item Env:NODE_TLS_REJECT_UNAUTHORIZED -ErrorAction SilentlyContinue
  Remove-Item Env:RA_PRO_CUTOVER_APPLY_DATABASE_URL -ErrorAction SilentlyContinue
  # Stage-1 containment channel is not an FRLS channel.
  Remove-Item Env:CONTAINMENT_APPLY_DATABASE_URL -ErrorAction SilentlyContinue

  # Reject mutable publication-tip / ceremony substitutions (argv/env/ref/abbrev).
  foreach ($forbiddenEnv in @(
      "RA_PRO_CUTOVER_PUBLICATION_TIP",
      "RA_PRO_CUTOVER_CEREMONY_PATH",
      "RA_PRO_CUTOVER_OPERATOR_CEREMONY_PATH",
      "RA_PRO_CUTOVER_CEREMONY_COMMIT",
      "RA_PRO_CUTOVER_CEREMONY_REF"
    )) {
    if (-not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($forbiddenEnv, "Process"))) {
      Stop-Entry "BLOCKED_INPUT_INVALID" "input_validate" ("forbidden env substitution: " + $forbiddenEnv)
    }
    if (-not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($forbiddenEnv, "User"))) {
      Stop-Entry "BLOCKED_INPUT_INVALID" "input_validate" ("forbidden env substitution: " + $forbiddenEnv)
    }
    if (-not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($forbiddenEnv, "Machine"))) {
      Stop-Entry "BLOCKED_INPUT_INVALID" "input_validate" ("forbidden env substitution: " + $forbiddenEnv)
    }
  }

  $tipRaw = Invoke-GitText -GitArgs @("rev-parse", "HEAD") -WorkDir $RepoRoot
  if (-not ($tipRaw -match '^[0-9a-fA-F]{40}$')) {
    Stop-Entry "BLOCKED_PUBLICATION_TIP" "resolve_publication_tip" "HEAD did not resolve to exact 40-hex"
  }
  $tip = $tipRaw.ToLowerInvariant()
  $tipVerify = Invoke-GitText -GitArgs @("rev-parse", "--verify", ($tip + "^{commit}")) -WorkDir $RepoRoot
  if ($tipVerify.ToLowerInvariant() -ne $tip) {
    Stop-Entry "BLOCKED_PUBLICATION_TIP" "resolve_publication_tip" "publication tip failed exact commit verify"
  }

  $authPath = "docs/security/ra-pro-cutover-apply/TOOLING_AUTHORIZATION.json"
  $authJson = [Text.Encoding]::UTF8.GetString((Invoke-GitBytes -GitArgs @("cat-file", "blob", "${tip}:${authPath}") -WorkDir $RepoRoot))
  $auth = $authJson | ConvertFrom-Json

  if ([string]$auth.authorized_pr_head -ne $PrHead) {
    Stop-Entry "BLOCKED_PIN_MISMATCH" "tip_freeze_relation" "PrHead must equal authorized_pr_head (tooling freeze)"
  }
  if ([string]$authJson -match "PENDING_AFTER_COMMIT") {
    Stop-Entry "BLOCKED_PIN_MISMATCH" "tip_freeze_relation" "authorization still PENDING_AFTER_COMMIT"
  }

  $freeze = ([string]$auth.authorized_pr_head).ToLowerInvariant()
  $bundleSource = $null
  if ($null -ne $auth.PSObject.Properties["bundle_source_commit"] -and -not [string]::IsNullOrWhiteSpace([string]$auth.bundle_source_commit)) {
    $bundleSource = ([string]$auth.bundle_source_commit).ToLowerInvariant()
  } elseif ($null -ne $auth.PSObject.Properties["required_precondition_bundle_source"] -and -not [string]::IsNullOrWhiteSpace([string]$auth.required_precondition_bundle_source)) {
    $bundleSource = ([string]$auth.required_precondition_bundle_source).ToLowerInvariant()
  }
  if ([string]::IsNullOrWhiteSpace($bundleSource) -or $bundleSource -notmatch '^[0-9a-f]{40}$') {
    Stop-Entry "AUTH_METADATA_INVALID" "load_auth" "bundle_source_commit (exact 40-hex) required for publication-tip ancestry"
  }
  try {
    Assert-PublicationTipAncestry -PublicationTip $tip -Freeze $freeze -BundleSource $bundleSource -WorkDir $RepoRoot
  } catch {
    Stop-Entry "BLOCKED_PUBLICATION_TIP" "tip_ancestry" ([string]$_.Exception.Message)
  }

  $preconditionPublished = Test-PreconditionEvidencePublished -Auth $auth
  $ve = $auth.visible_ceremony_entry
  $vl = $auth.visible_ceremony_launcher
  $ocDry = $auth.operator_ceremony
  $ocApply = $auth.operator_apply_ceremony
  if (-not $vl) {
    Stop-Entry "AUTH_METADATA_INVALID" "load_auth" "missing visible_ceremony_launcher seals"
  }
  if ([string]::IsNullOrWhiteSpace($CeremonyKind)) {
    Stop-Entry "BLOCKED_CEREMONY_KIND" "ceremony_kind" "CeremonyKind is required (dry-run|apply)"
  }
  if ($CeremonyKind -eq "dry-run") {
    if (-not $ocDry) {
      Stop-Entry "AUTH_METADATA_INVALID" "load_auth" "missing operator_ceremony (dry-run) seals"
    }
    if (-not [string]::IsNullOrWhiteSpace($PriorDryRunEvidencePath)) {
      Stop-Entry "BLOCKED_MODE_CONFUSION" "ceremony_kind" "PriorDryRunEvidencePath is not valid for dry-run ceremony kind"
    }
  } elseif ($CeremonyKind -eq "apply") {
    if (-not $ocApply) {
      Stop-Entry "AUTH_METADATA_INVALID" "load_auth" "missing operator_apply_ceremony seals"
    }
    if ([string]::IsNullOrWhiteSpace($TestStubScript)) {
      if (-not (Test-PriorDryRunPinsPublished -Auth $auth)) {
        Stop-Entry "BLOCKED_PRIOR_DRY_RUN_PINS_UNPUBLISHED" "prior_dry_run_pin_publication" "required_prior_dry_run_* pins are not published in TOOLING_AUTHORIZATION"
      }
      if ([string]::IsNullOrWhiteSpace($PriorDryRunEvidencePath)) {
        Stop-Entry "BLOCKED_PRIOR_DRY_RUN_MISSING" "prior_dry_run_gate" "PriorDryRunEvidencePath required for apply ceremony kind"
      }
    }
  } else {
    Stop-Entry "BLOCKED_CEREMONY_KIND" "ceremony_kind" "unknown CeremonyKind"
  }
  $oc = $(if ($CeremonyKind -eq "apply") { $ocApply } else { $ocDry })
  $ceremonyRel = [string]$oc.path
  if ([string]::IsNullOrWhiteSpace($ceremonyRel)) {
    Stop-Entry "AUTH_METADATA_INVALID" "load_auth" "ceremony seal missing path"
  }

  # Dry-run ceremony authority: tip seal + tip blob only. Apply remains freeze-owned.
  # When precondition evidence is PUBLISHED, freeze ceremony fallback is forbidden.
  $ceremonyAuthorityCommit = $freeze
  if ($CeremonyKind -eq "dry-run") {
    $ceremonyAuthorityCommit = $tip
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
  $launcherDest = Join-Path $script:materialRoot "launch-visible-ra-pro-cutover-ceremony.ps1"
  $ceremonyLeaf = [IO.Path]::GetFileName($ceremonyRel)
  $ceremonyDest = Join-Path $script:materialRoot $ceremonyLeaf

  $launcherSeal = $null
  try {
    $launcherSeal = Assert-BlobSeal -Commit $freeze -Rel "scripts/security/launch-visible-ra-pro-cutover-ceremony.ps1" -Seal $vl -Dest $launcherDest -WorkDir $RepoRoot
  } catch {
    Stop-Entry "BLOCKED_SEAL_MISMATCH" "materialize_launcher" ([string]$_.Exception.Message)
  }

  $ceremonySha = [string]$oc.sha256
  $ceremonyBytes = [int]$oc.bytes
  $ceremonyMaterialCommit = $null
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
    $ceremonyMaterialCommit = "synthetic_stub"
  } else {
    if ($CeremonyKind -eq "dry-run" -and $preconditionPublished -and $ceremonyAuthorityCommit -eq $freeze) {
      Stop-Entry "BLOCKED_SEAL_MISMATCH" "materialize_ceremony" "freeze ceremony fallback forbidden when precondition evidence is PUBLISHED"
    }
    try {
      $mat = Assert-BlobSeal -Commit $ceremonyAuthorityCommit -Rel $ceremonyRel -Seal $oc -Dest $ceremonyDest -WorkDir $RepoRoot
      $ceremonyMaterialCommit = [string]$mat.commit
    } catch {
      Stop-Entry "BLOCKED_SEAL_MISMATCH" "materialize_ceremony" ([string]$_.Exception.Message)
    }
    if ($CeremonyKind -eq "dry-run" -and $ceremonyMaterialCommit -ne $tip) {
      Stop-Entry "BLOCKED_SEAL_MISMATCH" "materialize_ceremony" "dry-run operator_ceremony must materialize from publication tip"
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
  if ($CeremonyKind -eq "apply" -and -not [string]::IsNullOrWhiteSpace($PriorDryRunEvidencePath)) {
    Assert-SafePath "PriorDryRunEvidencePath" $PriorDryRunEvidencePath
    $launchArgs += (Format-Win32Argument "-PriorDryRunEvidencePath")
    $launchArgs += (Format-Win32Argument $PriorDryRunEvidencePath)
  }
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
