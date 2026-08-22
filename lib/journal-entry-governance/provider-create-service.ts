/**
 * JE-3B2 — Governed QBO JournalEntry create orchestration.
 * Hard-disabled by JE_3B2_FEATURE_GATE. No Memory. No legacy poster.
 * No worker. No auto principal. Exactly one POST after dispatch receipt.
 */

import { resolveEngagementActorForVerifiedUser } from "@/lib/audit-ready/server-auth";
import { resolveQBOTokenForAccountingConnection } from "@/lib/erp/quickbooks/token-resolver";
import {
  loadEngagementFirmId,
  loadExactJournalEntryProposal,
} from "./approval-custody";
import { hashProviderRequestPreview } from "./execution-hash";
import { mapGovernedProposalToQboPayload } from "./execution-payload";
import {
  loadProviderAttemptByExecutionId,
  JeProviderAttemptPersistError,
} from "./provider-attempt-repository";
import {
  applyJournalEntryProviderDispatchStarted,
  applyJournalEntryProviderPosted,
  applyJournalEntryProviderPostUnknown,
} from "./provider-dispatch-repository";
import {
  classifyJeProviderCreateOutcome,
  mapCreateOutcomeToJe3b2TerminalAction,
  JE_PROVIDER_ATTEMPT_ERROR,
  type JournalEntryProviderAttemptRow,
  type JeProviderNetworkAttemptResult,
} from "./provider-attempt-types";
import type {
  JeExecutionContext,
  JournalEntryExecutionRow,
} from "./execution-types";
import {
  assertJe3b2GovernedCreateEnabled,
  isJe3b2GovernedCreateEnabled,
  Je3b2GateError,
  JE_3B2_GATE_ERROR,
} from "./je3b2-feature-gate";
import { JE_MEMORY_PROJECTION_CONTRACT } from "./memory-projection-contract";
import {
  assertWirePrivateNoteContainsMarker,
  toGovernedQboJournalEntryWireBody,
} from "./provider-qbo-create-wire";
import {
  postGovernedQboJournalEntryOnce,
  type GovernedQboCreateTransportResult,
} from "./provider-qbo-create-transport";
import {
  assertProviderAttemptWriteAuthority,
  assertPersistedProviderRequestHashGate,
  loadExactExecution,
  revalidateCanonicalExecutionConnection,
} from "./provider-attempt-service";

export type ExecuteGovernedJeCreateInput = {
  executionId: string;
};

export type ExecuteGovernedJeCreateResult =
  | {
      ok: true;
      gated: false;
      attempt: JournalEntryProviderAttemptRow;
      execution: JournalEntryExecutionRow;
      outcome: JeProviderNetworkAttemptResult;
      transport: GovernedQboCreateTransportResult;
      dispatchLedgerEventId: string | null;
      terminalLedgerEventId: string | null;
      providerPostIssued: true;
      memoryWritten: false;
    }
  | {
      ok: false;
      code: string;
      message: string;
      providerPostIssued: false;
      memoryWritten: false;
    };

export type GovernedJeCreateDeps = {
  resolveActor?: typeof resolveEngagementActorForVerifiedUser;
  loadExecution?: typeof loadExactExecution;
  loadProposal?: typeof loadExactJournalEntryProposal;
  loadAttempt?: typeof loadProviderAttemptByExecutionId;
  loadFirmId?: typeof loadEngagementFirmId;
  revalidateConnection?: typeof revalidateCanonicalExecutionConnection;
  resolveToken?: typeof resolveQBOTokenForAccountingConnection;
  applyDispatchStarted?: typeof applyJournalEntryProviderDispatchStarted;
  applyPosted?: typeof applyJournalEntryProviderPosted;
  applyPostUnknown?: typeof applyJournalEntryProviderPostUnknown;
  postOnce?: typeof postGovernedQboJournalEntryOnce;
};

/**
 * Public entry — always hard-disabled while JE_3B2_FEATURE_GATE.governedCreateEnabled=false.
 * Never writes Memory (JE_MEMORY_PROJECTION_CONTRACT.je3b2WritesMemory === false).
 */
export async function executeGovernedJournalEntryCreate(
  _input: ExecuteGovernedJeCreateInput,
  _ctx: JeExecutionContext,
  _options?: { deps?: Partial<GovernedJeCreateDeps> },
): Promise<ExecuteGovernedJeCreateResult> {
  void _input;
  void _ctx;
  void _options;
  void JE_MEMORY_PROJECTION_CONTRACT;
  assertJe3b2GovernedCreateEnabled();
}

/**
 * Internal orchestration used by unit tests with injected deps.
 * Still refuses when gate is off unless bypassGateForTests=true.
 * When bypassing, callers MUST inject a mock postOnce (never real QBO).
 */
export async function executeGovernedJournalEntryCreateOrchestration(
  input: ExecuteGovernedJeCreateInput,
  ctx: JeExecutionContext,
  options?: {
    deps?: Partial<GovernedJeCreateDeps>;
    bypassGateForTests?: boolean;
  },
): Promise<ExecuteGovernedJeCreateResult> {
  void JE_MEMORY_PROJECTION_CONTRACT;
  if (!options?.bypassGateForTests && !isJe3b2GovernedCreateEnabled()) {
    return {
      ok: false,
      code: JE_3B2_GATE_ERROR.CREATE_DISABLED,
      message:
        "JE-3B2 governed QBO JournalEntry create is hard-disabled. Draft-only; no production invocation.",
      providerPostIssued: false,
      memoryWritten: false,
    };
  }

  if (options?.bypassGateForTests && !options.deps?.postOnce) {
    return {
      ok: false,
      code: JE_3B2_GATE_ERROR.LIVE_POST_DISABLED,
      message:
        "bypassGateForTests requires an injected mock postOnce; live QBO POST remains forbidden.",
      providerPostIssued: false,
      memoryWritten: false,
    };
  }

  const deps: Required<GovernedJeCreateDeps> = {
    resolveActor: resolveEngagementActorForVerifiedUser,
    loadExecution: loadExactExecution,
    loadProposal: loadExactJournalEntryProposal,
    loadAttempt: loadProviderAttemptByExecutionId,
    loadFirmId: loadEngagementFirmId,
    revalidateConnection: revalidateCanonicalExecutionConnection,
    resolveToken: resolveQBOTokenForAccountingConnection,
    applyDispatchStarted: applyJournalEntryProviderDispatchStarted,
    applyPosted: applyJournalEntryProviderPosted,
    applyPostUnknown: applyJournalEntryProviderPostUnknown,
    postOnce: postGovernedQboJournalEntryOnce,
    ...(options?.deps || {}),
  } as Required<GovernedJeCreateDeps>;

  try {
    if (
      !ctx.principal ||
      ctx.principal.type !== "user" ||
      !ctx.principal.userId
    ) {
      return {
        ok: false,
        code: "je_execution_principal_required",
        message: "Verified user principal required.",
        providerPostIssued: false,
        memoryWritten: false,
      };
    }
    const userId = ctx.principal.userId;

    const execution = await deps.loadExecution(input.executionId);
    if (!execution) {
      return {
        ok: false,
        code: "je_execution_not_found",
        message: "Execution not found.",
        providerPostIssued: false,
        memoryWritten: false,
      };
    }

    const actor = await deps.resolveActor({
      engagementId: execution.engagement_id,
      userId,
    });
    const auth = assertProviderAttemptWriteAuthority({
      actor,
      principalUserId: userId,
    });
    if (!auth.ok) {
      return {
        ok: false,
        code: auth.code,
        message: auth.message,
        providerPostIssued: false,
        memoryWritten: false,
      };
    }

    if (execution.status !== "POSTING") {
      return {
        ok: false,
        code: JE_PROVIDER_ATTEMPT_ERROR.EXECUTION_STATUS_INVALID,
        message: `Governed create requires execution POSTING; found ${execution.status}`,
        providerPostIssued: false,
        memoryWritten: false,
      };
    }

    const connectionOk = await deps.revalidateConnection({ execution });
    if (!connectionOk.ok) {
      return {
        ok: false,
        code: connectionOk.code,
        message: connectionOk.message,
        providerPostIssued: false,
        memoryWritten: false,
      };
    }

    const proposal = await deps.loadProposal(execution.proposal_id);
    assertPersistedProviderRequestHashGate({
      proposal,
      correlationMarker: execution.correlation_marker,
      persistedHash: execution.provider_request_hash,
    });

    const preview = mapGovernedProposalToQboPayload({
      proposal,
      correlationMarker: execution.correlation_marker,
    });
    const reconstructedHash = hashProviderRequestPreview(
      preview as unknown as Record<string, unknown>,
    );
    if (reconstructedHash !== execution.provider_request_hash) {
      return {
        ok: false,
        code: JE_PROVIDER_ATTEMPT_ERROR.REQUEST_HASH_MISMATCH,
        message:
          "Reconstructed provider_request_hash mismatch immediately before dispatch.",
        providerPostIssued: false,
        memoryWritten: false,
      };
    }

    assertWirePrivateNoteContainsMarker({
      privateNote: preview.PrivateNote,
      correlationMarker: execution.correlation_marker,
    });

    const attempt = await deps.loadAttempt(execution.id);
    if (!attempt) {
      return {
        ok: false,
        code: JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
        message: "Provider attempt must exist before governed create dispatch.",
        providerPostIssued: false,
        memoryWritten: false,
      };
    }
    if (
      attempt.accounting_connection_id !== execution.accounting_connection_id ||
      attempt.provider_request_hash !== execution.provider_request_hash ||
      attempt.correlation_marker !== execution.correlation_marker
    ) {
      return {
        ok: false,
        code: JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
        message: "Provider attempt binding mismatch.",
        providerPostIssued: false,
        memoryWritten: false,
      };
    }

    // Crash / duplicate window: once dispatch has begun, never POST again.
    if (
      attempt.status !== "RESERVED" ||
      attempt.commit_certainty !== "NOT_SENT"
    ) {
      return {
        ok: false,
        code: JE_PROVIDER_ATTEMPT_ERROR.NO_GOVERNED_POST,
        message:
          "Dispatch already started or terminal custody. No second POST. Discovery/recovery only.",
        providerPostIssued: false,
        memoryWritten: false,
      };
    }

    // Resolve token before dispatch receipt so local token failure keeps NOT_SENT.
    const token = await deps.resolveToken(execution.accounting_connection_id, {
      forceRefresh: false,
    });
    if (!token) {
      return {
        ok: false,
        code: JE_PROVIDER_ATTEMPT_ERROR.CONNECTION_UNUSABLE,
        message: "Canonical accounting connection token unavailable.",
        providerPostIssued: false,
        memoryWritten: false,
      };
    }

    const firmId = await deps.loadFirmId(execution.engagement_id);
    const dispatchPayload = {
      execution_id: execution.id,
      provider_attempt_id: attempt.id,
      provider_request_hash: attempt.provider_request_hash,
      correlation_marker: attempt.correlation_marker,
      accounting_connection_id: attempt.accounting_connection_id,
      attempt_status: "REQUEST_STARTED",
      commit_certainty: "POSSIBLY_COMMITTED",
    };

    const dispatched = await deps.applyDispatchStarted({
      attemptId: attempt.id,
      expectedStatus: "RESERVED",
      eventPayload: dispatchPayload,
      firmId,
      firmClientId: execution.firm_client_id,
      engagementId: execution.engagement_id,
      closePeriodId: null,
      actorId: userId,
    });

    const wireBody = toGovernedQboJournalEntryWireBody(preview);
    const transport = await deps.postOnce({
      accountingConnectionId: execution.accounting_connection_id,
      realmId: token.realmId,
      accessToken: token.accessToken,
      wireBody,
    });

    if (transport.postAttempts !== 1) {
      throw new JeProviderAttemptPersistError(
        JE_PROVIDER_ATTEMPT_ERROR.NO_GOVERNED_POST,
        "Governed transport violated single-POST contract.",
      );
    }

    const outcome = classifyJeProviderCreateOutcome({
      requestStarted: transport.requestStarted,
      responseReceived: transport.responseReceived,
      httpStatus: transport.httpStatus,
      providerId: transport.providerId,
      networkError: transport.networkError,
    });
    const terminal = mapCreateOutcomeToJe3b2TerminalAction(outcome);

    if (terminal === "PROVIDER_POSTED" && outcome.providerId) {
      const posted = await deps.applyPosted({
        attemptId: attempt.id,
        expectedStatus: "REQUEST_STARTED",
        qboJeId: outcome.providerId,
        intuitTid: transport.intuitTid,
        providerResponseHash: transport.providerResponseHash,
        eventPayload: {
          execution_id: execution.id,
          provider_attempt_id: attempt.id,
          status: "POSTED_UNVERIFIED",
          commit_certainty: "COMMITTED",
          qbo_je_id: outcome.providerId,
          intuit_tid: transport.intuitTid,
          provider_response_hash: transport.providerResponseHash,
          provider_request_hash: attempt.provider_request_hash,
          correlation_marker: attempt.correlation_marker,
        },
        firmId,
        firmClientId: execution.firm_client_id,
        engagementId: execution.engagement_id,
        closePeriodId: null,
        actorId: userId,
      });
      return {
        ok: true,
        gated: false,
        attempt: posted.attempt,
        execution: posted.execution,
        outcome,
        transport,
        dispatchLedgerEventId: dispatched.ledgerEventId,
        terminalLedgerEventId: posted.ledgerEventId,
        providerPostIssued: true,
        memoryWritten: false,
      };
    }

    const unknown = await deps.applyPostUnknown({
      attemptId: attempt.id,
      expectedStatus: "REQUEST_STARTED",
      intuitTid: transport.intuitTid,
      providerErrorCode: outcome.errorClass,
      providerErrorMessage: outcome.errorMessage || transport.errorMessage,
      eventPayload: {
        execution_id: execution.id,
        provider_attempt_id: attempt.id,
        status: "UNKNOWN_COMMIT",
        commit_certainty: "POSSIBLY_COMMITTED",
        http_status: transport.httpStatus,
        error_class: outcome.errorClass,
        intuit_tid: transport.intuitTid,
        provider_request_hash: attempt.provider_request_hash,
        correlation_marker: attempt.correlation_marker,
      },
      firmId,
      firmClientId: execution.firm_client_id,
      engagementId: execution.engagement_id,
      closePeriodId: null,
      actorId: userId,
    });

    return {
      ok: true,
      gated: false,
      attempt: unknown.attempt,
      execution: unknown.execution,
      outcome,
      transport,
      dispatchLedgerEventId: dispatched.ledgerEventId,
      terminalLedgerEventId: unknown.ledgerEventId,
      providerPostIssued: true,
      memoryWritten: false,
    };
  } catch (err) {
    if (err instanceof Je3b2GateError) {
      return {
        ok: false,
        code: err.code,
        message: err.message,
        providerPostIssued: false,
        memoryWritten: false,
      };
    }
    if (err instanceof JeProviderAttemptPersistError) {
      return {
        ok: false,
        code: err.code,
        message: err.message,
        providerPostIssued: false,
        memoryWritten: false,
      };
    }
    return {
      ok: false,
      code: JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
      message: err instanceof Error ? err.message : String(err),
      providerPostIssued: false,
      memoryWritten: false,
    };
  }
}
