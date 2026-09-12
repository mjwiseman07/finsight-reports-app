#Requires -Version 5.1
# Synthetic stub for visible-launcher e2e — no DB, no credentials.
[CmdletBinding()]
param(
  [Parameter(Mandatory = $false)][string]$PrHead = "",
  [Parameter(Mandatory = $false)][string]$RepoRoot = "",
  [Parameter(Mandatory = $false)][string]$EvidenceOutDir = "",
  [Parameter(Mandatory = $false)][string]$SupervisorSentinel = ""
)
Set-StrictMode -Version Latest
if (-not $EvidenceOutDir) { throw "EvidenceOutDir required" }
New-Item -ItemType Directory -Force -Path $EvidenceOutDir | Out-Null
[IO.File]::WriteAllText((Join-Path $EvidenceOutDir "PROMPT_READY.txt"), "awaiting_securestring_input")
[IO.File]::WriteAllText((Join-Path $EvidenceOutDir "SYNTHETIC_STUB_OK.txt"), "no_db_no_credentials")
Start-Sleep -Seconds 1
Remove-Item -LiteralPath (Join-Path $EvidenceOutDir "PROMPT_READY.txt") -Force -ErrorAction SilentlyContinue
[IO.File]::WriteAllText((Join-Path $EvidenceOutDir "CEREMONY_DONE.txt"), "result_code=SYNTHETIC_LAUNCH_ONLY")
exit 0
