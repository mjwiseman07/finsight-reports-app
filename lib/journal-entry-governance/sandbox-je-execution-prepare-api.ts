/**
 * Sandbox two-person mechanical execution-preparation API.
 * Stops before provider attempt, token access, QBO, or Memory.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import {
  assertJe3dPrepareActivationPolicy,
} from "./je3d-activation-guards";
import {
  JE_3D_ACTIVATION_ERROR,
  Je3dActivationError,
  isJe3dPrepareCapabilityEnabled,
} from "./je3d-activation-policy";
import { resolveJe3dActivationPolicy, JE_3D_VERIFIED_DEMO_A_IDENTITY } from "./je3d-first-controlled-create-activation";
import { assertSandboxCockpitQbEnvironment } from "./sandbox-je-cockpit-api";
import { resolveJeAuthenticationAssurance } from "./approval-custody";
import {
  assertDesignatedSandboxApprover,
  assertSandboxJeProposalRuntimeEnabled,
} from "./sandbox-je-proposal-api";
import {
  isStrictProposalUuid,
  SANDBOX_JE_DESIGNATED_PROPOSER_USER_ID,
} from "./sandbox-je-proposal-shared";
import {
  isSandboxJeCockpitRuntimeEnabled,
} from "./sandbox-je-cockpit-api";
import {
  assertPatent6ChainReceiptCustody,
  LEDGER_EVENTS_PATENT6_CHAIN_SELECT,
  parseLedgerEventPatent6ChainRow,
} from "./ledger-events-schema";
import type { Patent6ChainReceiptEvent } from "./sandbox-je-cockpit-shared";
import {
  SANDBOX_JE_ACCEPTED_APPROVAL_ID,
  SANDBOX_JE_ACCEPTED_PROPOSAL_ID,
  type SafeSandboxPrepareResponse,
  type SandboxJePrepareCapabilityState,
} from "./sandbox-je-execution-prepare-shared";
import {
  SANDBOX_TWO_PERSON_PREPARE_AUTHORITY_V1,
  SANDBOX_TWO_PERSON_PREPARATION_MODE,
} from "./sandbox-two-person-prepare-policy";
import { executeSandboxTwoPersonMechanicalPrepare } from "./sandbox-two-person-prepare-core";
import { JE_EXECUTION_ERROR } from "./execution-types";

export class SandboxJePrepareApiError extends Error {
  code: string;
  httpStatus: number;

  constructor(code: string, message: string, httpStatus = 400) {
    super(message);
    this.name = "SandboxJePrepareApiError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

const FORBIDDEN_BODY_KEYS = new Set([
  "approvalId",
  "approval_id",
  "companyId",
  "company_id",
  "connectionId",
  "connection_id",
  "accountingConnectionId",
  "accounting_connection_id",
  "realmId",
  "realm_id",
  "amount",
  "amountCents",
  "amount_cents",
  "currency",
  "txnDate",
  "txn_date",
  "proposalHash",
  "proposal_hash",
  "approvalHash",
  "approval_hash",
  "executionPolicy",
  "execution_policy",
  "executionHash",
  "execution_hash",
  "correlationMarker",
  "correlation_marker",
  "mfaVerifiedAt",
  "mfa_verified_at",
  "clientMutationId",
  "client_mutation_id",
  "debitAccountId",
  "creditAccountId",
  "providerEnvironment",
  "provider_environment",
]);

export function resolveSandboxJePrepareCapabilityState(): SandboxJePrepareCapabilityState {
  const policy = resolveJe3dActivationPolicy();
  const prepareEnabled = isJe3dPrepareCapabilityEnabled(policy);
  return {
    prepare_sandbox_je: prepareEnabled,
    create_sandbox_je: false,
    verify_sandbox_je: false,
    memory: false,
    worker: false,
    governed_auto: false,
    dispatch_kill_switch_engaged: true,
    post_disabled: true,
    verify_disabled: true,
    execution_prepare_disabled: !prepareEnabled,
  };
}

export function assertSandboxJePrepareRuntimeEnabled(): void {
  if (!isSandboxJeCockpitRuntimeEnabled()) {
    throw new SandboxJePrepareApiError(
      "sandbox_je_not_found",
      "Not found",
      404,
    );
  }
  assertSandboxJeProposalRuntimeEnabled();
  assertSandboxCockpitQbEnvironment();
}

export function assertPrepareCapabilityBeforeWrites(): void {
  try {
    assertJe3dPrepareActivationPolicy();
  } catch (err) {
    if (err instanceof Je3dActivationError) {
      throw new SandboxJePrepareApiError(
        err.code,
        err.message,
        err.code === JE_3D_ACTIVATION_ERROR.PREPARE_CAPABILITY_OFF ? 403 : 403,
      );
    }
    throw err;
  }
}

export function assertStrictEmptyPrepareBody(body: unknown): void {
  if (body == null) return;
  if (typeof body !== "object" || Array.isArray(body)) {
    throw new SandboxJePrepareApiError(
      "sandbox_je_prepare_body_invalid",
      "Request body must be empty object.",
      400,
    );
  }
  const keys = Object.keys(body as Record<string, unknown>);
  if (keys.length === 0) return;
  for (const key of keys) {
    if (FORBIDDEN_BODY_KEYS.has(key)) {
      throw new SandboxJePrepareApiError(
        "sandbox_je_prepare_override_forbidden",
        `Field ${key} is forbidden; custody fields are server-derived.`,
        400,
      );
    }
    const value = (body as Record<string, unknown>)[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      throw new SandboxJePrepareApiError(
        "sandbox_je_prepare_body_not_empty",
        "Request body must be empty; proposal is bound by path only.",
        400,
      );
    }
  }
}

export function assertAcceptedDemoAProposalId(proposalId: string): void {
  const id = String(proposalId || "").trim();
  if (!isStrictProposalUuid(id)) {
    throw new SandboxJePrepareApiError(
      "sandbox_je_proposal_id_invalid",
      "proposalId must be a valid UUID.",
      400,
    );
  }
  if (id !== SANDBOX_JE_ACCEPTED_PROPOSAL_ID) {
    throw new SandboxJePrepareApiError(
      "sandbox_je_proposal_not_accepted",
      "Only the accepted Demo A proposal may be prepared via this route.",
      403,
    );
  }
}

export function assertProposerForbiddenForPrepare(userId: string): void {
  if (userId === SANDBOX_JE_DESIGNATED_PROPOSER_USER_ID) {
    throw new SandboxJePrepareApiError(
      "sandbox_je_proposer_prepare_forbidden",
      "Proposer may not initiate execution preparation.",
      403,
    );
  }
}

export async function assertFreshPrepareMfa(userId: string): Promise<void> {
  const assurance = await resolveJeAuthenticationAssurance(userId);
  if (!assurance.satisfied) {
    throw new SandboxJePrepareApiError(
      JE_EXECUTION_ERROR.MFA_NOT_SATISFIED,
      "Fresh MFA step-up is required before execution preparation.",
      403,
    );
  }
}

async function loadPatent6ExecutionChainEvents(
  executionId: string,
): Promise<Patent6ChainReceiptEvent[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ledger_events")
    .select(LEDGER_EVENTS_PATENT6_CHAIN_SELECT)
    .eq("aggregate_type", "journal_entry_execution")
    .eq("aggregate_id", executionId)
    .order("chain_index", { ascending: true });
  if (error) {
    throw new SandboxJePrepareApiError(
      "sandbox_je_prepare_chain_read_failed",
      error.message,
      500,
    );
  }
  return (data || []).map((row: Record<string, unknown>) => {
    const parsed = parseLedgerEventPatent6ChainRow(row as Record<string, unknown>);
    return {
      event_id: parsed.event_id,
      event_type: parsed.event_type,
      event_hash: parsed.event_hash,
      previous_event_hash: parsed.previous_event_hash,
      chain_index: parsed.chain_index,
      event_sequence: parsed.event_sequence,
      aggregate_type: parsed.aggregate_type,
      aggregate_id: parsed.aggregate_id,
      occurred_at: parsed.occurred_at,
      recorded_at: parsed.recorded_at,
    };
  });
}

export function mapSandboxJePrepareError(
  err: unknown,
): { status: number; body: Record<string, unknown> } {
  if (err instanceof SandboxJePrepareApiError) {
    if (err.httpStatus === 404 && err.code === "sandbox_je_not_found") {
      return { status: 404, body: { error: "Not found" } };
    }
    return {
      status: err.httpStatus,
      body: { error: err.message, code: err.code },
    };
  }
  if (err instanceof Je3dActivationError) {
    return {
      status: 403,
      body: { error: err.message, code: err.code },
    };
  }
  return {
    status: 500,
    body: {
      error: err instanceof Error ? err.message : "Prepare failed.",
      code: "sandbox_je_prepare_failed",
    },
  };
}

export async function prepareAcceptedDemoATwoPersonExecution(args: {
  proposalId: string;
  approverUserId: string;
  approverEmail: string | null | undefined;
  body: unknown;
}): Promise<SafeSandboxPrepareResponse> {
  assertSandboxJePrepareRuntimeEnabled();
  assertPrepareCapabilityBeforeWrites();
  assertStrictEmptyPrepareBody(args.body);
  assertAcceptedDemoAProposalId(args.proposalId);
  assertDesignatedSandboxApprover({
    userId: args.approverUserId,
    email: args.approverEmail,
  });
  assertProposerForbiddenForPrepare(args.approverUserId);
  await assertFreshPrepareMfa(args.approverUserId);

  const result = await executeSandboxTwoPersonMechanicalPrepare({
    proposalId: SANDBOX_JE_ACCEPTED_PROPOSAL_ID,
    approvalId: SANDBOX_JE_ACCEPTED_APPROVAL_ID,
    executionContext: {
      principal: { type: "user", userId: args.approverUserId },
    },
  });

  if (result.ok === false) {
    throw new SandboxJePrepareApiError(
      result.code,
      result.message,
      400,
    );
  }
  if (!result.execution) {
    throw new SandboxJePrepareApiError(
      "sandbox_je_prepare_failed",
      "Execution preparation failed.",
      400,
    );
  }

  const execution = result.execution;
  const events = await loadPatent6ExecutionChainEvents(execution.id);
  if (!result.reused && events.length > 0) {
    assertPatent6ChainReceiptCustody({
      executionId: execution.id,
      events,
      aggregateType: "journal_entry_execution",
    });
  }

  const preflight = (result.preflight || execution.preflight_result) as {
    eligible?: boolean;
  } | null;

  return {
    execution_id: execution.id,
    proposal_id: execution.proposal_id,
    approval_id: execution.approval_id,
    status: execution.status as SafeSandboxPrepareResponse["status"],
    execution_hash: execution.execution_hash,
    correlation_marker: execution.correlation_marker,
    reused: Boolean(result.reused),
    preflight_eligible: Boolean(preflight?.eligible),
    preparation_authority: SANDBOX_TWO_PERSON_PREPARE_AUTHORITY_V1,
    preparation_mode: SANDBOX_TWO_PERSON_PREPARATION_MODE,
    demo_a: JE_3D_VERIFIED_DEMO_A_IDENTITY,
    capabilities: resolveSandboxJePrepareCapabilityState(),
    patent6_chain_receipt: {
      aggregate_type: "journal_entry_execution",
      aggregate_id: execution.id,
      events,
    },
    memory_is_display_context_only: true,
  };
}

/** Guard-only entry for capability-OFF path — zero DB writes. */
export function denySandboxJePrepareWhenCapabilityOff(): never {
  assertSandboxJePrepareRuntimeEnabled();
  assertPrepareCapabilityBeforeWrites();
  throw new SandboxJePrepareApiError("unreachable", "unreachable", 500);
}
