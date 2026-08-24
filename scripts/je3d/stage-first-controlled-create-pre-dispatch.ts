/* eslint-disable no-console */
/**
 * JE-3D — First controlled CREATE activation staging (pre-dispatch STOP).
 *
 * Phase A (read-only): COA candidate report — no auto account selection.
 * Phase B (mutating): proposal → approval → execution → RESERVED attempt
 *   only when explicit reviewed account IDs pass authority checks.
 *
 * STOPS before provider_dispatch_started and before POST /journalentry.
 * No QBO network calls.
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
  buildFirstRunAccountCandidateReport,
  FIRST_RUN_ACCOUNT_APPROVAL_RECOMMENDATION,
  FIRST_RUN_JE_AMOUNT_CENTS,
  FIRST_RUN_JE_CURRENCY,
  resolveFirstRunExplicitAccountEvidence,
  validateExplicitFirstRunAccounts,
  type CoaMirrorAccountRow,
} from "../../lib/journal-entry-governance/je3d-first-run-account-authority";
import {
  createContinuousCloseJournalEntryProposal,
  prepareGovernedJournalEntryExecution,
  reserveGovernedProviderAttempt,
  DEFAULT_JE_PROPOSAL_POLICY,
  DEFAULT_JE_EXECUTION_POLICY,
  inspectGovernedJeActivationCustody,
} from "../../lib/journal-entry-governance";
import type { CreateJeProposalInput } from "../../lib/journal-entry-governance";
import { FIRST_RUN_REASON_CODE } from "../../lib/journal-entry-governance/je3d-first-run-execution-authority";

/** Controlled first-run evidence — not general product authority. */
const FIRST_RUN_JE_EVIDENCE = {
  originType: "ACCRUAL" as const,
  reasonCode: FIRST_RUN_REASON_CODE,
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

async function loadCoaMirrorRows(
  firmClientId: string,
): Promise<CoaMirrorAccountRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("qbo_coa_mirror")
    .select(
      "external_account_id, account_name, account_type, account_subtype, active",
    )
    .eq("firm_client_id", firmClientId);
  if (error) throw error;
  return (data || []).map((row: {
    external_account_id: string;
    account_name: string | null;
    account_type: string | null;
    account_subtype: string | null;
    active: boolean;
  }) => ({
    accountId: String(row.external_account_id),
    accountName: String(row.account_name || ""),
    accountType: String(row.account_type || ""),
    accountSubtype: row.account_subtype ? String(row.account_subtype) : null,
    active: Boolean(row.active),
  }));
}

async function resolveOpenTxnDate(
  firmClientId: string,
): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data: closePeriod } = await supabase
    .from("close_periods")
    .select("period_end, status")
    .eq("firm_client_id", firmClientId)
    .neq("status", "locked")
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();
  return closePeriod?.period_end
    ? String(closePeriod.period_end).slice(0, 10)
    : null;
}

async function auditPrerequisites(args: {
  requireCoaMirror: boolean;
}): Promise<{
  stopReasons: StopReason[];
  engagementId: string | null;
  ccRunId: string | null;
  coaMirrorPresent: boolean;
  sod: {
    proposerUserId: string | null;
    approverUserId: string | null;
    executorUserId: string | null;
  };
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
    .select("external_account_id", { count: "exact", head: true })
    .eq("firm_client_id", firmClientId);

  const coaMirrorPresent = Boolean(coaCount && coaCount > 0);
  if (args.requireCoaMirror && !coaMirrorPresent) {
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
      message:
        "Executor must differ from approver under DEFAULT_JE_EXECUTION_POLICY.",
    });
  }

  return {
    stopReasons,
    engagementId,
    ccRunId,
    coaMirrorPresent,
    sod: { proposerUserId, approverUserId, executorUserId },
  };
}

function accountDetail(candidate: {
  accountId: string;
  accountName: string;
  accountType: string;
  accountSubtype: string | null;
  active: boolean;
}) {
  return {
    account_id: candidate.accountId,
    account_name: candidate.accountName,
    account_type: candidate.accountType,
    account_subtype: candidate.accountSubtype,
    active: candidate.active,
  };
}

async function loadHumanApprovedApprovalForProposal(proposalId: string): Promise<{
  id: string;
  reviewer_user_id: string;
  mfa_level: string | null;
} | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("journal_entry_approvals")
    .select("id, reviewer_user_id, mfa_level, decision, proposal_hash")
    .eq("proposal_id", proposalId)
    .eq("decision", "APPROVED")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: String(data.id),
    reviewer_user_id: String(data.reviewer_user_id),
    mfa_level: data.mfa_level ? String(data.mfa_level) : null,
  };
}

async function main() {
  const policy = resolveJe3dActivationPolicy();
  const accountEvidence = resolveFirstRunExplicitAccountEvidence();
  const output: Record<string, unknown> = {
    base: "4a346b9a1f83d1a3a8e2be4e0f019c086c8c1a46",
    head: null,
    phase: "A",
    CREATE_SANDBOX_JE: isJe3dCreateCapabilityEnabled(policy),
    VERIFY_SANDBOX_JE: isJe3dVerifyCapabilityEnabled(policy),
    sandbox_dispatch_kill_switch: policy.sandboxDispatchKillSwitch,
    memory: policy.memoryWriteAllowed,
    worker: policy.workerAllowed,
    GOVERNED_AUTO: policy.governedAutoAllowed,
    productionAllowed: policy.productionAllowed,
    heuristic_first_account_selection: false,
    human_approval_synthesis_forbidden: true,
    exact_execution_id_required_for_public_create: true,
    first_run_execution_review_required_for_public_create: true,
    explicit_expense_account_id_required: true,
    explicit_accrued_liability_account_id_required: true,
    first_run_expense_account_id: accountEvidence.expenseAccountId,
    first_run_accrued_liability_account_id:
      accountEvidence.accruedLiabilityAccountId,
    first_run_accounts_reviewed_and_approved:
      accountEvidence.accountsReviewedAndApproved,
    company_id: JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId,
    accounting_connection_id: JE_3D_VERIFIED_DEMO_A_IDENTITY.accountingConnectionId,
    realm_id: JE_3D_VERIFIED_DEMO_A_IDENTITY.realmId,
    provider_environment: JE_3D_VERIFIED_DEMO_A_IDENTITY.providerEnvironment,
    je_amount_cents: FIRST_RUN_JE_AMOUNT_CENTS,
    currency: FIRST_RUN_JE_CURRENCY,
    qbo_post_made: false,
    dispatch_receipt_exists: false,
    proposal_created: false,
    qbo_provider_id: null,
    stop_reasons: [] as StopReason[],
    candidate_report: null,
    expense_account: null,
    liability_account: null,
    transaction_date: null,
    cockpit: null,
    recommendation: FIRST_RUN_ACCOUNT_APPROVAL_RECOMMENDATION,
  };

  if (!classifyQbEnvironment(process.env.QB_ENVIRONMENT).ok) {
    output.stop_reasons = [
      {
        code: "invalid_qb_environment",
        message: "QB_ENVIRONMENT must be exactly sandbox.",
      },
    ];
    output.recommendation = "KEEP DRAFT — RETURN CONTROL TO CHATGPT.";
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
    output.recommendation = "KEEP DRAFT — RETURN CONTROL TO CHATGPT.";
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
    output.recommendation = "KEEP DRAFT — RETURN CONTROL TO CHATGPT.";
    console.log(JSON.stringify(output, null, 2));
    process.exit(2);
  }

  const firmClientId = JE_3D_VERIFIED_DEMO_A_IDENTITY.firmClientId;
  const prereqForReport = await auditPrerequisites({ requireCoaMirror: true });
  if (!prereqForReport.coaMirrorPresent) {
    output.stop_reasons = prereqForReport.stopReasons.filter(
      (r) => r.code === "missing_qbo_coa_mirror",
    );
    output.recommendation = "KEEP DRAFT — RETURN CONTROL TO CHATGPT.";
    console.log(JSON.stringify(output, null, 2));
    process.exit(2);
  }

  const mirrorRows = await loadCoaMirrorRows(firmClientId);
  const candidateReport = buildFirstRunAccountCandidateReport({
    firmClientId,
    rows: mirrorRows,
  });
  output.candidate_report = candidateReport;

  const accountAuthority = validateExplicitFirstRunAccounts({
    evidence: accountEvidence,
    mirrorRows,
  });

  if (!accountAuthority.ok) {
    output.stop_reasons = [
      { code: accountAuthority.code, message: accountAuthority.message },
      ...prereqForReport.stopReasons,
    ];
    if (accountEvidence.expenseAccountId) {
      const expenseRow = mirrorRows.find(
        (r) => r.accountId === accountEvidence.expenseAccountId,
      );
      if (expenseRow) output.expense_account = accountDetail(expenseRow);
    }
    if (accountEvidence.accruedLiabilityAccountId) {
      const liabilityRow = mirrorRows.find(
        (r) => r.accountId === accountEvidence.accruedLiabilityAccountId,
      );
      if (liabilityRow) output.liability_account = accountDetail(liabilityRow);
    }
    output.transaction_date = await resolveOpenTxnDate(firmClientId);
    output.recommendation = accountAuthority.recommendation;
    console.log(JSON.stringify(output, null, 2));
    process.exit(2);
  }

  output.expense_account = accountDetail(accountAuthority.expenseCandidate);
  output.liability_account = accountDetail(accountAuthority.liabilityCandidate);
  output.transaction_date = await resolveOpenTxnDate(firmClientId);

  const prereq = await auditPrerequisites({ requireCoaMirror: true });
  if (prereq.stopReasons.length > 0) {
    output.stop_reasons = prereq.stopReasons;
    output.recommendation = "KEEP DRAFT — RETURN CONTROL TO CHATGPT.";
    console.log(JSON.stringify(output, null, 2));
    process.exit(2);
  }

  if (!output.transaction_date) {
    output.stop_reasons = [
      {
        code: "missing_open_period",
        message: "No unlocked close period available for txn date.",
      },
    ];
    output.recommendation = "KEEP DRAFT — RETURN CONTROL TO CHATGPT.";
    console.log(JSON.stringify(output, null, 2));
    process.exit(2);
  }

  output.phase = "B";
  const amount = FIRST_RUN_JE_AMOUNT_CENTS;
  const proposalInput: CreateJeProposalInput = {
    engagementId: String(prereq.engagementId),
    sourceContinuousCloseRunId: String(prereq.ccRunId),
    originType: FIRST_RUN_JE_EVIDENCE.originType,
    reasonCode: FIRST_RUN_JE_EVIDENCE.reasonCode,
    memo: FIRST_RUN_JE_EVIDENCE.memo,
    currency: FIRST_RUN_JE_CURRENCY,
    txnDate: String(output.transaction_date),
    lines: [
      {
        sequence: 1,
        accountId: accountAuthority.expense.accountId,
        debitCents: amount,
        creditCents: 0,
        description: "Immaterial sandbox accrual expense",
      },
      {
        sequence: 2,
        accountId: accountAuthority.liability.accountId,
        debitCents: 0,
        creditCents: amount,
        description: "Accrued liability",
      },
    ],
    expectedEffects: [
      {
        type: "ACCOUNT_RECLASS",
        fromAccountId: accountAuthority.expense.accountId,
        toAccountId: accountAuthority.liability.accountId,
        amountCents: amount,
      },
    ],
    sourceReconRunIds: [],
  };

  const proposerCtx = {
    principal: { type: "user" as const, userId: String(prereq.sod.proposerUserId) },
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
    output.recommendation = "KEEP DRAFT — RETURN CONTROL TO CHATGPT.";
    console.log(JSON.stringify(output, null, 2));
    process.exit(2);
  }
  output.proposal_created = true;
  output.proposal_id = proposalResult.proposal.id;

  const humanApproval = await loadHumanApprovedApprovalForProposal(
    proposalResult.proposal.id,
  );
  if (!humanApproval) {
    output.stop_reasons = [
      {
        code: "human_approval_required",
        message:
          "No APPROVED journal_entry_approvals row exists for this proposal. Staging cannot synthesize human approval/MFA via principal impersonation. Complete JE-2 approval through a verified human session, then re-run staging.",
      },
      ...((output.stop_reasons as StopReason[]) || []),
    ];
    output.distinct_approver_available = Boolean(prereq.sod.approverUserId);
    output.recommendation = "KEEP DRAFT — RETURN CONTROL TO CHATGPT.";
    console.log(JSON.stringify(output, null, 2));
    process.exit(2);
  }

  output.approval_id = humanApproval.id;
  output.human_approval_reviewer_user_id = humanApproval.reviewer_user_id;
  output.human_approval_mfa_level = humanApproval.mfa_level;

  const executorCtx = {
    principal: { type: "user" as const, userId: String(prereq.sod.executorUserId) },
  };

  const executionResult = await prepareGovernedJournalEntryExecution(
    {
      proposalId: proposalResult.proposal.id,
      approvalId: humanApproval.id,
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
    output.approval_id = humanApproval.id;
    output.recommendation = "KEEP DRAFT — RETURN CONTROL TO CHATGPT.";
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
    output.approval_id = humanApproval.id;
    output.execution_id = executionResult.execution.id;
    output.recommendation = "KEEP DRAFT — RETURN CONTROL TO CHATGPT.";
    console.log(JSON.stringify(output, null, 2));
    process.exit(2);
  }

  const stopReasons = output.stop_reasons as StopReason[];
  if (reserveResult.attempt.status !== "RESERVED") {
    stopReasons.push({
      code: "attempt_status_unexpected",
      message: `Expected RESERVED, got ${reserveResult.attempt.status}`,
    });
  }
  if (reserveResult.attempt.commit_certainty !== "NOT_SENT") {
    stopReasons.push({
      code: "commit_certainty_unexpected",
      message: `Expected NOT_SENT, got ${reserveResult.attempt.commit_certainty}`,
    });
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
    debit_account_id: accountAuthority.expense.accountId,
    credit_account_id: accountAuthority.liability.accountId,
    provider_request_hash: cockpit.provider_request_hash,
    correlation_marker: cockpit.correlation_marker,
    dispatch_receipt_exists: Boolean(cockpit.dispatch_receipt_id),
    qbo_provider_id: cockpit.qbo_je_id,
    cockpit,
    recommendation:
      stopReasons.length === 0
        ? "READY FOR FIRST SANDBOX POST REVIEW — RETURN CONTROL TO CHATGPT."
        : "KEEP DRAFT — RETURN CONTROL TO CHATGPT.",
  });

  console.log(JSON.stringify(output, null, 2));
  process.exit(stopReasons.length === 0 ? 0 : 2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
