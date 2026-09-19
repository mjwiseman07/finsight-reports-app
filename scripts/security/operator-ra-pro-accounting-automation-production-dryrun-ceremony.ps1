#Requires -Version 5.1
<#
.SYNOPSIS
  Visible Windows PowerShell production dry-run ceremony for RA Pro accounting-automation.
  SecureString URL prompt. Never applies migrations. Never publishes prior/pre-apply pins.
  Dry-run authority = published precondition_publication only (not prior-dry-run / pre-apply).
  Guaranteed cleanup of raw stdout + materialized bundle; bounded child supervision.
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

  # Harness-only: non-interactive SecureString source when ALLOW_SYNTHETIC=1.
  # Must be a project-bound host (never localhost). Used only for ceremony unit tests.
  [Parameter(Mandatory = $false)]
  [string]$TestSyntheticDatabaseUrl = "",

  # Harness-only child behavior: success | hang | fail | malformed (requires ALLOW_SYNTHETIC=1).
  [Parameter(Mandatory = $false)]
  [ValidateSet("", "success", "hang", "fail", "malformed")]
  [string]$TestHarnessChildStub = "",

  # Post-credential Node runtime only. Not the operator prompt window.
  # Default 120s. Harness may lower for hang tests.
  [Parameter(Mandatory = $false)]
  [int]$ChildTimeoutMs = 120000,

  # Visible SecureString window. Independent of -ChildTimeoutMs.
  # Default 10 minutes so the prompt is not killed at the old 180-second parent wait.
  [Parameter(Mandatory = $false)]
  [int]$PromptInputTimeoutMs = 600000,

  # Harness-only: force cleanup verification to fail closed.
  [Parameter(Mandatory = $false)]
  [switch]$TestForceCleanupFailure,

  # Harness-only: force child termination verification to fail closed.
  [Parameter(Mandatory = $false)]
  [switch]$TestForceTerminateFailure,

  # Harness-only: inject the pre-prompt null-index defect at a named site (requires ALLOW_SYNTHETIC=1).
  # Sites: empty_blob_index | envvars_null | pub_null_index
  [Parameter(Mandatory = $false)]
  [ValidateSet("", "empty_blob_index", "envvars_null", "pub_null_index")]
  [string]$TestForcePrePromptNullIndex = "",

  # Harness-only: prove the prompt-owning host is visible and interactive, then stop before credentials.
  # Requires ALLOW_SYNTHETIC=1. Never accepts a database URL.
  [Parameter(Mandatory = $false)]
  [switch]$TestVisiblePromptProbe,

  # Harness-only: simulate operator cancel before a credential exists. Requires ALLOW_SYNTHETIC=1.
  [Parameter(Mandatory = $false)]
  [switch]$TestForcePromptCancel,

  # Harness-only: report the prompt/child timeout split and exit before Read-Host. Requires ALLOW_SYNTHETIC=1.
  [Parameter(Mandatory = $false)]
  [switch]$TestTimeoutBudgetProbe,

  # Harness-only: fail as a prompt deadline before any marker. Requires ALLOW_SYNTHETIC=1.
  [Parameter(Mandatory = $false)]
  [switch]$TestForcePromptTimeout,

  # Harness-only: fail as a closed prompt window before any marker. Requires ALLOW_SYNTHETIC=1.
  [Parameter(Mandatory = $false)]
  [switch]$TestForcePromptWindowClose,

  # Harness-only: sleep past the parent wait so the parent must emit fallback evidence. Requires ALLOW_SYNTHETIC=1.
  [Parameter(Mandatory = $false)]
  [switch]$TestHangBeforeEvidence,

  # Harness-only: classify one URL per line and exit before markers, git, or Node.
  [Parameter(Mandatory = $false)]
  [string]$TestHostClassFile = "",

  # One-attempt apply. Default remains dry-run. Production authorization is a separate record.
  [Parameter(Mandatory = $false)]
  [ValidateSet("dry-run", "apply")]
  [string]$Mode = "dry-run",

  [Parameter(Mandatory = $false)]
  [string]$ApplyAttemptId = "",

  # Pinned by sealed entry from the credential-free preflight. Required for apply.
  [Parameter(Mandatory = $false)]
  [string]$AuthorizationPublicationCommit = "",

  [Parameter(Mandatory = $false)]
  [string]$AuthorizationBlobOid = "",

  [Parameter(Mandatory = $false)]
  [string]$ExecutableBundleOid = "",

  # Set only by sealed enter after tip/source blob materialize. Direct worktree launch is forbidden.
  [Parameter(Mandatory = $false)]
  [switch]$SealedMaterialInvocation
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
try { Set-PSReadLineOption -HistorySaveStyle SaveNothing -ErrorAction SilentlyContinue | Out-Null } catch {}

# Fail closed on direct worktree/operator ceremony execution unless sealed materialize or harness.
# ALLOW_DIRECT_HARNESS=1 is unit-test only; synthetic-URL policy is enforced later in-ceremony.
$allowDirectHarness = [Environment]::GetEnvironmentVariable("RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_DIRECT_HARNESS", "Process")
if (-not $SealedMaterialInvocation) {
  if ($allowDirectHarness -ne "1") {
    $blocked = [ordered]@{
      verdict = "BLOCKED"
      reason = "CEREMONY_DIRECT_EXEC_FORBIDDEN: launch only via sealed supervise/enter materialize path"
      mode = "dry-run"
      productionContact = $false
    } | ConvertTo-Json -Compress
    Write-Output $blocked
    exit 1
  }
}

function Test-PromptOwningHost {
  $nonInteractive = $false
  foreach ($arg in @([Environment]::GetCommandLineArgs())) {
    if ($arg -eq "-NonInteractive") { $nonInteractive = $true }
  }
  $visible = $false
  try {
    if (-not ("RaAcctPromptConsole" -as [type])) {
      Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class RaAcctPromptConsole {
  [DllImport("kernel32.dll")]
  public static extern IntPtr GetConsoleWindow();
}
'@
    }
    $hwnd = [RaAcctPromptConsole]::GetConsoleWindow()
    $visible = ($hwnd -ne [IntPtr]::Zero)
  } catch {
    $visible = $false
  }
  $script:PromptHostNonInteractive = $nonInteractive
  $script:PromptHostVisible = $visible
  if ($nonInteractive) { return $false }
  if (-not [Environment]::UserInteractive) { return $false }
  if (-not $visible) { return $false }
  return $true
}

function Write-PromptReadySidecar {
  $now = [DateTime]::UtcNow
  if (-not $script:PromptOpenedUtc) { $script:PromptOpenedUtc = $now.ToString("o") }
  $script:PromptDeadlineUtc = $now.AddMilliseconds([Math]::Max(1, $PromptInputTimeoutMs)).ToString("o")
  $script:PromptReadyUtc = [DateTime]::UtcNow.ToString("o")
  $side = [ordered]@{
    prompt_opened_utc = [string]$script:PromptOpenedUtc
    prompt_ready_utc = [string]$script:PromptReadyUtc
    prompt_deadline_utc = [string]$script:PromptDeadlineUtc
    prompt_input_timeout_ms = [int]$PromptInputTimeoutMs
    precondition_sha256 = $(if ($pre) { [string]$pre.evidence_sha256 } else { $null })
    pr_tip = $PrHead
  }
  $sidePath = Join-Path $EvidenceOutDir "PROMPT_READY.json"
  [IO.File]::WriteAllText($sidePath, (($side | ConvertTo-Json -Compress) + "`n"))
}

function Read-BoundedSecureString([string]$Prompt, [int]$TimeoutMs) {
  Write-PromptReadySidecar
  $deadline = [DateTime]::Parse([string]$script:PromptDeadlineUtc).ToUniversalTime()
  Write-Host $Prompt
  Write-Host ("Prompt deadline (UTC): " + $script:PromptDeadlineUtc)
  Write-Host ("Input window: " + [int]($TimeoutMs / 1000) + " seconds. This prompt is not closed at 180 seconds.")
  $remain0 = [int][Math]::Max(0, ($deadline - [DateTime]::UtcNow).TotalSeconds)
  Write-Host ("Remaining prompt time: " + $remain0 + " seconds.")
  $ss = New-Object Security.SecureString
  $previousTreatControlC = $false
  try {
    $previousTreatControlC = [Console]::TreatControlCAsInput
    [Console]::TreatControlCAsInput = $true
  } catch {}
  $lastBeat = [DateTime]::UtcNow
  try {
    while ($true) {
      $now = [DateTime]::UtcNow
      if ($now -ge $deadline) {
        try { $ss.Dispose() } catch {}
        $ss = $null
        throw "PROMPT_INPUT_TIMEOUT: operator prompt exceeded ${TimeoutMs}ms; deadline $($script:PromptDeadlineUtc)"
      }
      if (($now - $lastBeat).TotalSeconds -ge 30) {
        $remain = [int][Math]::Max(0, ($deadline - $now).TotalSeconds)
        Write-Host ("Remaining prompt time: " + $remain + " seconds. Deadline " + $script:PromptDeadlineUtc)
        $lastBeat = $now
      }
      $available = $false
      try {
        $available = [Console]::KeyAvailable
      } catch {
        try { if ($null -ne $ss) { $ss.Dispose() } } catch {}
        $ss = $null
        throw "PROMPT_WINDOW_CLOSED: console unavailable"
      }
      if (-not $available) {
        Start-Sleep -Milliseconds 200
        continue
      }
      try {
        $key = [Console]::ReadKey($true)
      } catch {
        try { if ($null -ne $ss) { $ss.Dispose() } } catch {}
        $ss = $null
        throw "PROMPT_WINDOW_CLOSED: console read failed"
      }
      if ($key.Key -eq [ConsoleKey]::Enter) { break }
      $controlC = $false
      try {
        $controlC = (($key.Modifiers -band [ConsoleModifiers]::Control) -and $key.Key -eq [ConsoleKey]::C)
      } catch { $controlC = $false }
      if ($key.Key -eq [ConsoleKey]::Escape -or $controlC) {
        try { $ss.Dispose() } catch {}
        $ss = $null
        throw "BLOCKED_CREDENTIAL_UNAVAILABLE: operator cancel"
      }
      if ($key.Key -eq [ConsoleKey]::Backspace) {
        if ($ss.Length -gt 0) {
          $ss.RemoveAt($ss.Length - 1)
          Write-Host "`b `b" -NoNewline
        }
        continue
      }
      if ($key.KeyChar -eq [char]0) { continue }
      $ss.AppendChar($key.KeyChar)
      Write-Host "*" -NoNewline
    }
  } finally {
    try { [Console]::TreatControlCAsInput = $previousTreatControlC } catch {}
  }
  Write-Host ""
  return $ss
}

function New-ApplyMarkerAtomic([string]$Dir, [string]$Tip, [string]$AttemptId) {
  if ($AttemptId -notmatch '^apply-[0-9a-f]{12}-[0-9a-f]{32}$') {
    throw "APPLY_ATTEMPT_ID_INVALID: attempt id"
  }
  if ($AttemptId.StartsWith("attempt-")) {
    throw "APPLY_MARKER_DRY_RUN_REUSE_FORBIDDEN: dry-run prefix"
  }
  $markerPath = Join-Path $Dir ($AttemptId + ".marker")
  if (Test-Path -LiteralPath $markerPath) {
    throw "APPLY_ATTEMPT_CONSUMED: marker exists"
  }
  $stream = $null
  try {
    $stream = [IO.File]::Open($markerPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    $body = [Text.Encoding]::UTF8.GetBytes(("apply`n{0}`n{1}`n" -f $Tip, $AttemptId))
    $stream.Write($body, 0, $body.Length)
  } catch {
    throw "APPLY_ATTEMPT_CONSUMED: create collision"
  } finally {
    if ($null -ne $stream) { $stream.Dispose() }
  }
  return $markerPath
}

function New-AttemptMarkerAtomic([string]$Dir, [string]$Head) {
  $name = "attempt-" + $Head.Substring(0, 12) + "-" + [guid]::NewGuid().ToString("N") + ".marker"
  $markerPath = Join-Path $Dir $name
  $stream = $null
  try {
    $stream = [IO.File]::Open($markerPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    $body = [Text.Encoding]::UTF8.GetBytes(("dry-run`n{0}`n{1}`n" -f $Head, (Get-Date).ToUniversalTime().ToString("o")))
    $stream.Write($body, 0, $body.Length)
  } catch {
    throw "ATTEMPT_MARKER_COLLISION: $name"
  } finally {
    if ($null -ne $stream) { $stream.Dispose() }
  }
  return $markerPath
}

$DatabaseUrlEnv = "RA_PRO_ACCOUNTING_AUTOMATION_APPLY_DATABASE_URL"
$ExpectedProjectRef = "jzmdgwwiestcmmeuhhkr"
$AuthRel = "docs/security/ra-pro-accounting-automation-apply/TOOLING_AUTHORIZATION.json"
$BundleRel = "scripts/security/bundles/ra-pro-accounting-automation-applicator.standalone.cjs"
$script:PrePromptPhase = "init"
$script:PrePromptError = $null
$script:PromptHostNonInteractive = $null
$script:PromptHostVisible = $null
$script:MarkerBeforeChild = $false
$script:PromptOpenedUtc = $null
$script:PromptReadyUtc = $null
$script:PromptDeadlineUtc = $null
$script:SecureStringAcquired = $false
$script:TerminationReason = $null
$script:NodeStarted = $false
$ForbiddenUrlEnvs = @(
  "DATABASE_URL",
  "RA_PRO_CUTOVER_APPLY_DATABASE_URL",
  "CONTAINMENT_APPLY_DATABASE_URL",
  "FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL"
)
$ForbiddenOverrideEnvs = @(
  "RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_PATH",
  "RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_SHA256",
  "RA_PRO_ACCOUNTING_AUTOMATION_ALLOW_LOCALHOST",
  "ALLOW_LOCALHOST_FOR_HARNESS",
  "RA_PRO_ACCOUNTING_AUTOMATION_ALLOW_LOCALHOST_FOR_HARNESS"
)

function Set-PrePromptPhase([string]$Phase) {
  $script:PrePromptPhase = $Phase
}

function Get-Sha256Bytes([byte[]]$Bytes) {
  if ($null -eq $Bytes) {
    throw "CEREMONY_BLOB_BYTES_NULL: Get-Sha256Bytes received null byte array"
  }
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($sha.ComputeHash($Bytes)) -replace "-", "").ToLowerInvariant()
  } finally { $sha.Dispose() }
}

function Set-ProcessGitSafeDirectory([Diagnostics.ProcessStartInfo]$Psi, [string]$Root) {
  if ($null -eq $Psi) {
    throw "CEREMONY_PROCESS_STARTINFO_UNAVAILABLE"
  }
  $Psi.UseShellExecute = $false
  $envMap = $Psi.EnvironmentVariables
  if ($null -eq $envMap) {
    throw "CEREMONY_PROCESS_ENV_UNAVAILABLE: ProcessStartInfo.EnvironmentVariables is null"
  }
  $envMap["GIT_CONFIG_COUNT"] = "1"
  $envMap["GIT_CONFIG_KEY_0"] = "safe.directory"
  $envMap["GIT_CONFIG_VALUE_0"] = ($Root -replace "\\", "/")
}

function ConvertTo-ByteArrayStrict($Value, [string]$Label) {
  if ($null -eq $Value) {
    throw "CEREMONY_BLOB_BYTES_NULL: $Label is null (byte[] unroll)"
  }
  if ($Value -is [byte[]]) {
    return $Value
  }
  try {
    return [byte[]]$Value
  } catch {
    throw "CEREMONY_BLOB_BYTES_INVALID: $Label could not be coerced to byte[] ($($_.Exception.Message))"
  }
}

function Assert-EmbeddedTlsCaSeal($Auth, [string]$Tip) {
  Set-PrePromptPhase "tls_ca_seal"
  foreach ($name in @("NODE_TLS_REJECT_UNAUTHORIZED", "NODE_EXTRA_CA_CERTS", "SSL_CERT_FILE", "SSL_CERT_DIR")) {
    $value = [Environment]::GetEnvironmentVariable($name, "Process")
    if ($name -eq "NODE_TLS_REJECT_UNAUTHORIZED") {
      if ($value -eq "0") { throw "BLOCKED_TLS_BYPASS: NODE_TLS_REJECT_UNAUTHORIZED=0 is forbidden" }
    } elseif (-not [string]::IsNullOrWhiteSpace($value)) {
      throw "BLOCKED_TLS_BYPASS: $name is forbidden"
    }
  }
  $seal = $null
  if ($null -ne $Auth) { $seal = $Auth.tls_trust_root }
  if ($null -eq $seal) { throw "TLS_CA_SEAL_MISSING" }
  foreach ($field in @("path", "source_commit", "oid", "sha256", "bytes", "der_sha256", "certificate_pem_sha256", "certificate_bytes")) {
    if ([string]::IsNullOrWhiteSpace([string]$seal.$field)) { throw "TLS_CA_SEAL_MISSING" }
  }
  if ([string]$seal.path -ne "scripts/security/embedded-supabase-prod-ca-2021.js") {
    throw "TLS_CA_SEAL_PATH_FORBIDDEN"
  }
  if ([string]$seal.subject -ne "Supabase Root 2021 CA") { throw "TLS_CA_SUBJECT_MISMATCH" }
  $src = ([string]$seal.source_commit).ToLowerInvariant()
  try {
    Invoke-GitTextLocal @("merge-base", "--is-ancestor", $src, $Tip.ToLowerInvariant()) | Out-Null
  } catch {
    throw "TLS_CA_SOURCE_NOT_ANCESTOR"
  }
  $oid = Invoke-GitTextLocal @("rev-parse", ($src + ":" + [string]$seal.path))
  if ($oid.ToLowerInvariant() -ne ([string]$seal.oid).ToLowerInvariant()) { throw "TLS_CA_OID_MISMATCH" }
  $bytes = ConvertTo-ByteArrayStrict (Get-GitBlobBytes -Commit $src -Rel ([string]$seal.path)) "tls_ca"
  if ($bytes.Length -ne [int]$seal.bytes) { throw "TLS_CA_BYTES_MISMATCH" }
  if ((Get-Sha256Bytes -Bytes $bytes) -ne ([string]$seal.sha256).ToLowerInvariant()) { throw "TLS_CA_SHA_MISMATCH" }
  if (Test-BundleBytesContainCR -Bytes $bytes) { throw "TLS_CA_CRLF_FORBIDDEN" }
  $text = [Text.Encoding]::UTF8.GetString($bytes)
  if (([regex]::Matches($text, "-----BEGIN CERTIFICATE-----")).Count -ne 1) { throw "TLS_CA_EXTRA_OR_MISSING" }
  $pin = ([string]$seal.der_sha256).ToLowerInvariant()
  if (([regex]::Matches($text, [regex]::Escape($pin))).Count -ne 1) { throw "TLS_CA_PIN_ABSENT" }
  $assign = [regex]::Match($text, 'OFFICIAL_SUPABASE_PROD_CA_2021_PEM = "([^"]+)"')
  if (-not $assign.Success) { throw "TLS_CA_PEM_ABSENT" }
  $pem = $assign.Groups[1].Value.Replace('\n', "`n")
  if (-not $pem.EndsWith("`n")) { $pem = $pem + "`n" }
  $pemBytes = [Text.Encoding]::UTF8.GetBytes($pem)
  if ($pemBytes.Length -ne [int]$seal.certificate_bytes) { throw "TLS_CA_PEM_BYTES_MISMATCH" }
  if ((Get-Sha256Bytes -Bytes $pemBytes) -ne ([string]$seal.certificate_pem_sha256).ToLowerInvariant()) {
    throw "TLS_CA_PEM_SHA_MISMATCH"
  }
  $body = ($pem -replace "-----BEGIN CERTIFICATE-----", "" -replace "-----END CERTIFICATE-----", "" -replace "\s", "")
  $der = [Convert]::FromBase64String($body)
  if ((Get-Sha256Bytes -Bytes $der) -ne $pin) { throw "TLS_CA_PIN_MISMATCH" }
  $cert = $null
  try {
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2 -ArgumentList @(,$der)
    if ($cert.Subject.IndexOf("Supabase Root 2021 CA", [StringComparison]::Ordinal) -lt 0) {
      throw "TLS_CA_SUBJECT_MISMATCH"
    }
    $now = [DateTime]::UtcNow
    if ($now -lt $cert.NotBefore.ToUniversalTime()) { throw "TLS_CA_NOT_YET_VALID" }
    if ($now -gt $cert.NotAfter.ToUniversalTime()) { throw "TLS_CA_EXPIRED" }
  } finally {
    if ($null -ne $cert) { $cert.Reset() }
  }
}

function Test-BundleBytesContainCR([byte[]]$Bytes) {
  if ($null -eq $Bytes) {
    throw "CEREMONY_BLOB_BYTES_NULL: CRLF scan received null"
  }
  return ([Array]::IndexOf($Bytes, [byte]0x0d) -ge 0)
}

function Clear-AccountingCredentialChannels {
  foreach ($k in (@($DatabaseUrlEnv) + $ForbiddenUrlEnvs + @("ENABLE_RA_PRO_ACCOUNTING_AUTOMATION", "NODE_TLS_REJECT_UNAUTHORIZED", "NODE_EXTRA_CA_CERTS", "SSL_CERT_FILE", "SSL_CERT_DIR"))) {
    Remove-Item "Env:$k" -ErrorAction SilentlyContinue
    [Environment]::SetEnvironmentVariable($k, $null, "Process")
  }
}

function Sanitize-Text([string]$Text) {
  if (-not $Text) { return $Text }
  $t = [regex]::Replace($Text, "postgres(?:ql)?://[^\s`"']+", "postgres://***")
  $t = [regex]::Replace($t, "$DatabaseUrlEnv\s*[:=]\s*[^\s`"']+", "$DatabaseUrlEnv=***")
  $t = [regex]::Replace($t, "password=[^&\s`"']+", "password=***")
  return $t
}

function ConvertFrom-PercentOnce([string]$Value) {
  if ([string]::IsNullOrEmpty($Value)) { return "" }
  if ($Value.IndexOf("%") -lt 0) { return $Value }
  if ($Value -match '%(?![0-9A-Fa-f]{2})') { return $null }
  try { return [Uri]::UnescapeDataString($Value) } catch { return $null }
}

function Test-CanonicalPort([string]$Token) {
  if ($Token -notmatch '^[1-9][0-9]{0,4}$') { return $null }
  $n = 0
  if (-not [int]::TryParse($Token, [ref]$n)) { return $null }
  if ($n -lt 1 -or $n -gt 65535) { return $null }
  if ([string]$n -ne $Token) { return $null }
  return $n
}

function Get-HostClass([string]$Url) {
  $result = @{
    ok = $false
    host_class = "malformed"
    username_class = "absent"
    is_local = $false
    matches = $false
    database_name_match = $false
    ssl_requirement_match = $false
    port_class_match = $false
    effective_port = 0
  }
  if ([string]::IsNullOrWhiteSpace($Url)) { return $result }
  $Url = $Url.Trim()
  $blocked = $false
  foreach ($ch in $Url.ToCharArray()) {
    $code = [int]$ch
    if (($code -ge 0 -and $code -le 32) -or $code -eq 127 -or $ch -eq "\" -or $ch -eq "#") { $blocked = $true }
  }
  if ($blocked) { return $result }
  if ($Url -notmatch '^(?i)postgres(?:ql)?://([\s\S]*)$') { return $result }
  $rest = $Matches[1]
  $qPos = $rest.IndexOf("?")
  $before = if ($qPos -lt 0) { $rest } else { $rest.Substring(0, $qPos) }
  $query = if ($qPos -lt 0) { $null } else { $rest.Substring($qPos + 1) }
  $slash = $before.IndexOf("/")
  if ($slash -le 0) { return $result }
  $authority = $before.Substring(0, $slash)
  $databaseRaw = $before.Substring($slash + 1)
  if ($databaseRaw.Contains("/")) { return $result }
  $at = $authority.LastIndexOf("@")
  $userinfo = if ($at -lt 0) { "" } else { $authority.Substring(0, $at) }
  $hostport = if ($at -lt 0) { $authority } else { $authority.Substring($at + 1) }
  $hostRaw = ""
  $explicitToken = $null
  if ($hostport.StartsWith("[")) {
    $end = $hostport.IndexOf("]")
    if ($end -lt 2) { return $result }
    $hostRaw = $hostport.Substring(1, $end - 1)
    $tail = $hostport.Substring($end + 1)
    if ($tail.Length -gt 0) {
      if (-not $tail.StartsWith(":") -or $tail.Length -lt 2) { return $result }
      $explicitToken = $tail.Substring(1)
    }
  } else {
    $colon = $hostport.LastIndexOf(":")
    if ($colon -lt 0) {
      $hostRaw = $hostport
    } else {
      $token = $hostport.Substring($colon + 1)
      if ($token -match '^[0-9]+$') {
        $hostRaw = $hostport.Substring(0, $colon)
        $explicitToken = $token
      } else {
        $hostRaw = $hostport
      }
    }
  }
  $hostDecoded = ConvertFrom-PercentOnce $hostRaw
  $database = ConvertFrom-PercentOnce $databaseRaw
  if ($null -eq $hostDecoded -or $null -eq $database -or [string]::IsNullOrEmpty($hostDecoded)) { return $result }
  $hostName = $hostDecoded.ToLowerInvariant()
  if ($hostName.Contains("%")) { return $result }
  $username = ""
  if (-not [string]::IsNullOrEmpty($userinfo)) {
    $colon = $userinfo.IndexOf(":")
    $rawUser = if ($colon -lt 0) { $userinfo } else { $userinfo.Substring(0, $colon) }
    $username = ConvertFrom-PercentOnce $rawUser
    if ($null -eq $username) { return $result }
  }
  $effective = 5432
  if ($null -ne $explicitToken) {
    $parsedPort = Test-CanonicalPort $explicitToken
    if ($null -eq $parsedPort) { return $result }
    $effective = [int]$parsedPort
  }
  $sslOk = $false
  if ($null -ne $query) {
    if ($query -eq "" -or $query.Contains("#") -or $query.Contains("+") -or $query.Contains("&")) {
      $sslOk = $false
    } else {
      $eq = $query.IndexOf("=")
      if ($eq -gt 0) {
        $rawKey = $query.Substring(0, $eq)
        $rawValue = $query.Substring($eq + 1)
        if ([string]::Equals($rawKey, "sslmode", [StringComparison]::Ordinal) -and (
          [string]::Equals($rawValue, "require", [StringComparison]::Ordinal) -or
          [string]::Equals($rawValue, "verify-full", [StringComparison]::Ordinal) -or
          [string]::Equals($rawValue, "verify-ca", [StringComparison]::Ordinal)
        )) {
          $sslOk = $true
        }
      }
    }
  }
  $result.ok = $true
  $result.effective_port = $effective
  $result.database_name_match = [string]::Equals($database, "postgres", [StringComparison]::Ordinal)
  $result.ssl_requirement_match = $sslOk
  $ref = [string]$ExpectedProjectRef
  $directHost = "db.$ref.supabase.co"
  $boundUser = "postgres.$ref"
  $poolerPattern = '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.pooler\.supabase\.com$'
  if ($hostName -eq "127.0.0.1" -or $hostName -eq "localhost" -or $hostName -eq "::1") {
    $result.host_class = "loopback"
    $result.username_class = "not_applicable"
    $result.is_local = $true
    $result.matches = $false
    $result.port_class_match = ($effective -eq 5432)
    return $result
  }
  if ($hostName -eq $directHost) {
    $result.host_class = "direct"
    $result.username_class = "not_applicable"
    $result.port_class_match = ($effective -eq 5432)
    $result.matches = ($result.port_class_match -and $result.database_name_match -and $result.ssl_requirement_match)
    return $result
  }
  if ([regex]::IsMatch($hostName, $poolerPattern)) {
    $session = ($effective -eq 5432)
    $transaction = ($null -ne $explicitToken -and $effective -eq 6543)
    $result.port_class_match = ($session -or $transaction)
    if ($transaction) { $result.host_class = "transaction_pooler" }
    elseif ($session) { $result.host_class = "session_pooler" }
    else { $result.host_class = "mismatched" }
    if ([string]::IsNullOrEmpty($username)) { $result.username_class = "absent" }
    elseif ([string]::Equals($username, $boundUser, [StringComparison]::Ordinal)) { $result.username_class = "project_bound" }
    else { $result.username_class = "mismatched" }
    $result.matches = ($result.port_class_match -and $result.database_name_match -and $result.ssl_requirement_match -and ($result.username_class -eq "project_bound"))
    return $result
  }
  $result.host_class = "mismatched"
  if ([string]::IsNullOrEmpty($username)) { $result.username_class = "absent" } else { $result.username_class = "mismatched" }
  $result.matches = $false
  return $result
}

function Invoke-GitTextLocal([string[]]$GitArgs) {
  if ($null -eq $GitArgs -or $GitArgs.Count -eq 0) {
    throw "CEREMONY_GIT_ARGS_NULL"
  }
  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = "git"
  $psi.Arguments = ($GitArgs | ForEach-Object {
      if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
    }) -join " "
  $psi.WorkingDirectory = $RepoRoot
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  Set-ProcessGitSafeDirectory -Psi $psi -Root $RepoRoot
  if ($TestForcePrePromptNullIndex -eq "envvars_null") {
    # Exact production-class failure: index into a null EnvironmentVariables map.
    $nullMap = $null
    $nullMap["GIT_CONFIG_COUNT"] = "1"
  }
  $p = [Diagnostics.Process]::Start($psi)
  $out = $p.StandardOutput.ReadToEnd()
  $err = $p.StandardError.ReadToEnd()
  if (-not $p.WaitForExit(60000)) {
    try { $p.Kill() } catch {}
    throw "git timed out"
  }
  if ($p.ExitCode -ne 0) { throw "git failed: $err" }
  return $out.Trim()
}

function Invoke-BundlePreflight([byte[]]$BundleBytes, [string[]]$ExtraArgs) {
  $dest = Join-Path $EvidenceOutDir ("preflight-" + [guid]::NewGuid().ToString("N") + ".cjs")
  [IO.File]::WriteAllBytes($dest, $BundleBytes)
  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = (Get-Command node.exe).Source
  $quoted = @('"{0}"' -f $dest)
  foreach ($arg in $ExtraArgs) {
    if ($arg -match '[\s"]') { $quoted += ('"' + ($arg -replace '"', '\"') + '"') } else { $quoted += $arg }
  }
  $psi.Arguments = $quoted -join " "
  $psi.WorkingDirectory = $RepoRoot
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  $p = [Diagnostics.Process]::Start($psi)
  $stdout = $p.StandardOutput.ReadToEnd()
  $stderr = $p.StandardError.ReadToEnd()
  if (-not $p.WaitForExit(120000)) {
    try { $p.Kill() } catch {}
    throw "APPLY_AUTHORIZATION_PREFLIGHT_FAILED: timeout"
  }
  Remove-Item -LiteralPath $dest -Force -ErrorAction SilentlyContinue
  $text = (([string]$stdout) -split "`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Last 1)
  if ([string]::IsNullOrWhiteSpace($text)) { throw "APPLY_AUTHORIZATION_PREFLIGHT_FAILED: empty" }
  return @{ exit = [int]$p.ExitCode; decision = ($text.Trim() | ConvertFrom-Json); stderr = ([string]$stderr).Trim() }
}

function Get-GitBlobBytes([string]$Commit, [string]$Rel) {
  if ($TestForcePrePromptNullIndex -eq "empty_blob_index") {
    # Legacy defect: empty `return $ms.ToArray()` unrolls to $null; `$null[0]` throws
    # "Cannot index into a null array."
    $legacy = & {
      $msEmpty = New-Object IO.MemoryStream
      return $msEmpty.ToArray()
    }
    $null = $legacy[0]
  }
  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = "git"
  $psi.Arguments = "cat-file blob ${Commit}:${Rel}"
  $psi.WorkingDirectory = $RepoRoot
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  Set-ProcessGitSafeDirectory -Psi $psi -Root $RepoRoot
  $p = [Diagnostics.Process]::Start($psi)
  $ms = New-Object IO.MemoryStream
  $p.StandardOutput.BaseStream.CopyTo($ms)
  $err = $p.StandardError.ReadToEnd()
  if (-not $p.WaitForExit(60000)) {
    try { $p.Kill() } catch {}
    throw "git cat-file timed out"
  }
  if ($p.ExitCode -ne 0) { throw "git cat-file failed for ${Rel}: $err" }
  # Unary comma prevents PowerShell from unrolling byte[] (empty → $null; len=1 → scalar).
  return , $ms.ToArray()
}

function Get-ScopedOrphanPids([string]$Sentinel, [int]$ExcludePid) {
  $found = @()
  try {
    $procs = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue
    foreach ($proc in $procs) {
      if ($null -eq $proc) { continue }
      if ([int]$proc.ProcessId -eq $ExcludePid) { continue }
      $cmd = [string]$proc.CommandLine
      if ([string]::IsNullOrWhiteSpace($cmd)) { continue }
      if ($cmd.IndexOf($Sentinel, [StringComparison]::OrdinalIgnoreCase) -ge 0) {
        $found += [int]$proc.ProcessId
      }
    }
  } catch {}
  return $found
}

function Stop-CeremonyChildTree([Diagnostics.Process]$Proc, [string]$Sentinel) {
  $terminated = $false
  $confirmed = $false
  if ($null -eq $Proc) {
    return @{ terminated = $true; confirmed = $true; method = "no_child" }
  }
  $procId = 0
  try { $procId = [int]$Proc.Id } catch {}
  try {
    if (-not $Proc.HasExited) {
      # Kill process tree rooted at child PID only (scoped).
      $tk = Start-Process -FilePath "taskkill.exe" -ArgumentList @("/PID", "$procId", "/T", "/F") -Wait -PassThru -WindowStyle Hidden -ErrorAction SilentlyContinue
      $terminated = $true
      if ($null -ne $tk -and $tk.ExitCode -ne 0) {
        try { $Proc.Kill() } catch {}
      }
    } else {
      $terminated = $true
    }
  } catch {
    try { if (-not $Proc.HasExited) { $Proc.Kill() }; $terminated = $true } catch {}
  }
  try {
    if (-not $Proc.HasExited) { [void]$Proc.WaitForExit(15000) }
    $confirmed = [bool]$Proc.HasExited
  } catch {
    $confirmed = $false
  }
  # Also kill any remaining scoped orphans matching the ceremony sentinel.
  foreach ($op in (Get-ScopedOrphanPids -Sentinel $Sentinel -ExcludePid 0)) {
    try {
      Start-Process -FilePath "taskkill.exe" -ArgumentList @("/PID", "$op", "/T", "/F") -Wait -WindowStyle Hidden -ErrorAction SilentlyContinue | Out-Null
    } catch {}
  }
  return @{ terminated = $terminated; confirmed = $confirmed; method = "taskkill_tree"; pid = $procId }
}

if (-not [string]::IsNullOrWhiteSpace($TestHostClassFile)) {
  if ($allowDirectHarness -ne "1") { throw "BLOCKED_HARNESS" }
  $rows = @()
  foreach ($line in (Get-Content -LiteralPath $TestHostClassFile)) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    $class = Get-HostClass -Url $line
    $rows += [ordered]@{
      ok = [bool]$class.ok
      host_class = [string]$class.host_class
      username_class = [string]$class.username_class
      is_local = [bool]$class.is_local
      matches_expected_project_ref = [bool]$class.matches
      database_name_match = [bool]$class.database_name_match
      ssl_requirement_match = [bool]$class.ssl_requirement_match
      port_class_match = [bool]$class.port_class_match
      effective_port = [int]$class.effective_port
    }
  }
  Write-Output (@{ results = $rows } | ConvertTo-Json -Compress -Depth 5)
  exit 0
}

if (-not $RepoRoot) {
  $RepoRoot = (git -c "safe.directory=*" rev-parse --show-toplevel 2>$null)
  if (-not $RepoRoot) { throw "RepoRoot required" }
}
$RepoRoot = [IO.Path]::GetFullPath($RepoRoot)
if (-not $EvidenceOutDir) {
  $EvidenceOutDir = Join-Path $env:TEMP "ra-pro-accounting-automation-prod-dryrun-ceremony"
}
New-Item -ItemType Directory -Force -Path $EvidenceOutDir | Out-Null

$secure = $null
$bstr = [IntPtr]::Zero
$plain = $null
$attemptMarker = $null
$child = $null
$childPid = $null
$bundleTemp = $null
$ceremonySentinel = "ra-acct-dryrun-" + [guid]::NewGuid().ToString("N")
$rawCapture = Join-Path $EvidenceOutDir "raw-child-stdout.frame.txt"
$evidencePath = Join-Path $EvidenceOutDir "PRODUCTION_DRY_RUN_EVIDENCE.json"
$resultCode = "CEREMONY_FAILED"
$parsed = $null
$pre = $null
$bundleSeal = $null
$hostClass = $null
$timedOut = $false
$childTerminated = $false
$terminationConfirmed = $false
$orphanPids = @()
$orphanCheckCompleted = $false
$rawStdoutRemoved = $false
$materialRemoved = $false
$credentialCleared = $false
$secureZeroFreed = $false
$cleanupCompleted = $false
$stdout = ""
$stderr = ""
$combined = ""

Clear-Host
Write-Host "RA Pro accounting-automation production dry-run ceremony"
Write-Host "PrHead: $PrHead"
Write-Host ("Mode: " + $Mode + " (production apply authorization stays unpublished until a later explicit one-attempt record)")
Write-Host "Paste an already-known URL at the hidden prompt. Do not paste into chat."

try {
  Set-PrePromptPhase "forbidden_envs"
  if (-not [string]::IsNullOrWhiteSpace($TestForcePrePromptNullIndex)) {
    $allowSyntheticProbe = [Environment]::GetEnvironmentVariable("RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL", "Process")
    if ($allowSyntheticProbe -ne "1") {
      throw "SYNTHETIC_URL_NOT_ALLOWED"
    }
  }
  foreach ($k in $ForbiddenOverrideEnvs) {
    $v = [Environment]::GetEnvironmentVariable($k, "Process")
    if (-not [string]::IsNullOrWhiteSpace($v)) {
      throw "PRECONDITION_EVIDENCE_ENV_OVERRIDE_FORBIDDEN: $k must not be set"
    }
  }
  foreach ($k in $ForbiddenUrlEnvs) {
    $v = [Environment]::GetEnvironmentVariable($k, "Process")
    if (-not [string]::IsNullOrWhiteSpace($v)) {
      throw "PROHIBITED_CREDENTIAL_CHANNEL: $k is forbidden"
    }
  }

  Set-PrePromptPhase "tip_rev_parse"
  $tip = Invoke-GitTextLocal @("rev-parse", "HEAD")
  $bundleCommit = $PrHead.ToLowerInvariant()
  if ($Mode -ne "apply") {
    if ($tip.ToLowerInvariant() -ne $PrHead.ToLowerInvariant()) {
      throw "WRONG_TIP: HEAD $tip does not match -PrHead $PrHead"
    }
  } else {
    if ($bundleCommit -notmatch '^[0-9a-f]{40}$') { throw "BLOCKED_PIN_MISMATCH: executable" }
    $resolvedExec = (Invoke-GitTextLocal @("rev-parse", "--verify", "${bundleCommit}^{commit}")).ToLowerInvariant()
    if ($resolvedExec -ne $bundleCommit) { throw "BLOCKED_PIN_MISMATCH: ambiguous executable" }
    if ($bundleCommit -ne $tip.ToLowerInvariant()) {
      $safe = ($RepoRoot -replace "\\", "/")
      $anc = Start-Process -FilePath "git" -ArgumentList @("-c", "safe.directory=$safe", "merge-base", "--is-ancestor", $bundleCommit, $tip.ToLowerInvariant()) -WorkingDirectory $RepoRoot -Wait -PassThru -WindowStyle Hidden
      if ($anc.ExitCode -ne 0) { throw "APPLY_AUTHORIZATION_ANCESTRY: executable is not an ancestor of HEAD" }
    }
    if ($ExecutableBundleOid -notmatch '^[0-9a-f]{40}$') { throw "APPLY_AUTHORIZATION_PIN_MISMATCH: executable bundle oid" }
  }

  Set-PrePromptPhase "auth_blob"
  $authBytes = ConvertTo-ByteArrayStrict (Get-GitBlobBytes -Commit $bundleCommit -Rel $AuthRel) "auth_blob"
  Set-PrePromptPhase "auth_parse"
  $auth = ([Text.Encoding]::UTF8.GetString($authBytes)) | ConvertFrom-Json
  Set-PrePromptPhase "precondition"
  $pre = $auth.precondition_publication
  if ($null -eq $pre -or [string]$pre.status -ne "PUBLISHED") {
    throw "PRECONDITION_PINS_UNPUBLISHED: precondition_publication is not PUBLISHED"
  }
  Set-PrePromptPhase "publication_pin_note"
  $pub = $auth.publication
  # Null-safe: never index/dereference $pub when absent (restores guard removed at 03f0bc0c).
  if ($TestForcePrePromptNullIndex -eq "pub_null_index") {
    # Prove fixed path tolerates null publication without NullArray.
    $pub = $null
  }
  if (
    $null -ne $pub -and (
      $null -ne $pub.required_prior_dry_run_evidence_sha256 -or
      $null -ne $pub.required_pre_apply_live_evidence_sha256
    )
  ) {
    Write-Host "NOTE: prior/pre-apply pins are present; dry-run still does not consume apply authority."
  }

  Set-PrePromptPhase "bundle_seal"
  $bundleSeal = $auth.standalone_bundle
  if (-not $bundleSeal -or -not $bundleSeal.oid -or -not $bundleSeal.sha256 -or -not $bundleSeal.bytes) {
    throw "BUNDLE_AUTHORITY_UNPUBLISHED: standalone_bundle seals missing"
  }
  Set-PrePromptPhase "bundle_oid"
  $bundleOid = Invoke-GitTextLocal @("rev-parse", "${bundleCommit}:${BundleRel}")
  if ($bundleOid -ne [string]$bundleSeal.oid) {
    throw "BUNDLE_AUTHORITY_MISMATCH: tip bundle OID mismatch"
  }
  Set-PrePromptPhase "bundle_blob"
  $bundleBytes = ConvertTo-ByteArrayStrict (Get-GitBlobBytes -Commit $bundleCommit -Rel $BundleRel) "bundle_blob"
  Set-PrePromptPhase "bundle_sha"
  $bundleSha = Get-Sha256Bytes -Bytes $bundleBytes
  if ($bundleSha -ne ([string]$bundleSeal.sha256).ToLowerInvariant()) {
    throw "BUNDLE_AUTHORITY_MISMATCH: tip bundle SHA-256 mismatch"
  }
  Set-PrePromptPhase "bundle_len"
  if ($bundleBytes.Length -ne [int]$bundleSeal.bytes) {
    throw "BUNDLE_AUTHORITY_MISMATCH: tip bundle bytes mismatch"
  }
  Set-PrePromptPhase "bundle_crlf"
  if (Test-BundleBytesContainCR -Bytes $bundleBytes) {
    throw "BUNDLE_CRLF_FORBIDDEN"
  }

  Assert-EmbeddedTlsCaSeal -Auth $auth -Tip $tip

  if ($Mode -eq "apply") {
    Set-PrePromptPhase "apply_authorization"
    if ($ApplyAttemptId -notmatch '^apply-[0-9a-f]{12}-[0-9a-f]{32}$') {
      throw "APPLY_ATTEMPT_ID_INVALID: attempt id"
    }
    $allowSyntheticApply = [Environment]::GetEnvironmentVariable("RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL", "Process")
    if ($allowSyntheticApply -eq "1" -and [string]::IsNullOrWhiteSpace($ApplyAttemptId)) {
      throw "APPLY_AUTHORIZATION_REF_OVERRIDE_FORBIDDEN: synthetic env is not authorization"
    }
    if ($AuthorizationPublicationCommit -notmatch '^[0-9a-f]{40}$' -or $AuthorizationBlobOid -notmatch '^[0-9a-f]{40}$') {
      throw "APPLY_AUTHORIZATION_PIN_MISMATCH: preflight pin missing"
    }
    $preflight = Invoke-BundlePreflight -BundleBytes $bundleBytes -ExtraArgs @("--preflight")
    $decision = $preflight.decision
    if ($preflight.exit -ne 0 -or $decision.blocked) {
      $code = [string]$decision.blocked
      if ([string]::IsNullOrWhiteSpace($code)) { $code = "APPLY_AUTHORIZATION_PREFLIGHT_FAILED" }
      throw ("{0}: sealed preflight rejected the publication before credentials" -f $code)
    }
    if ([string]$decision.publication_commit -ne $AuthorizationPublicationCommit.ToLowerInvariant() -or [string]$decision.authorization_blob_oid -ne $AuthorizationBlobOid.ToLowerInvariant()) {
      throw "APPLY_AUTHORIZATION_PIN_MISMATCH: ceremony pin does not match preflight"
    }
    if ([string]$decision.attempt_id -ne $ApplyAttemptId) {
      throw "APPLY_ATTEMPT_ID_INVALID: attempt id does not match preflight"
    }
    if (([string]$decision.authorized_executable_commit).ToLowerInvariant() -ne $bundleCommit) {
      throw "APPLY_AUTHORIZATION_REF_OVERRIDE_FORBIDDEN: preflight executable"
    }
    $liveOid = (Invoke-GitTextLocal @("rev-parse", "${bundleCommit}:${BundleRel}")).ToLowerInvariant()
    if ($liveOid -ne $ExecutableBundleOid.ToLowerInvariant() -or $liveOid -ne $bundleOid.ToLowerInvariant()) {
      throw "APPLY_AUTHORIZATION_BUNDLE_MISMATCH: executable bundle changed before prompt"
    }
    if ($bundleCommit -ne $tip.ToLowerInvariant()) {
      $headOid = (Invoke-GitTextLocal @("rev-parse", "${tip}:${BundleRel}")).ToLowerInvariant()
      if ($headOid -ne $liveOid) { throw "APPLY_AUTHORIZATION_BUNDLE_MISMATCH: publication bundle" }
    }
    $script:ApplyExecutableCommit = $bundleCommit
    $existingApply = Join-Path $EvidenceOutDir ($ApplyAttemptId + ".marker")
    if (Test-Path -LiteralPath $existingApply) {
      throw "APPLY_ATTEMPT_CONSUMED: marker exists before prompt"
    }
  }

  Set-PrePromptPhase "credential_boundary"
  if ($TestVisiblePromptProbe) {
    Set-PrePromptPhase "visible_prompt_probe"
    $allowProbe = [Environment]::GetEnvironmentVariable("RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL", "Process")
    if ($allowProbe -ne "1") { throw "SYNTHETIC_URL_NOT_ALLOWED" }
    if (-not [string]::IsNullOrWhiteSpace($TestSyntheticDatabaseUrl) -or -not [string]::IsNullOrWhiteSpace($TestHarnessChildStub)) {
      throw "PROMPT_PROBE_REJECTS_CREDENTIALS"
    }
    if (-not (Test-PromptOwningHost)) {
      throw "PROMPT_HOST_NOT_INTERACTIVE: prompt owner is hidden or noninteractive"
    }
    $resultCode = "VISIBLE_PROMPT_READY"
  } elseif ($TestTimeoutBudgetProbe) {
    $allowBudget = [Environment]::GetEnvironmentVariable("RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL", "Process")
    if ($allowBudget -ne "1") { throw "SYNTHETIC_URL_NOT_ALLOWED" }
    if ($PromptInputTimeoutMs -le 180000) { throw "PROMPT_WINDOW_STILL_180S" }
    $script:PromptOpenedUtc = [DateTime]::UtcNow.ToString("o")
    $script:PromptReadyUtc = [string]$script:PromptOpenedUtc
    $script:PromptDeadlineUtc = [DateTime]::UtcNow.AddMilliseconds($PromptInputTimeoutMs).ToString("o")
    $script:TerminationReason = "budget_probe"
    $resultCode = "TIMEOUT_BUDGET_READY"
  } else {
  if ($TestForcePromptCancel) {
    $allowCancel = [Environment]::GetEnvironmentVariable("RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL", "Process")
    if ($allowCancel -ne "1") { throw "SYNTHETIC_URL_NOT_ALLOWED" }
    $script:TerminationReason = "operator_cancel"
    throw "BLOCKED_CREDENTIAL_UNAVAILABLE: operator cancel"
  }
  if ($TestForcePromptTimeout) {
    $allowTimeout = [Environment]::GetEnvironmentVariable("RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL", "Process")
    if ($allowTimeout -ne "1") { throw "SYNTHETIC_URL_NOT_ALLOWED" }
    Write-PromptReadySidecar
    $script:TerminationReason = "prompt_input_timeout"
    throw "PROMPT_INPUT_TIMEOUT: operator prompt exceeded ${PromptInputTimeoutMs}ms; deadline $($script:PromptDeadlineUtc)"
  }
  if ($TestForcePromptWindowClose) {
    $allowClose = [Environment]::GetEnvironmentVariable("RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL", "Process")
    if ($allowClose -ne "1") { throw "SYNTHETIC_URL_NOT_ALLOWED" }
    Write-PromptReadySidecar
    $script:TerminationReason = "prompt_window_closed"
    throw "PROMPT_WINDOW_CLOSED: operator window closed"
  }
  if ($TestHangBeforeEvidence) {
    $allowHang = [Environment]::GetEnvironmentVariable("RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL", "Process")
    if ($allowHang -ne "1") { throw "SYNTHETIC_URL_NOT_ALLOWED" }
    Write-PromptReadySidecar
    Start-Sleep -Seconds 30
    throw "PROMPT_HANG_BEFORE_EVIDENCE"
  }
  $allowSynthetic = [Environment]::GetEnvironmentVariable("RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL", "Process")
  if (-not [string]::IsNullOrWhiteSpace($TestSyntheticDatabaseUrl) -or -not [string]::IsNullOrWhiteSpace($TestHarnessChildStub)) {
    if ($allowSynthetic -ne "1") {
      throw "SYNTHETIC_URL_NOT_ALLOWED"
    }
  }

  $usingSynthetic = -not [string]::IsNullOrWhiteSpace($TestSyntheticDatabaseUrl)
  if (-not $usingSynthetic) {
    Set-PrePromptPhase "prompt_host"
    if (-not (Test-PromptOwningHost)) {
      throw "PROMPT_HOST_NOT_INTERACTIVE: prompt owner is hidden or noninteractive"
    }
    Set-PrePromptPhase "credential_boundary"
    if (-not [string]::IsNullOrWhiteSpace($allowSynthetic)) {
      throw "BLOCKED_HARNESS_ENV_CONTAMINATION: interactive path forbids synthetic harness env without TestSyntheticDatabaseUrl"
    }
    if ($PromptInputTimeoutMs -le 180000) { throw "PROMPT_WINDOW_STILL_180S" }
    $secure = Read-BoundedSecureString -Prompt $DatabaseUrlEnv -TimeoutMs $PromptInputTimeoutMs
  } else {
    $secure = ConvertTo-SecureString -String $TestSyntheticDatabaseUrl -AsPlainText -Force
  }
  if ($null -eq $secure -or $secure.Length -le 0) {
    throw "BLOCKED_CREDENTIAL_UNAVAILABLE: No URL provided by operator"
  }
  $script:SecureStringAcquired = $true

  Set-PrePromptPhase "attempt_marker"
  if ($Mode -eq "apply") {
    $headNow = (Invoke-GitTextLocal @("rev-parse", "HEAD")).ToLowerInvariant()
    if ($headNow -ne $tip.ToLowerInvariant()) { throw "APPLY_AUTHORIZATION_PIN_MISMATCH: HEAD moved after preflight" }
    $oidNow = (Invoke-GitTextLocal @("rev-parse", "${bundleCommit}:${BundleRel}")).ToLowerInvariant()
    if ($oidNow -ne $ExecutableBundleOid.ToLowerInvariant()) { throw "APPLY_AUTHORIZATION_BUNDLE_MISMATCH: bundle moved after preflight" }
    $recheck = Invoke-BundlePreflight -BundleBytes $bundleBytes -ExtraArgs @(
      "--preflight", "--recheck",
      "--expect-commit", $AuthorizationPublicationCommit.ToLowerInvariant(),
      "--expect-blob-oid", $AuthorizationBlobOid.ToLowerInvariant(),
      "--expect-executable", $bundleCommit,
      "--expect-bundle-oid", $ExecutableBundleOid.ToLowerInvariant()
    )
    if ($recheck.exit -ne 0 -or $recheck.decision.blocked) {
      $code = [string]$recheck.decision.blocked
      if ([string]::IsNullOrWhiteSpace($code)) { $code = "APPLY_AUTHORIZATION_PIN_MISMATCH" }
      throw ("{0}: publication changed after preflight" -f $code)
    }
    $attemptMarker = New-ApplyMarkerAtomic -Dir $EvidenceOutDir -Tip $script:ApplyExecutableCommit -AttemptId $ApplyAttemptId
  } else {
    $attemptMarker = New-AttemptMarkerAtomic -Dir $EvidenceOutDir -Head $PrHead
  }
  $script:MarkerBeforeChild = $true
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  if ([string]::IsNullOrWhiteSpace($plain)) {
    throw "BLOCKED_CREDENTIAL_UNAVAILABLE: Empty URL after SecureString"
  }

  $hostClass = Get-HostClass -Url $plain
  if (-not $hostClass.ok) {
    throw "MALFORMED_DATABASE_URL"
  }
  if ($hostClass.is_local -or -not $hostClass.matches) {
    throw "DATABASE_PROJECT_REF_MISMATCH: connection is not bound to Supabase project $ExpectedProjectRef"
  }

  $bundleTemp = Join-Path $EvidenceOutDir ("bundle-" + $ceremonySentinel + ".cjs")
  if (-not [string]::IsNullOrWhiteSpace($TestHarnessChildStub) -and $allowSynthetic -eq "1") {
    $stubBody = switch ($TestHarnessChildStub) {
      "success" {
        $successCode = $(if ($Mode -eq "apply") { "APPLY_PATH_REACHED" } else { "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION" })
        @"
console.log(JSON.stringify({
  verdict: "$successCode",
  result_code: "$successCode",
  databaseConnectionAttempts: 0,
  sqlApplicationAttempts: 0,
  migration_sql_attempts: 0,
  harness_stub: true,
  ceremony_sentinel: "$ceremonySentinel"
}));
process.exit(0);
"@
      }
      "hang" {
        @"
setInterval(() => {}, 1000);
// hang until killed; sentinel=$ceremonySentinel
"@
      }
      "fail" {
        @"
console.log(JSON.stringify({
  verdict: "DRY_RUN_BLOCKED",
  result_code: "HARNESS_CHILD_FAIL",
  databaseConnectionAttempts: 0,
  sqlApplicationAttempts: 0,
  ceremony_sentinel: "$ceremonySentinel"
}));
process.exit(2);
"@
      }
      "malformed" {
        @"
console.log("NOT_JSON_EVIDENCE sentinel=$ceremonySentinel");
process.exit(0);
"@
      }
      default { throw "INVALID_HARNESS_STUB" }
    }
    [IO.File]::WriteAllText($bundleTemp, ($stubBody -replace "`r`n", "`n"))
  } else {
    [IO.File]::WriteAllBytes($bundleTemp, $bundleBytes)
  }

  Clear-AccountingCredentialChannels
  [Environment]::SetEnvironmentVariable($DatabaseUrlEnv, $plain, "Process")
  Set-Item -Path "Env:$DatabaseUrlEnv" -Value $plain

  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = (Get-Command node.exe).Source
  if ($Mode -eq "apply") {
    $exactToken = [string]$auth.apply_authorization_token
    if ([string]::IsNullOrWhiteSpace($exactToken)) {
      throw "APPLY_AUTHORIZATION_TOKEN_MISMATCH: missing token"
    }
    $authorizationPin = "{0}:{1}:{2}:{3}" -f $bundleCommit, $AuthorizationPublicationCommit.ToLowerInvariant(), $AuthorizationBlobOid.ToLowerInvariant(), $ExecutableBundleOid.ToLowerInvariant()
    $psi.Arguments = ('"{0}" --apply --apply-marker "{1}" --authorization-pin "{2}"' -f $bundleTemp, $attemptMarker, $authorizationPin)
  } else {
    $psi.Arguments = "`"$bundleTemp`""
  }
  $psi.WorkingDirectory = $RepoRoot
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  $childEnv = $psi.EnvironmentVariables
  if ($null -eq $childEnv) {
    throw "CEREMONY_PROCESS_ENV_UNAVAILABLE: child EnvironmentVariables is null"
  }
  $childEnv[$DatabaseUrlEnv] = $plain
  if ($Mode -eq "apply") {
    $childEnv["RA_PRO_ACCOUNTING_AUTOMATION_APPLY_TOKEN"] = $exactToken
  }
  foreach ($k in $ForbiddenUrlEnvs) {
    if ($childEnv.ContainsKey($k)) { $childEnv.Remove($k) }
  }
  $child = New-Object Diagnostics.Process
  $child.StartInfo = $psi
  [void]$child.Start()
  $script:NodeStarted = $true
  $childPid = [int]$child.Id

  # Async read so WaitForExit timeout cannot deadlock on full pipes.
  $outTask = $child.StandardOutput.ReadToEndAsync()
  $errTask = $child.StandardError.ReadToEndAsync()
  $exited = $child.WaitForExit([Math]::Max(1, $ChildTimeoutMs))
  if (-not $exited) {
    $timedOut = $true
    $stop = Stop-CeremonyChildTree -Proc $child -Sentinel $ceremonySentinel
    $childTerminated = [bool]$stop.terminated
    $terminationConfirmed = [bool]$stop.confirmed
    if ($TestForceTerminateFailure) {
      $terminationConfirmed = $false
      $childTerminated = $false
    }
    if (-not $terminationConfirmed) {
      throw "CEREMONY_CHILD_TERMINATION_FAILED: timed out and child tree not confirmed exited"
    }
    throw "CEREMONY_CHILD_TIMEOUT: child exceeded ${ChildTimeoutMs}ms"
  } else {
    $childTerminated = $true
    $terminationConfirmed = $true
    if ($TestForceTerminateFailure) {
      $terminationConfirmed = $false
      throw "CEREMONY_CHILD_TERMINATION_FAILED: forced harness termination failure"
    }
  }
  try { $stdout = [string]$outTask.Result } catch { $stdout = "" }
  try { $stderr = [string]$errTask.Result } catch { $stderr = "" }
  $combined = $stdout + "`n" + $stderr
  [IO.File]::WriteAllText($rawCapture, (Sanitize-Text $combined))

  # Zero-free credential material immediately after child completes.
  if ($bstr -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    $bstr = [IntPtr]::Zero
  }
  $secureZeroFreed = $true
  $plain = $null
  if ($null -ne $secure) { $secure.Dispose(); $secure = $null }
  Clear-AccountingCredentialChannels
  $credentialCleared = $true

  $line = ($combined -split "`r?`n" | Where-Object { $_.Trim().StartsWith("{") } | Select-Object -Last 1)
  if ([string]::IsNullOrWhiteSpace($line)) {
    throw "CEREMONY_EVIDENCE_DECODE_FAIL: no JSON evidence frame"
  }
  $parsed = $line | ConvertFrom-Json
  $resultCode = [string]$parsed.verdict
  if ($child.ExitCode -ne 0 -and ($resultCode -eq "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION" -or $resultCode -eq "APPLY_PATH_REACHED")) {
    $resultCode = "CEREMONY_CHILD_EXIT_MISMATCH"
  }
  }
}
catch {
  $msg = Sanitize-Text ([string]$_.Exception.Message)
  $failLine = 0
  $failStmt = ""
  $failPhase = [string]$script:PrePromptPhase
  try { $failLine = [int]$_.InvocationInfo.ScriptLineNumber } catch {}
  try {
    $failStmt = Sanitize-Text ([string]$_.InvocationInfo.Line).Trim()
    if ($failStmt.Length -gt 240) { $failStmt = $failStmt.Substring(0, 240) }
  } catch { $failStmt = "" }
  $script:PrePromptError = [ordered]@{
    phase = $failPhase
    script_line = $failLine
    statement = $failStmt
    exception_type = [string]$_.Exception.GetType().FullName
  }
  if ($resultCode -eq "CEREMONY_FAILED" -or $resultCode -eq "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION" -or $resultCode -eq "APPLY_PATH_REACHED") {
    if ($msg -match '^(WRONG_TIP|SYNTHETIC_URL_NOT_ALLOWED|DATABASE_PROJECT_REF_MISMATCH|MALFORMED_DATABASE_URL|CEREMONY_CHILD_TIMEOUT|CEREMONY_CHILD_TERMINATION_FAILED|CEREMONY_EVIDENCE_DECODE_FAIL|BLOCKED_CREDENTIAL|PROHIBITED_CREDENTIAL|PRECONDITION_|BUNDLE_|ATTEMPT_|APPLY_|BLOCKED_HARNESS|PROMPT_|CEREMONY_PROCESS_|CEREMONY_BLOB_|CEREMONY_GIT_)') {
      $resultCode = ($msg -split ":")[0]
    } else {
      $resultCode = "BLOCKED"
    }
  }
  if (-not $script:TerminationReason) {
    if ($resultCode -eq "PROMPT_INPUT_TIMEOUT") { $script:TerminationReason = "prompt_input_timeout" }
    elseif ($resultCode -eq "PROMPT_WINDOW_CLOSED") { $script:TerminationReason = "prompt_window_closed" }
    elseif ($resultCode -eq "CEREMONY_CHILD_TIMEOUT") { $script:TerminationReason = "child_runtime_timeout" }
    elseif ($msg -match "operator cancel") { $script:TerminationReason = "operator_cancel" }
    else { $script:TerminationReason = "pre_marker_failure" }
  }
  if (-not $parsed) {
    $parsed = [ordered]@{
      verdict = "BLOCKED"
      reason = $msg
      productionContact = $false
      pre_prompt_phase = $failPhase
      pre_prompt_error = $script:PrePromptError
    }
  }
}
finally {
  # Guaranteed credential / SecureString cleanup
  try {
    if ($bstr -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) | Out-Null
      $bstr = [IntPtr]::Zero
      $secureZeroFreed = $true
    }
  } catch {}
  try {
    if ($null -ne $secure) { $secure.Dispose(); $secure = $null; $secureZeroFreed = $true }
  } catch {}
  $plain = $null
  Clear-AccountingCredentialChannels
  $credentialCleared = (-not [bool][Environment]::GetEnvironmentVariable($DatabaseUrlEnv, "Process"))

  # SecureString/BSTR: either never allocated, or must be zero-freed/disposed above.
  if ($bstr -eq [IntPtr]::Zero -and $null -eq $secure) {
    $secureZeroFreed = $true
  }

  # Terminate child tree if still alive
  if ($null -ne $child) {
    try {
      if (-not $child.HasExited) {
        $stop = Stop-CeremonyChildTree -Proc $child -Sentinel $ceremonySentinel
        $childTerminated = [bool]$stop.terminated
        $terminationConfirmed = [bool]$stop.confirmed
      } else {
        $childTerminated = $true
        $terminationConfirmed = $true
      }
    } catch {
      $terminationConfirmed = $false
    }
  } else {
    $childTerminated = $true
    $terminationConfirmed = $true
  }
  if ($TestForceTerminateFailure -and $null -ne $child) {
    $terminationConfirmed = $false
    $childTerminated = $false
  }

  # Remove raw stdout capture
  try {
    if (Test-Path -LiteralPath $rawCapture) {
      Remove-Item -LiteralPath $rawCapture -Force -ErrorAction Stop
    }
    $rawStdoutRemoved = -not (Test-Path -LiteralPath $rawCapture)
  } catch {
    $rawStdoutRemoved = $false
  }

  # Remove every materialized bundle-*.cjs in the evidence dir
  try {
    Get-ChildItem -LiteralPath $EvidenceOutDir -Filter "bundle-*.cjs" -ErrorAction SilentlyContinue | ForEach-Object {
      Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
    }
    if ($bundleTemp -and (Test-Path -LiteralPath $bundleTemp)) {
      Remove-Item -LiteralPath $bundleTemp -Force -ErrorAction SilentlyContinue
    }
    $left = @(Get-ChildItem -LiteralPath $EvidenceOutDir -Filter "bundle-*.cjs" -ErrorAction SilentlyContinue)
    $materialRemoved = ($left.Count -eq 0)
  } catch {
    $materialRemoved = $false
  }

  if ($TestForceCleanupFailure) {
    $rawStdoutRemoved = $false
    $materialRemoved = $false
  }

  # Scoped orphan check using ceremony sentinel (never kill unrelated node/pwsh)
  try {
    $orphanPids = @(Get-ScopedOrphanPids -Sentinel $ceremonySentinel -ExcludePid 0)
    $orphanCheckCompleted = $true
  } catch {
    $orphanPids = @()
    $orphanCheckCompleted = $false
  }

  $orphanFree = ($orphanCheckCompleted -and $orphanPids.Count -eq 0)
  $cleanupCompleted = (
    $credentialCleared -and
    $secureZeroFreed -and
    $rawStdoutRemoved -and
    $materialRemoved -and
    $terminationConfirmed -and
    $orphanCheckCompleted -and
    $orphanFree
  )

  # Prefer primary failure codes; only overwrite with cleanup faults when primary was success-like.
  $primaryCodes = @(
    "WRONG_TIP", "SYNTHETIC_URL_NOT_ALLOWED", "DATABASE_PROJECT_REF_MISMATCH", "MALFORMED_DATABASE_URL",
    "CEREMONY_CHILD_TIMEOUT", "CEREMONY_CHILD_TERMINATION_FAILED", "CEREMONY_EVIDENCE_DECODE_FAIL",
    "BLOCKED_CREDENTIAL_UNAVAILABLE", "PROHIBITED_CREDENTIAL_CHANNEL", "PRECONDITION_PINS_UNPUBLISHED",
    "PRECONDITION_EVIDENCE_ENV_OVERRIDE_FORBIDDEN", "BUNDLE_AUTHORITY_MISMATCH", "BUNDLE_AUTHORITY_UNPUBLISHED",
    "BUNDLE_CRLF_FORBIDDEN", "ATTEMPT_MARKER_COLLISION", "BLOCKED_HARNESS_ENV_CONTAMINATION",
    "PROMPT_HOST_NOT_INTERACTIVE", "PROMPT_PROBE_REJECTS_CREDENTIALS",
    "PROMPT_INPUT_TIMEOUT", "PROMPT_WINDOW_CLOSED", "PROMPT_WINDOW_STILL_180S",
    "DRY_RUN_BLOCKED", "HARNESS_CHILD_FAIL", "CEREMONY_CHILD_EXIT_MISMATCH", "BLOCKED"
  )
  if ($resultCode -notin $primaryCodes -and $resultCode -ne "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION" -and $resultCode -ne "APPLY_PATH_REACHED") {
    # keep
  }
  if (-not $terminationConfirmed) {
    if ($resultCode -eq "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION" -or $resultCode -eq "APPLY_PATH_REACHED" -or $resultCode -eq "CEREMONY_FAILED") {
      $resultCode = "CEREMONY_CHILD_TERMINATION_FAILED"
    } elseif ($TestForceTerminateFailure) {
      $resultCode = "CEREMONY_CHILD_TERMINATION_FAILED"
    }
  } elseif (-not $orphanFree -or -not $orphanCheckCompleted) {
    if ($resultCode -eq "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION" -or $resultCode -eq "APPLY_PATH_REACHED" -or $resultCode -eq "CEREMONY_FAILED") {
      $resultCode = "CEREMONY_ORPHAN_PROCESSES_REMAIN"
    }
  } elseif (-not $rawStdoutRemoved -or -not $materialRemoved -or -not $cleanupCompleted) {
    if (
      $resultCode -eq "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION" -or
      $resultCode -eq "APPLY_PATH_REACHED" -or
      $resultCode -eq "CEREMONY_FAILED" -or
      $TestForceCleanupFailure
    ) {
      $resultCode = "CEREMONY_CLEANUP_FAILED"
    }
  }

  $cleanup = [ordered]@{
    completed = [bool]$cleanupCompleted
    credential_cleared = [bool]$credentialCleared
    secure_string_zero_freed = [bool]$secureZeroFreed
    raw_stdout_removed = [bool]$rawStdoutRemoved
    material_removed = [bool]$materialRemoved
    child_terminated = [bool]$childTerminated -and [bool]$terminationConfirmed
    orphan_check_completed = [bool]$orphanCheckCompleted
  }
  $childSupervision = [ordered]@{
    child_pid = $childPid
    timed_out = [bool]$timedOut
    timeout_ms = [int]$ChildTimeoutMs
    termination_confirmed = [bool]$terminationConfirmed
    orphan_count = [int]$orphanPids.Count
    orphan_free = [bool]$orphanFree
    ceremony_sentinel = $ceremonySentinel
  }

  $dbAttempts = 0
  $sqlAttempts = 0
  if ($null -ne $parsed) {
    try {
      if ($null -ne $parsed.databaseConnectionAttempts) { $dbAttempts = [int]$parsed.databaseConnectionAttempts }
    } catch { $dbAttempts = 0 }
    try {
      if ($null -ne $parsed.sqlApplicationAttempts) { $sqlAttempts = [int]$parsed.sqlApplicationAttempts }
    } catch { $sqlAttempts = 0 }
  }
  $parentWaitFloor = [int]$PromptInputTimeoutMs + [int]$ChildTimeoutMs + 60000

  $wrapper = [ordered]@{
    protocol = "RA_PRO_ACCOUNTING_AUTOMATION_PRODUCTION_DRY_RUN_CEREMONY_V1"
    verdict = $(if ($resultCode -eq "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION" -or $resultCode -eq "APPLY_PATH_REACHED" -or $resultCode -eq "VISIBLE_PROMPT_READY" -or $resultCode -eq "TIMEOUT_BUDGET_READY") { $resultCode } else { "BLOCKED" })
    pr_tip = $PrHead
    mode = $Mode
    attempt_marker = $(if ($attemptMarker) { [IO.Path]::GetFileName($attemptMarker) } else { $null })
    marker_before_child = [bool]$script:MarkerBeforeChild
    securestring_acquired = [bool]$script:SecureStringAcquired
    prompt_opened_utc = $script:PromptOpenedUtc
    prompt_ready_utc = $script:PromptReadyUtc
    prompt_deadline_utc = $script:PromptDeadlineUtc
    prompt_input_timeout_ms = [int]$PromptInputTimeoutMs
    child_runtime_timeout_ms = [int]$ChildTimeoutMs
    parent_wait_floor_ms = [int]$parentWaitFloor
    termination_reason = $script:TerminationReason
    prompt_host_noninteractive = $script:PromptHostNonInteractive
    prompt_host_visible = $script:PromptHostVisible
    precondition_sha256 = $(if ($pre) { [string]$pre.evidence_sha256 } else { $null })
    precondition_source_commit = $(if ($pre) { [string]$pre.evidence_source_commit } else { $null })
    bundle_oid = $(if ($bundleSeal) { [string]$bundleSeal.oid } else { $null })
    bundle_sha256 = $(if ($bundleSeal) { [string]$bundleSeal.sha256 } else { $null })
    bundle_bytes = $(if ($bundleSeal) { [int]$bundleSeal.bytes } else { $null })
    prior_dry_run_pins = "UNPUBLISHED"
    pre_apply_pins = "UNPUBLISHED"
    feature_flag_untouched = $true
    productionContact = $false
    node_started = [bool]$script:NodeStarted
    database_connection_attempts = [int]$dbAttempts
    sql_application_attempts = [int]$sqlAttempts
    pre_prompt_phase = $(if ($script:PrePromptPhase) { [string]$script:PrePromptPhase } else { $null })
    pre_prompt_error = $(if ($script:PrePromptError) { $script:PrePromptError } else { $null })
    uri_diagnostics = $(if ($hostClass) {
      [ordered]@{
        ok = [bool]$hostClass.ok
        host_class = [string]$hostClass.host_class
        username_class = [string]$hostClass.username_class
        is_local = [bool]$hostClass.is_local
        matches_expected_project_ref = [bool]$hostClass.matches
        database_name_match = [bool]$hostClass.database_name_match
        ssl_requirement_match = [bool]$hostClass.ssl_requirement_match
        port_class_match = [bool]$hostClass.port_class_match
        expected_project_ref = $ExpectedProjectRef
      }
    } else { $null })
    cleanup = $cleanup
    child_supervision = $childSupervision
    child_exit_code = $(if ($null -ne $child) { try { $child.ExitCode } catch { $null } } else { $null })
    child_evidence = $parsed
    result_code = $resultCode
  }
  $json = ($wrapper | ConvertTo-Json -Depth 12 -Compress)
  $sanitized = Sanitize-Text $json
  try { [IO.File]::WriteAllText($evidencePath, ($sanitized + "`n")) } catch {}
  $readySide = Join-Path $EvidenceOutDir "PROMPT_READY.json"
  if (Test-Path -LiteralPath $readySide) {
    try { Remove-Item -LiteralPath $readySide -Force -ErrorAction SilentlyContinue } catch {}
  }
  Write-Output $sanitized
}

if (
  (
    $resultCode -eq "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION" -or
    $resultCode -eq "APPLY_PATH_REACHED" -or
    $resultCode -eq "VISIBLE_PROMPT_READY" -or
    $resultCode -eq "TIMEOUT_BUDGET_READY"
  ) -and
  $cleanupCompleted
) {
  exit 0
}
exit 1
