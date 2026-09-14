#Requires -Version 5.1
<#
.SYNOPSIS
  Shared FRLS prior-dry-run evidence gates (verdict allowlist + Assert-PriorDryRunEvidence).
  Must be materialized from the authorized executable freeze and seal-verified before
  the production apply ceremony may dot-source this file. Never load from a mutable worktree.
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
}

function Get-FrlsSha256Bytes([byte[]]$Bytes) {
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($sha.ComputeHash($Bytes)) -replace "-", "").ToLowerInvariant()
  } finally { $sha.Dispose() }
}

function Get-FrlsRequiredString($Obj, [string]$Name, [string]$Code) {
  if ($null -eq $Obj) { throw "$Code`: missing object for $Name" }
  $prop = $Obj.PSObject.Properties[$Name]
  if ($null -eq $prop) { throw "$Code`: missing field $Name" }
  $v = $prop.Value
  if ($null -eq $v) { throw "$Code`: null field $Name" }
  if ($v -isnot [string]) { throw "$Code`: non-string field $Name" }
  if ([string]::IsNullOrWhiteSpace($v)) { throw "$Code`: empty field $Name" }
  return [string]$v
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

  Assert-FrlsPriorDryRunReadyCodes `
    -WrapperResultCode $ev.result_code `
    -ApplicatorVerdict $app.verdict

  $wrapSrc = Get-FrlsRequiredString $ev "evidence_source" "BLOCKED_PRIOR_DRY_RUN_SOURCE"
  $appSrc = Get-FrlsRequiredString $app "evidence_source" "BLOCKED_PRIOR_DRY_RUN_SOURCE"
  if ($wrapSrc -ne "sealed_applicator" -or $appSrc -ne "sealed_applicator") {
    throw "BLOCKED_PRIOR_DRY_RUN_SOURCE: evidence_source must be sealed_applicator on wrapper and applicator"
  }

  if ([string]$ev.mode -ne "dry-run") {
    throw "BLOCKED_PRIOR_DRY_RUN_INVALID: wrapper mode must be dry-run"
  }
  if ([string]$app.mode -ne "dry-run") {
    throw "BLOCKED_PRIOR_DRY_RUN_INVALID: applicator mode must be dry-run"
  }
  if ([bool]$app.read_only -ne $true) {
    throw "BLOCKED_PRIOR_DRY_RUN_INVALID: read_only must be true"
  }

  $project = $null
  if ($null -ne $app.project_ref_provided) { $project = [string]$app.project_ref_provided }
  elseif ($null -ne $app.project_ref_expected) { $project = [string]$app.project_ref_expected }
  if ($project -ne [string]$Auth.project_ref) {
    throw "BLOCKED_PRIOR_DRY_RUN_PROJECT: project_ref mismatch"
  }

  $evFreeze = [string]$(if ($app.authorized_tooling_freeze) { $app.authorized_tooling_freeze } elseif ($app.pr_head) { $app.pr_head } else { $ev.freeze })
  $evTip = [string]$app.evidence_tip
  $wrapFreeze = [string]$ev.freeze
  if ($evFreeze.ToLowerInvariant() -ne $expectedFreeze.ToLowerInvariant()) {
    throw "BLOCKED_PRIOR_DRY_RUN_STALE_FREEZE: evidence freeze does not match required_prior_dry_run_freeze"
  }
  if ($wrapFreeze.ToLowerInvariant() -ne $expectedFreeze.ToLowerInvariant()) {
    throw "BLOCKED_PRIOR_DRY_RUN_STALE_FREEZE: wrapper freeze does not match required_prior_dry_run_freeze"
  }
  if ($evTip.ToLowerInvariant() -ne $expectedTip.ToLowerInvariant()) {
    throw "BLOCKED_PRIOR_DRY_RUN_STALE_TIP: evidence tip does not match required_prior_dry_run_evidence_tip"
  }

  if ([string]$app.migration_version -ne [string]$Auth.migration_version) {
    throw "BLOCKED_PRIOR_DRY_RUN_MIGRATION: migration_version mismatch"
  }
  if ([string]$app.migration_name -ne [string]$Auth.migration_name) {
    throw "BLOCKED_PRIOR_DRY_RUN_MIGRATION: migration_name mismatch"
  }
  if ([string]$app.migration_path -ne [string]$Auth.migration_path) {
    throw "BLOCKED_PRIOR_DRY_RUN_MIGRATION: migration_path mismatch"
  }
  if ([string]$app.migration_blob_oid -ne [string]$Auth.migration_blob_oid) {
    throw "BLOCKED_PRIOR_DRY_RUN_MIGRATION: migration_blob_oid mismatch"
  }
  if ([string]$app.migration_sha256 -ne [string]$Auth.migration_sha256) {
    throw "BLOCKED_PRIOR_DRY_RUN_MIGRATION: migration_sha256 mismatch"
  }
  if ([int]$app.migration_bytes -ne [int]$Auth.migration_bytes) {
    throw "BLOCKED_PRIOR_DRY_RUN_MIGRATION: migration_bytes mismatch"
  }

  $hist = $null
  if ($null -ne $app.prior_history_count) { $hist = [int]$app.prior_history_count }
  if ($hist -ne 186) {
    throw "BLOCKED_PRIOR_DRY_RUN_HISTORY: prior_history_count must be 186"
  }
  if ([bool]$app.version_absent -ne $true) {
    throw "BLOCKED_PRIOR_DRY_RUN_VERSION: version_absent must be true"
  }
  if ([bool]$app.migration_objects_absent -ne $true) {
    throw "BLOCKED_PRIOR_DRY_RUN_OBJECTS: migration_objects_absent must be true"
  }
  if ($null -eq $app.PSObject.Properties["transaction_mutation"] -or [bool]$app.transaction_mutation -ne $false) {
    throw "BLOCKED_PRIOR_DRY_RUN_TX: transaction_mutation must be false"
  }

  $sql = $null
  if ($null -ne $ev.sqlApplicationAttempts) { $sql = [int]$ev.sqlApplicationAttempts }
  $sqlApp = $null
  if ($null -ne $app.sqlApplicationAttempts) { $sqlApp = [int]$app.sqlApplicationAttempts }
  if ($sql -ne 0 -or $sqlApp -ne 0) {
    throw "BLOCKED_PRIOR_DRY_RUN_INVALID: sqlApplicationAttempts must be 0"
  }

  $db = $null
  if ($null -ne $ev.databaseConnectionAttempts) { $db = [int]$ev.databaseConnectionAttempts }
  $dbApp = $null
  if ($null -ne $app.databaseConnectionAttempts) { $dbApp = [int]$app.databaseConnectionAttempts }
  if ($db -ne 1 -or $dbApp -ne 1) {
    throw "BLOCKED_PRIOR_DRY_RUN_DB_ATTEMPTS: databaseConnectionAttempts must be 1"
  }

  $adv = $false
  if ($null -ne $ev.advisory_lock_acquired) { $adv = [bool]$ev.advisory_lock_acquired }
  $advApp = $false
  if ($null -ne $app.advisory_lock_acquired) { $advApp = [bool]$app.advisory_lock_acquired }
  if ($adv -or $advApp) {
    throw "BLOCKED_PRIOR_DRY_RUN_INVALID: advisory_lock_acquired must be false"
  }

  $cleanup = $ev.cleanup
  if (-not $cleanup -or [bool]$cleanup.credential_cleared -ne $true) {
    throw "BLOCKED_PRIOR_DRY_RUN_CLEANUP: credential_cleared required"
  }
  if ([bool]$cleanup.ca_path_env_absent -ne $true) {
    throw "BLOCKED_PRIOR_DRY_RUN_CLEANUP: ca_path_env_absent required"
  }
  if ($null -ne $cleanup.PSObject.Properties["completed"] -and [bool]$cleanup.completed -ne $true) {
    throw "BLOCKED_PRIOR_DRY_RUN_CLEANUP: cleanup.completed must be true when present"
  }

  $cred = $ev.credential_redaction_confirmation
  if (-not $cred) {
    throw "BLOCKED_PRIOR_DRY_RUN_REDACTION: wrapper credential_redaction_confirmation required"
  }
  if ([bool]$cred.url_in_evidence -eq $true -or [bool]$cred.url_in_argv -eq $true) {
    throw "BLOCKED_PRIOR_DRY_RUN_REDACTION: credential disclosure forbidden"
  }
  $appCred = $app.credential_redaction_confirmation
  if (-not $appCred -or [bool]$appCred.values_undisclosed -ne $true) {
    throw "BLOCKED_PRIOR_DRY_RUN_REDACTION: applicator credential_redaction_confirmation.values_undisclosed required"
  }

  return @{
    sha256 = $sha
    freeze = $evFreeze
    tip    = $evTip
  }
}
