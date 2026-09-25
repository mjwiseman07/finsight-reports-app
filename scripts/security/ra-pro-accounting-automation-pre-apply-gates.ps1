#Requires -Version 5.1
<#
.SYNOPSIS
  Sealed RA Pro accounting-automation pre-apply live-evidence gate.
  Materialized from ceremony_source_commit. No path or environment override.
  Refuses before credential prompt, applicator Node, and database contact.
#>

Set-StrictMode -Version Latest

function Get-PreApplySha256Hex([byte[]]$Bytes) {
  $sha = [Security.Cryptography.SHA256]::Create()
  try {
    return ([BitConverter]::ToString($sha.ComputeHash($Bytes)) -replace "-", "").ToLowerInvariant()
  } finally { $sha.Dispose() }
}

function Get-PreApplyGitBytes([string[]]$GitArgs, [string]$WorkDir) {
  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = "git"
  $psi.Arguments = ($GitArgs | ForEach-Object {
      if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
    }) -join " "
  $psi.WorkingDirectory = $WorkDir
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  $psi.EnvironmentVariables["GIT_CONFIG_COUNT"] = "1"
  $psi.EnvironmentVariables["GIT_CONFIG_KEY_0"] = "safe.directory"
  $psi.EnvironmentVariables["GIT_CONFIG_VALUE_0"] = ($WorkDir -replace "\\", "/")
  $p = [Diagnostics.Process]::Start($psi)
  $ms = New-Object IO.MemoryStream
  $p.StandardOutput.BaseStream.CopyTo($ms)
  $err = $p.StandardError.ReadToEnd()
  if (-not $p.WaitForExit(120000)) { try { $p.Kill() } catch {}; throw "PRE_APPLY_LIVE_GIT_TIMEOUT" }
  if ($p.ExitCode -ne 0) { throw "GIT_BLOB_LOAD_FAILED" }
  return , $ms.ToArray()
}

function ConvertTo-PreApplyUtc([string]$Text) {
  if ($Text -notmatch '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$') { throw "PRE_APPLY_LIVE_TIMESTAMP" }
  return [DateTime]::ParseExact(
    $Text,
    "yyyy-MM-dd'T'HH:mm:ss'Z'",
    [Globalization.CultureInfo]::InvariantCulture,
    [Globalization.DateTimeStyles]::AdjustToUniversal -bor [Globalization.DateTimeStyles]::AssumeUniversal
  ).ToUniversalTime()
}

function Assert-PreApplyKeys($Obj, [string[]]$Keys, [string]$Code) {
  if ($null -eq $Obj) { throw $Code }
  $names = @($Obj.PSObject.Properties.Name)
  if ($names.Count -ne $Keys.Count) { throw $Code }
  foreach ($key in $Keys) {
    $found = $false
    foreach ($name in $names) {
      if ([string]$name -ceq $key) { $found = $true; break }
    }
    if (-not $found) { throw $Code }
  }
}

function Assert-PreApplySanitized([string]$Text) {
  $live = "sk_" + "live_"
  if ($Text -match 'postgres(ql)?://' -or $Text.Contains($live) -or $Text.Contains("BEGIN CERTIFICATE") -or $Text.Contains("BEGIN RSA") -or $Text -match 'supabase\.co' -or $Text -match 'https?://' -or $Text.Contains("@") -or $Text -match '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}') {
    throw "PRE_APPLY_LIVE_SANITIZATION"
  }
}

function Test-AccountingPreApplyLiveObject($Evidence, [string]$NowUtc) {
  $substitutes = @(
    "RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_V1",
    "RA_PRO_ACCOUNTING_AUTOMATION_PRODUCTION_DRY_RUN_CEREMONY_V1",
    "RA_PRO_ACCOUNTING_AUTOMATION_PRIOR_DRY_RUN_EVIDENCE_V1",
    "RA_PRO_CUTOVER_PRE_APPLY_LIVE_EVIDENCE_V1"
  )
  if ($substitutes -contains [string]$Evidence.protocol) { throw "PRE_APPLY_LIVE_SUBSTITUTION_FORBIDDEN" }
  if ([string]$Evidence.protocol -cne "RA_PRO_ACCOUNTING_AUTOMATION_PRE_APPLY_LIVE_EVIDENCE_V1") {
    throw "PRE_APPLY_LIVE_PROTOCOL_MISMATCH"
  }
  if ([int]$Evidence.schema_version -ne 1) { throw "PRE_APPLY_LIVE_SCHEMA" }
  $from = ConvertTo-PreApplyUtc ([string]$Evidence.valid_from_utc)
  $until = ConvertTo-PreApplyUtc ([string]$Evidence.valid_until_utc)
  $started = ConvertTo-PreApplyUtc ([string]$Evidence.collection_started_at_utc)
  $ended = ConvertTo-PreApplyUtc ([string]$Evidence.collection_ended_at_utc)
  if (($until - $from).Ticks -ne [TimeSpan]::FromHours(24).Ticks) { throw "PRE_APPLY_LIVE_WINDOW" }
  if ($started -ne $from -or $ended -lt $started -or $ended -ge $until) { throw "PRE_APPLY_LIVE_WINDOW" }
  $now = ConvertTo-PreApplyUtc $NowUtc
  if ($now -lt $from) { throw "PRE_APPLY_LIVE_NOT_YET_VALID" }
  if ($now -ge $until) { throw "PRE_APPLY_LIVE_EXPIRED" }
  if ([string]$Evidence.authorization.pr_head -cne "62d58f905729f054a36b771b90721a84ab54c4d6") {
    throw "PRE_APPLY_LIVE_HEAD_MISMATCH"
  }
  if ([string]$Evidence.prior_dry_run_pin.evidence_sha256 -cne "f89c3e701703d199f56577a65ae6f28b5ba120be45ee482f2ab75c284d763d18") {
    throw "PRE_APPLY_LIVE_PRIOR_PIN_CONTRADICTION"
  }
  if ([string]$Evidence.serving_deployment.production_commit -cne "854fd2920cd1c77a411918a617d10a8fb3ce591d") {
    throw "PRE_APPLY_LIVE_DEPLOYMENT_MISMATCH"
  }
  if ([string]$Evidence.serving_deployment.pr_head_is_serving_production -ne "False") {
    throw "PRE_APPLY_LIVE_CONTRADICTION"
  }
  $presence = [string]$Evidence.automation_gate.production_presence
  $state = [string]$Evidence.automation_gate.effective_state
  if ($presence -cne "absent" -or $state -cne "closed" -or [bool]$Evidence.automation_gate.value_read) {
    throw "PRE_APPLY_LIVE_AUTOMATION_GATE_OPEN"
  }
  if ([int]$Evidence.database_readonly.history_count -ne 188) { throw "PRE_APPLY_LIVE_HISTORY_DRIFT" }
  if ([int]$Evidence.database_readonly.weekly_version_count -ne 0 -or [int]$Evidence.database_readonly.month_end_version_count -ne 0 -or [int]$Evidence.database_readonly.target_relation_count -ne 0 -or [int]$Evidence.database_readonly.target_policy_count -ne 0) {
    throw "PRE_APPLY_LIVE_OBJECT_DRIFT"
  }
  if ([bool]$Evidence.database_readonly.partial_accounting_automation_state) { throw "PRE_APPLY_LIVE_PARTIAL_STATE" }
  $inv = $Evidence.database_readonly.authorizing_inventory
  if (([int]$inv.company_owned + [int]$inv.firm_owned + [int]$inv.dual_owner) -ne [int]$inv.total) {
    throw "PRE_APPLY_LIVE_CONTRADICTION"
  }
  if ([int]$inv.total -ne 4 -or [int]$inv.company_owned -ne 3 -or [int]$inv.firm_owned -ne 1 -or [int]$inv.dual_owner -ne 0) {
    throw "PRE_APPLY_LIVE_INVENTORY_DRIFT"
  }
  if ([int]$Evidence.database_readonly.linked_firms_count -ne 0) { throw "PRE_APPLY_LIVE_LINKED_FIRMS" }
  $statuses = @($Evidence.database_readonly.webhook_non_terminal_statuses)
  if (($statuses -join ",") -cne "received,processing,retryable" -or [int]$Evidence.database_readonly.webhook_non_terminal_count -ne 0) {
    throw "PRE_APPLY_LIVE_WEBHOOK_NOT_QUIESCENT"
  }
  foreach ($key in @("production_writes", "sql_application_attempts", "dry_run_attempts", "migration_apply_attempts", "provider_writes")) {
    if ([int]$Evidence.safety.$key -ne 0) { throw "PRE_APPLY_LIVE_WRITE_COUNTER" }
  }
  Assert-PreApplySanitized (($Evidence | ConvertTo-Json -Compress -Depth 8))
}

function Assert-AccountingPreApplyLiveEvidence {
  param(
    $Auth,
    [string]$RepoRoot,
    [string]$EvidencePath = "",
    [string]$NowUtc = ""
  )
  if (-not [string]::IsNullOrWhiteSpace($EvidencePath)) {
    throw "PRE_APPLY_LIVE_EVIDENCE_PATH_OVERRIDE_FORBIDDEN"
  }
  foreach ($key in @(
      "RA_PRO_ACCOUNTING_AUTOMATION_PRE_APPLY_LIVE_EVIDENCE_PATH",
      "RA_PRO_ACCOUNTING_AUTOMATION_PRE_APPLY_LIVE_EVIDENCE_SHA256"
    )) {
    if (-not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($key, "Process"))) {
      throw "PRE_APPLY_LIVE_EVIDENCE_ENV_OVERRIDE_FORBIDDEN"
    }
  }
  $seal = $Auth.pre_apply_live_contract
  if ($null -eq $seal -or [string]$seal.path -cne "docs/security/ra-pro-accounting-automation-apply/PRE_APPLY_LIVE_EVIDENCE_CONTRACT.json") {
    throw "PRE_APPLY_LIVE_CONTRACT_UNSEALED"
  }
  if ([string]$Auth.ceremony_source_commit -ne [string]$seal.source_commit) {
    throw "PRE_APPLY_LIVE_CONTRACT_MISMATCH"
  }
  $oid = (Get-PreApplyGitBytes -GitArgs @("rev-parse", ([string]$seal.source_commit + ":" + [string]$seal.path)) -WorkDir $RepoRoot)
  $oidText = [Text.Encoding]::UTF8.GetString($oid).Trim()
  if ($oidText -cne [string]$seal.oid) { throw "PRE_APPLY_LIVE_CONTRACT_MISMATCH" }
  $bytes = Get-PreApplyGitBytes -GitArgs @("cat-file", "blob", ([string]$seal.source_commit + ":" + [string]$seal.path)) -WorkDir $RepoRoot
  if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xef -and $bytes[1] -eq 0xbb -and $bytes[2] -eq 0xbf) { throw "PRE_APPLY_LIVE_NEWLINE" }
  if ([Array]::IndexOf($bytes, [byte]0x0d) -ge 0) { throw "PRE_APPLY_LIVE_NEWLINE" }
  if ($bytes.Length -ne [int]$seal.bytes) { throw "PRE_APPLY_LIVE_CONTRACT_MISMATCH" }
  if ((Get-PreApplySha256Hex -Bytes $bytes) -cne ([string]$seal.sha256).ToLowerInvariant()) { throw "PRE_APPLY_LIVE_CONTRACT_MISMATCH" }
  $contract = [Text.Encoding]::UTF8.GetString($bytes) | ConvertFrom-Json
  if ([string]$contract.protocol -cne "RA_PRO_ACCOUNTING_AUTOMATION_PRE_APPLY_LIVE_EVIDENCE_V1") { throw "PRE_APPLY_LIVE_CONTRACT_MISMATCH" }
  if ([string]$contract.publication_status -cne "UNPUBLISHED") { throw "PRE_APPLY_LIVE_CONTRACT_MISMATCH" }

  $pub = $Auth.publication
  $pre = $Auth.pre_apply_live_publication
  $unpublished = (
    $null -eq $pub -or
    [string]$pub.status -eq "UNPUBLISHED" -or
    $null -eq $pub.required_pre_apply_live_evidence_sha256 -or
    $null -eq $pre -or
    [string]$pre.status -ne "PUBLISHED" -or
    $null -eq $pre.evidence_sha256
  )
  if ($unpublished) { throw "AUTHORIZATION_PINS_UNPUBLISHED" }

  if (
    [string]$pub.required_pre_apply_live_evidence_sha256 -cne [string]$pre.evidence_sha256 -or
    [string]$pub.required_prior_dry_run_evidence_sha256 -cne "f89c3e701703d199f56577a65ae6f28b5ba120be45ee482f2ab75c284d763d18"
  ) { throw "PRE_APPLY_LIVE_PIN_CONTRADICTION" }

  $evidenceBytes = Get-PreApplyGitBytes -GitArgs @("cat-file", "blob", ([string]$pre.evidence_source_commit + ":" + [string]$pre.evidence_path)) -WorkDir $RepoRoot
  if ([Array]::IndexOf($evidenceBytes, [byte]0x0d) -ge 0) { throw "PRE_APPLY_LIVE_NEWLINE" }
  if ((Get-PreApplySha256Hex -Bytes $evidenceBytes) -cne [string]$pre.evidence_sha256) { throw "BLOCKED_PIN_MISMATCH" }
  if ($evidenceBytes.Length -ne [int]$pre.evidence_bytes) { throw "BLOCKED_PIN_MISMATCH" }
  $evidence = [Text.Encoding]::UTF8.GetString($evidenceBytes) | ConvertFrom-Json
  if ([string]::IsNullOrWhiteSpace($NowUtc)) { $NowUtc = [DateTime]::UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'") }
  Test-AccountingPreApplyLiveObject -Evidence $evidence -NowUtc $NowUtc
}
