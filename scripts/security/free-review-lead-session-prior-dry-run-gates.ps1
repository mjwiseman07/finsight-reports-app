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

function Get-FrlsRequiredBoolean($Obj, [string]$Name, [string]$Code) {
  if ($null -eq $Obj) { throw "$Code`: missing object for $Name" }
  $prop = $Obj.PSObject.Properties[$Name]
  if ($null -eq $prop) { throw "$Code`: missing field $Name" }
  $v = $prop.Value
  if ($null -eq $v) { throw "$Code`: null field $Name" }
  # ConvertFrom-Json maps JSON true/false to [bool]. Reject strings/numbers/inference.
  if ($v -isnot [bool]) { throw "$Code`: non-boolean field $Name" }
  return [bool]$v
}

function Get-FrlsRequiredInt($Obj, [string]$Name, [string]$Code) {
  if ($null -eq $Obj) { throw "$Code`: missing object for $Name" }
  $prop = $Obj.PSObject.Properties[$Name]
  if ($null -eq $prop) { throw "$Code`: missing field $Name" }
  $v = $prop.Value
  if ($null -eq $v) { throw "$Code`: null field $Name" }
  if ($v -is [bool] -or $v -is [string] -or $v -is [array]) {
    throw "$Code`: non-integer field $Name"
  }
  if (-not ($v -is [byte] -or $v -is [int16] -or $v -is [int] -or $v -is [long] -or $v -is [decimal] -or $v -is [double] -or $v -is [float])) {
    throw "$Code`: non-integer field $Name"
  }
  if ($v -is [double] -or $v -is [float] -or $v -is [decimal]) {
    if ([math]::Floor([double]$v) -ne [double]$v) {
      throw "$Code`: non-integer field $Name"
    }
  }
  return [int]$v
}

function Assert-FrlsRequiredBooleanEquals {
  param(
    $Obj,
    [string]$Name,
    [bool]$Expected,
    [string]$Code
  )
  $v = Get-FrlsRequiredBoolean $Obj $Name $Code
  if ($v -ne $Expected) {
    $want = if ($Expected) { "true" } else { "false" }
    throw "$Code`: $Name must be $want"
  }
}

function Get-OptionalFrlsBundleSourceString($Obj, [string]$Name, [string]$Code) {
  if ($null -eq $Obj) { return $null }
  if ($null -eq $Obj.PSObject.Properties[$Name]) { return $null }
  $v = $Obj.PSObject.Properties[$Name].Value
  if ($null -eq $v) { return $null }
  if ($v -isnot [string]) {
    throw "$Code`: non-string field $Name"
  }
  if ([string]::IsNullOrWhiteSpace($v)) {
    throw "$Code`: empty field $Name"
  }
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
  $expectedBundleSource = [string]$Auth.required_prior_dry_run_bundle_source
  if (-not ($expectedFreeze -match '^[0-9a-fA-F]{40}$')) {
    throw "AUTH_METADATA_INVALID: missing required_prior_dry_run_freeze"
  }
  if (-not ($expectedTip -match '^[0-9a-fA-F]{40}$')) {
    throw "AUTH_METADATA_INVALID: missing required_prior_dry_run_evidence_tip"
  }
  if (-not ($expectedBundleSource -match '^[0-9a-fA-F]{40}$')) {
    throw "AUTH_METADATA_INVALID: missing required_prior_dry_run_bundle_source"
  }
  # Never confuse prior dry-run bundle source with the current apply tip's bundle_source_commit.
  $applyBundleSource = $null
  if ($null -ne $Auth.PSObject.Properties["bundle_source_commit"] -and $null -ne $Auth.bundle_source_commit) {
    $applyBundleSource = [string]$Auth.bundle_source_commit
  }
  if (-not [string]::IsNullOrWhiteSpace($applyBundleSource) -and $applyBundleSource -match '^[0-9a-fA-F]{40}$') {
    if ($applyBundleSource.ToLowerInvariant() -eq $expectedBundleSource.ToLowerInvariant()) {
      throw "BLOCKED_PRIOR_DRY_RUN_BUNDLE_SOURCE: required_prior_dry_run_bundle_source must not equal current apply bundle_source_commit"
    }
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

  $wrapMode = Get-FrlsRequiredString $ev "mode" "BLOCKED_PRIOR_DRY_RUN_INVALID"
  $appMode = Get-FrlsRequiredString $app "mode" "BLOCKED_PRIOR_DRY_RUN_INVALID"
  if ($wrapMode -ne "dry-run") {
    throw "BLOCKED_PRIOR_DRY_RUN_INVALID: wrapper mode must be dry-run"
  }
  if ($appMode -ne "dry-run") {
    throw "BLOCKED_PRIOR_DRY_RUN_INVALID: applicator mode must be dry-run"
  }
  Assert-FrlsRequiredBooleanEquals $app "read_only" $true "BLOCKED_PRIOR_DRY_RUN_INVALID"

  $project = $null
  if ($null -ne $app.PSObject.Properties["project_ref_provided"] -and $null -ne $app.project_ref_provided) {
    $project = [string]$app.project_ref_provided
  } elseif ($null -ne $app.PSObject.Properties["project_ref_expected"] -and $null -ne $app.project_ref_expected) {
    $project = [string]$app.project_ref_expected
  }
  if ($project -ne [string]$Auth.project_ref) {
    throw "BLOCKED_PRIOR_DRY_RUN_PROJECT: project_ref mismatch"
  }

  $evFreeze = $null
  if ($null -ne $app.PSObject.Properties["authorized_tooling_freeze"] -and $app.authorized_tooling_freeze) {
    $evFreeze = [string]$app.authorized_tooling_freeze
  } elseif ($null -ne $app.PSObject.Properties["pr_head"] -and $app.pr_head) {
    $evFreeze = [string]$app.pr_head
  } else {
    $evFreeze = Get-FrlsRequiredString $ev "freeze" "BLOCKED_PRIOR_DRY_RUN_STALE_FREEZE"
  }
  $evTip = Get-FrlsRequiredString $app "evidence_tip" "BLOCKED_PRIOR_DRY_RUN_STALE_TIP"
  $wrapFreeze = Get-FrlsRequiredString $ev "freeze" "BLOCKED_PRIOR_DRY_RUN_STALE_FREEZE"
  if ($evFreeze.ToLowerInvariant() -ne $expectedFreeze.ToLowerInvariant()) {
    throw "BLOCKED_PRIOR_DRY_RUN_STALE_FREEZE: evidence freeze does not match required_prior_dry_run_freeze"
  }
  if ($wrapFreeze.ToLowerInvariant() -ne $expectedFreeze.ToLowerInvariant()) {
    throw "BLOCKED_PRIOR_DRY_RUN_STALE_FREEZE: wrapper freeze does not match required_prior_dry_run_freeze"
  }
  if ($evTip.ToLowerInvariant() -ne $expectedTip.ToLowerInvariant()) {
    throw "BLOCKED_PRIOR_DRY_RUN_STALE_TIP: evidence tip does not match required_prior_dry_run_evidence_tip"
  }

  # Dry-run bundle-source pin: production evidence does not embed the 40-hex
  # bundle_source_commit string. Authoritative present identity is
  # applicator.bootstrap.bundle_{oid,sha256,bytes}, which must match the sealed
  # standalone bundle of required_prior_dry_run_bundle_source (never the current
  # apply tip's standalone_bundle). If a literal bundle_source(_commit) field is
  # present on wrapper or applicator, it must equal the pin and agree across sides.
  $pub = $null
  if ($null -ne $Auth.PSObject.Properties["published_prior_dry_run"] -and $null -ne $Auth.published_prior_dry_run) {
    $pub = $Auth.published_prior_dry_run
  }
  $expectedBundleOid = $null
  $expectedBundleSha = $null
  $expectedBundleBytes = $null
  if ($null -ne $pub -and $null -ne $pub.PSObject.Properties["dry_run_standalone_bundle"] -and $null -ne $pub.dry_run_standalone_bundle) {
    $expectedBundleOid = [string]$pub.dry_run_standalone_bundle.oid
    $expectedBundleSha = [string]$pub.dry_run_standalone_bundle.sha256
    $expectedBundleBytes = [int]$pub.dry_run_standalone_bundle.bytes
  }
  if ([string]::IsNullOrWhiteSpace($expectedBundleOid) -or $expectedBundleOid.Length -ne 40) {
    throw "AUTH_METADATA_INVALID: missing published_prior_dry_run.dry_run_standalone_bundle.oid"
  }
  if ([string]::IsNullOrWhiteSpace($expectedBundleSha) -or $expectedBundleSha.Length -ne 64) {
    throw "AUTH_METADATA_INVALID: missing published_prior_dry_run.dry_run_standalone_bundle.sha256"
  }
  if ($null -eq $expectedBundleBytes -or $expectedBundleBytes -le 0) {
    throw "AUTH_METADATA_INVALID: missing published_prior_dry_run.dry_run_standalone_bundle.bytes"
  }
  if ($null -ne $pub.PSObject.Properties["dry_run_bundle_source"] -and $null -ne $pub.dry_run_bundle_source) {
    if (([string]$pub.dry_run_bundle_source).ToLowerInvariant() -ne $expectedBundleSource.ToLowerInvariant()) {
      throw "AUTH_METADATA_INVALID: published_prior_dry_run.dry_run_bundle_source disagrees with required_prior_dry_run_bundle_source"
    }
  }

  $wrapBundleSrc = Get-OptionalFrlsBundleSourceString $ev "bundle_source_commit" "BLOCKED_PRIOR_DRY_RUN_BUNDLE_SOURCE"
  if ($null -eq $wrapBundleSrc) { $wrapBundleSrc = Get-OptionalFrlsBundleSourceString $ev "bundle_source" "BLOCKED_PRIOR_DRY_RUN_BUNDLE_SOURCE" }
  $appBundleSrc = Get-OptionalFrlsBundleSourceString $app "bundle_source_commit" "BLOCKED_PRIOR_DRY_RUN_BUNDLE_SOURCE"
  if ($null -eq $appBundleSrc) { $appBundleSrc = Get-OptionalFrlsBundleSourceString $app "bundle_source" "BLOCKED_PRIOR_DRY_RUN_BUNDLE_SOURCE" }
  if ($null -ne $wrapBundleSrc -or $null -ne $appBundleSrc) {
    if ($null -ne $wrapBundleSrc -and $null -ne $appBundleSrc -and $wrapBundleSrc.ToLowerInvariant() -ne $appBundleSrc.ToLowerInvariant()) {
      throw "BLOCKED_PRIOR_DRY_RUN_BUNDLE_SOURCE: wrapper/applicator bundle_source disagree"
    }
    $literal = if ($null -ne $appBundleSrc) { $appBundleSrc } else { $wrapBundleSrc }
    if (-not ($literal -match '^[0-9a-fA-F]{40}$')) {
      throw "BLOCKED_PRIOR_DRY_RUN_BUNDLE_SOURCE: literal bundle_source must be exact 40-hex"
    }
    if ($literal.ToLowerInvariant() -ne $expectedBundleSource.ToLowerInvariant()) {
      throw "BLOCKED_PRIOR_DRY_RUN_BUNDLE_SOURCE: literal bundle_source does not match required_prior_dry_run_bundle_source"
    }
  }

  $boot = $null
  if ($null -ne $app.PSObject.Properties["bootstrap"]) {
    $boot = $app.bootstrap
  }
  if ($null -eq $boot) {
    throw "BLOCKED_PRIOR_DRY_RUN_BUNDLE_SOURCE: applicator.bootstrap required (authoritative dry-run bundle identity)"
  }
  $bootOid = Get-FrlsRequiredString $boot "bundle_oid" "BLOCKED_PRIOR_DRY_RUN_BUNDLE_SOURCE"
  $bootSha = Get-FrlsRequiredString $boot "bundle_sha256" "BLOCKED_PRIOR_DRY_RUN_BUNDLE_SOURCE"
  $bootBytes = Get-FrlsRequiredInt $boot "bundle_bytes" "BLOCKED_PRIOR_DRY_RUN_BUNDLE_SOURCE"
  if ($bootOid.ToLowerInvariant() -ne $expectedBundleOid.ToLowerInvariant()) {
    throw "BLOCKED_PRIOR_DRY_RUN_BUNDLE_SOURCE: bootstrap.bundle_oid does not match sealed dry-run standalone bundle"
  }
  if ($bootSha.ToLowerInvariant() -ne $expectedBundleSha.ToLowerInvariant()) {
    throw "BLOCKED_PRIOR_DRY_RUN_BUNDLE_SOURCE: bootstrap.bundle_sha256 does not match sealed dry-run standalone bundle"
  }
  if ($bootBytes -ne $expectedBundleBytes) {
    throw "BLOCKED_PRIOR_DRY_RUN_BUNDLE_SOURCE: bootstrap.bundle_bytes does not match sealed dry-run standalone bundle"
  }
  # Reject prior/apply bundle confusion: evidence must not present the current apply tip bundle.
  if ($null -ne $Auth.PSObject.Properties["standalone_bundle"] -and $null -ne $Auth.standalone_bundle) {
    $applyOid = [string]$Auth.standalone_bundle.oid
    $applySha = [string]$Auth.standalone_bundle.sha256
    if (-not [string]::IsNullOrWhiteSpace($applyOid) -and $bootOid.ToLowerInvariant() -eq $applyOid.ToLowerInvariant()) {
      throw "BLOCKED_PRIOR_DRY_RUN_BUNDLE_SOURCE: evidence bootstrap.bundle_oid matches current apply standalone_bundle (prior/apply confusion)"
    }
    if (-not [string]::IsNullOrWhiteSpace($applySha) -and $bootSha.ToLowerInvariant() -eq $applySha.ToLowerInvariant()) {
      throw "BLOCKED_PRIOR_DRY_RUN_BUNDLE_SOURCE: evidence bootstrap.bundle_sha256 matches current apply standalone_bundle (prior/apply confusion)"
    }
  }

  if ((Get-FrlsRequiredString $app "migration_version" "BLOCKED_PRIOR_DRY_RUN_MIGRATION") -ne [string]$Auth.migration_version) {
    throw "BLOCKED_PRIOR_DRY_RUN_MIGRATION: migration_version mismatch"
  }
  if ((Get-FrlsRequiredString $app "migration_name" "BLOCKED_PRIOR_DRY_RUN_MIGRATION") -ne [string]$Auth.migration_name) {
    throw "BLOCKED_PRIOR_DRY_RUN_MIGRATION: migration_name mismatch"
  }
  if ((Get-FrlsRequiredString $app "migration_path" "BLOCKED_PRIOR_DRY_RUN_MIGRATION") -ne [string]$Auth.migration_path) {
    throw "BLOCKED_PRIOR_DRY_RUN_MIGRATION: migration_path mismatch"
  }
  if ((Get-FrlsRequiredString $app "migration_blob_oid" "BLOCKED_PRIOR_DRY_RUN_MIGRATION") -ne [string]$Auth.migration_blob_oid) {
    throw "BLOCKED_PRIOR_DRY_RUN_MIGRATION: migration_blob_oid mismatch"
  }
  if ((Get-FrlsRequiredString $app "migration_sha256" "BLOCKED_PRIOR_DRY_RUN_MIGRATION") -ne [string]$Auth.migration_sha256) {
    throw "BLOCKED_PRIOR_DRY_RUN_MIGRATION: migration_sha256 mismatch"
  }
  if ((Get-FrlsRequiredInt $app "migration_bytes" "BLOCKED_PRIOR_DRY_RUN_MIGRATION") -ne [int]$Auth.migration_bytes) {
    throw "BLOCKED_PRIOR_DRY_RUN_MIGRATION: migration_bytes mismatch"
  }

  $hist = Get-FrlsRequiredInt $app "prior_history_count" "BLOCKED_PRIOR_DRY_RUN_HISTORY"
  if ($hist -ne 186) {
    throw "BLOCKED_PRIOR_DRY_RUN_HISTORY: prior_history_count must be 186"
  }
  Assert-FrlsRequiredBooleanEquals $app "version_absent" $true "BLOCKED_PRIOR_DRY_RUN_VERSION"
  Assert-FrlsRequiredBooleanEquals $app "migration_objects_absent" $true "BLOCKED_PRIOR_DRY_RUN_OBJECTS"
  Assert-FrlsRequiredBooleanEquals $app "transaction_mutation" $false "BLOCKED_PRIOR_DRY_RUN_TX"

  $sql = Get-FrlsRequiredInt $ev "sqlApplicationAttempts" "BLOCKED_PRIOR_DRY_RUN_INVALID"
  $sqlApp = Get-FrlsRequiredInt $app "sqlApplicationAttempts" "BLOCKED_PRIOR_DRY_RUN_INVALID"
  if ($sql -ne 0 -or $sqlApp -ne 0) {
    throw "BLOCKED_PRIOR_DRY_RUN_INVALID: sqlApplicationAttempts must be 0"
  }

  $db = Get-FrlsRequiredInt $ev "databaseConnectionAttempts" "BLOCKED_PRIOR_DRY_RUN_DB_ATTEMPTS"
  $dbApp = Get-FrlsRequiredInt $app "databaseConnectionAttempts" "BLOCKED_PRIOR_DRY_RUN_DB_ATTEMPTS"
  if ($db -ne 1 -or $dbApp -ne 1) {
    throw "BLOCKED_PRIOR_DRY_RUN_DB_ATTEMPTS: databaseConnectionAttempts must be 1"
  }

  Assert-FrlsRequiredBooleanEquals $ev "advisory_lock_acquired" $false "BLOCKED_PRIOR_DRY_RUN_LOCK"
  Assert-FrlsRequiredBooleanEquals $app "advisory_lock_acquired" $false "BLOCKED_PRIOR_DRY_RUN_LOCK"
  $adv = Get-FrlsRequiredBoolean $ev "advisory_lock_acquired" "BLOCKED_PRIOR_DRY_RUN_LOCK"
  $advApp = Get-FrlsRequiredBoolean $app "advisory_lock_acquired" "BLOCKED_PRIOR_DRY_RUN_LOCK"
  if ($adv -ne $advApp) {
    throw "BLOCKED_PRIOR_DRY_RUN_LOCK: wrapper/applicator advisory_lock_acquired disagree"
  }

  $cleanup = $ev.cleanup
  if (-not $cleanup) {
    throw "BLOCKED_PRIOR_DRY_RUN_CLEANUP: cleanup object required"
  }
  Assert-FrlsRequiredBooleanEquals $cleanup "credential_cleared" $true "BLOCKED_PRIOR_DRY_RUN_CLEANUP"
  Assert-FrlsRequiredBooleanEquals $cleanup "ca_path_env_absent" $true "BLOCKED_PRIOR_DRY_RUN_CLEANUP"
  Assert-FrlsRequiredBooleanEquals $cleanup "completed" $true "BLOCKED_PRIOR_DRY_RUN_CLEANUP"

  $cred = $ev.credential_redaction_confirmation
  if (-not $cred) {
    throw "BLOCKED_PRIOR_DRY_RUN_REDACTION: wrapper credential_redaction_confirmation required"
  }
  Assert-FrlsRequiredBooleanEquals $cred "url_in_evidence" $false "BLOCKED_PRIOR_DRY_RUN_REDACTION"
  Assert-FrlsRequiredBooleanEquals $cred "url_in_argv" $false "BLOCKED_PRIOR_DRY_RUN_REDACTION"
  $appCred = $app.credential_redaction_confirmation
  if (-not $appCred) {
    throw "BLOCKED_PRIOR_DRY_RUN_REDACTION: applicator credential_redaction_confirmation required"
  }
  Assert-FrlsRequiredBooleanEquals $appCred "values_undisclosed" $true "BLOCKED_PRIOR_DRY_RUN_REDACTION"

  return [pscustomobject]@{
    sha256        = $sha
    freeze        = $evFreeze
    tip           = $evTip
    bundle_source = $expectedBundleSource
  }
}
