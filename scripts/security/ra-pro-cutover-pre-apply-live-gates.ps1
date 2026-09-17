#Requires -Version 5.1
<#
.SYNOPSIS
  Shared RA Pro cutover fresh pre-apply live-evidence gates.
  Must be materialized from the publication tip and seal-verified before
  a production apply ceremony may dot-source this file. Never load from a mutable worktree.

.NOTES
  Assert-RaProPreApplyLiveEvidencePublished must run before any SecureString prompt.
  Distinct from precondition gates (RA_PRO_CUTOVER_PRECONDITION_EVIDENCE_V1) and
  prior-dry-run gates (required_prior_dry_run_*). Those MUST NEVER satisfy this gate.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:RaProPreApplyLiveGateMergeBaseRef = "19e8bd071bae5f8afed85340f50168d4ca8e5586"
$script:RaProPreApplyLiveGateProtocolId = "RA_PRO_CUTOVER_PRE_APPLY_LIVE_EVIDENCE_V1"
$script:RaProPreApplyLiveGateCommandNames = @(
  "Get-RaProPreApplyLiveSha256Bytes",
  "Get-RaProPreApplyLiveRequiredString",
  "Get-RaProPreApplyLiveRequiredBoolean",
  "Get-RaProPreApplyLiveRequiredInt",
  "Assert-RaProPreApplyLiveRequiredBooleanEquals",
  "Assert-RaProPreApplyLiveRequiredIntEquals",
  "Test-RaProPreApplyLiveForbiddenContent",
  "Assert-RaProPreApplyLiveWrapperApplicatorAgreement",
  "Assert-RaProPreApplyLiveEvidencePublished",
  "Assert-RaProPreApplyLiveEvidence"
)

function Get-RaProPreApplyLiveSha256Bytes([byte[]]$Bytes) {
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($sha.ComputeHash($Bytes)) -replace "-", "").ToLowerInvariant()
  } finally { $sha.Dispose() }
}

function Get-RaProPreApplyLiveRequiredString($Obj, [string]$Name, [string]$Code) {
  if ($null -eq $Obj) { throw "$Code`: missing object for $Name" }
  $prop = $Obj.PSObject.Properties[$Name]
  if ($null -eq $prop) { throw "$Code`: missing field $Name" }
  $v = $prop.Value
  if ($null -eq $v) { throw "$Code`: null field $Name" }
  if ($v -isnot [string]) { throw "$Code`: non-string field $Name" }
  if ([string]::IsNullOrWhiteSpace($v)) { throw "$Code`: empty field $Name" }
  return [string]$v
}

function Get-RaProPreApplyLiveRequiredBoolean($Obj, [string]$Name, [string]$Code) {
  if ($null -eq $Obj) { throw "$Code`: missing object for $Name" }
  $prop = $Obj.PSObject.Properties[$Name]
  if ($null -eq $prop) { throw "$Code`: missing field $Name" }
  $v = $prop.Value
  if ($null -eq $v) { throw "$Code`: null field $Name" }
  if ($v -isnot [bool]) { throw "$Code`: non-boolean field $Name" }
  return [bool]$v
}

function Get-RaProPreApplyLiveRequiredInt($Obj, [string]$Name, [string]$Code) {
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

function Assert-RaProPreApplyLiveRequiredBooleanEquals {
  param(
    $Obj,
    [string]$Name,
    [bool]$Expected,
    [string]$Code
  )
  $v = Get-RaProPreApplyLiveRequiredBoolean $Obj $Name $Code
  if ($v -ne $Expected) {
    $want = if ($Expected) { "true" } else { "false" }
    throw "$Code`: $Name must be $want"
  }
}

function Assert-RaProPreApplyLiveRequiredIntEquals {
  param(
    $Obj,
    [string]$Name,
    [int]$Expected,
    [string]$Code
  )
  $v = Get-RaProPreApplyLiveRequiredInt $Obj $Name $Code
  if ($v -ne $Expected) {
    throw "$Code`: $Name must be $Expected"
  }
}

function Test-RaProPreApplyLiveForbiddenContent([string]$JsonText) {
  if ([string]::IsNullOrEmpty($JsonText)) { return }
  if ($JsonText -match '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}') {
    throw "PRE_APPLY_LIVE_EVIDENCE_FORBIDDEN_CONTENT: UUID/GUID shape present"
  }
  if ($JsonText -match '(?i)\b(cus_|sub_|evt_|in_|pi_|price_|prod_)[A-Za-z0-9]+') {
    throw "PRE_APPLY_LIVE_EVIDENCE_FORBIDDEN_CONTENT: Stripe-like object id present"
  }
  if ($JsonText -match '(?i)postgres(ql)?://[^/\s"'']+:[^@/\s"'']+@') {
    throw "PRE_APPLY_LIVE_EVIDENCE_FORBIDDEN_CONTENT: credentialed postgres URL present"
  }
  if ($JsonText -match '(?i)\b(sk_live_|sk_test_|rk_live_|rk_test_|whsec_)[A-Za-z0-9]+') {
    throw "PRE_APPLY_LIVE_EVIDENCE_FORBIDDEN_CONTENT: secret-like token present"
  }
  if ($JsonText -match '(?i)-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----') {
    throw "PRE_APPLY_LIVE_EVIDENCE_FORBIDDEN_CONTENT: PEM private key material present"
  }
}

function Assert-RaProPreApplyLiveWrapperApplicatorAgreement {
  param($Evidence)
  $hasWrapper = $null -ne $Evidence.PSObject.Properties["wrapper"] -and $null -ne $Evidence.wrapper
  $hasApp = $null -ne $Evidence.PSObject.Properties["applicator"] -and $null -ne $Evidence.applicator
  if (-not $hasWrapper -or -not $hasApp) { return }

  $wrapper = $Evidence.wrapper
  $app = $Evidence.applicator
  $compareNames = @(
    "serving_deployment",
    "commerce_gate",
    "protection",
    "stripe_tcp1",
    "database_readonly"
  )
  foreach ($name in $compareNames) {
    $wProp = $wrapper.PSObject.Properties[$name]
    $aProp = $app.PSObject.Properties[$name]
    if ($null -eq $wProp -or $null -eq $aProp) { continue }
    $wJson = ($wProp.Value | ConvertTo-Json -Compress -Depth 12)
    $aJson = ($aProp.Value | ConvertTo-Json -Compress -Depth 12)
    if ($wJson -ne $aJson) {
      throw "PRE_APPLY_LIVE_EVIDENCE_WRAPPER_APPLICATOR: wrapper/applicator disagree on $name"
    }
  }
}

function Assert-RaProPreApplyLiveEvidencePublished {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Auth
  )
  if ($null -eq $Auth) {
    throw "PRE_APPLY_LIVE_PINS_UNPUBLISHED: auth object missing"
  }

  $sha = $null
  if ($null -ne $Auth.PSObject.Properties["required_pre_apply_live_evidence_sha256"]) {
    $sha = $Auth.required_pre_apply_live_evidence_sha256
  }
  $freeze = $null
  if ($null -ne $Auth.PSObject.Properties["required_pre_apply_live_freeze"]) {
    $freeze = $Auth.required_pre_apply_live_freeze
  }
  $tip = $null
  if ($null -ne $Auth.PSObject.Properties["required_pre_apply_live_evidence_tip"]) {
    $tip = $Auth.required_pre_apply_live_evidence_tip
  }
  $bundleSource = $null
  if ($null -ne $Auth.PSObject.Properties["required_pre_apply_live_bundle_source"]) {
    $bundleSource = $Auth.required_pre_apply_live_bundle_source
  }

  $status = $null
  if ($null -ne $Auth.PSObject.Properties["published_pre_apply_live_evidence"] -and $null -ne $Auth.published_pre_apply_live_evidence) {
    if ($null -ne $Auth.published_pre_apply_live_evidence.PSObject.Properties["status"]) {
      $status = [string]$Auth.published_pre_apply_live_evidence.status
    }
  }

  $shaText = if ($null -eq $sha) { "" } else { [string]$sha }
  $freezeText = if ($null -eq $freeze) { "" } else { [string]$freeze }
  $tipText = if ($null -eq $tip) { "" } else { [string]$tip }
  $bundleText = if ($null -eq $bundleSource) { "" } else { [string]$bundleSource }

  if (
    [string]::IsNullOrWhiteSpace($shaText) -or
    [string]::IsNullOrWhiteSpace($freezeText) -or
    [string]::IsNullOrWhiteSpace($tipText) -or
    [string]::IsNullOrWhiteSpace($bundleText) -or
    [string]::IsNullOrWhiteSpace($status) -or
    $status -ieq "UNPUBLISHED"
  ) {
    throw "PRE_APPLY_LIVE_PINS_UNPUBLISHED: required_pre_apply_live_evidence_sha256/freeze/tip/bundle_source null or published_pre_apply_live_evidence.status UNPUBLISHED/missing"
  }

  if ($shaText.Length -ne 64 -or -not ($shaText -match '^[0-9a-fA-F]{64}$')) {
    throw "PRE_APPLY_LIVE_PINS_UNPUBLISHED: required_pre_apply_live_evidence_sha256 invalid"
  }
  if (-not ($freezeText -match '^[0-9a-fA-F]{40}$')) {
    throw "PRE_APPLY_LIVE_PINS_UNPUBLISHED: required_pre_apply_live_freeze invalid"
  }
  if (-not ($tipText -match '^[0-9a-fA-F]{40}$')) {
    throw "PRE_APPLY_LIVE_PINS_UNPUBLISHED: required_pre_apply_live_evidence_tip invalid"
  }
  if (-not ($bundleText -match '^[0-9a-fA-F]{40}$')) {
    throw "PRE_APPLY_LIVE_PINS_UNPUBLISHED: required_pre_apply_live_bundle_source invalid"
  }
  if ($status -ine "PUBLISHED") {
    throw "PRE_APPLY_LIVE_PINS_UNPUBLISHED: published_pre_apply_live_evidence.status must be PUBLISHED"
  }
}

function Assert-RaProPreApplyLiveEvidence {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [object]$Auth
  )

  Assert-RaProPreApplyLiveEvidencePublished -Auth $Auth

  if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path -LiteralPath $Path)) {
    throw "PRE_APPLY_LIVE_EVIDENCE_MISSING: evidence path required"
  }
  $item = Get-Item -LiteralPath $Path -Force
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    throw "PRE_APPLY_LIVE_EVIDENCE_REPARSE: evidence path is a reparse point"
  }

  $bytes = [IO.File]::ReadAllBytes($Path)
  $sha = Get-RaProPreApplyLiveSha256Bytes -Bytes $bytes
  $expectedSha = ([string]$Auth.required_pre_apply_live_evidence_sha256).ToLowerInvariant()
  if ($sha -ne $expectedSha) {
    throw "PRE_APPLY_LIVE_EVIDENCE_SHA_MISMATCH: evidence SHA-256 does not match authorization pin"
  }

  $json = [Text.Encoding]::UTF8.GetString($bytes)
  Test-RaProPreApplyLiveForbiddenContent -JsonText $json

  try {
    $ev = $json | ConvertFrom-Json
  } catch {
    throw "PRE_APPLY_LIVE_EVIDENCE_INVALID: malformed evidence JSON"
  }
  if ($null -eq $ev) {
    throw "PRE_APPLY_LIVE_EVIDENCE_INVALID: empty evidence JSON"
  }

  # Historical frames must never satisfy this gate.
  $protocolProbe = $null
  if ($null -ne $ev.PSObject.Properties["protocol_id"] -and $null -ne $ev.protocol_id) {
    $protocolProbe = [string]$ev.protocol_id
  }
  if ($protocolProbe -eq "RA_PRO_CUTOVER_PRECONDITION_EVIDENCE_V1") {
    throw "PRE_APPLY_LIVE_EVIDENCE_SUBSTITUTION_FORBIDDEN: precondition evidence cannot satisfy pre-apply live gate"
  }
  $looksLikePrior = $false
  if ($null -ne $ev.PSObject.Properties["result_code"] -and $null -ne $ev.result_code) {
    $looksLikePrior = $true
  }
  if ($null -ne $ev.PSObject.Properties["applicator"] -and $null -ne $ev.applicator) {
    if ($null -ne $ev.applicator.PSObject.Properties["verdict"] -and $null -ne $ev.applicator.verdict) {
      $looksLikePrior = $true
    }
    if ($null -ne $ev.applicator.PSObject.Properties["mode"]) {
      $appMode = [string]$ev.applicator.mode
      if ($appMode -eq "dry-run") { $looksLikePrior = $true }
    }
  }
  if ($null -ne $ev.PSObject.Properties["mode"] -and ([string]$ev.mode) -eq "dry-run") {
    $looksLikePrior = $true
  }
  if ($looksLikePrior -and $protocolProbe -ne $script:RaProPreApplyLiveGateProtocolId) {
    throw "PRE_APPLY_LIVE_EVIDENCE_SUBSTITUTION_FORBIDDEN: prior dry-run evidence frame cannot satisfy pre-apply live gate"
  }

  $protocol = Get-RaProPreApplyLiveRequiredString $ev "protocol_id" "PRE_APPLY_LIVE_EVIDENCE_PROTOCOL"
  if ($protocol -ne $script:RaProPreApplyLiveGateProtocolId) {
    throw "PRE_APPLY_LIVE_EVIDENCE_PROTOCOL: protocol_id must be RA_PRO_CUTOVER_PRE_APPLY_LIVE_EVIDENCE_V1"
  }
  $schema = Get-RaProPreApplyLiveRequiredInt $ev "schema_version" "PRE_APPLY_LIVE_EVIDENCE_INVALID"
  if ($schema -ne 1) {
    throw "PRE_APPLY_LIVE_EVIDENCE_INVALID: schema_version must be 1"
  }

  [void](Get-RaProPreApplyLiveRequiredString $ev "source_channel_classification" "PRE_APPLY_LIVE_EVIDENCE_INVALID")

  $startedText = Get-RaProPreApplyLiveRequiredString $ev "collection_started_at_utc" "PRE_APPLY_LIVE_EVIDENCE_INVALID"
  $endedText = Get-RaProPreApplyLiveRequiredString $ev "collection_ended_at_utc" "PRE_APPLY_LIVE_EVIDENCE_INVALID"
  $validFromText = Get-RaProPreApplyLiveRequiredString $ev "valid_from_utc" "PRE_APPLY_LIVE_EVIDENCE_INVALID"
  $validUntilText = Get-RaProPreApplyLiveRequiredString $ev "valid_until_utc" "PRE_APPLY_LIVE_EVIDENCE_INVALID"

  try {
    $started = [DateTimeOffset]::Parse($startedText, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AssumeUniversal -bor [Globalization.DateTimeStyles]::AdjustToUniversal)
    $ended = [DateTimeOffset]::Parse($endedText, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AssumeUniversal -bor [Globalization.DateTimeStyles]::AdjustToUniversal)
    $validFrom = [DateTimeOffset]::Parse($validFromText, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AssumeUniversal -bor [Globalization.DateTimeStyles]::AdjustToUniversal)
    $validUntil = [DateTimeOffset]::Parse($validUntilText, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AssumeUniversal -bor [Globalization.DateTimeStyles]::AdjustToUniversal)
  } catch {
    throw "PRE_APPLY_LIVE_EVIDENCE_INVALID: timestamp fields must be ISO-8601 UTC"
  }

  $now = [DateTimeOffset]::UtcNow
  # Apply start requires valid_until strictly after gate UtcNow. Mid-transaction
  # expiry after a valid start is outside this gate (applicator remains fail-closed).
  if ($validUntil -le $now) {
    throw "PRE_APPLY_LIVE_EVIDENCE_EXPIRED: valid_until_utc is not after UtcNow (PRE_APPLY_LIVE_EVIDENCE_START_NOT_UNEXPIRED)"
  }
  if ($validFrom -ge $validUntil) {
    throw "PRE_APPLY_LIVE_EVIDENCE_START_NOT_UNEXPIRED: valid_from_utc must be strictly before valid_until_utc"
  }
  if ($ended -lt $started) {
    throw "PRE_APPLY_LIVE_EVIDENCE_COLLECTION_WINDOW: collection_ended_at_utc before collection_started_at_utc"
  }
  if ($started -lt $validFrom -or $ended -gt $validUntil) {
    throw "PRE_APPLY_LIVE_EVIDENCE_COLLECTION_WINDOW: collection window outside valid_from/until"
  }
  if ($started -gt $validUntil -or $ended -lt $validFrom) {
    throw "PRE_APPLY_LIVE_EVIDENCE_COLLECTION_WINDOW: collection window inconsistent with validity"
  }

  $deploy = $ev.serving_deployment
  if ($null -eq $deploy) {
    throw "PRE_APPLY_LIVE_EVIDENCE_INVALID: missing serving_deployment"
  }
  [void](Get-RaProPreApplyLiveRequiredString $deploy "vercel_deployment_id" "PRE_APPLY_LIVE_EVIDENCE_DEPLOYMENT")
  $merge = Get-RaProPreApplyLiveRequiredString $deploy "merge_base_ref" "PRE_APPLY_LIVE_EVIDENCE_MERGE_BASE"
  if ($merge.ToLowerInvariant() -ne $script:RaProPreApplyLiveGateMergeBaseRef) {
    throw "PRE_APPLY_LIVE_EVIDENCE_MERGE_BASE: merge_base_ref must equal $($script:RaProPreApplyLiveGateMergeBaseRef)"
  }
  Assert-RaProPreApplyLiveRequiredBooleanEquals $deploy "merge_contained_or_serving" $true "PRE_APPLY_LIVE_EVIDENCE_DEPLOYMENT"
  [void](Get-RaProPreApplyLiveRequiredString $deploy "observed_at_utc" "PRE_APPLY_LIVE_EVIDENCE_DEPLOYMENT")

  $commerce = $ev.commerce_gate
  if ($null -eq $commerce) {
    throw "PRE_APPLY_LIVE_EVIDENCE_INVALID: missing commerce_gate"
  }
  $observed = Get-RaProPreApplyLiveRequiredString $commerce "observed" "PRE_APPLY_LIVE_EVIDENCE_COMMERCE_GATE"
  if ($observed -ne "absent" -and $observed -ne "closed") {
    throw "PRE_APPLY_LIVE_EVIDENCE_COMMERCE_GATE: observed must be absent|closed"
  }
  Assert-RaProPreApplyLiveRequiredBooleanEquals $commerce "never_open" $true "PRE_APPLY_LIVE_EVIDENCE_COMMERCE_GATE"

  $protection = $ev.protection
  if ($null -eq $protection) {
    throw "PRE_APPLY_LIVE_EVIDENCE_INVALID: missing protection"
  }
  Assert-RaProPreApplyLiveRequiredBooleanEquals $protection "generated_production_preview_urls_protected" $true "PRE_APPLY_LIVE_EVIDENCE_PROTECTION"
  Assert-RaProPreApplyLiveRequiredBooleanEquals $protection "old_pre_gate_url_protected" $true "PRE_APPLY_LIVE_EVIDENCE_PROTECTION"
  Assert-RaProPreApplyLiveRequiredBooleanEquals $protection "custom_domains_public" $true "PRE_APPLY_LIVE_EVIDENCE_PROTECTION"

  $stripe = $ev.stripe_tcp1
  if ($null -eq $stripe) {
    throw "PRE_APPLY_LIVE_EVIDENCE_INVALID: missing stripe_tcp1"
  }
  [void](Get-RaProPreApplyLiveRequiredString $stripe "destination_classification" "PRE_APPLY_LIVE_EVIDENCE_STRIPE")
  Assert-RaProPreApplyLiveRequiredBooleanEquals $stripe "enabled" $true "PRE_APPLY_LIVE_EVIDENCE_STRIPE"
  if ($null -eq $stripe.PSObject.Properties["events_allowlist"] -or $null -eq $stripe.events_allowlist) {
    throw "PRE_APPLY_LIVE_EVIDENCE_STRIPE: events_allowlist required"
  }
  $allow = @($stripe.events_allowlist)
  if ($allow.Count -ne 1 -or [string]$allow[0] -ne "checkout.session.completed") {
    throw "PRE_APPLY_LIVE_EVIDENCE_STRIPE: events_allowlist must be exactly [checkout.session.completed]"
  }
  Assert-RaProPreApplyLiveRequiredIntEquals $stripe "failed_visible_count" 0 "PRE_APPLY_LIVE_EVIDENCE_STRIPE"
  Assert-RaProPreApplyLiveRequiredIntEquals $stripe "pending_or_retry_scheduled_visible_count" 0 "PRE_APPLY_LIVE_EVIDENCE_STRIPE"
  $winStartText = Get-RaProPreApplyLiveRequiredString $stripe "visibility_window_start_utc" "PRE_APPLY_LIVE_EVIDENCE_STRIPE"
  $winEndText = Get-RaProPreApplyLiveRequiredString $stripe "visibility_window_end_utc" "PRE_APPLY_LIVE_EVIDENCE_STRIPE"
  [void](Get-RaProPreApplyLiveRequiredString $stripe "visibility_limitations" "PRE_APPLY_LIVE_EVIDENCE_STRIPE")
  try {
    $winStart = [DateTimeOffset]::Parse($winStartText, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AssumeUniversal -bor [Globalization.DateTimeStyles]::AdjustToUniversal)
    $winEnd = [DateTimeOffset]::Parse($winEndText, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AssumeUniversal -bor [Globalization.DateTimeStyles]::AdjustToUniversal)
  } catch {
    throw "PRE_APPLY_LIVE_EVIDENCE_STRIPE: visibility window timestamps must be ISO-8601 UTC"
  }
  if ($winEnd -lt $winStart) {
    throw "PRE_APPLY_LIVE_EVIDENCE_CONTRADICTION: stripe_tcp1 visibility_window_end_utc before start"
  }

  $db = $ev.database_readonly
  if ($null -eq $db) {
    throw "PRE_APPLY_LIVE_EVIDENCE_INVALID: missing database_readonly"
  }
  Assert-RaProPreApplyLiveRequiredIntEquals $db "history_count_expected" 187 "PRE_APPLY_LIVE_EVIDENCE_MIGRATION"
  $targetAbsent = Get-RaProPreApplyLiveRequiredString $db "target_version_absent" "PRE_APPLY_LIVE_EVIDENCE_MIGRATION"
  if ($targetAbsent -ne "20260915004500") {
    throw "PRE_APPLY_LIVE_EVIDENCE_MIGRATION: target_version_absent must be 20260915004500"
  }
  Assert-RaProPreApplyLiveRequiredBooleanEquals $db "migration_objects_absent" $true "PRE_APPLY_LIVE_EVIDENCE_MIGRATION"
  Assert-RaProPreApplyLiveRequiredBooleanEquals $db "billing_company_id_absent" $true "PRE_APPLY_LIVE_EVIDENCE_MIGRATION"
  Assert-RaProPreApplyLiveRequiredIntEquals $db "linked_firms_count" 0 "PRE_APPLY_LIVE_EVIDENCE_MIGRATION"

  $inv = $db.ceremony_inventory
  if ($null -eq $inv) {
    throw "PRE_APPLY_LIVE_EVIDENCE_INVALID: missing database_readonly.ceremony_inventory"
  }
  Assert-RaProPreApplyLiveRequiredIntEquals $inv "total" 4 "PRE_APPLY_LIVE_EVIDENCE_INVENTORY"
  Assert-RaProPreApplyLiveRequiredIntEquals $inv "company_owned" 3 "PRE_APPLY_LIVE_EVIDENCE_INVENTORY"
  Assert-RaProPreApplyLiveRequiredIntEquals $inv "firm_owned" 1 "PRE_APPLY_LIVE_EVIDENCE_INVENTORY"
  $classification = Get-RaProPreApplyLiveRequiredString $inv "classification" "PRE_APPLY_LIVE_EVIDENCE_INVENTORY"
  if ($classification -ne "active_and_complimentary") {
    throw "PRE_APPLY_LIVE_EVIDENCE_INVENTORY: classification must be active_and_complimentary"
  }
  if ((Get-RaProPreApplyLiveRequiredInt $inv "company_owned" "PRE_APPLY_LIVE_EVIDENCE_INVENTORY") + (Get-RaProPreApplyLiveRequiredInt $inv "firm_owned" "PRE_APPLY_LIVE_EVIDENCE_INVENTORY") -ne 4) {
    throw "PRE_APPLY_LIVE_EVIDENCE_CONTRADICTION: company_owned + firm_owned must equal total"
  }

  Assert-RaProPreApplyLiveRequiredIntEquals $db "unexpected_new_links" 0 "PRE_APPLY_LIVE_EVIDENCE_DELTA"
  Assert-RaProPreApplyLiveRequiredIntEquals $db "unexpected_new_authorizing_slots" 0 "PRE_APPLY_LIVE_EVIDENCE_DELTA"
  Assert-RaProPreApplyLiveRequiredIntEquals $db "webhook_ledger_non_terminal_count" 0 "PRE_APPLY_LIVE_EVIDENCE_LEDGER"
  [void](Get-RaProPreApplyLiveRequiredString $db "relevant_activity_class" "PRE_APPLY_LIVE_EVIDENCE_INVALID")
  $actStartText = Get-RaProPreApplyLiveRequiredString $db "relevant_activity_window_start_utc" "PRE_APPLY_LIVE_EVIDENCE_INVALID"
  $actEndText = Get-RaProPreApplyLiveRequiredString $db "relevant_activity_window_end_utc" "PRE_APPLY_LIVE_EVIDENCE_INVALID"
  try {
    $actStart = [DateTimeOffset]::Parse($actStartText, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AssumeUniversal -bor [Globalization.DateTimeStyles]::AdjustToUniversal)
    $actEnd = [DateTimeOffset]::Parse($actEndText, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AssumeUniversal -bor [Globalization.DateTimeStyles]::AdjustToUniversal)
  } catch {
    throw "PRE_APPLY_LIVE_EVIDENCE_INVALID: relevant_activity window timestamps must be ISO-8601 UTC"
  }
  if ($actEnd -lt $actStart) {
    throw "PRE_APPLY_LIVE_EVIDENCE_CONTRADICTION: relevant_activity_window_end_utc before start"
  }

  Assert-RaProPreApplyLiveWrapperApplicatorAgreement -Evidence $ev

  return [pscustomobject]@{
    sha256        = $sha
    freeze        = ([string]$Auth.required_pre_apply_live_freeze).ToLowerInvariant()
    tip           = ([string]$Auth.required_pre_apply_live_evidence_tip).ToLowerInvariant()
    bundle_source = ([string]$Auth.required_pre_apply_live_bundle_source).ToLowerInvariant()
  }
}

# Promote into script scope so Assert-* survives Import when dotsourced inside a function.
foreach ($name in $script:RaProPreApplyLiveGateCommandNames) {
  $cmd = Get-Command -Name $name -CommandType Function -ErrorAction SilentlyContinue
  if ($null -ne $cmd) {
    Set-Item -Path ("function:script:" + $name) -Value $cmd.ScriptBlock -Force
  }
}
