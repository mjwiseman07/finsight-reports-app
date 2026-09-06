/* eslint-disable no-console */
/**
 * JE-3D — BS-coherent CREATE-only pre-POST staging.
 *
 * Governed chain only (no SQL bypass of proposal/approval/execution):
 *   proposal → JE-2 approval → JE-3A prepare → optional RESERVE (NOT_SENT)
 *
 * HARD STOP before provider_dispatch_started / QBO POST.
 *
 * Usage:
 *   QB_ENVIRONMENT=sandbox npx tsx scripts/je3d/stage-bs-coherent-pre-post.ts
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { getSupabaseAdmin } from "../../lib/supabase-admin.js";
import {
  createContinuousCloseJournalEntryProposal,
  decideJournalEntryProposal,
  reserveGovernedProviderAttempt,
  inspectGovernedJeActivationCustody,
  DEFAULT_JE_PROPOSAL_POLICY,
  DEFAULT_JE_APPROVAL_POLICY,
  DEFAULT_JE_EXECUTION_POLICY,
  buildBsAccountGlDeltaExpectedEffect,
} from "../../lib/journal-entry-governance";
import { prepareGovernedJournalEntryExecutionInternal } from "../../lib/journal-entry-governance/execution-prepare-internal";
import { JeExecutionCustodyError } from "../../lib/journal-entry-governance/execution-custody";
import { JE_EXECUTION_ERROR } from "../../lib/journal-entry-governance/execution-types";
import type { AccountingConnectionRecord } from "../../lib/integrations/accounting/types";
import type { JeExecutionPolicy } from "../../lib/journal-entry-governance/execution-types";

/**
 * Same authority as lib/entitlements.js hasFlag(…, "review_assist_write_qbo").
 * Inlined because Node/tsx resolve entitlements.js → entitlements.ts (no hasFlag).
 */
async function assertJeWriteEntitlementFromDb(args: {
  firmId: string | null;
  companyId: string | null;
}): Promise<{ ok: true; resolvedVia: "firm" | "company" }> {
  const supabase = getSupabaseAdmin();
  async function check(
    subscriberType: "firm" | "company",
    subscriberId: string,
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from("entitlements")
      .select("status, flags")
      .eq("subscriber_type", subscriberType)
      .eq("subscriber_id", subscriberId)
      .maybeSingle();
    if (error || !data) return false;
    if (!["active", "trialing"].includes(String(data.status))) return false;
    const flags = (data.flags || {}) as Record<string, unknown>;
    return flags.review_assist_write_qbo === true;
  }
  if (args.firmId && (await check("firm", args.firmId))) {
    return { ok: true, resolvedVia: "firm" };
  }
  if (args.companyId && (await check("company", args.companyId))) {
    return { ok: true, resolvedVia: "company" };
  }
  throw new JeExecutionCustodyError(
    JE_EXECUTION_ERROR.ENTITLEMENT_DENIED,
    "review_assist_write_qbo entitlement is required for JE execution (RA Pro / ra_je_write_addon). ap_pay and Pulse writeback are insufficient.",
  );
}

/**
 * Company-canonical Demo A connection (JE-3D allowlist), not user-scoped OAuth row.
 * SoD executor is company_admin; the connected grant is owned by owner_executive.
 * Still DB authority only — exact allowlisted connection id + realm + sandbox.
 */
async function resolveDemoACanonicalExecutionConnection(args: {
  userId: string;
  companyId: string;
  policy: JeExecutionPolicy;
}): Promise<AccountingConnectionRecord> {
  if (args.policy.provider !== "quickbooks") {
    throw new JeExecutionCustodyError(
      JE_EXECUTION_ERROR.PROVIDER_UNSUPPORTED,
      "Only provider=quickbooks is supported for JE-3A.",
    );
  }
  if (args.companyId !== JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId) {
    throw new JeExecutionCustodyError(
      JE_EXECUTION_ERROR.CONNECTION_NOT_FOUND,
      "Company is not the verified Demo A identity.",
    );
  }
  const allowlist = await resolveSandboxActivationAllowlist();
  if (allowlist.allowlistResolution !== "resolved" || !allowlist.demoA) {
    throw new JeExecutionCustodyError(
      JE_EXECUTION_ERROR.CONNECTION_NOT_FOUND,
      "Sandbox Demo A allowlist unresolved.",
    );
  }
  if (
    allowlist.demoA.accountingConnectionId !==
      JE_3D_VERIFIED_DEMO_A_IDENTITY.accountingConnectionId ||
    allowlist.demoA.realmId !== JE_3D_VERIFIED_DEMO_A_IDENTITY.realmId
  ) {
    throw new JeExecutionCustodyError(
      JE_EXECUTION_ERROR.CONNECTION_NOT_FOUND,
      "Allowlist Demo A connection/realm mismatch vs verified identity.",
    );
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("accounting_connections")
    .select("*")
    .eq("id", allowlist.demoA.accountingConnectionId)
    .maybeSingle();
  if (error || !data?.id) {
    throw new JeExecutionCustodyError(
      JE_EXECUTION_ERROR.CONNECTION_NOT_FOUND,
      "Canonical Demo A accounting_connection not found.",
    );
  }
  if (String(data.provider) !== "quickbooks") {
    throw new JeExecutionCustodyError(
      JE_EXECUTION_ERROR.PROVIDER_UNSUPPORTED,
      "Canonical connection provider must be quickbooks.",
    );
  }
  if (String(data.status) !== "connected") {
    throw new JeExecutionCustodyError(
      JE_EXECUTION_ERROR.CONNECTION_UNHEALTHY,
      `Connection status is ${data.status}, expected connected.`,
    );
  }
  if (String(data.provider_environment) !== "sandbox") {
    throw new JeExecutionCustodyError(
      JE_EXECUTION_ERROR.CONNECTION_UNHEALTHY,
      "Canonical connection provider_environment must be sandbox.",
    );
  }
  if (
    String(data.tenant_or_realm_id || "") !==
    JE_3D_VERIFIED_DEMO_A_IDENTITY.realmId
  ) {
    throw new JeExecutionCustodyError(
      JE_EXECUTION_ERROR.CONNECTION_NOT_FOUND,
      "Canonical connection realm mismatch.",
    );
  }
  void args.userId; // write authority already enforced separately
  return data as AccountingConnectionRecord;
}
import {
  isJe3dCreateCapabilityEnabled,
  isJe3dVerifyCapabilityEnabled,
  JE_3D_SANDBOX_QBO_API_BASE,
} from "../../lib/journal-entry-governance/je3d-activation-policy";
import {
  JE_3D_VERIFIED_DEMO_A_IDENTITY,
  resolveJe3dActivationPolicy,
  isVerifiedDemoAIdentityMatch,
} from "../../lib/journal-entry-governance/je3d-first-controlled-create-activation";
import { resolveSandboxActivationAllowlist } from "../../lib/journal-entry-governance/je3d-sandbox-company-authority";
import {
  assertJe3dSandboxQboEnvironment,
  classifyQbEnvironment,
} from "../../lib/journal-entry-governance/je3d-sandbox-environment";
import {
  FIRST_RUN_ACCOUNTS_REVIEWED_AND_APPROVED,
  FIRST_RUN_JE_AMOUNT_CENTS,
  FIRST_RUN_JE_CURRENCY,
  FIRST_RUN_STAGED_ACCRUED_LIABILITY_ACCOUNT_ID,
  FIRST_RUN_STAGED_EXPENSE_ACCOUNT_ID,
} from "../../lib/journal-entry-governance/je3d-first-run-account-authority";
import {
  FIRST_RUN_EXECUTION_REVIEWED_AND_APPROVED,
  FIRST_RUN_REASON_CODE,
} from "../../lib/journal-entry-governance/je3d-first-run-execution-authority";

const BS_RUN_ID = "9398adc2-6626-4289-8d80-9d891041643e";
const PROPOSER_ID = "a4ebf834-a698-4f79-a945-8498f2e6c45d";
const APPROVER_ID = "0f660773-eaf1-4187-a7f6-acb0f34c1c64";
const EXECUTOR_ID = "c2a8e790-4550-4d11-951c-c0cb42424cf9";

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
loadEnv(".tmp-urm5-prod-runtime.env");
loadEnv(".tmp-vercel-prod.env");
process.env.QB_ENVIRONMENT = "sandbox";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

async function main() {
  const supabase = getSupabaseAdmin();
  const policy = resolveJe3dActivationPolicy();
  const report: Record<string, unknown> = {
    CREATE_SANDBOX_JE: isJe3dCreateCapabilityEnabled(policy),
    VERIFY_SANDBOX_JE: isJe3dVerifyCapabilityEnabled(policy),
    sandboxDispatchKillSwitch: policy.sandboxDispatchKillSwitch,
    productionAllowed: policy.productionAllowed,
    memory: policy.memoryWriteAllowed,
    worker: policy.workerAllowed,
    GOVERNED_AUTO: policy.governedAutoAllowed,
    FIRST_RUN_ACCOUNTS_REVIEWED_AND_APPROVED,
    FIRST_RUN_EXECUTION_REVIEWED_AND_APPROVED,
    qbo_api_base: JE_3D_SANDBOX_QBO_API_BASE,
    qbo_post_made: false,
    dispatch_receipt_exists: false,
    stop_reasons: [] as Array<{ code: string; message: string }>,
  };

  if (!classifyQbEnvironment(process.env.QB_ENVIRONMENT).ok) {
    report.stop_reasons = [
      { code: "invalid_qb_environment", message: "QB_ENVIRONMENT must be sandbox." },
    ];
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }
  assertJe3dSandboxQboEnvironment();

  const allowlist = await resolveSandboxActivationAllowlist();
  if (allowlist.allowlistResolution !== "resolved" || !allowlist.demoA) {
    report.stop_reasons = [
      {
        code: "allowlist_unresolved",
        message: `allowlist=${allowlist.allowlistResolution}`,
      },
    ];
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }
  const identityOk = isVerifiedDemoAIdentityMatch({
    companyId: allowlist.demoA.companyId,
    accountingConnectionId: allowlist.demoA.accountingConnectionId,
    realmId: allowlist.demoA.realmId,
    providerEnvironment: allowlist.demoA.providerEnvironment,
    demoRole: allowlist.demoA.demoRole,
  });
  if (!identityOk) {
    report.stop_reasons = [
      { code: "identity_mismatch", message: "Resolved Demo A identity mismatch." },
    ];
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }
  report.demo_a_identity = {
    company_id: allowlist.demoA.companyId,
    accounting_connection_id: allowlist.demoA.accountingConnectionId,
    realm_id: allowlist.demoA.realmId,
    provider_environment: allowlist.demoA.providerEnvironment,
    demo_role: allowlist.demoA.demoRole,
    exact_match_count: 1,
  };

  const expenseId = FIRST_RUN_STAGED_EXPENSE_ACCOUNT_ID!;
  const liabilityId = FIRST_RUN_STAGED_ACCRUED_LIABILITY_ACCOUNT_ID!;
  const firmClientId = JE_3D_VERIFIED_DEMO_A_IDENTITY.firmClientId;

  const { data: coaRows, error: coaErr } = await supabase
    .from("qbo_coa_mirror")
    .select(
      "external_account_id, account_name, account_type, account_subtype, active",
    )
    .eq("firm_client_id", firmClientId)
    .in("external_account_id", [expenseId, liabilityId]);
  if (coaErr || !coaRows || coaRows.length !== 2) {
    report.stop_reasons = [
      {
        code: "coa_mirror_accounts_missing",
        message: coaErr?.message || "Expected both expense and liability in COA mirror.",
      },
    ];
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }
  const expense = coaRows.find(
    (r: { external_account_id: string }) =>
      String(r.external_account_id) === expenseId,
  )!;
  const liability = coaRows.find(
    (r: { external_account_id: string }) =>
      String(r.external_account_id) === liabilityId,
  )!;
  report.expense_account = {
    qbo_account_id: expense.external_account_id,
    name: expense.account_name,
    type: expense.account_type,
    subtype: expense.account_subtype,
    active: expense.active,
  };
  report.accrued_liability_account = {
    qbo_account_id: liability.external_account_id,
    name: liability.account_name,
    type: liability.account_type,
    subtype: liability.account_subtype,
    active: liability.active,
  };

  const { data: bsRun, error: bsErr } = await supabase
    .from("audit_ready_tie_out_runs")
    .select(
      "id, engagement_id, period_end, status, totals_status, totals_variance_cents, subledger_total_cents, gl_total_cents, baseline_sync_id, tie_out_kind",
    )
    .eq("id", BS_RUN_ID)
    .maybeSingle();
  if (
    bsErr ||
    !bsRun ||
    bsRun.status !== "completed" ||
    bsRun.totals_status !== "tie" ||
    Number(bsRun.totals_variance_cents) !== 0 ||
    bsRun.baseline_sync_id != null ||
    bsRun.tie_out_kind !== "bs_account_recon"
  ) {
    report.stop_reasons = [
      {
        code: "bs_source_not_first_run_ready",
        message: bsErr?.message || "BS run must be completed live_provider clean tie.",
      },
    ];
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }
  const baselineGl = Number(bsRun.subledger_total_cents);
  const effectBuild = buildBsAccountGlDeltaExpectedEffect({
    sourceRunId: BS_RUN_ID,
    qboAccountId: liabilityId,
    classification: "Liability",
    baselineGlBalanceCents: baselineGl,
    creditCents: FIRST_RUN_JE_AMOUNT_CENTS,
  });
  if (!effectBuild.ok) {
    report.stop_reasons = [
      { code: effectBuild.code, message: effectBuild.message },
    ];
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }
  report.amount_cents = FIRST_RUN_JE_AMOUNT_CENTS;
  report.currency = FIRST_RUN_JE_CURRENCY;
  report.txn_date = String(bsRun.period_end).slice(0, 10);
  report.memo = "JE-3D first controlled sandbox accrual (immaterial)";
  report.balanced_je_preview = {
    debit: {
      account_id: expenseId,
      name: expense.account_name,
      cents: FIRST_RUN_JE_AMOUNT_CENTS,
    },
    credit: {
      account_id: liabilityId,
      name: liability.account_name,
      cents: FIRST_RUN_JE_AMOUNT_CENTS,
    },
    balanced: true,
  };
  report.expected_effect = effectBuild.effect;
  report.bs_source_run_id = BS_RUN_ID;

  const resumeProposalId = process.env.JE3D_RESUME_PROPOSAL_ID?.trim() || null;
  const resumeApprovalId = process.env.JE3D_RESUME_APPROVAL_ID?.trim() || null;

  let proposalId: string;
  let approvalId: string;

  if (resumeProposalId && resumeApprovalId) {
    proposalId = resumeProposalId;
    approvalId = resumeApprovalId;
    report.proposal_id = proposalId;
    report.approval_id = approvalId;
    report.resumed = true;
    report.engagement_id = String(bsRun.engagement_id);
  } else {
    const engagementId = String(bsRun.engagement_id);
    const periodEnd = String(bsRun.period_end).slice(0, 10);

    // Reuse Demo A SUCCESS sync for CC period custody (BS measurement stays null baseline).
    const { data: sync, error: syncErr } = await supabase
      .from("accounting_syncs")
      .select("id, validation_status, report_period_end, company_id")
      .eq("id", "436d935e-e2d7-4af0-baa6-66a6d2c8e29f")
      .maybeSingle();
    if (syncErr || !sync || sync.validation_status !== "SUCCESS") {
      report.stop_reasons = [
        {
          code: "accounting_sync_unavailable",
          message: syncErr?.message || "Demo A SUCCESS accounting sync required.",
        },
      ];
      console.log(JSON.stringify(report, null, 2));
      process.exit(2);
    }

    const observationSummary = {
      reconciliations: {
        ar: null,
        ap: null,
        inventory: null,
        bsAccount: {
          runId: BS_RUN_ID,
          authoritative: true,
          baselineSyncId: null,
          measurementSource: "live_provider",
          qboAccountId: liabilityId,
        },
      },
    };
    const now = new Date().toISOString();
    const idempotencyKey = sha256Hex(
      `je3d-bs-cc:${JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId}:${engagementId}:${BS_RUN_ID}:${periodEnd}:${now}`,
    );
    const { data: ccRun, error: ccErr } = await supabase
      .from("continuous_close_runs")
      .insert({
        id: randomUUID(),
        company_id: JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId,
        engagement_id: engagementId,
        firm_client_id: firmClientId,
        accounting_sync_id: sync.id,
        period_end: periodEnd,
        mode: "OBSERVE",
        status: "completed",
        readiness: "READY",
        observation_summary: observationSummary,
        policy_snapshot: { purpose: "je3d_bs_coherent_pre_post_staging" },
        result: {
          evidence: "bs_account_gl_delta_cutoff_accrual",
          bs_run_id: BS_RUN_ID,
        },
        created_by: PROPOSER_ID,
        started_at: now,
        completed_at: now,
        idempotency_key: idempotencyKey,
        policy_hash: sha256Hex("je3d-bs-cc-policy"),
        input_hash: sha256Hex(JSON.stringify(observationSummary)),
        created_at: now,
      })
      .select("id")
      .single();
    if (ccErr || !ccRun) {
      report.stop_reasons = [
        {
          code: "cc_run_create_failed",
          message: ccErr?.message || "Failed to create BS-authoritative CC run.",
        },
      ];
      console.log(JSON.stringify(report, null, 2));
      process.exit(2);
    }
    report.continuous_close_run_id = ccRun.id;
    report.accounting_sync_id = sync.id;
    report.engagement_id = engagementId;

    const proposalResult = await createContinuousCloseJournalEntryProposal(
      {
        engagementId,
        sourceContinuousCloseRunId: String(ccRun.id),
        originType: "ACCRUAL",
        reasonCode: FIRST_RUN_REASON_CODE,
        memo: String(report.memo),
        currency: FIRST_RUN_JE_CURRENCY,
        txnDate: periodEnd,
        lines: [
          {
            sequence: 1,
            accountId: expenseId,
            debitCents: FIRST_RUN_JE_AMOUNT_CENTS,
            creditCents: 0,
            description: String(expense.account_name),
          },
          {
            sequence: 2,
            accountId: liabilityId,
            debitCents: 0,
            creditCents: FIRST_RUN_JE_AMOUNT_CENTS,
            description: String(liability.account_name),
          },
        ],
        expectedEffects: [effectBuild.effect as import("../../lib/journal-entry-governance").JeExpectedEffect],
        sourceReconRunIds: [BS_RUN_ID],
      },
      { principal: { type: "user", userId: PROPOSER_ID } },
      DEFAULT_JE_PROPOSAL_POLICY,
    );
    if (!proposalResult.ok) {
      report.stop_reasons = [
        {
          code: "proposal_failed",
          message: `${proposalResult.code}: ${proposalResult.message}`,
        },
      ];
      console.log(JSON.stringify(report, null, 2));
      process.exit(2);
    }
    proposalId = proposalResult.proposal.id;
    report.proposal_id = proposalId;
    report.proposal_hash = proposalResult.proposal.proposal_hash;

    const approvalResult = await decideJournalEntryProposal(
      {
        proposalId,
        decision: "APPROVED",
        reason: "JE-3D Demo A BS-coherent first-run pre-POST staging approval.",
      },
      { principal: { type: "user", userId: APPROVER_ID } },
      DEFAULT_JE_APPROVAL_POLICY,
    );
    if (!approvalResult.ok) {
      report.stop_reasons = [
        {
          code: "approval_failed",
          message: `${approvalResult.code}: ${approvalResult.message}`,
        },
      ];
      console.log(JSON.stringify(report, null, 2));
      process.exit(2);
    }
    approvalId = approvalResult.approval.id;
    report.approval_id = approvalId;
    report.approval_mfa_level = approvalResult.approval.mfa_level;
  }

  const executionResult = await prepareGovernedJournalEntryExecutionInternal(
    {
      proposalId,
      approvalId,
    },
    { principal: { type: "user", userId: EXECUTOR_ID } },
    DEFAULT_JE_EXECUTION_POLICY,
    { assertEntitlement: assertJeWriteEntitlementFromDb, resolveConnection: resolveDemoACanonicalExecutionConnection },
  );
  if (!executionResult.ok) {
    report.stop_reasons = [
      {
        code: "execution_prepare_failed",
        message: `${executionResult.code}: ${executionResult.message}`,
      },
    ];
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }
  report.execution_id = executionResult.execution.id;
  report.execution_status = executionResult.execution.status;
  report.state_version = executionResult.execution.state_version;
  report.provider_request_hash =
    executionResult.execution.provider_request_hash;
  report.correlation_marker = executionResult.execution.correlation_marker;
  report.firm_client_id = executionResult.execution.firm_client_id;
  report.accounting_connection_id =
    executionResult.execution.accounting_connection_id;

  const reserveResult = await reserveGovernedProviderAttempt(
    { executionId: executionResult.execution.id },
    { principal: { type: "user", userId: EXECUTOR_ID } },
    { publishPostingStarted: false },
  );
  if (!reserveResult.ok) {
    report.stop_reasons = [
      {
        code: "reserve_failed",
        message: `${reserveResult.code}: ${reserveResult.message}`,
      },
    ];
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }
  report.provider_attempt = {
    id: reserveResult.attempt.id,
    status: reserveResult.attempt.status,
    commit_certainty: reserveResult.attempt.commit_certainty,
  };

  const cockpit = await inspectGovernedJeActivationCustody(
    executionResult.execution.id,
  );
  report.cockpit = cockpit;
  report.dispatch_receipt_exists = Boolean(cockpit.dispatch_receipt_id);
  report.qbo_je_id = cockpit.qbo_je_id ?? null;
  report.provider_response_hash = cockpit.provider_response_hash ?? null;
  report.provider_readback_hash = cockpit.provider_readback_hash ?? null;
  report.provider_outcome_receipt_id =
    cockpit.provider_outcome_receipt_id ?? null;
  report.provider_attempt_status = cockpit.attempt_status ?? null;
  report.provider_attempt_certainty = cockpit.commit_certainty ?? null;
  report.qbo_post_made = cockpit.qbo_post_made;

  report.recommendation =
    executionResult.execution.status === "READY_TO_POST" &&
    !report.dispatch_receipt_exists &&
    report.qbo_post_made === false
      ? "READY FOR FINAL PRE-POST REVIEW"
      : "STOP — PRE-FLIGHT FAILURE";

  writeFileSync(
    ".tmp-je3d-bs-coherent-pre-post.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.recommendation === "READY FOR FINAL PRE-POST REVIEW" ? 0 : 2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
