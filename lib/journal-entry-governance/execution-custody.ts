/**
 * JE-3A — Approval loaders + connection / entitlement / qbo_write gates.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
// @ts-expect-error — entitlements.js is a plain JS module
import { hasFlag } from "@/lib/entitlements.js";
import { selectAccountingConnectionForActiveContext } from "@/lib/integrations/accounting/connection-selection";
import type { AccountingConnectionRecord } from "@/lib/integrations/accounting/types";
import {
  JE_EXECUTION_ERROR,
  type JeExecutionPolicy,
} from "./execution-types";
import {
  JE_APPROVAL_ERROR,
  type JeApprovalMode,
  type JeApprovalDecision,
  type JournalEntryApprovalRow,
} from "./approval-types";
import {
  JeApprovalCustodyError,
  loadExactJournalEntryProposal,
} from "./approval-custody";
import type { JournalEntryProposalRow } from "./types";

export class JeExecutionCustodyError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "JeExecutionCustodyError";
    this.code = code;
  }
}

function coerceApproval(raw: Record<string, unknown>): JournalEntryApprovalRow {
  return {
    id: String(raw.id),
    proposal_id: String(raw.proposal_id),
    company_id: String(raw.company_id),
    engagement_id: String(raw.engagement_id),
    proposal_hash: String(raw.proposal_hash),
    policy_hash: String(raw.policy_hash),
    decision: String(raw.decision) as JeApprovalDecision,
    approval_mode: String(raw.approval_mode) as JeApprovalMode,
    reviewer_user_id: String(raw.reviewer_user_id),
    reviewer_role: raw.reviewer_role ? String(raw.reviewer_role) : null,
    mfa_level: raw.mfa_level ? String(raw.mfa_level) : null,
    mfa_verified_at: raw.mfa_verified_at ? String(raw.mfa_verified_at) : null,
    decision_reason: raw.decision_reason == null ? null : String(raw.decision_reason),
    policy_snapshot: (raw.policy_snapshot as Record<string, unknown>) || {},
    approved_at: String(raw.approved_at),
    idempotency_key: String(raw.idempotency_key),
    created_at: raw.created_at ? String(raw.created_at) : undefined,
  };
}

export async function loadExactJournalEntryApproval(
  approvalId: string,
): Promise<JournalEntryApprovalRow> {
  const id = String(approvalId || "").trim();
  if (!id) {
    throw new JeExecutionCustodyError(
      JE_EXECUTION_ERROR.APPROVAL_REQUIRED,
      "approvalId is required.",
    );
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("journal_entry_approvals")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data?.id) {
    throw new JeExecutionCustodyError(
      JE_EXECUTION_ERROR.APPROVAL_NOT_FOUND,
      `Approval ${id} was not found.`,
    );
  }
  return coerceApproval(data as Record<string, unknown>);
}

/**
 * Exact APPROVED approval bound to exact proposal. Fail closed.
 */
export async function loadExactApprovedApprovalForProposal(args: {
  approvalId: string;
  proposal: JournalEntryProposalRow;
}): Promise<JournalEntryApprovalRow> {
  const approval = await loadExactJournalEntryApproval(args.approvalId);
  if (approval.proposal_id !== args.proposal.id) {
    throw new JeExecutionCustodyError(
      JE_EXECUTION_ERROR.APPROVAL_PROPOSAL_MISMATCH,
      "Approval does not bind the requested proposal.",
    );
  }
  if (approval.decision !== "APPROVED") {
    throw new JeExecutionCustodyError(
      JE_EXECUTION_ERROR.APPROVAL_NOT_APPROVED,
      "Approval decision must be APPROVED.",
    );
  }
  if (approval.approval_mode !== "REVIEW_REQUIRED") {
    throw new JeExecutionCustodyError(
      JE_EXECUTION_ERROR.APPROVAL_MODE_INVALID,
      "Approval mode must be REVIEW_REQUIRED.",
    );
  }
  if (approval.proposal_hash !== args.proposal.proposal_hash) {
    throw new JeExecutionCustodyError(
      JE_EXECUTION_ERROR.APPROVAL_HASH_MISMATCH,
      "Approval proposal_hash does not match proposal.proposal_hash.",
    );
  }
  if (approval.company_id !== args.proposal.company_id) {
    throw new JeExecutionCustodyError(
      JE_EXECUTION_ERROR.APPROVAL_PROPOSAL_MISMATCH,
      "Approval company_id does not match proposal.",
    );
  }
  if (approval.engagement_id !== args.proposal.engagement_id) {
    throw new JeExecutionCustodyError(
      JE_EXECUTION_ERROR.APPROVAL_PROPOSAL_MISMATCH,
      "Approval engagement_id does not match proposal.",
    );
  }
  return approval;
}

export { loadExactJournalEntryProposal, JeApprovalCustodyError };

/**
 * JE write entitlement authority:
 * hasFlag(firm|company, id, "review_assist_write_qbo")
 * which is granted by RA Pro tier or ra_je_write_addon.
 * NOT ap_pay. NOT Pulse writeback (qbo_write_back).
 */
export async function assertJeWriteEntitlement(args: {
  firmId: string | null;
  companyId: string | null;
}): Promise<{ ok: true; resolvedVia: "firm" | "company" }> {
  if (args.firmId) {
    const ok = await hasFlag("firm", args.firmId, "review_assist_write_qbo");
    if (ok) return { ok: true, resolvedVia: "firm" };
  }
  if (args.companyId) {
    const ok = await hasFlag("company", args.companyId, "review_assist_write_qbo");
    if (ok) return { ok: true, resolvedVia: "company" };
  }
  throw new JeExecutionCustodyError(
    JE_EXECUTION_ERROR.ENTITLEMENT_DENIED,
    "review_assist_write_qbo entitlement is required for JE execution (RA Pro / ra_je_write_addon). ap_pay and Pulse writeback are insufficient.",
  );
}

/**
 * Safe qbo_write_enabled gate — DB flag only, no live QBO health network call.
 * Full canPostToQBO (health + token) remains JE-3B concern before actual POST.
 */
export async function assertQboWriteEnabledGate(
  firmClientId: string | null,
): Promise<void> {
  const id = String(firmClientId || "").trim();
  if (!id) {
    throw new JeExecutionCustodyError(
      JE_EXECUTION_ERROR.QBO_WRITE_DISABLED,
      "firm_client_id is required for qbo_write_enabled gate.",
    );
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("firm_clients")
    .select("id, qbo_write_enabled")
    .eq("id", id)
    .maybeSingle();
  if (error || !data?.id) {
    throw new JeExecutionCustodyError(
      JE_EXECUTION_ERROR.QBO_WRITE_DISABLED,
      "firm_client not found for qbo_write_enabled gate.",
    );
  }
  if (!data.qbo_write_enabled) {
    throw new JeExecutionCustodyError(
      JE_EXECUTION_ERROR.QBO_WRITE_DISABLED,
      "qbo_write_enabled is false.",
    );
  }
}

/**
 * Canonical QBO connection for proposal company via selectAccountingConnectionForActiveContext.
 * Caller realm / connection / firm_client-only selection are NOT used.
 */
export async function resolveCanonicalExecutionConnection(args: {
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
  const supabase = getSupabaseAdmin();
  let connection: AccountingConnectionRecord | null = null;
  try {
    connection = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: args.userId,
      companyId: args.companyId,
      sourceSystem: "quickbooks",
      // Intentionally omit connectionId and tenantOrRealmId — company canonical only.
    });
  } catch (err) {
    throw new JeExecutionCustodyError(
      JE_EXECUTION_ERROR.CONNECTION_NOT_FOUND,
      err instanceof Error ? err.message : "Canonical connection selection failed.",
    );
  }
  if (!connection?.id) {
    throw new JeExecutionCustodyError(
      JE_EXECUTION_ERROR.CONNECTION_NOT_FOUND,
      "No canonical connected QuickBooks accounting_connection for company.",
    );
  }
  if (connection.provider !== "quickbooks") {
    throw new JeExecutionCustodyError(
      JE_EXECUTION_ERROR.PROVIDER_UNSUPPORTED,
      "Canonical connection provider must be quickbooks.",
    );
  }
  if (connection.status !== "connected") {
    throw new JeExecutionCustodyError(
      JE_EXECUTION_ERROR.CONNECTION_UNHEALTHY,
      `Connection status is ${connection.status}, expected connected.`,
    );
  }
  return connection;
}

export async function loadEngagementSubscriberIds(
  engagementId: string,
): Promise<{ firmId: string | null; companyId: string | null }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("audit_ready_engagements")
    .select("firm_id, company_id")
    .eq("id", engagementId)
    .maybeSingle();
  if (error || !data) {
    throw new JeExecutionCustodyError(
      JE_EXECUTION_ERROR.WRITE_FORBIDDEN,
      "Engagement not found for entitlement resolution.",
    );
  }
  return {
    firmId: data.firm_id ? String(data.firm_id) : null,
    companyId: data.company_id ? String(data.company_id) : null,
  };
}

/**
 * Reject caller attempts to override custody fields on prepare input.
 * Prepare input only allows proposalId + approvalId.
 */
export function assertNoExecutionCallerOverrides(
  input: Record<string, unknown>,
): void {
  const forbidden = [
    "companyId",
    "company_id",
    "connectionId",
    "accountingConnectionId",
    "accounting_connection_id",
    "realm",
    "realmId",
    "tenantOrRealmId",
    "tenant_or_realm_id",
    "qboRealmId",
  ];
  for (const key of forbidden) {
    if (key in input && input[key] != null && String(input[key]).trim() !== "") {
      throw new JeExecutionCustodyError(
        JE_EXECUTION_ERROR.CALLER_OVERRIDE_FORBIDDEN,
        `Caller must not supply ${key}; custody fields are derived.`,
      );
    }
  }
}
