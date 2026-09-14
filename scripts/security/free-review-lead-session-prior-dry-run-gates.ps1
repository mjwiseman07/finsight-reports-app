#Requires -Version 5.1
<#
.SYNOPSIS
  Shared FRLS prior-dry-run evidence gates (verdict allowlist + Assert-PriorDryRunEvidence).
  Dot-sourced by the production apply ceremony and unit-test harness.
  Does not connect to databases or accept credentials.
#>

function Get-FrlsDryRunReadyAllowlist {
  # Canonical FRLS success: long form. Short form retained for historically sealed
  # FRLS evidence only (semantic synonym under this allowlist).
  return @(
    "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION",
    "DRY_RUN_READY"
  )
}

function Test-FrlsDryRunReadyCode {
  param(
    [Parameter(Mandatory = $false)]
    [AllowNull()]
    $Code
  )
  if ($null -eq $Code) { return $false }
  # Reject non-string / wrong types (PSCustomObject, int, bool, etc.)
  if ($Code -isnot [string]) { return $false }
  if ([string]::IsNullOrWhiteSpace($Code)) { return $false }
  return (Get-FrlsDryRunReadyAllowlist) -contains $Code
}

function Assert-FrlsPriorDryRunReadyCodes {
  param(
    [Parameter(Mandatory = $false)]
    [AllowNull()]
    $WrapperResultCode,

    [Parameter(Mandatory = $false)]
    [AllowNull()]
    $ApplicatorVerdict
  )
  $allow = Get-FrlsDryRunReadyAllowlist
  $allowText = ($allow -join ", ")

  if (-not (Test-FrlsDryRunReadyCode -Code $ApplicatorVerdict)) {
    throw ("BLOCKED_PRIOR_DRY_RUN_NOT_READY: applicator verdict must be one of: " + $allowText)
  }
  if (-not (Test-FrlsDryRunReadyCode -Code $WrapperResultCode)) {
    throw ("BLOCKED_PRIOR_DRY_RUN_NOT_READY: wrapper result_code must be one of: " + $allowText)
  }
  # Semantic agreement: both codes must be members of the same success allowlist.
  # Long+short pairs are accepted; mixed success/failure is rejected above.
}

function Get-FrlsSha256Bytes([byte[]]$Bytes) {
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($sha.ComputeHash($Bytes)) -replace "-", "").ToLowerInvariant()
  } finally { $sha.Dispose() }
}

function Assert-PriorDryRunEvidence {
  param(
    [string]$Path,
    [object]$Auth
  )
  if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path -LiteralPath $Path)) {
    throw "BLOCKED_PRIOR_DRY_RUN_MISSING: PriorDryRunEvidencePath required"
  }
  $item = Get-Item -LiteralPath $Path -Force
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    throw "BLOCKED_PRIOR_DRY_RUN_INVALID: PriorDryRunEvidencePath is a reparse point"
  }
  $bytes = [IO.File]::ReadAllBytes($Path)
  $sha = Get-FrlsSha256Bytes -Bytes $bytes
  $expectedSha = [string]$Auth.required_prior_dry_run_evidence_sha256
  if ([string]::IsNullOrWhiteSpace($expectedSha) -or $expectedSha.Length -ne 64) {
    throw "AUTH_METADATA_INVALID: missing required_prior_dry_run_evidence_sha256"
  }
  if ($sha -ne $expectedSha.ToLowerInvariant()) {
    throw "BLOCKED_PRIOR_DRY_RUN_SHA_MISMATCH: evidence SHA-256 does not match authorization pin"
  }
  $expectedFreeze = [string]$Auth.required_prior_dry_run_freeze
  $expectedTip = [string]$Auth.required_prior_dry_run_evidence_tip
  if (-not ($expectedFreeze -match '^[0-9a-fA-F]{40}$')) {
    throw "AUTH_METADATA_INVALID: missing required_prior_dry_run_freeze"
  }
  if (-not ($expectedTip -match '^[0-9a-fA-F]{40}$')) {
    throw "AUTH_METADATA_INVALID: missing required_prior_dry_run_evidence_tip"
  }
  $json = [Text.Encoding]::UTF8.GetString($bytes)
  try {
    $ev = $json | ConvertFrom-Json
  } catch {
    throw "BLOCKED_PRIOR_DRY_RUN_INVALID: malformed evidence JSON"
  }
  if ($null -eq $ev) {
    throw "BLOCKED_PRIOR_DRY_RUN_INVALID: empty evidence JSON"
  }
  $app = $ev.applicator
  if (-not $app) { throw "BLOCKED_PRIOR_DRY_RUN_INVALID: missing applicator evidence" }

  # Wrapper + applicator use the identical success allowlist; no silent fallback.
  Assert-FrlsPriorDryRunReadyCodes `
    -WrapperResultCode $ev.result_code `
    -ApplicatorVerdict $app.verdict

  if ([string]$ev.mode -ne "dry-run") {
    throw "BLOCKED_PRIOR_DRY_RUN_INVALID: mode must be dry-run"
  }
  if ([bool]$app.read_only -ne $true) {
    throw "BLOCKED_PRIOR_DRY_RUN_INVALID: read_only must be true"
  }
  $evFreeze = [string]$(if ($app.authorized_tooling_freeze) { $app.authorized_tooling_freeze } elseif ($app.pr_head) { $app.pr_head } else { $ev.freeze })
  $evTip = [string]$app.evidence_tip
  if ($evFreeze.ToLowerInvariant() -ne $expectedFreeze.ToLowerInvariant()) {
    throw "BLOCKED_PRIOR_DRY_RUN_STALE_FREEZE: evidence freeze does not match required_prior_dry_run_freeze"
  }
  if ($evTip.ToLowerInvariant() -ne $expectedTip.ToLowerInvariant()) {
    throw "BLOCKED_PRIOR_DRY_RUN_STALE_TIP: evidence tip does not match required_prior_dry_run_evidence_tip"
  }
  $sql = 0
  if ($null -ne $ev.sqlApplicationAttempts) { $sql = [int]$ev.sqlApplicationAttempts }
  elseif ($null -ne $app.sqlApplicationAttempts) { $sql = [int]$app.sqlApplicationAttempts }
  if ($sql -ne 0) { throw "BLOCKED_PRIOR_DRY_RUN_INVALID: sqlApplicationAttempts must be 0" }
  $adv = $false
  if ($null -ne $ev.advisory_lock_acquired) { $adv = [bool]$ev.advisory_lock_acquired }
  elseif ($null -ne $app.advisory_lock_acquired) { $adv = [bool]$app.advisory_lock_acquired }
  if ($adv) { throw "BLOCKED_PRIOR_DRY_RUN_INVALID: advisory_lock_acquired must be false" }
  $cleanup = $ev.cleanup
  if (-not $cleanup -or [bool]$cleanup.credential_cleared -ne $true) {
    throw "BLOCKED_PRIOR_DRY_RUN_CLEANUP: credential_cleared required"
  }
  if ([bool]$cleanup.ca_path_env_absent -ne $true) {
    throw "BLOCKED_PRIOR_DRY_RUN_CLEANUP: ca_path_env_absent required"
  }
  return @{
    sha256 = $sha
    freeze = $evFreeze
    tip    = $evTip
  }
}
