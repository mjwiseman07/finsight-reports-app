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
import { hashProviderRequestPreview } from "./execution-hash";
import { mapGovernedProposalToQboPayload } from "./execution-payload";
import { loadExactJournalEntryProposal } from "./approval-custody";
import { loadExactExecution } from "./provider-attempt-service";
import type { JournalEntryProposalRow } from "./types";

export type GovernedJeActivationLineInspection = {
  account_id: string;
  account_name: string | null;
  debit_cents: number;
  credit_cents: number;
  class_ref: string | null;
};

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
  realm_id: string | null;
  proposal_hash: string;
  approval_policy_hash: string;
  execution_hash: string;
  provider_request_hash: string | null;
  correlation_marker: string;
  provider_attempt_id: string | null;
  attempt_status: string | null;
  commit_certainty: string | null;
  txn_date: string | null;
  currency: string | null;
  je_lines: GovernedJeActivationLineInspection[];
  total_debits_cents: number;
  total_credits_cents: number;
  private_note_contains_marker: boolean;
  provider_request_hash_reconstructs: boolean;
  qbo_je_id: string | null;
  intuit_tid: string | null;
  dispatch_receipt_id: string | null;
  provider_outcome_receipt_id: string | null;
  verification_receipt_id: string | null;
  provider_response_hash: string | null;
  provider_readback_hash: string | null;
  sandbox_demo_role: string | null;
  canonical_sandbox_connection_id: string | null;
  qbo_post_made: false;
};

import {
  LEDGER_EVENTS_RECEIPT_ID_SELECT,
  type LedgerEventReceiptIdRow,
} from "./ledger-events-schema";

type LedgerEventRow = LedgerEventReceiptIdRow;

async function loadLedgerEventsForExecution(
  executionId: string,
): Promise<LedgerEventRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ledger_events")
    .select(LEDGER_EVENTS_RECEIPT_ID_SELECT)
    .eq("aggregate_type", "journal_entry_execution")
    .eq("aggregate_id", executionId)
    .order("chain_index", { ascending: true, nullsFirst: false })
    .order("event_sequence", { ascending: true });
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

function buildJeLineInspection(args: {
  proposal: JournalEntryProposalRow | null;
  accountNames?: ReadonlyMap<string, string>;
}): GovernedJeActivationLineInspection[] {
  if (!args.proposal?.lines?.length) return [];
  return args.proposal.lines.map((line) => ({
    account_id: String(line.accountId),
    account_name: args.accountNames?.get(String(line.accountId)) ?? null,
    debit_cents: Number(line.debitCents) || 0,
    credit_cents: Number(line.creditCents) || 0,
    class_ref: line.classId ? String(line.classId) : null,
  }));
}

export function buildActivationInspectionFromCustody(args: {
  execution: JournalEntryExecutionRow;
  attempt: JournalEntryProviderAttemptRow | null;
  ledgerEvents: LedgerEventRow[];
  proposal?: JournalEntryProposalRow | null;
  realmId?: string | null;
  accountNames?: ReadonlyMap<string, string>;
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

  const proposal = args.proposal ?? null;
  const payloadPreview = proposal
    ? mapGovernedProposalToQboPayload({
        proposal,
        correlationMarker: args.execution.correlation_marker,
      })
    : null;
  const reconstructedHash = payloadPreview
    ? hashProviderRequestPreview(
        payloadPreview as unknown as Record<string, unknown>,
      )
    : null;
  const persistedHash = args.execution.provider_request_hash ?? null;

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
    realm_id: args.realmId ?? null,
    proposal_hash: args.execution.proposal_hash,
    approval_policy_hash: args.execution.approval_policy_hash,
    execution_hash: args.execution.execution_hash,
    provider_request_hash: persistedHash,
    correlation_marker: args.execution.correlation_marker,
    provider_attempt_id: args.attempt?.id ?? null,
    attempt_status: args.attempt?.status ?? null,
    commit_certainty: args.attempt?.commit_certainty ?? null,
    txn_date: proposal ? String(proposal.txn_date).slice(0, 10) : null,
    currency: proposal ? String(proposal.currency || "USD") : null,
    je_lines: buildJeLineInspection({
      proposal,
      accountNames: args.accountNames,
    }),
    total_debits_cents: proposal ? Number(proposal.total_debits_cents) || 0 : 0,
    total_credits_cents: proposal ? Number(proposal.total_credits_cents) || 0 : 0,
    private_note_contains_marker: payloadPreview
      ? String(payloadPreview.PrivateNote).includes(args.execution.correlation_marker)
      : false,
    provider_request_hash_reconstructs:
      Boolean(reconstructedHash && persistedHash && reconstructedHash === persistedHash),
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
    qbo_post_made: false,
  };
}

export type ActivationInspectionDeps = {
  loadExecution?: typeof loadExactExecution;
  loadProposal?: typeof loadExactJournalEntryProposal;
  loadAttempt?: (executionId: string) => Promise<JournalEntryProviderAttemptRow | null>;
  loadLedgerEvents?: typeof loadLedgerEventsForExecution;
  loadAccountNames?: (
    firmClientId: string | null,
    accountIds: string[],
  ) => Promise<Map<string, string>>;
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

  const coerced = coerceExecution(execution as unknown as Record<string, unknown>);

  let proposal: JournalEntryProposalRow | null = null;
  if (deps.loadProposal) {
    proposal = await deps.loadProposal(coerced.proposal_id);
  } else {
    proposal = await loadExactJournalEntryProposal(coerced.proposal_id);
  }

  let accountNames: Map<string, string> | undefined;
  if (proposal?.lines?.length) {
    const ids = proposal.lines.map((line) => String(line.accountId));
    if (deps.loadAccountNames) {
      accountNames = await deps.loadAccountNames(coerced.firm_client_id ?? null, ids);
    } else {
      accountNames = await loadCoaMirrorAccountNames(
        coerced.firm_client_id ?? null,
        ids,
      );
    }
  }

  return buildActivationInspectionFromCustody({
    execution: coerced,
    attempt,
    ledgerEvents,
    proposal,
    realmId: allowlist.demoA?.realmId ?? null,
    accountNames,
    sandboxDemoRole: allowlist.demoA?.demoRole ?? null,
    canonicalSandboxConnectionId:
      allowlist.demoA?.accountingConnectionId ?? null,
  });
}

async function loadCoaMirrorAccountNames(
  firmClientId: string | null,
  accountIds: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!firmClientId || accountIds.length === 0) return out;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("qbo_coa_mirror")
    .select("account_id, account_name")
    .eq("firm_client_id", firmClientId)
    .in("account_id", accountIds);
  for (const row of data || []) {
    const id = String((row as { account_id: string }).account_id);
    const name = String((row as { account_name: string }).account_name || "");
    if (name) out.set(id, name);
  }
  return out;
}
