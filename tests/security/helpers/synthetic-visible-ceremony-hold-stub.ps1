#Requires -Version 5.1
# Synthetic stub: write PROMPT_READY then hold forever (post-ready close / cancel tests).
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
  (Join-Path $EvidenceOutDir "SYNTHETIC_HOLD.txt"),
  ("pid={0}`nsentinel={1}`n" -f $PID, $SupervisorSentinel)
)
[IO.File]::WriteAllText((Join-Path $EvidenceOutDir "SYNTHETIC_HOLD_PID.txt"), [string]$PID)
[IO.File]::WriteAllText((Join-Path $EvidenceOutDir "PROMPT_READY.txt"), "awaiting_securestring_input")
while ($true) { Start-Sleep -Seconds 30 }
