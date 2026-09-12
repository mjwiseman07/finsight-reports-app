#Requires -Version 5.1
# Synthetic stub: dump exact bound parameters for launcher e2e.
[CmdletBinding()]
param(
  [Parameter(Mandatory = $false)][string]$PrHead = "",
  [Parameter(Mandatory = $false)][string]$RepoRoot = "",
  [Parameter(Mandatory = $false)][string]$EvidenceOutDir = ""
)
Set-StrictMode -Version Latest
if (-not $EvidenceOutDir) { throw "EvidenceOutDir required" }
New-Item -ItemType Directory -Force -Path $EvidenceOutDir | Out-Null
$payload = [ordered]@{
  PrHead         = [string]$PrHead
  RepoRoot       = [string]$RepoRoot
  EvidenceOutDir = [string]$EvidenceOutDir
}
$json = ($payload | ConvertTo-Json -Compress -Depth 5)
[IO.File]::WriteAllText((Join-Path $EvidenceOutDir "SYNTHETIC_ARGV.json"), $json)
[IO.File]::WriteAllText((Join-Path $EvidenceOutDir "PROMPT_READY.txt"), "awaiting_securestring_input")
[IO.File]::WriteAllText((Join-Path $EvidenceOutDir "SYNTHETIC_STUB_OK.txt"), "argv_dump")
Start-Sleep -Milliseconds 800
Remove-Item -LiteralPath (Join-Path $EvidenceOutDir "PROMPT_READY.txt") -Force -ErrorAction SilentlyContinue
exit 0
