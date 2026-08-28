/* eslint-disable no-console */
/**
 * JE-3D Phase A — Authentic provider-backed BS account source authority.
 *
 * READ-ONLY QBO (AccountList + GL Detail + Trial Balance).
 * Persists a real bs_account_recon Tie-Out run (DB only — not a JE).
 * Does NOT create JE proposal/approval/execution.
 * Does NOT POST JournalEntry.
 * Does NOT write Memory.
 * Kill switch stays ON.
 *
 * Usage:
 *   QB_ENVIRONMENT=sandbox npx tsx scripts/je3d/phase-a-bs-account-source-authority.ts
 */
import { readFileSync } from "node:fs";
import { getSupabaseAdmin } from "../../lib/supabase-admin.js";
import { resolveQBOTokenForFirmClient } from "../../lib/erp/quickbooks/token-resolver";
import {
  fetchQboAccountList,
  fetchQboGeneralLedgerDetail,
  fetchQboTrialBalance,
} from "../../lib/audit-ready/tie-out/qbo-reports";
import {
  normalizeTbNetToNaturalSign,
  type BsClassification,
} from "../../lib/audit-ready/tie-out/sign-normalize";
import {
  activityWindowForFiscalYear,
  resolveFiscalYearStartMonth,
  runBsAccountResolver,
} from "../../lib/audit-ready/tie-out/bs-account-resolver";
import {
  JE_3D_VERIFIED_DEMO_A_IDENTITY,
  resolveJe3dActivationPolicy,
  isVerifiedDemoAIdentityMatch,
} from "../../lib/journal-entry-governance/je3d-first-controlled-create-activation";
import {
  isJe3dCreateCapabilityEnabled,
  isJe3dVerifyCapabilityEnabled,
} from "../../lib/journal-entry-governance/je3d-activation-policy";
import {
  FIRST_RUN_ACCOUNTS_REVIEWED_AND_APPROVED,
  FIRST_RUN_STAGED_ACCRUED_LIABILITY_ACCOUNT_ID,
} from "../../lib/journal-entry-governance/je3d-first-run-account-authority";
import { FIRST_RUN_EXECUTION_REVIEWED_AND_APPROVED } from "../../lib/journal-entry-governance/je3d-first-run-execution-authority";
import { resolveSandboxActivationAllowlist } from "../../lib/journal-entry-governance/je3d-sandbox-company-authority";
import {
  buildBsAccountGlDeltaExpectedEffect,
  describeBsAccountLiabilityCreditEffect,
  JE_BS_ACCOUNT_SOURCE_KIND_GOVERNANCE_REQUIREMENTS,
  PROPOSED_JE_SOURCE_RECON_KIND_BS_ACCOUNT,
  resolveProviderBackedGlBaselineFromBsResolverResult,
  validateBsAccountSourceRunForGlDelta,
} from "../../lib/journal-entry-governance/je3d-bs-account-source-authority-contract";
import { JE_SOURCE_RECON_KINDS } from "../../lib/journal-entry-governance/types";
import { assertJe3dSandboxQboEnvironment } from "../../lib/journal-entry-governance/je3d-sandbox-environment";

function loadEnv(path: string) {
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

loadEnv(".env");
loadEnv(".env.local");
loadEnv(".tmp-vercel-prod.env");

process.env.QB_ENVIRONMENT = "sandbox";

const CANDIDATE_ACCRUED_LIABILITY_ID =
  FIRST_RUN_STAGED_ACCRUED_LIABILITY_ACCOUNT_ID ?? "1150040002";
const PROPOSER_ID = "a4ebf834-a698-4f79-a945-8498f2e6c45d";
const PBC_REQUEST_NUMBER = "SYS-BS-ACCRUED-LIABILITY-JE3D-PHASE-A";
const CREDIT_CENTS = 100;

function toClassification(raw: string | null | undefined): BsClassification | null {
  const c = String(raw || "").toLowerCase();
  if (c === "asset") return "Asset";
  if (c === "liability") return "Liability";
  if (c === "equity") return "Equity";
  return null;
}

function isApControl(account: {
  accountType?: string | null;
  accountSubType?: string | null;
  name?: string | null;
}): boolean {
  const type = String(account.accountType || "").toLowerCase();
  const subtype = String(account.accountSubType || "").toLowerCase();
  const name = String(account.name || "").toLowerCase();
  return (
    type === "accounts payable" ||
    subtype.includes("accountspayable") ||
    name.includes("accounts payable")
  );
}

async function main() {
  const policy = resolveJe3dActivationPolicy();
  const report: Record<string, unknown> = {
    phase: "A_AUTHENTIC_BS_SOURCE_AUTHORITY",
    qbo_writes: false,
    je_proposal_created: false,
    je_approval_created: false,
    je_execution_created: false,
    memory: false,
    kill_switch: policy.sandboxDispatchKillSwitch,
    CREATE_SANDBOX_JE: isJe3dCreateCapabilityEnabled(policy),
    VERIFY_SANDBOX_JE: isJe3dVerifyCapabilityEnabled(policy),
    FIRST_RUN_EXECUTION_REVIEWED_AND_APPROVED:
      FIRST_RUN_EXECUTION_REVIEWED_AND_APPROVED,
    FIRST_RUN_ACCOUNTS_REVIEWED_AND_APPROVED:
      FIRST_RUN_ACCOUNTS_REVIEWED_AND_APPROVED,
    je_source_kinds_today: [...JE_SOURCE_RECON_KINDS],
    proposed_source_kind: PROPOSED_JE_SOURCE_RECON_KIND_BS_ACCOUNT,
    je_source_kinds_expanded: false,
    stop_reasons: [] as Array<{ code: string; message: string }>,
  };

  try {
    assertJe3dSandboxQboEnvironment(process.env.QB_ENVIRONMENT);
  } catch (err) {
    (report.stop_reasons as Array<{ code: string; message: string }>).push({
      code: "qb_environment_not_sandbox",
      message: err instanceof Error ? err.message : String(err),
    });
    report.recommendation = "NO COHERENT SOURCE AUTHORITY — STOP";
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }

  const supabase = getSupabaseAdmin();
  const allowlist = await resolveSandboxActivationAllowlist();
  const demoA = allowlist.demoA;
  report.allowlist_resolution = allowlist.allowlistResolution;
  report.company_id = demoA?.companyId ?? null;
  report.accounting_connection_id = demoA?.accountingConnectionId ?? null;
  report.realm_id = demoA?.realmId ?? null;

  if (
    !demoA ||
    !isVerifiedDemoAIdentityMatch({
      companyId: demoA.companyId,
      accountingConnectionId: demoA.accountingConnectionId,
      realmId: demoA.realmId,
      providerEnvironment: demoA.providerEnvironment,
      demoRole: demoA.demoRole,
    })
  ) {
    (report.stop_reasons as Array<{ code: string; message: string }>).push({
      code: "demo_a_authority_failed",
      message: "JE-3D Demo A canonical identity did not resolve.",
    });
    report.recommendation = "NO COHERENT SOURCE AUTHORITY — STOP";
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }

  const firmClientId = JE_3D_VERIFIED_DEMO_A_IDENTITY.firmClientId;
  const token = await resolveQBOTokenForFirmClient(firmClientId);
  if (!token?.accessToken || !token.realmId) {
    (report.stop_reasons as Array<{ code: string; message: string }>).push({
      code: "qbo_token_unavailable",
      message: "Could not resolve sandbox QBO token for Demo A firm_client.",
    });
    report.recommendation = "NO COHERENT SOURCE AUTHORITY — STOP";
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }
  if (token.realmId !== JE_3D_VERIFIED_DEMO_A_IDENTITY.realmId) {
    (report.stop_reasons as Array<{ code: string; message: string }>).push({
      code: "realm_mismatch",
      message: `Token realm ${token.realmId} != verified ${JE_3D_VERIFIED_DEMO_A_IDENTITY.realmId}`,
    });
    report.recommendation = "NO COHERENT SOURCE AUTHORITY — STOP";
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }

  // --- Live COA verification (READ-ONLY) ---
  const accounts = await fetchQboAccountList({
    realmId: token.realmId,
    accessToken: token.accessToken,
  });
  let target = accounts.find((a) => a.id === CANDIDATE_ACCRUED_LIABILITY_ID);
  if (!target) {
    target = accounts.find(
      (a) =>
        String(a.name || "")
          .toLowerCase()
          .includes("accrued expenses") &&
        toClassification(a.classification) === "Liability",
    );
  }
  if (!target) {
    (report.stop_reasons as Array<{ code: string; message: string }>).push({
      code: "accrued_liability_not_found_in_live_coa",
      message: `Live sandbox COA has no account ${CANDIDATE_ACCRUED_LIABILITY_ID} / Accrued Expenses.`,
    });
    report.recommendation = "NO COHERENT SOURCE AUTHORITY — STOP";
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }

  const classification = toClassification(target.classification);
  const apControl = isApControl(target);
  report.target_account = {
    qbo_account_id: target.id,
    name: target.name,
    account_type: target.accountType,
    account_subtype: target.accountSubType,
    classification,
    active: target.active !== false,
    ap_control: apControl,
    candidate_id_confirmed:
      target.id === CANDIDATE_ACCRUED_LIABILITY_ID,
  };

  if (classification !== "Liability" || apControl || target.active === false) {
    (report.stop_reasons as Array<{ code: string; message: string }>).push({
      code: "target_account_not_eligible",
      message:
        "Target must be active Liability, not AP control, for accrued-liability JE credit.",
    });
    report.recommendation = "NO COHERENT SOURCE AUTHORITY — STOP";
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }

  // --- Period ---
  const { data: closePeriod } = await supabase
    .from("close_periods")
    .select("period_end, status")
    .eq("firm_client_id", firmClientId)
    .neq("status", "locked")
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();
  const asOfDate =
    (closePeriod?.period_end
      ? String(closePeriod.period_end).slice(0, 10)
      : null) || "2026-08-31";
  report.period_end = asOfDate;

  const fyMonth = await resolveFiscalYearStartMonth({
    engagementId: (
      await supabase
        .from("audit_ready_engagements")
        .select("id")
        .eq("company_id", JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    ).data?.id as string,
    realmId: token.realmId,
    accessToken: token.accessToken,
  });
  const window = activityWindowForFiscalYear(asOfDate, fyMonth);

  // --- Read-only measurement (no JE, no mutation of QBO) ---
  const [gl, tb] = await Promise.all([
    fetchQboGeneralLedgerDetail({
      realmId: token.realmId,
      accessToken: token.accessToken,
      accountId: target.id,
      startDate: window.start,
      endDate: asOfDate,
    }),
    fetchQboTrialBalance({
      realmId: token.realmId,
      accessToken: token.accessToken,
      asOfDate,
    }),
  ]);
  const tbLine = tb.lines.find((l) => l.account_ref === target!.id);
  const tbNatural = tbLine
    ? normalizeTbNetToNaturalSign(tbLine.net_cents, classification!)
    : gl.endingBalanceCents;
  const tieVariance = gl.endingBalanceCents - tbNatural;

  report.read_only_measurement = {
    source: "PROVIDER-BACKED",
    acquisition: "live_provider",
    not_synthetic_governance_staging_sync: true,
    gl_beginning_balance_cents: gl.beginningBalanceCents,
    gl_ending_balance_cents: gl.endingBalanceCents,
    tb_net_cents_signed: tbLine?.net_cents ?? null,
    tb_natural_sign_cents: tbNatural,
    tie_variance_cents: tieVariance,
    activity_window: window,
    gl_report_url: gl.reportUrl ?? null,
    gl_intuit_tid: gl.intuitTid ?? null,
    tb_currency: tb.currency ?? null,
    tb_raw_report_url: tb.raw_report_url ?? null,
    tb_intuit_tid: tb.intuit_tid ?? null,
    sign_convention: "qbo_natural_sign",
    liability_credit_balances_positive: true,
  };
  report.baseline_gl_balance_cents = gl.endingBalanceCents;
  report.baseline_gl_authority =
    "GeneralLedger detail ending (provider-backed GL). Not TB/prepared comparison.";

  // --- Persist authentic bs_account_recon (Tie-Out DB only) ---
  const { data: engagement } = await supabase
    .from("audit_ready_engagements")
    .select("id")
    .eq("company_id", JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!engagement?.id) {
    (report.stop_reasons as Array<{ code: string; message: string }>).push({
      code: "missing_engagement",
      message: "No Demo A engagement for BS recon custody.",
    });
    report.recommendation = "NO COHERENT SOURCE AUTHORITY — STOP";
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }

  let { data: pbc } = await supabase
    .from("audit_ready_pbc_requests")
    .select("id")
    .eq("engagement_id", engagement.id)
    .eq("request_number", PBC_REQUEST_NUMBER)
    .maybeSingle();
  if (!pbc) {
    const { data: createdPbc, error: pbcErr } = await supabase
      .from("audit_ready_pbc_requests")
      .insert({
        engagement_id: engagement.id,
        request_number: PBC_REQUEST_NUMBER,
        request_description:
          "JE-3D Phase A — provider-backed BS recon for accrued-liability source authority.",
        tie_out_kind: "bs_account_recon",
        status: "accepted",
        source_account_hint: target.id,
        assertion_tags: [],
      })
      .select("id")
      .single();
    if (pbcErr || !createdPbc) {
      (report.stop_reasons as Array<{ code: string; message: string }>).push({
        code: "pbc_create_failed",
        message: pbcErr?.message || "unknown",
      });
      report.recommendation = "NO COHERENT SOURCE AUTHORITY — STOP";
      console.log(JSON.stringify(report, null, 2));
      process.exit(2);
    }
    pbc = createdPbc;
  }

  const { data: tiePolicy } = await supabase
    .from("audit_ready_tie_out_policies")
    .select(
      "policy_mode, auto_reconcile_max_dollar, auto_reconcile_max_percent, kickout_min_dollar, kickout_min_percent, authoritative_comparison",
    )
    .eq("engagement_id", engagement.id)
    .maybeSingle();

  const policySnapshot = tiePolicy ?? {
    policy_mode: "standard",
    auto_reconcile_max_dollar: 0,
    auto_reconcile_max_percent: 0,
    kickout_min_dollar: 0,
    kickout_min_percent: 0,
    authoritative_comparison: true,
  };

  const bsResult = await runBsAccountResolver({
    engagementId: engagement.id,
    pbcRequestId: pbc.id,
    realmId: token.realmId,
    accessToken: token.accessToken,
    bsAccountId: target.id,
    bsAccountName: target.name,
    accountType: target.accountType,
    accountSubType: target.accountSubType ?? undefined,
    classification: classification!,
    asOfDate,
    policy: policySnapshot as never,
    triggeredByUserId: PROPOSER_ID,
    triggerReason: "manual",
    triggerKind: "initial",
  });

  if (bsResult.status !== "completed") {
    (report.stop_reasons as Array<{ code: string; message: string }>).push({
      code: "bs_account_recon_failed",
      message: `${bsResult.errorCode}: ${bsResult.errorMessage}`,
    });
    report.recommendation = "NO COHERENT SOURCE AUTHORITY — STOP";
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }

  report.bs_account_recon_run_id = bsResult.runId;
  report.bs_artifact_id = bsResult.artifactId;
  report.bs_totals_status = bsResult.totalsStatus;
  report.bs_ending_balance_cents = bsResult.endingBalanceCents;
  report.bs_gl_ending_balance_cents = bsResult.glEndingBalanceCents;
  report.bs_tie_variance_cents = bsResult.tieVarianceCents;
  report.source_is_provider_backed = true;
  report.source_acquisition = "live_provider";
  report.source_accounting_sync_id = null;
  report.source_sync_note =
    "bs_account_recon uses live_provider GL+TB; baseline_sync_id intentionally unset (not synthetic staging sync).";

  // NAMING TRAP: resolver endingBalanceCents = GL detail; glEndingBalanceCents = TB.
  const glBaseline = resolveProviderBackedGlBaselineFromBsResolverResult(bsResult);
  report.baseline_source_field = glBaseline.baselineSourceField;
  report.comparison_source_field = glBaseline.comparisonSourceField;
  report.baseline_gl_balance_cents = glBaseline.baselineGlBalanceCents;
  report.prepared_or_tb_ending_balance_cents =
    glBaseline.preparedOrTbEndingBalanceCents;

  const sourceBinding = validateBsAccountSourceRunForGlDelta({
    tieOutKind: "bs_account_recon",
    status: "completed",
    qboAccountId: target.id,
    expectedQboAccountId: target.id,
    acquisition: "live_provider",
    baselineSyncId: null,
    providerBackedGlEndingBalanceCents: glBaseline.baselineGlBalanceCents,
    preparedOrTbEndingBalanceCents: glBaseline.preparedOrTbEndingBalanceCents,
    totalsStatus: bsResult.totalsStatus,
    tieVarianceCents: bsResult.tieVarianceCents,
    classification: classification!,
    apControl: false,
    signConvention: "qbo_natural_sign",
    requireFirstRunCleanTie: true,
  });
  report.first_run_source_binding = sourceBinding;

  const effect = buildBsAccountGlDeltaExpectedEffect({
    sourceRunId: bsResult.runId,
    qboAccountId: target.id,
    classification: classification!,
    baselineGlBalanceCents: glBaseline.baselineGlBalanceCents,
    creditCents: CREDIT_CENTS,
  });
  report.proposed_expected_effect = effect.ok ? effect.effect : null;
  report.proposed_expected_effect_error = effect.ok
    ? null
    : { code: effect.code, message: effect.message };
  report.why_je_changes_measurement = describeBsAccountLiabilityCreditEffect();
  report.proposed_je_source_kind_governance_change = {
    add_to_JE_SOURCE_RECON_KINDS: PROPOSED_JE_SOURCE_RECON_KIND_BS_ACCOUNT,
    applied_in_this_phase: false,
    requirements: [...JE_BS_ACCOUNT_SOURCE_KIND_GOVERNANCE_REQUIREMENTS],
  };

  report.recommendation =
    effect.ok &&
    sourceBinding.ok &&
    (report.stop_reasons as unknown[]).length === 0
      ? "SOURCE AUTHORITY COHERENT — READY FOR DIRECT REVIEW"
      : "NO COHERENT SOURCE AUTHORITY — STOP";

  console.log(JSON.stringify(report, null, 2));
  process.exit(
    report.recommendation === "SOURCE AUTHORITY COHERENT — READY FOR DIRECT REVIEW"
      ? 0
      : 2,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
