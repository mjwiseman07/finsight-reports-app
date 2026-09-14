#Requires -Version 5.1
<#
.SYNOPSIS
  Harness for Assert-PriorDryRunEvidence / verdict allowlist (tests only).
#>
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("assert-evidence", "assert-codes")]
  [string]$Action,

  [Parameter(Mandatory = $false)]
  [string]$EvidencePath = "",

  [Parameter(Mandatory = $false)]
  [string]$AuthJsonPath = "",

  [Parameter(Mandatory = $false)]
  [string]$WrapperResultCode = "",

  [Parameter(Mandatory = $false)]
  [string]$ApplicatorVerdict = "",

  # null|number|object|bool|empty|string (default string uses WrapperResultCode / ApplicatorVerdict)
  [Parameter(Mandatory = $false)]
  [string]$WrapperResultCodeKind = "string",

  [Parameter(Mandatory = $false)]
  [string]$ApplicatorVerdictKind = "string"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$gates = Join-Path $PSScriptRoot "..\..\..\scripts\security\free-review-lead-session-prior-dry-run-gates.ps1"
. (Resolve-Path -LiteralPath $gates)

function Convert-KindPayload([string]$Kind, [string]$AsString) {
  switch ($Kind) {
    "null" { return $null }
    "number" { return 1 }
    "bool" { return $true }
    "object" { return @{ nested = $true } }
    "empty" { return "" }
    default { return $AsString }
  }
}

try {
  if ($Action -eq "assert-codes") {
    $w = Convert-KindPayload $WrapperResultCodeKind $WrapperResultCode
    $a = Convert-KindPayload $ApplicatorVerdictKind $ApplicatorVerdict
    Assert-FrlsPriorDryRunReadyCodes -WrapperResultCode $w -ApplicatorVerdict $a
    Write-Output "ACCEPTED"
    exit 0
  }

  if ([string]::IsNullOrWhiteSpace($EvidencePath) -or [string]::IsNullOrWhiteSpace($AuthJsonPath)) {
    throw "EvidencePath and AuthJsonPath required for assert-evidence"
  }
  $auth = Get-Content -LiteralPath $AuthJsonPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $meta = Assert-PriorDryRunEvidence -Path $EvidencePath -Auth $auth
  Write-Output ("ACCEPTED:" + $meta.sha256)
  exit 0
} catch {
  Write-Output ([string]$_.Exception.Message)
  exit 1
}
