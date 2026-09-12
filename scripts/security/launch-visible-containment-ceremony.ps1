#Requires -Version 5.1
<#
.SYNOPSIS
  Safe visible launcher for the containment production dry-run ceremony.

  Uses Start-Process so Windows never treats an empty/escaped window-title
  token from nested cmd start invocations as an executable path.

  Does not accept credentials. Does not set CONTAINMENT_APPLY_DATABASE_URL.
  Operator pastes the URL only into the ceremony SecureString prompt.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-fA-F]{40}$')]
  [string]$PrHead,

  [Parameter(Mandatory = $false)]
  [string]$RepoRoot = "",

  [Parameter(Mandatory = $false)]
  [string]$EvidenceOutDir = "",

  # When set, wait for PROMPT_READY.txt (operator interactive path).
  [Parameter(Mandatory = $false)]
  [switch]$WaitForPromptReady,

  # Synthetic harness only: path to a stub .ps1 instead of freeze ceremony.
  [Parameter(Mandatory = $false)]
  [string]$TestStubScript = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $RepoRoot) {
  $RepoRoot = (git rev-parse --show-toplevel 2>$null)
  if (-not $RepoRoot) { throw "RepoRoot required" }
}
if (-not $EvidenceOutDir) {
  $EvidenceOutDir = Join-Path $env:TEMP "containment-prod-dryrun-ceremony"
}
New-Item -ItemType Directory -Force -Path $EvidenceOutDir | Out-Null

# Never forward retired CA-path or TLS bypass into the child.
Remove-Item Env:CONTAINMENT_APPLY_SSL_ROOTCERT -ErrorAction SilentlyContinue
Remove-Item Env:NODE_TLS_REJECT_UNAUTHORIZED -ErrorAction SilentlyContinue

$scriptPath = $null
if (-not [string]::IsNullOrWhiteSpace($TestStubScript)) {
  if (-not (Test-Path -LiteralPath $TestStubScript)) {
    throw "TestStubScript missing"
  }
  $scriptPath = $TestStubScript
} else {
  # Materialize ceremony from freeze git blob (not worktree authority).
  $rel = "scripts/security/operator-containment-production-dryrun-ceremony.ps1"
  $scriptPath = Join-Path $EvidenceOutDir "ceremony.ps1"
  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = "git"
  $psi.Arguments = "cat-file blob ${PrHead}:${rel}"
  $psi.WorkingDirectory = $RepoRoot
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $p = [Diagnostics.Process]::Start($psi)
  $ms = New-Object IO.MemoryStream
  $p.StandardOutput.BaseStream.CopyTo($ms)
  $err = $p.StandardError.ReadToEnd()
  $p.WaitForExit()
  if ($p.ExitCode -ne 0) { throw "failed to materialize ceremony: $err" }
  [IO.File]::WriteAllBytes($scriptPath, $ms.ToArray())
}

# Safe construction: FileName = powershell.exe, Arguments = -File <script> ...
# Never route through cmd start with an empty window-title token.
$argList = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", $scriptPath,
  "-PrHead", $PrHead,
  "-RepoRoot", $RepoRoot,
  "-EvidenceOutDir", $EvidenceOutDir
)

$proc = Start-Process -FilePath "powershell.exe" -ArgumentList $argList -WorkingDirectory $RepoRoot -PassThru
if (-not $proc) { throw "Start-Process returned null" }

$marker = Join-Path $EvidenceOutDir "VISIBLE_LAUNCH_STARTED.txt"
[IO.File]::WriteAllText($marker, ("pid={0}`nfile={1}`n" -f $proc.Id, $scriptPath))

if ($WaitForPromptReady) {
  $ready = Join-Path $EvidenceOutDir "PROMPT_READY.txt"
  $deadline = (Get-Date).AddMinutes(2)
  while ((Get-Date) -lt $deadline) {
    if (Test-Path -LiteralPath $ready) {
      Write-Host "PROMPT_READY"
      exit 0
    }
    if ($proc.HasExited) {
      throw "ceremony exited before PROMPT_READY (exit=$($proc.ExitCode))"
    }
    Start-Sleep -Milliseconds 200
  }
  throw "timeout waiting for PROMPT_READY"
}

Write-Host ("LAUNCHED pid={0}" -f $proc.Id)
exit 0
