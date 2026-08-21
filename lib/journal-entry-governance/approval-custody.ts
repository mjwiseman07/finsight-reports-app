/**
 * JE-2 proposal + source custody loaders for approval.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { asIsoDate } from "@/lib/audit-ready/measurement-snapshots/validate";
import {
  JE_APPROVAL_ERROR,
  type JeApprovalCcReadiness,
  type JeApprovalPolicy,
} from "./approval-types";
import type {
  JeProposalOriginType,
  JournalEntryProposalRow,
  JeExpectedEffect,
  JeProposalLine,
} from "./types";
import { verifyMfaStepUpForRequest } from "@/lib/pre-close/mfa-step-up-verify";
import type { JeAuthenticationAssurance } from "./approval-types";

export class JeApprovalCustodyError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "JeApprovalCustodyError";
    this.code = code;
  }
}

function coerceProposal(raw: Record<string, unknown>): JournalEntryProposalRow {
  return {
    id: String(raw.id),
    company_id: String(raw.company_id),
    engagement_id: String(raw.engagement_id),
    firm_client_id: raw.firm_client_id ? String(raw.firm_client_id) : null,
    period_end: String(raw.period_end).slice(0, 10),
    source_continuous_close_run_id: String(raw.source_continuous_close_run_id),
    source_accounting_sync_id: String(raw.source_accounting_sync_id),
    source_recon_run_ids: Array.isArray(raw.source_recon_run_ids)
      ? raw.source_recon_run_ids.map(String)
      : [],
    origin_type: String(raw.origin_type) as JeProposalOriginType,
    reason_code: String(raw.reason_code),
    memo: raw.memo == null ? null : String(raw.memo),
    currency: String(raw.currency),
    txn_date: String(raw.txn_date).slice(0, 10),
    lines: (raw.lines as JeProposalLine[]) || [],
    total_debits_cents: Number(raw.total_debits_cents),
    total_credits_cents: Number(raw.total_credits_cents),
    expected_effects: (raw.expected_effects as JeExpectedEffect[]) || [],
    policy_snapshot: (raw.policy_snapshot as Record<string, unknown>) || {},
    policy_hash: String(raw.policy_hash),
    proposal_hash: String(raw.proposal_hash),
    status: "SUBMITTED",
    proposed_by: String(raw.proposed_by),
    proposed_at: String(raw.proposed_at),
    idempotency_key: String(raw.idempotency_key),
    created_at: raw.created_at ? String(raw.created_at) : undefined,
  };
}

export async function loadExactJournalEntryProposal(
  proposalId: string,
): Promise<JournalEntryProposalRow> {
  const id = String(proposalId || "").trim();
  if (!id) {
    throw new JeApprovalCustodyError(
      JE_APPROVAL_ERROR.PROPOSAL_REQUIRED,
      "proposalId is required.",
    );
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("journal_entry_proposals")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data?.id) {
    throw new JeApprovalCustodyError(
      JE_APPROVAL_ERROR.PROPOSAL_NOT_FOUND,
      `Proposal ${id} was not found.`,
    );
  }
  if (String(data.status) !== "SUBMITTED") {
    throw new JeApprovalCustodyError(
      JE_APPROVAL_ERROR.PROPOSAL_STATUS_INVALID,
      "Proposal status must be SUBMITTED.",
    );
  }
  return coerceProposal(data as Record<string, unknown>);
}

export type ApprovalSourceCc = {
  id: string;
  engagementId: string;
  companyId: string;
  accountingSyncId: string;
  periodEnd: string;
  readiness: string | null;
  status: string;
  mode: string;
};

export async function loadExactProposalSourceCc(args: {
  runId: string;
  expectedEngagementId: string;
  expectedCompanyId: string;
  expectedAccountingSyncId: string;
}): Promise<ApprovalSourceCc> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("continuous_close_runs")
    .select(
      "id, engagement_id, company_id, accounting_sync_id, period_end, readiness, status, mode",
    )
    .eq("id", args.runId)
    .maybeSingle();
  if (error || !data?.id) {
    throw new JeApprovalCustodyError(
      JE_APPROVAL_ERROR.SOURCE_CC_MISSING,
      "Source continuous_close_runs row was not found.",
    );
  }
  if (String(data.engagement_id) !== args.expectedEngagementId) {
    throw new JeApprovalCustodyError(
      JE_APPROVAL_ERROR.SOURCE_CC_MISSING,
      "Source CC engagement mismatch.",
    );
  }
  if (String(data.company_id) !== args.expectedCompanyId) {
    throw new JeApprovalCustodyError(
      JE_APPROVAL_ERROR.SOURCE_CC_MISSING,
      "Source CC company mismatch.",
    );
  }
  if (String(data.accounting_sync_id) !== args.expectedAccountingSyncId) {
    throw new JeApprovalCustodyError(
      JE_APPROVAL_ERROR.SOURCE_SYNC_MISSING,
      "Source CC accounting_sync_id mismatch — sync id never changes.",
    );
  }
  return {
    id: String(data.id),
    engagementId: String(data.engagement_id),
    companyId: String(data.company_id),
    accountingSyncId: String(data.accounting_sync_id),
    periodEnd: asIsoDate(data.period_end) || String(data.period_end).slice(0, 10),
    readiness: data.readiness ? String(data.readiness) : null,
    status: String(data.status),
    mode: String(data.mode),
  };
}

export async function assertSourceCcNotSuperseded(runId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("continuous_close_runs")
    .select("id")
    .eq("supersedes_run_id", runId)
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new JeApprovalCustodyError(
      JE_APPROVAL_ERROR.SOURCE_CC_SUPERSEDED,
      error.message,
    );
  }
  if (data?.id) {
    throw new JeApprovalCustodyError(
      JE_APPROVAL_ERROR.SOURCE_CC_SUPERSEDED,
      "Source Continuous Close run has been superseded by a later evaluation.",
    );
  }
}

export async function assertSourceAccountingSyncExists(
  accountingSyncId: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("accounting_syncs")
    .select("id")
    .eq("id", accountingSyncId)
    .maybeSingle();
  if (error || !data?.id) {
    throw new JeApprovalCustodyError(
      JE_APPROVAL_ERROR.SOURCE_SYNC_MISSING,
      "Source accounting_syncs row was not found.",
    );
  }
}

export async function assertSourceReconRunsExist(runIds: string[]): Promise<void> {
  const ids = [...new Set(runIds.map(String).filter(Boolean))];
  if (ids.length === 0) return;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("audit_ready_tie_out_runs")
    .select("id")
    .in("id", ids);
  if (error) {
    throw new JeApprovalCustodyError(
      JE_APPROVAL_ERROR.SOURCE_RECON_MISSING,
      error.message,
    );
  }
  const found = new Set((data || []).map((r: { id: string }) => String(r.id)));
  for (const id of ids) {
    if (!found.has(id)) {
      throw new JeApprovalCustodyError(
        JE_APPROVAL_ERROR.SOURCE_RECON_MISSING,
        `Source recon run ${id} was not found.`,
      );
    }
  }
}

export function assertSourceCcReadinessAllowed(args: {
  readiness: string | null;
  policy: JeApprovalPolicy;
}): void {
  const allowed = args.policy.requireSourceCcReadiness;
  if (!allowed || allowed.length === 0) return;
  const readiness = String(args.readiness || "") as JeApprovalCcReadiness;
  if (!allowed.map(String).includes(readiness)) {
    throw new JeApprovalCustodyError(
      JE_APPROVAL_ERROR.SOURCE_CC_READINESS,
      `Source CC readiness ${readiness || "null"} is not allowed by approval policy.`,
    );
  }
}

export async function loadPriorRejection(args: {
  proposalId: string;
  proposalHash: string;
  approvalPolicyHash: string;
}): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("journal_entry_approvals")
    .select("id")
    .eq("proposal_id", args.proposalId)
    .eq("proposal_hash", args.proposalHash)
    .eq("policy_hash", args.approvalPolicyHash)
    .eq("decision", "REJECTED")
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new JeApprovalCustodyError(
      JE_APPROVAL_ERROR.PERSIST_FAILED,
      error.message,
    );
  }
  return Boolean(data?.id);
}

export async function loadEngagementFirmId(
  engagementId: string,
): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("audit_ready_engagements")
    .select("firm_id")
    .eq("id", engagementId)
    .maybeSingle();
  return data?.firm_id ? String(data.firm_id) : null;
}

/**
 * Production MFA assurance resolver — trusted cookie step-up only.
 * Never accepts a caller-supplied mfaVerified boolean.
 */
export async function resolveJeAuthenticationAssurance(
  userId: string,
): Promise<JeAuthenticationAssurance> {
  try {
    const result = await verifyMfaStepUpForRequest(userId);
    if (result.ok) {
      return {
        satisfied: true,
        level: "aal2",
        verifiedAt: result.verifiedAt.toISOString(),
        method: result.method,
        source: "mfa_step_up_cookie",
      };
    }
  } catch {
    // cookies()/request unavailable outside Next request — treat as unsatisfied
  }
  return {
    satisfied: false,
    level: "none",
    verifiedAt: null,
    method: null,
    source: "none",
  };
}

export function mfaRequiredForProposal(args: {
  policy: JeApprovalPolicy;
  totalDebitsCents: number;
}): boolean {
  if (args.policy.alwaysRequireMfa) return true;
  if (
    args.policy.mfaRequiredAboveCents != null &&
    Number.isFinite(args.policy.mfaRequiredAboveCents) &&
    args.totalDebitsCents >= args.policy.mfaRequiredAboveCents
  ) {
    return true;
  }
  return false;
}
