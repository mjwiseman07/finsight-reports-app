#Requires -Version 5.1
<#
.SYNOPSIS
  Ceremony entry for RA Pro accounting-automation dry-run / apply.
  Dry-run: requires published precondition_publication only; launches visible SecureString ceremony.
  Apply: remains refuse-closed while prior-dry-run / pre-apply pins are UNPUBLISHED/null.
  Never sets ENABLE_RA_PRO_ACCOUNTING_AUTOMATION.
#>
[CmdletBinding()]
param(
  [ValidateSet("dry-run", "apply")]
  [string]$Mode = "dry-run",

  [Parameter(Mandatory = $false)]
  [ValidatePattern('^[0-9a-fA-F]{40}$')]
  [string]$PrHead = "",

  [Parameter(Mandatory = $false)]
  [string]$EvidenceOutDir = "",

  [Parameter(Mandatory = $false)]
  [string]$TestSyntheticDatabaseUrl = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot

function Invoke-GitText([string[]]$GitArgs) {
  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = "git"
  $psi.Arguments = ($GitArgs | ForEach-Object {
      if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
    }) -join " "
  $psi.WorkingDirectory = $repoRoot
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.EnvironmentVariables["GIT_CONFIG_COUNT"] = "1"
  $psi.EnvironmentVariables["GIT_CONFIG_KEY_0"] = "safe.directory"
  $psi.EnvironmentVariables["GIT_CONFIG_VALUE_0"] = ([string]$repoRoot -replace "\\", "/")
  $p = [Diagnostics.Process]::Start($psi)
  $out = $p.StandardOutput.ReadToEnd()
  $err = $p.StandardError.ReadToEnd()
  $p.WaitForExit()
  if ($p.ExitCode -ne 0) { throw "git failed: $err" }
  return $out.Trim()
}

# Load authorization from committed tip blob — never mutable worktree as authority.
$tip = Invoke-GitText @("rev-parse", "HEAD")
$authJson = Invoke-GitText @("cat-file", "blob", "${tip}:docs/security/ra-pro-accounting-automation-apply/TOOLING_AUTHORIZATION.json")
$auth = $authJson | ConvertFrom-Json

if ($Mode -eq "apply") {
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
      mode = "apply"
      productionContact = $false
      featureFlagTouched = $false
    } | ConvertTo-Json -Compress
    Write-Output $payload
    exit 1
  }
  Write-Error "Apply ceremony path requires separately published prior-dry-run and pre-apply pins plus sealed apply authorization; refuse closed on this tip."
  exit 1
}

# dry-run path
$pre = $auth.precondition_publication
if ($null -eq $pre -or [string]$pre.status -ne "PUBLISHED") {
  $payload = @{
    verdict = "BLOCKED"
    reason = "PRECONDITION_PINS_UNPUBLISHED"
    mode = "dry-run"
    productionContact = $false
    featureFlagTouched = $false
  } | ConvertTo-Json -Compress
  Write-Output $payload
  exit 1
}

if ([string]::IsNullOrWhiteSpace($PrHead)) {
  $PrHead = $tip
}

$ceremony = Join-Path $PSScriptRoot "operator-ra-pro-accounting-automation-production-dryrun-ceremony.ps1"
$args = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", $ceremony,
  "-PrHead", $PrHead,
  "-RepoRoot", ([string]$repoRoot)
)
if (-not [string]::IsNullOrWhiteSpace($EvidenceOutDir)) {
  $args += @("-EvidenceOutDir", $EvidenceOutDir)
}
if (-not [string]::IsNullOrWhiteSpace($TestSyntheticDatabaseUrl)) {
  $args += @("-TestSyntheticDatabaseUrl", $TestSyntheticDatabaseUrl)
}

$p = Start-Process -FilePath "powershell.exe" -ArgumentList $args -Wait -PassThru -NoNewWindow
exit $p.ExitCode
