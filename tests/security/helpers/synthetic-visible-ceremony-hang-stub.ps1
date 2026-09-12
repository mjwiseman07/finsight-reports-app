#Requires -Version 5.1
# Synthetic stub: never writes PROMPT_READY — forces launcher timeout + tree kill.
[CmdletBinding()]
param(
  [Parameter(Mandatory = $false)][string]$PrHead = "",
  [Parameter(Mandatory = $false)][string]$RepoRoot = "",
  [Parameter(Mandatory = $false)][string]$EvidenceOutDir = ""
)
Set-StrictMode -Version Latest
if (-not $EvidenceOutDir) { throw "EvidenceOutDir required" }
New-Item -ItemType Directory -Force -Path $EvidenceOutDir | Out-Null
[IO.File]::WriteAllText((Join-Path $EvidenceOutDir "SYNTHETIC_HANG.txt"), "hanging")
# Keep process alive until parent kills the tree.
while ($true) { Start-Sleep -Seconds 30 }
