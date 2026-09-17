# RA Pro accounting-automation apply ceremony entry.
# Refuses before credentials when TOOLING_AUTHORIZATION pins are UNPUBLISHED.
# Never sets ENABLE_RA_PRO_ACCOUNTING_AUTOMATION.
[CmdletBinding()]
param(
  [ValidateSet("dry-run", "apply")]
  [string]$Mode = "dry-run"
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot

$authPath = Join-Path $repoRoot "docs\security\ra-pro-accounting-automation-apply\TOOLING_AUTHORIZATION.json"
if (-not (Test-Path $authPath)) {
  Write-Error "AUTHORIZATION_PACKAGE_MISSING"
  exit 1
}

$auth = Get-Content -Raw -Path $authPath | ConvertFrom-Json
$pub = $auth.publication
if (
  $null -eq $pub -or
  $pub.status -eq "UNPUBLISHED" -or
  $null -eq $pub.required_prior_dry_run_evidence_sha256 -or
  $null -eq $pub.required_pre_apply_live_evidence_sha256
) {
  $payload = @{
    verdict = "BLOCKED"
    reason = "AUTHORIZATION_PINS_UNPUBLISHED"
    mode = $Mode
    productionContact = $false
    featureFlagTouched = $false
  } | ConvertTo-Json -Compress
  Write-Output $payload
  exit 1
}

Write-Error "Published-pin ceremony path is not enabled in this tip; refuse closed."
exit 1
