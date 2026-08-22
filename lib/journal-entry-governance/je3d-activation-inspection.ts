/**
 * JE-3D — Read-only Patent #6 activation inspection cockpit.
 * No mutation. No provider calls.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import {
  coerceAttempt,
  coerceExecution,
} from "./provider-attempt-repository";
import type { JournalEntryExecutionRow } from "./execution-types";
import type { JournalEntryProviderAttemptRow } from "./provider-attempt-types";
import {
  assertJe3dSandboxInspectionCustody,
  type Je3dActivationGuardDeps,
} from "./je3d-activation-guards";
import { loadExactExecution } from "./provider-attempt-service";

export type GovernedJeActivationInspection = {
  proposal_id: string;
  approval_id: string;
  execution_id: string;
  execution_status: string;
  state_version: number;
  company_id: string;
  engagement_id: string;
  firm_client_id: string | null;
  accounting_connection_id: string;
  provider_request_hash: string | null;
  correlation_marker: string;
  provider_attempt_id: string | null;
  attempt_status: string | null;
  commit_certainty: string | null;
  qbo_je_id: string | null;
  intuit_tid: string | null;
  dispatch_receipt_id: string | null;
  provider_outcome_receipt_id: string | null;
  verification_receipt_id: string | null;
  provider_response_hash: string | null;
  provider_readback_hash: string | null;
  sandbox_demo_role: string | null;
  canonical_sandbox_connection_id: string | null;
};

type LedgerEventRow = {
  event_id: string;
  event_type: string;
  created_at: string;
};

async function loadLedgerEventsForExecution(
  executionId: string,
): Promise<LedgerEventRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ledger_events")
    .select("event_id, event_type, created_at")
    .eq("entity_type", "journal_entry_execution")
    .eq("entity_id", executionId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (data || []) as LedgerEventRow[];
}

function pickLatestEventId(
  events: LedgerEventRow[],
  eventType: string,
): string | null {
  const matches = events.filter((e) => e.event_type === eventType);
  if (matches.length === 0) return null;
  return String(matches[matches.length - 1]!.event_id);
}

export function buildActivationInspectionFromCustody(args: {
  execution: JournalEntryExecutionRow;
  attempt: JournalEntryProviderAttemptRow | null;
  ledgerEvents: LedgerEventRow[];
  sandboxDemoRole?: string | null;
  canonicalSandboxConnectionId?: string | null;
}): GovernedJeActivationInspection {
  const dispatchReceiptId = pickLatestEventId(
    args.ledgerEvents,
    "journal_entry.provider_dispatch_started",
  );
  const outcomeReceiptId =
    pickLatestEventId(args.ledgerEvents, "journal_entry.provider_posted") ||
    pickLatestEventId(args.ledgerEvents, "journal_entry.post_unknown") ||
    pickLatestEventId(args.ledgerEvents, "journal_entry.provider_commit_discovered");

  return {
    proposal_id: args.execution.proposal_id,
    approval_id: args.execution.approval_id,
    execution_id: args.execution.id,
    execution_status: args.execution.status,
    state_version: args.execution.state_version,
    company_id: args.execution.company_id,
    engagement_id: args.execution.engagement_id,
    firm_client_id: args.execution.firm_client_id ?? null,
    accounting_connection_id: args.execution.accounting_connection_id,
    provider_request_hash: args.execution.provider_request_hash ?? null,
    correlation_marker: args.execution.correlation_marker,
    provider_attempt_id: args.attempt?.id ?? null,
    attempt_status: args.attempt?.status ?? null,
    commit_certainty: args.attempt?.commit_certainty ?? null,
    qbo_je_id: args.attempt?.qbo_je_id ?? args.execution.provider_journal_id ?? null,
    intuit_tid: args.attempt?.intuit_tid ?? null,
    dispatch_receipt_id: dispatchReceiptId,
    provider_outcome_receipt_id: outcomeReceiptId,
    verification_receipt_id:
      args.execution.verification_ledger_event_id ?? null,
    provider_response_hash: args.execution.provider_response_hash ?? null,
    provider_readback_hash: args.execution.provider_readback_hash ?? null,
    sandbox_demo_role: args.sandboxDemoRole ?? null,
    canonical_sandbox_connection_id: args.canonicalSandboxConnectionId ?? null,
  };
}

export type ActivationInspectionDeps = {
  loadExecution?: typeof loadExactExecution;
  loadAttempt?: (executionId: string) => Promise<JournalEntryProviderAttemptRow | null>;
  loadLedgerEvents?: typeof loadLedgerEventsForExecution;
  guardDeps?: Je3dActivationGuardDeps;
};

export async function inspectGovernedJeActivationCustody(
  executionId: string,
  deps: ActivationInspectionDeps = {},
): Promise<GovernedJeActivationInspection> {
  const loadExecution = deps.loadExecution ?? loadExactExecution;
  const executionRow = await loadExecution(executionId);
  if (!executionRow) {
    throw new Error(`journal_entry_execution not found: ${executionId}`);
  }
  const execution = executionRow as JournalEntryExecutionRow;

  const allowlist = await assertJe3dSandboxInspectionCustody({
    execution,
    guardDeps: deps.guardDeps,
  });

  let attempt: JournalEntryProviderAttemptRow | null = null;
  if (deps.loadAttempt) {
    attempt = await deps.loadAttempt(execution.id);
  } else {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("journal_entry_provider_attempts")
      .select("*")
      .eq("execution_id", execution.id)
      .maybeSingle();
    attempt = data ? coerceAttempt(data as Record<string, unknown>) : null;
  }

  const ledgerEvents = deps.loadLedgerEvents
    ? await deps.loadLedgerEvents(execution.id)
    : await loadLedgerEventsForExecution(execution.id);

  return buildActivationInspectionFromCustody({
    execution: coerceExecution(execution as unknown as Record<string, unknown>),
    attempt,
    ledgerEvents,
    sandboxDemoRole: allowlist.demoA?.demoRole ?? null,
    canonicalSandboxConnectionId:
      allowlist.demoA?.accountingConnectionId ?? null,
  });
}
