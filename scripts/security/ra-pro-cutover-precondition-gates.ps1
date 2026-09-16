#Requires -Version 5.1
<#
.SYNOPSIS
  Shared RA Pro cutover fresh-precondition evidence gates.
  Must be materialized from the authorized executable freeze and seal-verified before
  a production dry-run ceremony may dot-source this file. Never load from a mutable worktree.

.NOTES
  Assert-RaProPreconditionEvidencePublished must run before any SecureString prompt.
  Distinct from prior-dry-run gates (required_prior_dry_run_*).
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:RaProPreconditionGateMergeBaseRef = "19e8bd071bae5f8afed85340f50168d4ca8e5586"
$script:RaProPreconditionGateProtocolId = "RA_PRO_CUTOVER_PRECONDITION_EVIDENCE_V1"
$script:RaProPreconditionGateCommandNames = @(
  "Get-RaProPreconditionSha256Bytes",
  "Get-RaProPreconditionRequiredString",
  "Get-RaProPreconditionRequiredBoolean",
  "Get-RaProPreconditionRequiredInt",
  "Assert-RaProPreconditionRequiredBooleanEquals",
  "Assert-RaProPreconditionRequiredIntEquals",
  "Test-RaProPreconditionForbiddenContent",
  "Assert-RaProPreconditionWrapperApplicatorAgreement",
  "Assert-RaProPreconditionEvidencePublished",
  "Assert-RaProPreconditionEvidence"
)

function Get-RaProPreconditionSha256Bytes([byte[]]$Bytes) {
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($sha.ComputeHash($Bytes)) -replace "-", "").ToLowerInvariant()
  } finally { $sha.Dispose() }
}

function Get-RaProPreconditionRequiredString($Obj, [string]$Name, [string]$Code) {
  if ($null -eq $Obj) { throw "$Code`: missing object for $Name" }
  $prop = $Obj.PSObject.Properties[$Name]
  if ($null -eq $prop) { throw "$Code`: missing field $Name" }
  $v = $prop.Value
  if ($null -eq $v) { throw "$Code`: null field $Name" }
  if ($v -isnot [string]) { throw "$Code`: non-string field $Name" }
  if ([string]::IsNullOrWhiteSpace($v)) { throw "$Code`: empty field $Name" }
  return [string]$v
}

function Get-RaProPreconditionRequiredBoolean($Obj, [string]$Name, [string]$Code) {
  if ($null -eq $Obj) { throw "$Code`: missing object for $Name" }
  $prop = $Obj.PSObject.Properties[$Name]
  if ($null -eq $prop) { throw "$Code`: missing field $Name" }
  $v = $prop.Value
  if ($null -eq $v) { throw "$Code`: null field $Name" }
  if ($v -isnot [bool]) { throw "$Code`: non-boolean field $Name" }
  return [bool]$v
}

function Get-RaProPreconditionRequiredInt($Obj, [string]$Name, [string]$Code) {
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

function Assert-RaProPreconditionRequiredBooleanEquals {
  param(
    $Obj,
    [string]$Name,
    [bool]$Expected,
    [string]$Code
  )
  $v = Get-RaProPreconditionRequiredBoolean $Obj $Name $Code
  if ($v -ne $Expected) {
    $want = if ($Expected) { "true" } else { "false" }
    throw "$Code`: $Name must be $want"
  }
}

function Assert-RaProPreconditionRequiredIntEquals {
  param(
    $Obj,
    [string]$Name,
    [int]$Expected,
    [string]$Code
  )
  $v = Get-RaProPreconditionRequiredInt $Obj $Name $Code
  if ($v -ne $Expected) {
    throw "$Code`: $Name must be $Expected"
  }
}

function Test-RaProPreconditionForbiddenContent([string]$JsonText) {
  if ([string]::IsNullOrEmpty($JsonText)) { return }
  if ($JsonText -match '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}') {
    throw "PRECONDITION_EVIDENCE_FORBIDDEN_CONTENT: UUID/GUID shape present"
  }
  if ($JsonText -match '(?i)\b(cus_|sub_|evt_|in_|pi_|price_|prod_)[A-Za-z0-9]+') {
    throw "PRECONDITION_EVIDENCE_FORBIDDEN_CONTENT: Stripe-like object id present"
  }
  if ($JsonText -match '(?i)postgres(ql)?://[^/\s"'']+:[^@/\s"'']+@') {
    throw "PRECONDITION_EVIDENCE_FORBIDDEN_CONTENT: credentialed postgres URL present"
  }
  if ($JsonText -match '(?i)\b(sk_live_|sk_test_|rk_live_|rk_test_|whsec_)[A-Za-z0-9]+') {
    throw "PRECONDITION_EVIDENCE_FORBIDDEN_CONTENT: secret-like token present"
  }
  if ($JsonText -match '(?i)-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----') {
    throw "PRECONDITION_EVIDENCE_FORBIDDEN_CONTENT: PEM private key material present"
  }
}

function Assert-RaProPreconditionWrapperApplicatorAgreement {
  param($Evidence)
  $hasWrapper = $null -ne $Evidence.PSObject.Properties["wrapper"] -and $null -ne $Evidence.wrapper
  $hasApp = $null -ne $Evidence.PSObject.Properties["applicator"] -and $null -ne $Evidence.applicator
  if (-not $hasWrapper -or -not $hasApp) { return }

  $wrapper = $Evidence.wrapper
  $app = $Evidence.applicator
  $compareNames = @(
    "ceremony_inventory",
    "migration_state",
    "delta_since_decision",
    "commerce_gate",
    "old_generated_deployment_urls_protected",
    "custom_domains_public",
    "gate_aware_production_deployment"
  )
  foreach ($name in $compareNames) {
    $wProp = $wrapper.PSObject.Properties[$name]
    $aProp = $app.PSObject.Properties[$name]
    if ($null -eq $wProp -or $null -eq $aProp) { continue }
    $wJson = ($wProp.Value | ConvertTo-Json -Compress -Depth 10)
    $aJson = ($aProp.Value | ConvertTo-Json -Compress -Depth 10)
    if ($wJson -ne $aJson) {
      throw "PRECONDITION_EVIDENCE_WRAPPER_APPLICATOR: wrapper/applicator disagree on $name"
    }
  }
}

function Assert-RaProPreconditionEvidencePublished {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Auth
  )
  if ($null -eq $Auth) {
    throw "PRECONDITION_PINS_UNPUBLISHED: auth object missing"
  }

  $sha = $null
  if ($null -ne $Auth.PSObject.Properties["required_precondition_evidence_sha256"]) {
    $sha = $Auth.required_precondition_evidence_sha256
  }
  $freeze = $null
  if ($null -ne $Auth.PSObject.Properties["required_precondition_freeze"]) {
    $freeze = $Auth.required_precondition_freeze
  }
  $tip = $null
  if ($null -ne $Auth.PSObject.Properties["required_precondition_evidence_tip"]) {
    $tip = $Auth.required_precondition_evidence_tip
  }
  $bundleSource = $null
  if ($null -ne $Auth.PSObject.Properties["required_precondition_bundle_source"]) {
    $bundleSource = $Auth.required_precondition_bundle_source
  }

  $status = $null
  if ($null -ne $Auth.PSObject.Properties["published_precondition_evidence"] -and $null -ne $Auth.published_precondition_evidence) {
    if ($null -ne $Auth.published_precondition_evidence.PSObject.Properties["status"]) {
      $status = [string]$Auth.published_precondition_evidence.status
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
    throw "PRECONDITION_PINS_UNPUBLISHED: required_precondition_evidence_sha256/freeze/tip/bundle_source null or published_precondition_evidence.status UNPUBLISHED/missing"
  }

  if ($shaText.Length -ne 64 -or -not ($shaText -match '^[0-9a-fA-F]{64}$')) {
    throw "PRECONDITION_PINS_UNPUBLISHED: required_precondition_evidence_sha256 invalid"
  }
  if (-not ($freezeText -match '^[0-9a-fA-F]{40}$')) {
    throw "PRECONDITION_PINS_UNPUBLISHED: required_precondition_freeze invalid"
  }
  if (-not ($tipText -match '^[0-9a-fA-F]{40}$')) {
    throw "PRECONDITION_PINS_UNPUBLISHED: required_precondition_evidence_tip invalid"
  }
  if (-not ($bundleText -match '^[0-9a-fA-F]{40}$')) {
    throw "PRECONDITION_PINS_UNPUBLISHED: required_precondition_bundle_source invalid"
  }
  if ($status -ine "PUBLISHED") {
    throw "PRECONDITION_PINS_UNPUBLISHED: published_precondition_evidence.status must be PUBLISHED"
  }
}

function Assert-RaProPreconditionEvidence {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [object]$Auth
  )

  # Publication gate first — never proceed to file IO semantics without pins.
  Assert-RaProPreconditionEvidencePublished -Auth $Auth

  if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path -LiteralPath $Path)) {
    throw "PRECONDITION_EVIDENCE_INVALID: evidence path required"
  }
  $item = Get-Item -LiteralPath $Path -Force
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    throw "PRECONDITION_EVIDENCE_INVALID: evidence path is a reparse point"
  }

  $bytes = [IO.File]::ReadAllBytes($Path)
  $sha = Get-RaProPreconditionSha256Bytes -Bytes $bytes
  $expectedSha = ([string]$Auth.required_precondition_evidence_sha256).ToLowerInvariant()
  if ($sha -ne $expectedSha) {
    throw "PRECONDITION_EVIDENCE_SHA_MISMATCH: evidence SHA-256 does not match authorization pin"
  }

  $json = [Text.Encoding]::UTF8.GetString($bytes)
  Test-RaProPreconditionForbiddenContent -JsonText $json

  try {
    $ev = $json | ConvertFrom-Json
  } catch {
    throw "PRECONDITION_EVIDENCE_INVALID: malformed evidence JSON"
  }
  if ($null -eq $ev) {
    throw "PRECONDITION_EVIDENCE_INVALID: empty evidence JSON"
  }

  $protocol = Get-RaProPreconditionRequiredString $ev "protocol_id" "PRECONDITION_EVIDENCE_PROTOCOL"
  if ($protocol -ne $script:RaProPreconditionGateProtocolId) {
    throw "PRECONDITION_EVIDENCE_PROTOCOL: protocol_id must be RA_PRO_CUTOVER_PRECONDITION_EVIDENCE_V1"
  }
  $schema = Get-RaProPreconditionRequiredInt $ev "schema_version" "PRECONDITION_EVIDENCE_INVALID"
  if ($schema -ne 1) {
    throw "PRECONDITION_EVIDENCE_INVALID: schema_version must be 1"
  }

  [void](Get-RaProPreconditionRequiredString $ev "source_channel_classification" "PRECONDITION_EVIDENCE_INVALID")

  $collectedText = Get-RaProPreconditionRequiredString $ev "collected_at_utc" "PRECONDITION_EVIDENCE_INVALID"
  $validFromText = Get-RaProPreconditionRequiredString $ev "valid_from_utc" "PRECONDITION_EVIDENCE_INVALID"
  $validUntilText = Get-RaProPreconditionRequiredString $ev "valid_until_utc" "PRECONDITION_EVIDENCE_INVALID"

  try {
    $collected = [DateTimeOffset]::Parse($collectedText, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AssumeUniversal -bor [Globalization.DateTimeStyles]::AdjustToUniversal)
    $validFrom = [DateTimeOffset]::Parse($validFromText, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AssumeUniversal -bor [Globalization.DateTimeStyles]::AdjustToUniversal)
    $validUntil = [DateTimeOffset]::Parse($validUntilText, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AssumeUniversal -bor [Globalization.DateTimeStyles]::AdjustToUniversal)
  } catch {
    throw "PRECONDITION_EVIDENCE_INVALID: timestamp fields must be ISO-8601 UTC"
  }

  $now = [DateTimeOffset]::UtcNow
  if ($validUntil -le $now) {
    throw "PRECONDITION_EVIDENCE_EXPIRED: valid_until_utc is not after UtcNow"
  }
  if ($collected -gt $validUntil) {
    throw "PRECONDITION_EVIDENCE_COLLECTION_WINDOW: collected_at_utc after valid_until_utc"
  }
  if ($collected -lt $validFrom) {
    throw "PRECONDITION_EVIDENCE_COLLECTION_WINDOW: collected_at_utc before valid_from_utc"
  }

  $gate = $ev.gate_aware_production_deployment
  if ($null -eq $gate) {
    throw "PRECONDITION_EVIDENCE_INVALID: missing gate_aware_production_deployment"
  }
  [void](Get-RaProPreconditionRequiredString $gate "deployment_id_or_url_identity" "PRECONDITION_EVIDENCE_INVALID")
  $merge = Get-RaProPreconditionRequiredString $gate "merge_base_ref" "PRECONDITION_EVIDENCE_MERGE_BASE"
  if ($merge.ToLowerInvariant() -ne $script:RaProPreconditionGateMergeBaseRef) {
    throw "PRECONDITION_EVIDENCE_MERGE_BASE: merge_base_ref must equal $($script:RaProPreconditionGateMergeBaseRef)"
  }
  $gateObservedText = Get-RaProPreconditionRequiredString $gate "observed_at_utc" "PRECONDITION_EVIDENCE_INVALID"
  try {
    $gateObserved = [DateTimeOffset]::Parse($gateObservedText, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AssumeUniversal -bor [Globalization.DateTimeStyles]::AdjustToUniversal)
  } catch {
    throw "PRECONDITION_EVIDENCE_INVALID: gate_aware_production_deployment.observed_at_utc must be ISO-8601 UTC"
  }
  if ($collected -lt $gateObserved) {
    throw "PRECONDITION_EVIDENCE_DEPLOYMENT_BOUNDARY: collected_at_utc predates gate_aware_production_deployment.observed_at_utc"
  }

  $commerce = $ev.commerce_gate
  if ($null -eq $commerce) {
    throw "PRECONDITION_EVIDENCE_INVALID: missing commerce_gate"
  }
  $observed = Get-RaProPreconditionRequiredString $commerce "observed" "PRECONDITION_EVIDENCE_COMMERCE_GATE"
  if ($observed -ne "absent" -and $observed -ne "closed") {
    throw "PRECONDITION_EVIDENCE_COMMERCE_GATE: observed must be absent|closed"
  }
  Assert-RaProPreconditionRequiredBooleanEquals $commerce "never_open" $true "PRECONDITION_EVIDENCE_COMMERCE_GATE"
  [void](Get-RaProPreconditionRequiredString $commerce "observed_at_utc" "PRECONDITION_EVIDENCE_COMMERCE_GATE")

  Assert-RaProPreconditionRequiredBooleanEquals $ev "old_generated_deployment_urls_protected" $true "PRECONDITION_EVIDENCE_PROTECTION"
  Assert-RaProPreconditionRequiredBooleanEquals $ev "custom_domains_public" $true "PRECONDITION_EVIDENCE_PROTECTION"

  $ledger = $ev.ledger
  if ($null -eq $ledger) {
    throw "PRECONDITION_EVIDENCE_INVALID: missing ledger"
  }
  $ledgerCount = Get-RaProPreconditionRequiredInt $ledger "non_terminal_count" "PRECONDITION_EVIDENCE_INVALID"
  if ($ledgerCount -lt 0) {
    throw "PRECONDITION_EVIDENCE_CONTRADICTION: ledger.non_terminal_count must be non-negative"
  }
  [void](Get-RaProPreconditionRequiredString $ledger "observed_at_utc" "PRECONDITION_EVIDENCE_INVALID")

  $stripe = $ev.stripe_tcp1
  if ($null -eq $stripe) {
    throw "PRECONDITION_EVIDENCE_INVALID: missing stripe_tcp1"
  }
  $failed = Get-RaProPreconditionRequiredInt $stripe "failed_visible_count" "PRECONDITION_EVIDENCE_INVALID"
  $pending = Get-RaProPreconditionRequiredInt $stripe "pending_visible_count" "PRECONDITION_EVIDENCE_INVALID"
  if ($failed -lt 0 -or $pending -lt 0) {
    throw "PRECONDITION_EVIDENCE_CONTRADICTION: stripe_tcp1 counts must be non-negative"
  }
  $winStartText = Get-RaProPreconditionRequiredString $stripe "visibility_window_start_utc" "PRECONDITION_EVIDENCE_INVALID"
  $winEndText = Get-RaProPreconditionRequiredString $stripe "visibility_window_end_utc" "PRECONDITION_EVIDENCE_INVALID"
  try {
    $winStart = [DateTimeOffset]::Parse($winStartText, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AssumeUniversal -bor [Globalization.DateTimeStyles]::AdjustToUniversal)
    $winEnd = [DateTimeOffset]::Parse($winEndText, [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AssumeUniversal -bor [Globalization.DateTimeStyles]::AdjustToUniversal)
  } catch {
    throw "PRECONDITION_EVIDENCE_INVALID: stripe_tcp1 visibility window timestamps must be ISO-8601 UTC"
  }
  if ($winEnd -lt $winStart) {
    throw "PRECONDITION_EVIDENCE_CONTRADICTION: stripe_tcp1 visibility_window_end_utc before start"
  }

  $inv = $ev.ceremony_inventory
  if ($null -eq $inv) {
    throw "PRECONDITION_EVIDENCE_INVALID: missing ceremony_inventory"
  }
  Assert-RaProPreconditionRequiredIntEquals $inv "total" 4 "PRECONDITION_EVIDENCE_INVENTORY"
  Assert-RaProPreconditionRequiredIntEquals $inv "company_owned" 3 "PRECONDITION_EVIDENCE_INVENTORY"
  Assert-RaProPreconditionRequiredIntEquals $inv "firm_owned" 1 "PRECONDITION_EVIDENCE_INVENTORY"
  $classification = Get-RaProPreconditionRequiredString $inv "classification" "PRECONDITION_EVIDENCE_INVENTORY"
  if ($classification -ne "active_and_complimentary") {
    throw "PRECONDITION_EVIDENCE_INVENTORY: classification must be active_and_complimentary"
  }
  if ((Get-RaProPreconditionRequiredInt $inv "company_owned" "PRECONDITION_EVIDENCE_INVENTORY") + (Get-RaProPreconditionRequiredInt $inv "firm_owned" "PRECONDITION_EVIDENCE_INVENTORY") -ne 4) {
    throw "PRECONDITION_EVIDENCE_CONTRADICTION: company_owned + firm_owned must equal total"
  }

  $mig = $ev.migration_state
  if ($null -eq $mig) {
    throw "PRECONDITION_EVIDENCE_INVALID: missing migration_state"
  }
  Assert-RaProPreconditionRequiredIntEquals $mig "history_count_expected" 187 "PRECONDITION_EVIDENCE_MIGRATION"
  $targetAbsent = Get-RaProPreconditionRequiredString $mig "target_version_absent" "PRECONDITION_EVIDENCE_MIGRATION"
  if ($targetAbsent -ne "20260915004500") {
    throw "PRECONDITION_EVIDENCE_MIGRATION: target_version_absent must be 20260915004500"
  }
  Assert-RaProPreconditionRequiredBooleanEquals $mig "objects_absent" $true "PRECONDITION_EVIDENCE_MIGRATION"

  $delta = $ev.delta_since_decision
  if ($null -eq $delta) {
    throw "PRECONDITION_EVIDENCE_INVALID: missing delta_since_decision"
  }
  Assert-RaProPreconditionRequiredIntEquals $delta "unexpected_links" 0 "PRECONDITION_EVIDENCE_DELTA"
  Assert-RaProPreconditionRequiredIntEquals $delta "new_authorizing_slots" 0 "PRECONDITION_EVIDENCE_DELTA"

  Assert-RaProPreconditionWrapperApplicatorAgreement -Evidence $ev

  return [pscustomobject]@{
    sha256        = $sha
    freeze        = ([string]$Auth.required_precondition_freeze).ToLowerInvariant()
    tip           = ([string]$Auth.required_precondition_evidence_tip).ToLowerInvariant()
    bundle_source = ([string]$Auth.required_precondition_bundle_source).ToLowerInvariant()
  }
}

# Promote into script scope so Assert-* survives Import when dotsourced inside a function.
foreach ($name in $script:RaProPreconditionGateCommandNames) {
  $cmd = Get-Command -Name $name -CommandType Function -ErrorAction SilentlyContinue
  if ($null -ne $cmd) {
    Set-Item -Path ("function:script:" + $name) -Value $cmd.ScriptBlock -Force
  }
}
