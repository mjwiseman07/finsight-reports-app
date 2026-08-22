/**
 * JE-3A — Immutable execution binding comparison.
 * Status is mutable; these fields are not.
 */

import type { JournalEntryExecutionRow } from "./execution-types";
import { JE_EXECUTION_ERROR } from "./execution-types";

/** Fields that define the logical execution identity (immutable after insert). */
export type JeExecutionImmutableBinding = {
  proposal_id: string;
  approval_id: string;
  company_id: string;
  engagement_id: string;
  source_continuous_close_run_id: string;
  source_accounting_sync_id: string;
  accounting_connection_id: string;
  provider: string;
  proposal_hash: string;
  approval_policy_hash: string;
  execution_policy_hash: string;
  execution_hash: string;
  idempotency_key: string;
};

export function extractJeExecutionImmutableBinding(
  row: Pick<
    JournalEntryExecutionRow,
    | "proposal_id"
    | "approval_id"
    | "company_id"
    | "engagement_id"
    | "source_continuous_close_run_id"
    | "source_accounting_sync_id"
    | "accounting_connection_id"
    | "provider"
    | "proposal_hash"
    | "approval_policy_hash"
    | "execution_policy_hash"
    | "execution_hash"
    | "idempotency_key"
  >,
): JeExecutionImmutableBinding {
  return {
    proposal_id: String(row.proposal_id),
    approval_id: String(row.approval_id),
    company_id: String(row.company_id),
    engagement_id: String(row.engagement_id),
    source_continuous_close_run_id: String(row.source_continuous_close_run_id),
    source_accounting_sync_id: String(row.source_accounting_sync_id),
    accounting_connection_id: String(row.accounting_connection_id),
    provider: String(row.provider),
    proposal_hash: String(row.proposal_hash),
    approval_policy_hash: String(row.approval_policy_hash),
    execution_policy_hash: String(row.execution_policy_hash),
    execution_hash: String(row.execution_hash),
    idempotency_key: String(row.idempotency_key),
  };
}

export function jeExecutionBindingsEqual(
  a: JeExecutionImmutableBinding,
  b: JeExecutionImmutableBinding,
): boolean {
  return (
    a.proposal_id === b.proposal_id &&
    a.approval_id === b.approval_id &&
    a.company_id === b.company_id &&
    a.engagement_id === b.engagement_id &&
    a.source_continuous_close_run_id === b.source_continuous_close_run_id &&
    a.source_accounting_sync_id === b.source_accounting_sync_id &&
    a.accounting_connection_id === b.accounting_connection_id &&
    a.provider === b.provider &&
    a.proposal_hash === b.proposal_hash &&
    a.approval_policy_hash === b.approval_policy_hash &&
    a.execution_policy_hash === b.execution_policy_hash &&
    a.execution_hash === b.execution_hash &&
    a.idempotency_key === b.idempotency_key
  );
}

export function assertExactExecutionBindingMatch(args: {
  existing: JeExecutionImmutableBinding;
  requested: JeExecutionImmutableBinding;
}): void {
  if (!jeExecutionBindingsEqual(args.existing, args.requested)) {
    throw Object.assign(
      new Error(
        "Approval already has a governed execution with a different immutable binding.",
      ),
      { code: JE_EXECUTION_ERROR.BINDING_CONFLICT },
    );
  }
}

export function assertProviderRequestHashAligned(args: {
  existingHash: string | null | undefined;
  reconstructedHash: string;
}): void {
  const existing = args.existingHash ? String(args.existingHash) : "";
  if (!existing) return;
  if (existing !== args.reconstructedHash) {
    throw Object.assign(
      new Error(
        "Reconstructed provider request hash does not match persisted provider_request_hash.",
      ),
      { code: JE_EXECUTION_ERROR.BINDING_CONFLICT },
    );
  }
}
