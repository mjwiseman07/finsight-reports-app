/* eslint-disable no-console */
/**
 * JE-3D — First controlled CREATE activation staging (pre-dispatch STOP).
 *
 * - Verifies Demo A identity from database authority only
 * - Audits JE custody prerequisites
 * - When prerequisites exist: proposal → approval → execution → RESERVED attempt
 * - STOPS before provider_dispatch_started and before POST /journalentry
 * - No QBO network calls
 *
 * Usage:
 *   QB_ENVIRONMENT=sandbox npx tsx scripts/je3d/stage-first-controlled-create-pre-dispatch.ts
 */

import { readFileSync } from "node:fs";
import { getSupabaseAdmin } from "../../lib/supabase-admin.js";
import {
  JE_3D_SANDBOX_QBO_API_BASE,
  isJe3dCreateCapabilityEnabled,
  isJe3dVerifyCapabilityEnabled,
} from "../../lib/journal-entry-governance/je3d-activation-policy";
import {
  JE_3D_VERIFIED_DEMO_A_IDENTITY,
  isVerifiedDemoAIdentityMatch,
  resolveJe3dActivationPolicy,
} from "../../lib/journal-entry-governance/je3d-first-controlled-create-activation";
import {
  assertJe3dSandboxQboEnvironment,
  classifyQbEnvironment,
} from "../../lib/journal-entry-governance/je3d-sandbox-environment";
import { resolveSandboxActivationAllowlist } from "../../lib/journal-entry-governance/je3d-sandbox-company-authority";
import {
  createContinuousCloseJournalEntryProposal,
  decideJournalEntryProposal,
  prepareGovernedJournalEntryExecution,
  reserveGovernedProviderAttempt,
  DEFAULT_JE_PROPOSAL_POLICY,
  DEFAULT_JE_APPROVAL_POLICY,
  DEFAULT_JE_EXECUTION_POLICY,
  inspectGovernedJeActivationCustody,
} from "../../lib/journal-entry-governance";
import type { CreateJeProposalInput } from "../../lib/journal-entry-governance";

/** Controlled first-run evidence — not general product authority. */
const FIRST_RUN_JE_EVIDENCE = {
  amountCents: 100,
  currency: "USD",
  originType: "ACCRUAL" as const,
  reasonCode: "cutoff_accrual",
  memo: "JE-3D first controlled sandbox accrual (immaterial)",
};

function loadEnv(path: string) {
  try {
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const eq = trimmed.indexOf("=");
        if (eq === -1) return;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = value;
      });
  } catch {
    // optional
  }
}

loadEnv(".env");
loadEnv(".env.local");

type StopReason = { code: string; message: string };

async function auditPrerequisites(): Promise<{
  stopReasons: StopReason[];
  engagementId: string | null;
  ccRunId: string | null;
  sod: { proposerUserId: string | null; approverUserId: string | null; executorUserId: string | null };
}> {
  const supabase = getSupabaseAdmin();
  const stopReasons: StopReason[] = [];
  const companyId = JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId;
  const firmClientId = JE_3D_VERIFIED_DEMO_A_IDENTITY.firmClientId;

  const { count: engagementCount } = await supabase
    .from("audit_ready_engagements")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  let engagementId: string | null = null;
  if (!engagementCount) {
    stopReasons.push({
      code: "missing_audit_ready_engagement",
      message: "No audit_ready_engagements row for Demo A company.",
    });
  } else {
    const { data: engagement } = await supabase
      .from("audit_ready_engagements")
      .select("id")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    engagementId = engagement?.id ? String(engagement.id) : null;
  }

  const { count: ccCount } = await supabase
    .from("continuous_close_runs")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  let ccRunId: string | null = null;
  if (!ccCount) {
    stopReasons.push({
      code: "missing_continuous_close_run",
      message: "No continuous_close_runs row for Demo A company.",
    });
  } else if (engagementId) {
    const { data: ccRun } = await supabase
      .from("continuous_close_runs")
      .select("id")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    ccRunId = ccRun?.id ? String(ccRun.id) : null;
  }

  const { count: coaCount } = await supabase
    .from("qbo_coa_mirror")
    .select("account_id", { count: "exact", head: true })
    .eq("firm_client_id", firmClientId);

  if (!coaCount) {
    stopReasons.push({
      code: "missing_qbo_coa_mirror",
      message: "qbo_coa_mirror has no rows for Demo A firm_client.",
    });
  }

  const { count: closePeriodCount } = await supabase
    .from("close_periods")
    .select("id", { count: "exact", head: true })
    .eq("firm_client_id", firmClientId);

  if (!closePeriodCount) {
    stopReasons.push({
      code: "missing_close_period",
      message: "No close_periods row for Demo A firm_client.",
    });
  }

  const { data: companyUsers } = await supabase
    .from("company_users")
    .select("user_id, role")
    .eq("company_id", companyId)
    .eq("status", "active");

  const { data: firmApprovers } = await supabase
    .from("firm_memberships")
    .select("user_id, role, can_approve")
    .eq("firm_id", JE_3D_VERIFIED_DEMO_A_IDENTITY.firmId)
    .eq("status", "active")
    .eq("can_approve", true);

  const proposerUserId =
    companyUsers?.find((u: { role: string }) => u.role === "owner_executive")
      ?.user_id ?? null;
  const approverFromFirm = firmApprovers?.[0]?.user_id ?? null;
  const approverUserId =
    companyUsers?.find(
      (u: { user_id: string }) => u.user_id !== proposerUserId,
    )?.user_id ?? approverFromFirm;
  const executorUserId = proposerUserId;

  if (!proposerUserId) {
    stopReasons.push({
      code: "missing_proposer",
      message: "No active owner_executive company_users row for Demo A.",
    });
  }
  if (!approverUserId || approverUserId === proposerUserId) {
    stopReasons.push({
      code: "sod_approver_unavailable",
      message:
        "Segregation of duties requires a distinct approver (company or firm can_approve).",
    });
  }
  if (executorUserId && approverUserId && executorUserId === approverUserId) {
    stopReasons.push({
      code: "sod_executor_equals_approver",
      message: "Executor must differ from approver under DEFAULT_JE_EXECUTION_POLICY.",
    });
  }

  return {
    stopReasons,
    engagementId,
    ccRunId,
    sod: { proposerUserId, approverUserId, executorUserId },
  };
}

async function pickAccrualAccounts(firmClientId: string): Promise<{
  expenseAccountId: string | null;
  liabilityAccountId: string | null;
  txnDate: string | null;
}> {
  const supabase = getSupabaseAdmin();
  const { data: accounts } = await supabase
    .from("qbo_coa_mirror")
    .select("account_id, account_name, account_type, active")
    .eq("firm_client_id", firmClientId)
    .eq("active", true);

  const rows = accounts || [];
  const expense = rows.find((a: { account_type: string }) =>
    ["Expense", "Other Expense", "Cost of Goods Sold"].includes(
      String(a.account_type),
    ),
  );
  const liability = rows.find((a: { account_type: string }) =>
    ["Other Current Liability", "Long Term Liability"].includes(
      String(a.account_type),
    ),
  );

  const { data: closePeriod } = await supabase
    .from("close_periods")
    .select("period_end, status")
    .eq("firm_client_id", firmClientId)
    .neq("status", "locked")
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    expenseAccountId: expense?.account_id ? String(expense.account_id) : null,
    liabilityAccountId: liability?.account_id ? String(liability.account_id) : null,
    txnDate: closePeriod?.period_end
      ? String(closePeriod.period_end).slice(0, 10)
      : null,
  };
}

async function main() {
  const policy = resolveJe3dActivationPolicy();
  const qbEnv = classifyQbEnvironment(process.env.QB_ENVIRONMENT);
  const output: Record<string, unknown> = {
    base: "4a346b9a1f83d1a3a8e2be4e0f019c086c8c1a46",
    head: null,
    CREATE_SANDBOX_JE: isJe3dCreateCapabilityEnabled(policy),
    VERIFY_SANDBOX_JE: isJe3dVerifyCapabilityEnabled(policy),
    memory: policy.memoryWriteAllowed,
    worker: policy.workerAllowed,
    GOVERNED_AUTO: policy.governedAutoAllowed,
    productionAllowed: policy.productionAllowed,
    company_id: JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId,
    accounting_connection_id: JE_3D_VERIFIED_DEMO_A_IDENTITY.accountingConnectionId,
    realm_id: JE_3D_VERIFIED_DEMO_A_IDENTITY.realmId,
    provider_environment: JE_3D_VERIFIED_DEMO_A_IDENTITY.providerEnvironment,
    qbo_post_made: false,
    dispatch_receipt_exists: false,
    qbo_provider_id: null,
    stop_reasons: [] as StopReason[],
    cockpit: null,
    recommendation: "STOP — DO NOT POST. RETURN CONTROL TO CHATGPT.",
  };

  if (!qbEnv.ok) {
    output.stop_reasons = [
      {
        code: "invalid_qb_environment",
        message: "QB_ENVIRONMENT must be exactly sandbox.",
      },
    ];
    console.log(JSON.stringify(output, null, 2));
    process.exit(2);
  }
  assertJe3dSandboxQboEnvironment();
  output.qbo_api_base = JE_3D_SANDBOX_QBO_API_BASE;

  const allowlist = await resolveSandboxActivationAllowlist();
  if (allowlist.allowlistResolution !== "resolved" || !allowlist.demoA) {
    output.stop_reasons = [
      {
        code: "allowlist_unresolved",
        message: `Sandbox allowlist resolution: ${allowlist.allowlistResolution}`,
      },
    ];
    console.log(JSON.stringify(output, null, 2));
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
    output.stop_reasons = [
      {
        code: "identity_mismatch",
        message: "Resolved allowlist does not match verified Demo A identity evidence.",
      },
    ];
    console.log(JSON.stringify(output, null, 2));
    process.exit(2);
  }

  const prereq = await auditPrerequisites();
  if (prereq.stopReasons.length > 0) {
    output.stop_reasons = prereq.stopReasons;
    console.log(JSON.stringify(output, null, 2));
    process.exit(2);
  }

  const accounts = await pickAccrualAccounts(
    JE_3D_VERIFIED_DEMO_A_IDENTITY.firmClientId,
  );
  if (!accounts.expenseAccountId || !accounts.liabilityAccountId || !accounts.txnDate) {
    output.stop_reasons = [
      {
        code: "accrual_accounts_unresolved",
        message: "Could not resolve expense + accrued liability accounts from COA mirror / open period.",
      },
    ];
    console.log(JSON.stringify(output, null, 2));
    process.exit(2);
  }

  const amount = FIRST_RUN_JE_EVIDENCE.amountCents;
  const proposalInput: CreateJeProposalInput = {
    engagementId: String(prereq.engagementId),
    sourceContinuousCloseRunId: String(prereq.ccRunId),
    originType: FIRST_RUN_JE_EVIDENCE.originType,
    reasonCode: FIRST_RUN_JE_EVIDENCE.reasonCode,
    memo: FIRST_RUN_JE_EVIDENCE.memo,
    currency: FIRST_RUN_JE_EVIDENCE.currency,
    txnDate: accounts.txnDate,
    lines: [
      {
        sequence: 1,
        accountId: accounts.expenseAccountId,
        debitCents: amount,
        creditCents: 0,
        description: "Immateral sandbox accrual expense",
      },
      {
        sequence: 2,
        accountId: accounts.liabilityAccountId,
        debitCents: 0,
        creditCents: amount,
        description: "Accrued liability",
      },
    ],
    expectedEffects: [
      {
        type: "ACCOUNT_RECLASS",
        fromAccountId: accounts.expenseAccountId,
        toAccountId: accounts.liabilityAccountId,
        amountCents: amount,
      },
    ],
    sourceReconRunIds: [],
  };

  const proposerCtx = {
    principal: { type: "user" as const, userId: String(prereq.sod.proposerUserId) },
  };
  const approverCtx = {
    principal: { type: "user" as const, userId: String(prereq.sod.approverUserId) },
  };
  const executorCtx = {
    principal: { type: "user" as const, userId: String(prereq.sod.executorUserId) },
  };

  const proposalResult = await createContinuousCloseJournalEntryProposal(
    proposalInput,
    proposerCtx,
    DEFAULT_JE_PROPOSAL_POLICY,
  );
  if (!proposalResult.ok) {
    output.stop_reasons = [
      {
        code: "proposal_failed",
        message: `${proposalResult.code}: ${proposalResult.message}`,
      },
    ];
    console.log(JSON.stringify(output, null, 2));
    process.exit(2);
  }

  const approvalResult = await decideJournalEntryProposal(
    {
      proposalId: proposalResult.proposal.id,
      decision: "APPROVED",
    },
    approverCtx,
    DEFAULT_JE_APPROVAL_POLICY,
  );
  if (!approvalResult.ok) {
    output.stop_reasons = [
      {
        code: "approval_failed",
        message: `${approvalResult.code}: ${approvalResult.message}`,
      },
    ];
    output.proposal_id = proposalResult.proposal.id;
    console.log(JSON.stringify(output, null, 2));
    process.exit(2);
  }

  const executionResult = await prepareGovernedJournalEntryExecution(
    {
      proposalId: proposalResult.proposal.id,
      approvalId: approvalResult.approval.id,
    },
    executorCtx,
    DEFAULT_JE_EXECUTION_POLICY,
  );
  if (!executionResult.ok) {
    output.stop_reasons = [
      {
        code: "execution_prepare_failed",
        message: `${executionResult.code}: ${executionResult.message}`,
      },
    ];
    output.proposal_id = proposalResult.proposal.id;
    output.approval_id = approvalResult.approval.id;
    console.log(JSON.stringify(output, null, 2));
    process.exit(2);
  }

  const reserveResult = await reserveGovernedProviderAttempt(
    { executionId: executionResult.execution.id },
    executorCtx,
    { publishPostingStarted: false },
  );
  if (!reserveResult.ok) {
    output.stop_reasons = [
      {
        code: "provider_attempt_reserve_failed",
        message: `${reserveResult.code}: ${reserveResult.message}`,
      },
    ];
    output.proposal_id = proposalResult.proposal.id;
    output.approval_id = approvalResult.approval.id;
    output.execution_id = executionResult.execution.id;
    console.log(JSON.stringify(output, null, 2));
    process.exit(2);
  }

  if (reserveResult.attempt.status !== "RESERVED") {
    output.stop_reasons = [
      {
        code: "attempt_status_unexpected",
        message: `Expected RESERVED, got ${reserveResult.attempt.status}`,
      },
    ];
  }
  if (reserveResult.attempt.commit_certainty !== "NOT_SENT") {
    output.stop_reasons = [
      {
        code: "commit_certainty_unexpected",
        message: `Expected NOT_SENT, got ${reserveResult.attempt.commit_certainty}`,
      },
    ];
  }

  const cockpit = await inspectGovernedJeActivationCustody(
    executionResult.execution.id,
  );

  Object.assign(output, {
    proposal_id: cockpit.proposal_id,
    approval_id: cockpit.approval_id,
    execution_id: cockpit.execution_id,
    execution_status: cockpit.execution_status,
    provider_attempt_id: cockpit.provider_attempt_id,
    attempt_status: cockpit.attempt_status,
    commit_certainty: cockpit.commit_certainty,
    je_amount_cents: amount,
    debit_account_id: accounts.expenseAccountId,
    credit_account_id: accounts.liabilityAccountId,
    transaction_date: cockpit.txn_date,
    provider_request_hash: cockpit.provider_request_hash,
    correlation_marker: cockpit.correlation_marker,
    dispatch_receipt_exists: Boolean(cockpit.dispatch_receipt_id),
    qbo_provider_id: cockpit.qbo_je_id,
    cockpit,
    recommendation:
      (output.stop_reasons as StopReason[]).length === 0
        ? "READY FOR FIRST SANDBOX POST REVIEW"
        : "STOP — DO NOT POST. RETURN CONTROL TO CHATGPT.",
  });

  console.log(JSON.stringify(output, null, 2));
  process.exit((output.stop_reasons as StopReason[]).length === 0 ? 0 : 2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
