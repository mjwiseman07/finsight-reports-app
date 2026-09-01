/**
 * Sandbox-gated JE proposal + approval orchestration.
 * Persist only proposal/approval rows + Patent #6 journal_entry_proposal events.
 * No execution prepare, provider attempt, QBO, Memory, or capability flips.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import {
  createContinuousCloseJournalEntryProposal,
  DEFAULT_JE_PROPOSAL_POLICY,
} from "./service";
import {
  decideJournalEntryProposal,
  DEFAULT_JE_APPROVAL_POLICY,
} from "./approval-service";
import { buildBsAccountGlDeltaExpectedEffect } from "./je3d-bs-account-source-authority-contract";
import {
  assertPatent6ChainReceiptCustody,
  LEDGER_EVENTS_PATENT6_CHAIN_SELECT,
  parseLedgerEventPatent6ChainRow,
  type LedgerEventPatent6ChainRow,
} from "./ledger-events-schema";
import {
  isSandboxJeCockpitRuntimeEnabled,
  assertSandboxCockpitQbEnvironment,
  rejectSandboxCockpitRequestOverrides,
} from "./sandbox-je-cockpit-api";
import type { Patent6ChainReceiptEvent } from "./sandbox-je-cockpit-shared";
import {
  JE_3D_VERIFIED_DEMO_A_IDENTITY,
  SANDBOX_JE_DESIGNATED_APPROVER_EMAIL,
  SANDBOX_JE_DESIGNATED_APPROVER_USER_ID,
  SANDBOX_JE_LOCKED_AMOUNT_CENTS,
  SANDBOX_JE_LOCKED_CREDIT_ACCOUNT_ID,
  SANDBOX_JE_LOCKED_CURRENCY,
  SANDBOX_JE_LOCKED_DEBIT_ACCOUNT_ID,
  SANDBOX_JE_LOCKED_ORIGIN,
  SANDBOX_JE_REASON_CODE,
  type SafeSandboxApprovalSummary,
  type SafeSandboxDecisionResponse,
  type SafeSandboxProposalResponse,
} from "./sandbox-je-proposal-shared";
import {
  resolveLatestUniqueEligibleDemoASourceCustody,
  SandboxJeSourceCustodyError,
} from "./sandbox-je-proposal-source";
import type { JeApprovalPolicy } from "./approval-types";
import type { JeProposalPolicy } from "./types";

export class SandboxJeProposalApiError extends Error {
  code: string;
  httpStatus: number;

  constructor(code: string, message: string, httpStatus = 400) {
    super(message);
    this.name = "SandboxJeProposalApiError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

const PROPOSAL_ALLOWED_BODY_KEYS = new Set([
  "memo",
  "txnDate",
  "txn_date",
  "clientMutationId",
  "client_mutation_id",
]);

const DECISION_ALLOWED_BODY_KEYS = new Set([
  "decision",
  "reason",
  "clientMutationId",
  "client_mutation_id",
]);

export const SANDBOX_JE_APPROVAL_POLICY: JeApprovalPolicy = {
  ...DEFAULT_JE_APPROVAL_POLICY,
  alwaysRequireMfa: true,
  mfaRequiredAboveCents: null,
  allowSuperAdminApproval: false,
  requireSourceCcReadiness: ["READY"],
  maxApprovalAmountCents: SANDBOX_JE_LOCKED_AMOUNT_CENTS,
};

export const SANDBOX_JE_PROPOSAL_POLICY: JeProposalPolicy = {
  ...DEFAULT_JE_PROPOSAL_POLICY,
  maxProposalAmountCents: SANDBOX_JE_LOCKED_AMOUNT_CENTS,
  requireAuthoritativeReconSource: true,
  requireExpectedEffects: true,
};

const LOCKED_CAPABILITIES = {
  create_sandbox_je: false,
  verify_sandbox_je: false,
  memory: false,
  worker: false,
  governed_auto: false,
  dispatch_kill_switch_engaged: true,
  post_disabled: true,
  verify_disabled: true,
  execution_prepare_disabled: true,
} as const;

export function assertSandboxJeProposalRuntimeEnabled(): void {
  if (!isSandboxJeCockpitRuntimeEnabled()) {
    throw new SandboxJeProposalApiError(
      "sandbox_je_not_found",
      "Not found",
      404,
    );
  }
  assertSandboxCockpitQbEnvironment();
}

function requireClientMutationId(raw: unknown): string {
  const value = String(raw || "").trim();
  if (!value || value.length < 8 || value.length > 128) {
    throw new SandboxJeProposalApiError(
      "sandbox_je_client_mutation_id_required",
      "clientMutationId is required (8–128 chars).",
      400,
    );
  }
  return value;
}

function rejectUnknownKeys(
  body: Record<string, unknown>,
  allowed: Set<string>,
): void {
  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) {
      throw new SandboxJeProposalApiError(
        "sandbox_je_unknown_field",
        `Unknown field '${key}' is forbidden.`,
        400,
      );
    }
  }
}

export async function loadPatent6ProposalChainReceiptEvents(
  proposalId: string,
): Promise<Patent6ChainReceiptEvent[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ledger_events")
    .select(LEDGER_EVENTS_PATENT6_CHAIN_SELECT)
    .eq("aggregate_type", "journal_entry_proposal")
    .eq("aggregate_id", proposalId)
    .order("chain_index", { ascending: true, nullsFirst: false })
    .order("event_sequence", { ascending: true });
  if (error) {
    throw new SandboxJeProposalApiError(
      "sandbox_je_patent6_load_failed",
      `Failed to load Patent #6 proposal chain: ${error.message}`,
      500,
    );
  }
  const parsed = (data || []).map((row: Record<string, unknown>) =>
    parseLedgerEventPatent6ChainRow(row),
  );
  assertPatent6ChainReceiptCustody({
    executionId: proposalId,
    events: parsed,
    verificationReceiptId: null,
    aggregateType: "journal_entry_proposal",
  });
  return parsed.map((row: LedgerEventPatent6ChainRow) => ({
    event_id: row.event_id,
    event_type: row.event_type,
    event_hash: row.event_hash,
    previous_event_hash: row.previous_event_hash,
    chain_index: row.chain_index,
    event_sequence: row.event_sequence,
    aggregate_type: row.aggregate_type,
    aggregate_id: row.aggregate_id,
    occurred_at: row.occurred_at,
    recorded_at: row.recorded_at,
  }));
}

async function loadApprovalsForProposal(
  proposalId: string,
): Promise<SafeSandboxApprovalSummary[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("journal_entry_approvals")
    .select(
      "id, decision, decided_at, reviewer_user_id, reason, mfa_level, proposal_hash",
    )
    .eq("proposal_id", proposalId)
    .order("decided_at", { ascending: true });
  if (error) {
    throw new SandboxJeProposalApiError(
      "sandbox_je_approvals_load_failed",
      error.message,
      500,
    );
  }
  return (data || []).map(
    (row: {
      id: string;
      decision: string;
      decided_at: string;
      reviewer_user_id: string;
      reason: string | null;
      mfa_level: string | null;
      proposal_hash: string;
    }) => ({
      approval_id: String(row.id),
      decision: String(row.decision) as "APPROVED" | "REJECTED",
      decided_at: String(row.decided_at),
      reviewer_user_id: String(row.reviewer_user_id),
      reason: row.reason == null ? null : String(row.reason),
      mfa_level: row.mfa_level == null ? null : String(row.mfa_level),
      proposal_hash: String(row.proposal_hash),
    }),
  );
}

function mapProposalRowToSafeResponse(args: {
  proposal: {
    id: string;
    status: string;
    proposal_hash: string;
    currency: string;
    total_debits_cents: number;
    txn_date: string;
    memo: string | null;
    origin_type: string;
    reason_code: string;
    lines: Array<{ accountId: string; debitCents: number; creditCents: number }>;
    proposed_by: string;
    proposed_at: string;
    period_end: string;
    source_continuous_close_run_id: string;
    source_accounting_sync_id: string;
    source_recon_run_ids: string[];
    firm_client_id: string | null;
    company_id: string;
    engagement_id: string;
  };
  reused: boolean;
  clientMutationId: string | null;
  events: Patent6ChainReceiptEvent[];
  approvals: SafeSandboxApprovalSummary[];
}): SafeSandboxProposalResponse {
  const debit = args.proposal.lines.find((l) => l.debitCents > 0);
  const credit = args.proposal.lines.find((l) => l.creditCents > 0);
  if (
    args.proposal.company_id !== JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId ||
    args.proposal.firm_client_id !== JE_3D_VERIFIED_DEMO_A_IDENTITY.firmClientId ||
    debit?.accountId !== SANDBOX_JE_LOCKED_DEBIT_ACCOUNT_ID ||
    credit?.accountId !== SANDBOX_JE_LOCKED_CREDIT_ACCOUNT_ID ||
    args.proposal.total_debits_cents !== SANDBOX_JE_LOCKED_AMOUNT_CENTS ||
    args.proposal.currency !== SANDBOX_JE_LOCKED_CURRENCY ||
    args.proposal.origin_type !== SANDBOX_JE_LOCKED_ORIGIN
  ) {
    throw new SandboxJeProposalApiError(
      "sandbox_je_proposal_not_demo_a",
      "Proposal does not bind to locked Demo A sandbox economics.",
      404,
    );
  }

  return {
    proposal_id: args.proposal.id,
    status: args.proposal.status,
    proposal_hash: args.proposal.proposal_hash,
    currency: SANDBOX_JE_LOCKED_CURRENCY,
    amount_cents: SANDBOX_JE_LOCKED_AMOUNT_CENTS,
    txn_date: args.proposal.txn_date,
    memo: args.proposal.memo,
    origin_type: SANDBOX_JE_LOCKED_ORIGIN,
    reason_code: SANDBOX_JE_REASON_CODE,
    debit_account_id: SANDBOX_JE_LOCKED_DEBIT_ACCOUNT_ID,
    credit_account_id: SANDBOX_JE_LOCKED_CREDIT_ACCOUNT_ID,
    proposed_by: args.proposal.proposed_by,
    proposed_at: args.proposal.proposed_at,
    period_end: args.proposal.period_end,
    source_continuous_close_run_id: args.proposal.source_continuous_close_run_id,
    source_accounting_sync_id: args.proposal.source_accounting_sync_id,
    source_recon_run_ids: args.proposal.source_recon_run_ids,
    firm_client_id: args.proposal.firm_client_id,
    company_id: args.proposal.company_id,
    engagement_id: args.proposal.engagement_id,
    reused: args.reused,
    client_mutation_id: args.clientMutationId,
    demo_a: JE_3D_VERIFIED_DEMO_A_IDENTITY,
    capabilities: LOCKED_CAPABILITIES,
    patent6_chain_receipt: {
      aggregate_type: "journal_entry_proposal",
      aggregate_id: args.proposal.id,
      events: args.events,
    },
    approvals: args.approvals,
  };
}

export function parseSandboxJeProposalBody(body: unknown): {
  memo: string | null;
  txnDate: string | null;
  clientMutationId: string;
} {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new SandboxJeProposalApiError(
      "sandbox_je_body_invalid",
      "JSON object body is required.",
      400,
    );
  }
  const record = body as Record<string, unknown>;
  rejectUnknownKeys(record, PROPOSAL_ALLOWED_BODY_KEYS);
  const clientMutationId = requireClientMutationId(
    record.clientMutationId ?? record.client_mutation_id,
  );
  const memoRaw = record.memo;
  const txnRaw = record.txnDate ?? record.txn_date;
  return {
    memo: memoRaw == null ? null : String(memoRaw),
    txnDate: txnRaw == null || String(txnRaw).trim() === ""
      ? null
      : String(txnRaw).slice(0, 10),
    clientMutationId,
  };
}

export function parseSandboxJeDecisionBody(body: unknown): {
  decision: "APPROVED" | "REJECTED";
  reason: string | null;
  clientMutationId: string;
} {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new SandboxJeProposalApiError(
      "sandbox_je_body_invalid",
      "JSON object body is required.",
      400,
    );
  }
  const record = body as Record<string, unknown>;
  rejectUnknownKeys(record, DECISION_ALLOWED_BODY_KEYS);
  const clientMutationId = requireClientMutationId(
    record.clientMutationId ?? record.client_mutation_id,
  );
  const decision = String(record.decision || "").trim().toUpperCase();
  if (decision !== "APPROVED" && decision !== "REJECTED") {
    throw new SandboxJeProposalApiError(
      "sandbox_je_decision_invalid",
      "decision must be APPROVED or REJECTED.",
      400,
    );
  }
  const reason =
    record.reason == null || String(record.reason).trim() === ""
      ? null
      : String(record.reason).trim();
  if (decision === "REJECTED" && !reason) {
    throw new SandboxJeProposalApiError(
      "sandbox_je_reason_required",
      "reason is required when decision is REJECTED.",
      400,
    );
  }
  return {
    decision,
    reason,
    clientMutationId,
  };
}

export function assertDesignatedSandboxApprover(args: {
  userId: string;
  email: string | null | undefined;
}): void {
  if (args.userId !== SANDBOX_JE_DESIGNATED_APPROVER_USER_ID) {
    throw new SandboxJeProposalApiError(
      "sandbox_je_approver_denied",
      "Reviewer is not the designated Demo A sandbox approver.",
      403,
    );
  }
  const email = String(args.email || "").trim().toLowerCase();
  if (email !== SANDBOX_JE_DESIGNATED_APPROVER_EMAIL) {
    throw new SandboxJeProposalApiError(
      "sandbox_je_approver_identity_mismatch",
      "Authenticated email does not bind to the designated approver identity.",
      403,
    );
  }
}

export async function createSandboxJeProposal(args: {
  request: Request;
  proposerUserId: string;
  body: unknown;
}): Promise<SafeSandboxProposalResponse> {
  assertSandboxJeProposalRuntimeEnabled();
  rejectSandboxCockpitRequestOverrides(args.request);
  const ux = parseSandboxJeProposalBody(args.body);
  const source = await resolveLatestUniqueEligibleDemoASourceCustody();

  const effectBuild = buildBsAccountGlDeltaExpectedEffect({
    sourceRunId: source.bsReconRunId,
    qboAccountId: SANDBOX_JE_LOCKED_CREDIT_ACCOUNT_ID,
    classification: "Liability",
    baselineGlBalanceCents: source.baselineGlBalanceCents,
    creditCents: SANDBOX_JE_LOCKED_AMOUNT_CENTS,
  });
  if (!effectBuild.ok) {
    throw new SandboxJeProposalApiError(
      effectBuild.code,
      effectBuild.message,
      400,
    );
  }

  const txnDate = ux.txnDate || source.periodEnd;
  const memo =
    ux.memo?.trim() ||
    "Sandbox JE cockpit governed accrual (custody only; no provider dispatch)";

  const result = await createContinuousCloseJournalEntryProposal(
    {
      engagementId: source.engagementId,
      sourceContinuousCloseRunId: source.continuousCloseRunId,
      originType: SANDBOX_JE_LOCKED_ORIGIN,
      reasonCode: SANDBOX_JE_REASON_CODE,
      memo,
      currency: SANDBOX_JE_LOCKED_CURRENCY,
      txnDate,
      lines: [
        {
          sequence: 1,
          accountId: SANDBOX_JE_LOCKED_DEBIT_ACCOUNT_ID,
          debitCents: SANDBOX_JE_LOCKED_AMOUNT_CENTS,
          creditCents: 0,
          description: "Office Expenses",
        },
        {
          sequence: 2,
          accountId: SANDBOX_JE_LOCKED_CREDIT_ACCOUNT_ID,
          debitCents: 0,
          creditCents: SANDBOX_JE_LOCKED_AMOUNT_CENTS,
          description: "Accrued Expenses - Advisacor Test",
        },
      ],
      expectedEffects: [
        effectBuild.effect as import("./types").JeExpectedEffect,
      ],
      sourceReconRunIds: [source.bsReconRunId],
    },
    { principal: { type: "user", userId: args.proposerUserId } },
    SANDBOX_JE_PROPOSAL_POLICY,
  );

  if (!result.ok) {
    throw new SandboxJeProposalApiError(result.code, result.message, 400);
  }

  const events = await loadPatent6ProposalChainReceiptEvents(result.proposal.id);
  const approvals = await loadApprovalsForProposal(result.proposal.id);
  return mapProposalRowToSafeResponse({
    proposal: result.proposal,
    reused: result.reused,
    clientMutationId: ux.clientMutationId,
    events,
    approvals,
  });
}

export async function getSandboxJeProposal(args: {
  request: Request;
  proposalId: string;
}): Promise<SafeSandboxProposalResponse> {
  assertSandboxJeProposalRuntimeEnabled();
  rejectSandboxCockpitRequestOverrides(args.request);
  const proposalId = String(args.proposalId || "").trim();
  if (!proposalId) {
    throw new SandboxJeProposalApiError(
      "sandbox_je_proposal_id_required",
      "proposalId is required.",
      400,
    );
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("journal_entry_proposals")
    .select("*")
    .eq("id", proposalId)
    .maybeSingle();
  if (error) {
    throw new SandboxJeProposalApiError(
      "sandbox_je_proposal_load_failed",
      error.message,
      500,
    );
  }
  if (!data?.id) {
    throw new SandboxJeProposalApiError(
      "sandbox_je_proposal_not_found",
      "Proposal was not found.",
      404,
    );
  }

  const events = await loadPatent6ProposalChainReceiptEvents(proposalId);
  const approvals = await loadApprovalsForProposal(proposalId);
  return mapProposalRowToSafeResponse({
    proposal: {
      id: String(data.id),
      status: String(data.status),
      proposal_hash: String(data.proposal_hash),
      currency: String(data.currency),
      total_debits_cents: Number(data.total_debits_cents),
      txn_date: String(data.txn_date).slice(0, 10),
      memo: data.memo == null ? null : String(data.memo),
      origin_type: String(data.origin_type),
      reason_code: String(data.reason_code),
      lines: (data.lines || []) as Array<{
        accountId: string;
        debitCents: number;
        creditCents: number;
      }>,
      proposed_by: String(data.proposed_by),
      proposed_at: String(data.proposed_at),
      period_end: String(data.period_end).slice(0, 10),
      source_continuous_close_run_id: String(data.source_continuous_close_run_id),
      source_accounting_sync_id: String(data.source_accounting_sync_id),
      source_recon_run_ids: (data.source_recon_run_ids || []).map(String),
      firm_client_id: data.firm_client_id ? String(data.firm_client_id) : null,
      company_id: String(data.company_id),
      engagement_id: String(data.engagement_id),
    },
    reused: false,
    clientMutationId: null,
    events,
    approvals,
  });
}

export async function decideSandboxJeProposal(args: {
  request: Request;
  proposalId: string;
  reviewerUserId: string;
  reviewerEmail: string | null | undefined;
  body: unknown;
}): Promise<SafeSandboxDecisionResponse> {
  assertSandboxJeProposalRuntimeEnabled();
  rejectSandboxCockpitRequestOverrides(args.request);
  assertDesignatedSandboxApprover({
    userId: args.reviewerUserId,
    email: args.reviewerEmail,
  });
  const parsed = parseSandboxJeDecisionBody(args.body);

  // Load proposal first to enforce SoD against proposer and Demo A bind.
  const existing = await getSandboxJeProposal({
    request: args.request,
    proposalId: args.proposalId,
  });
  if (existing.proposed_by === args.reviewerUserId) {
    throw new SandboxJeProposalApiError(
      "sandbox_je_sod_violation",
      "Designated approver must be distinct from the proposer.",
      403,
    );
  }

  const result = await decideJournalEntryProposal(
    {
      proposalId: args.proposalId,
      decision: parsed.decision,
      reason: parsed.reason,
    },
    { principal: { type: "user", userId: args.reviewerUserId } },
    SANDBOX_JE_APPROVAL_POLICY,
  );

  if (!result.ok) {
    const status =
      result.code.includes("mfa") || result.code.includes("MFA")
        ? 403
        : result.code.includes("sod") || result.code.includes("SOD")
          ? 403
          : 400;
    throw new SandboxJeProposalApiError(result.code, result.message, status);
  }

  const events = await loadPatent6ProposalChainReceiptEvents(args.proposalId);
  return {
    approval_id: result.approval.id,
    proposal_id: args.proposalId,
    decision: parsed.decision,
    proposal_hash: existing.proposal_hash,
    reused: result.reused,
    client_mutation_id: parsed.clientMutationId,
    mfa_required: true,
    mfa_satisfied: true,
    patent6_chain_receipt: {
      aggregate_type: "journal_entry_proposal",
      aggregate_id: args.proposalId,
      events,
    },
    capabilities: LOCKED_CAPABILITIES,
  };
}

export function mapSandboxJeProposalError(err: unknown): {
  status: number;
  body: { error: string; code?: string };
} {
  if (err instanceof SandboxJeProposalApiError) {
    if (err.code === "sandbox_je_not_found") {
      return { status: 404, body: { error: "Not found" } };
    }
    return {
      status: err.httpStatus,
      body: { error: err.message, code: err.code },
    };
  }
  if (err instanceof SandboxJeSourceCustodyError) {
    return {
      status: 409,
      body: { error: err.message, code: err.code },
    };
  }
  if (err && typeof err === "object" && "code" in err && "message" in err) {
    const code = String((err as { code: string }).code || "");
    if (code.includes("CALLER_OVERRIDE") || code.includes("caller_override")) {
      return {
        status: 400,
        body: {
          error: String((err as { message: string }).message),
          code,
        },
      };
    }
  }
  if (err instanceof Error) {
    return { status: 500, body: { error: err.message } };
  }
  return { status: 500, body: { error: "Unexpected sandbox JE error." } };
}
