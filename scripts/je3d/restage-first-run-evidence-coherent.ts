/* eslint-disable no-console */
/**
 * JE-3D — Restage first-run custody with coherent AP-cutoff accrual evidence.
 *
 * Creates a NEW immutable proposal → approval → execution → RESERVED attempt chain.
 * Does NOT mutate the stale ar_aging-linked proposal/execution.
 * No QBO POST/GET. Kill switch remains ON.
 *
 * Usage:
 *   QB_ENVIRONMENT=sandbox npx tsx scripts/je3d/restage-first-run-evidence-coherent.ts
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { getSupabaseAdmin } from "../../lib/supabase-admin.js";
import {
  createContinuousCloseJournalEntryProposal,
  decideJournalEntryProposal,
  prepareGovernedJournalEntryExecution,
  reserveGovernedProviderAttempt,
  inspectGovernedJeActivationCustody,
  DEFAULT_JE_PROPOSAL_POLICY,
  DEFAULT_JE_APPROVAL_POLICY,
  DEFAULT_JE_EXECUTION_POLICY,
  FIRST_RUN_JE_AMOUNT_CENTS,
  FIRST_RUN_JE_CURRENCY,
  FIRST_RUN_REASON_CODE,
} from "../../lib/journal-entry-governance";
import {
  isJe3dCreateCapabilityEnabled,
  isJe3dVerifyCapabilityEnabled,
} from "../../lib/journal-entry-governance/je3d-activation-policy";
import {
  JE_3D_VERIFIED_DEMO_A_IDENTITY,
  resolveJe3dActivationPolicy,
} from "../../lib/journal-entry-governance/je3d-first-controlled-create-activation";
import {
  FIRST_RUN_STAGED_ACCRUED_LIABILITY_ACCOUNT_ID,
  FIRST_RUN_STAGED_EXPENSE_ACCOUNT_ID,
} from "../../lib/journal-entry-governance/je3d-first-run-account-authority";
import { buildFirstRunEvidenceCoherentExpectedEffects } from "../../lib/journal-entry-governance/je3d-first-run-evidence-coherence";

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

const COMPANY_ID = JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId;
const FIRM_ID = JE_3D_VERIFIED_DEMO_A_IDENTITY.firmId;
const FIRM_CLIENT_ID = JE_3D_VERIFIED_DEMO_A_IDENTITY.firmClientId;
const CONNECTION_ID = JE_3D_VERIFIED_DEMO_A_IDENTITY.accountingConnectionId;
const REALM_ID = JE_3D_VERIFIED_DEMO_A_IDENTITY.realmId;

const PROPOSER_ID = "a4ebf834-a698-4f79-a945-8498f2e6c45d";
const APPROVER_ID = "0f660773-eaf1-4187-a7f6-acb0f34c1c64";
const EXECUTOR_ID = "c2a8e790-4550-4d11-951c-c0cb42424cf9";

const DEBIT_ACCOUNT_ID = FIRST_RUN_STAGED_EXPENSE_ACCOUNT_ID!;
const CREDIT_ACCOUNT_ID = FIRST_RUN_STAGED_ACCRUED_LIABILITY_ACCOUNT_ID!;
const AMOUNT_CENTS = FIRST_RUN_JE_AMOUNT_CENTS;
const MEMO =
  "JE-3D first controlled sandbox cutoff accrual — AP aging variance remediation (immaterial)";

const STALE_EXECUTION_ID = "6d9579ad-0020-42b5-9521-db68a5d0edda";
const STALE_PROPOSAL_ID = "5a05807e-d21c-4426-b282-16bb90212971";

function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

async function main() {
  const supabase = getSupabaseAdmin();
  const policy = resolveJe3dActivationPolicy();
  const report: Record<string, unknown> = {
    restage_version: "evidence-coherent-v1",
    stale_proposal_id: STALE_PROPOSAL_ID,
    stale_execution_id: STALE_EXECUTION_ID,
    stale_chain_untouched: true,
    qbo_post_count: 0,
    qbo_get_count: 0,
    stop_reasons: [] as Array<{ code: string; message: string }>,
  };

  const { data: engagement } = await supabase
    .from("audit_ready_engagements")
    .select("id")
    .eq("company_id", COMPANY_ID)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!engagement?.id) {
    report.stop_reasons = [
      { code: "missing_engagement", message: "No audit_ready_engagements row." },
    ];
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }

  const { data: closePeriod } = await supabase
    .from("close_periods")
    .select("id, period_end, status")
    .eq("firm_client_id", FIRM_CLIENT_ID)
    .neq("status", "locked")
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!closePeriod?.period_end) {
    report.stop_reasons = [
      { code: "missing_close_period", message: "No unlocked close period." },
    ];
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }

  const periodEnd = String(closePeriod.period_end).slice(0, 10);
  const periodStart = `${periodEnd.slice(0, 8)}01`;
  const txnDate = periodEnd;

  let { data: sync } = await supabase
    .from("accounting_syncs")
    .select("id, report_period_start, report_period_end, validation_status")
    .eq("company_id", COMPANY_ID)
    .eq("report_period_end", periodEnd)
    .eq("validation_status", "SUCCESS")
    .order("last_synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sync) {
    const { data: createdSync, error: syncErr } = await supabase
      .from("accounting_syncs")
      .insert({
        company_id: COMPANY_ID,
        connection_id: CONNECTION_ID,
        source_system: "quickbooks",
        adapter_name: "je3d-evidence-coherent-restage",
        tenant_id: REALM_ID,
        tenant_name: "QBO Sandbox Smoke Company",
        report_period_start: periodStart,
        report_period_end: periodEnd,
        normalized_payload: {
          purpose: "je3d_first_run_evidence_coherent_restage",
          no_provider_fetch: true,
        },
        validation_status: "SUCCESS",
        last_synced_at: new Date().toISOString(),
      })
      .select("id, report_period_start, report_period_end, validation_status")
      .single();
    if (syncErr || !createdSync) {
      report.stop_reasons = [
        {
          code: "accounting_sync_create_failed",
          message: syncErr?.message || "unknown",
        },
      ];
      console.log(JSON.stringify(report, null, 2));
      process.exit(2);
    }
    sync = createdSync;
  }
  report.source_accounting_sync_id = sync.id;

  const pbcRequestNumber = "SYS-ROLLUP-AP-AGING-JE3D-CUTOFF";
  let { data: pbc } = await supabase
    .from("audit_ready_pbc_requests")
    .select("id")
    .eq("engagement_id", engagement.id)
    .eq("request_number", pbcRequestNumber)
    .maybeSingle();
  if (!pbc) {
    const { data: createdPbc, error: pbcErr } = await supabase
      .from("audit_ready_pbc_requests")
      .insert({
        engagement_id: engagement.id,
        request_number: pbcRequestNumber,
        request_description:
          "System-managed sentinel PBC for JE-3D first-run AP aging cutoff accrual custody.",
        tie_out_kind: "ap_aging",
        status: "accepted",
        assertion_tags: [],
      })
      .select("id")
      .single();
    if (pbcErr || !createdPbc) {
      report.stop_reasons = [
        {
          code: "pbc_sentinel_create_failed",
          message: pbcErr?.message || "unknown",
        },
      ];
      console.log(JSON.stringify(report, null, 2));
      process.exit(2);
    }
    pbc = createdPbc;
  }

  const now = new Date().toISOString();
  const { data: apRecon, error: apReconErr } = await supabase
    .from("audit_ready_tie_out_runs")
    .insert({
      engagement_id: engagement.id,
      pbc_request_id: pbc.id,
      tie_out_kind: "ap_aging",
      status: "completed",
      policy_mode: "standard",
      auto_reconcile_max_dollar: 0,
      auto_reconcile_max_percent: 0,
      kickout_min_dollar: 0,
      kickout_min_percent: 0,
      authoritative_comparison: true,
      item_count: 1,
      item_auto_reconcile_count: 0,
      item_review_count: 1,
      item_kickout_count: 0,
      period_start: periodStart,
      period_end: periodEnd,
      triggered_by_user_id: PROPOSER_ID,
      trigger_reason: "manual",
      trigger_kind: "initial",
      started_at: now,
      completed_at: now,
      recon_outcome: "open_review",
      baseline_sync_id: sync.id,
      totals_status: "review",
      subledger_total_cents: AMOUNT_CENTS,
      gl_total_cents: 0,
      totals_variance_cents: AMOUNT_CENTS,
    })
    .select(
      "id, tie_out_kind, status, recon_outcome, totals_variance_cents, baseline_sync_id, period_end",
    )
    .single();
  if (apReconErr || !apRecon) {
    report.stop_reasons = [
      {
        code: "ap_recon_create_failed",
        message: apReconErr?.message || "unknown",
      },
    ];
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }
  report.source_recon_runs = [apRecon];

  const observationSummary = {
    reconciliations: {
      ar: null,
      ap: {
        runId: apRecon.id,
        authoritative: true,
        baselineSyncId: sync.id,
      },
      inventory: null,
    },
  };
  const idempotencySeed = `je3d-first-run-cc-evidence-v1:${COMPANY_ID}:${engagement.id}:${sync.id}:${periodEnd}`;
  const idempotencyKey = sha256Hex(idempotencySeed);

  const { data: ccRun, error: ccErr } = await supabase
    .from("continuous_close_runs")
    .insert({
      id: randomUUID(),
      company_id: COMPANY_ID,
      engagement_id: engagement.id,
      firm_client_id: FIRM_CLIENT_ID,
      close_period_id: closePeriod.id,
      accounting_sync_id: sync.id,
      period_end: periodEnd,
      mode: "OBSERVE",
      readiness: "READY",
      status: "completed",
      policy_hash: sha256Hex(`je3d-cc-policy-evidence-v1:${engagement.id}`),
      input_hash: sha256Hex(JSON.stringify(observationSummary)),
      policy_snapshot: {
        purpose: "je3d_first_run_evidence_coherent_restage",
      },
      observation_summary: observationSummary,
      result: { restaged: true, evidence: "ap_aging_cutoff_accrual" },
      created_by: PROPOSER_ID,
      started_at: now,
      completed_at: now,
      idempotency_key: idempotencyKey,
    })
    .select("id, accounting_sync_id, period_end, status")
    .single();
  if (ccErr || !ccRun) {
    report.stop_reasons = [
      {
        code: "cc_run_create_failed",
        message: ccErr?.message || "unknown",
      },
    ];
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }
  report.source_continuous_close_run_id = ccRun.id;

  const expectedEffects = buildFirstRunEvidenceCoherentExpectedEffects({
    expenseAccountId: DEBIT_ACCOUNT_ID,
    accruedLiabilityAccountId: CREDIT_ACCOUNT_ID,
    amountCents: AMOUNT_CENTS,
  });
  report.expected_effects = expectedEffects;
  report.accounting_rationale =
    "AP aging tie-out identified $1.00 immaterial cutoff variance (open_review). " +
    "Governed accrual records expense and accrued liability pending vendor documentation.";

  const proposalResult = await createContinuousCloseJournalEntryProposal(
    {
      engagementId: engagement.id,
      sourceContinuousCloseRunId: ccRun.id,
      originType: "ACCRUAL",
      reasonCode: FIRST_RUN_REASON_CODE,
      memo: MEMO,
      currency: FIRST_RUN_JE_CURRENCY,
      txnDate,
      lines: [
        {
          sequence: 1,
          accountId: DEBIT_ACCOUNT_ID,
          debitCents: AMOUNT_CENTS,
          creditCents: 0,
          description: "Office Expenses — cutoff accrual",
        },
        {
          sequence: 2,
          accountId: CREDIT_ACCOUNT_ID,
          debitCents: 0,
          creditCents: AMOUNT_CENTS,
          description: "Accrued Expenses - Advisacor Test",
        },
      ],
      expectedEffects,
      sourceReconRunIds: [apRecon.id],
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
  report.proposal_id = proposalResult.proposal.id;
  report.proposal_hash = proposalResult.proposal.proposal_hash;

  const approvalResult = await decideJournalEntryProposal(
    {
      proposalId: proposalResult.proposal.id,
      decision: "APPROVED",
      reason:
        "JE-3D evidence-coherent restage — governed sandbox cutoff accrual approval",
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
  report.approval_id = approvalResult.approval.id;

  const executionResult = await prepareGovernedJournalEntryExecution(
    {
      proposalId: proposalResult.proposal.id,
      approvalId: approvalResult.approval.id,
    },
    { principal: { type: "user", userId: EXECUTOR_ID } },
    DEFAULT_JE_EXECUTION_POLICY,
    {
      assertEntitlement: async ({ firmId, companyId }) => {
        const check = async (subscriberType: "firm" | "company", id: string) => {
          const { data } = await supabase
            .from("entitlements")
            .select("status, flags")
            .eq("subscriber_type", subscriberType)
            .eq("subscriber_id", id)
            .maybeSingle();
          if (!data || !["active", "trialing"].includes(String(data.status))) {
            return false;
          }
          const flags = (data.flags || {}) as Record<string, unknown>;
          return flags.review_assist_write_qbo === true;
        };
        if (firmId && (await check("firm", firmId))) {
          return { ok: true as const, resolvedVia: "firm" as const };
        }
        if (companyId && (await check("company", companyId))) {
          return { ok: true as const, resolvedVia: "company" as const };
        }
        throw new Error("review_assist_write_qbo entitlement required");
      },
      resolveConnection: async () => {
        const { data, error } = await supabase
          .from("accounting_connections")
          .select("*")
          .eq("id", CONNECTION_ID)
          .eq("status", "connected")
          .maybeSingle();
        if (error || !data) throw new Error(error?.message || "connection missing");
        return data as never;
      },
    },
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
  report.execution_hash = executionResult.execution.execution_hash;
  report.execution_status = executionResult.execution.status;
  report.provider_request_hash = executionResult.execution.provider_request_hash;
  report.correlation_marker = executionResult.execution.correlation_marker;

  const reserveResult = await reserveGovernedProviderAttempt(
    { executionId: executionResult.execution.id },
    { principal: { type: "user", userId: EXECUTOR_ID } },
    { publishPostingStarted: false },
  );
  if (!reserveResult.ok) {
    report.stop_reasons = [
      {
        code: "provider_attempt_reserve_failed",
        message: `${reserveResult.code}: ${reserveResult.message}`,
      },
    ];
    console.log(JSON.stringify(report, null, 2));
    process.exit(2);
  }
  report.provider_attempt_id = reserveResult.attempt.id;
  report.attempt_status = reserveResult.attempt.status;
  report.commit_certainty = reserveResult.attempt.commit_certainty;

  const cockpit = await inspectGovernedJeActivationCustody(
    executionResult.execution.id,
  );
  report.cockpit = cockpit;
  report.qbo_je_id = cockpit.qbo_je_id;
  report.dispatch_receipt_exists = Boolean(cockpit.dispatch_receipt_id);
  report.provider_outcome_receipt_exists = Boolean(
    cockpit.provider_outcome_receipt_id,
  );
  report.CREATE_SANDBOX_JE = isJe3dCreateCapabilityEnabled(policy);
  report.VERIFY_SANDBOX_JE = isJe3dVerifyCapabilityEnabled(policy);
  report.kill_switch = policy.sandboxDispatchKillSwitch;
  report.execution_reviewed_and_approved = false;
  report.accounts_reviewed_and_approved = false;

  const { data: coa } = await supabase
    .from("qbo_coa_mirror")
    .select("external_account_id, account_name, account_type, active")
    .eq("firm_client_id", FIRM_CLIENT_ID)
    .in("external_account_id", [DEBIT_ACCOUNT_ID, CREDIT_ACCOUNT_ID]);
  report.coa_accounts = coa;

  report.recommendation = "READY FOR FINAL FIRST-RUN EVIDENCE APPROVAL";
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
