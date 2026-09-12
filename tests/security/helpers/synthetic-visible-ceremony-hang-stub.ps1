#Requires -Version 5.1
# Synthetic stub: never writes PROMPT_READY — forces timeout + job/tree kill.
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
[IO.File]::WriteAllText(
  (Join-Path $EvidenceOutDir "SYNTHETIC_HANG.txt"),
  ("pid={0}`nsentinel={1}`n" -f $PID, $SupervisorSentinel)
)
[IO.File]::WriteAllText((Join-Path $EvidenceOutDir "SYNTHETIC_HANG_PID.txt"), [string]$PID)
while ($true) { Start-Sleep -Seconds 30 }
