/**
 * JE-3B2 — Governed create orchestration (internal).
 *
 * Not a public package export. Requires a fully injected dependency bag —
 * never defaults to the live QBO transport. Production wiring lives only in
 * provider-create-service.ts behind the hard gate.
 */

import type { EngagementActor } from "@/lib/audit-ready/server-auth";
import { hashProviderRequestPreview } from "./execution-hash";
import { mapGovernedProposalToQboPayload } from "./execution-payload";
import {
  loadProviderAttemptByExecutionId,
  JeProviderAttemptPersistError,
} from "./provider-attempt-repository";
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
import { Je3b2GateError } from "./je3b2-feature-gate";
import { JE_MEMORY_PROJECTION_CONTRACT } from "./memory-projection-contract";
import {
  assertWirePrivateNoteContainsMarker,
  toGovernedQboJournalEntryWireBody,
} from "./provider-qbo-create-wire";
import type { GovernedQboCreateTransportResult } from "./provider-qbo-create-transport";
import {
  assertProviderAttemptWriteAuthority,
  assertPersistedProviderRequestHashGate,
  loadExactExecution,
  revalidateCanonicalExecutionConnection,
} from "./provider-attempt-service";
import type { JournalEntryProposalRow } from "./types";

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
      discoveryRequired: false;
    }
  | {
      ok: false;
      code: string;
      message: string;
      providerPostIssued: false;
      memoryWritten: false;
      discoveryRequired: false;
    }
  | {
      ok: false;
      code: "je_3b2_post_dispatch_persistence_failed";
      message: string;
      providerPostIssued: true;
      memoryWritten: false;
      /** Custody remains REQUEST_STARTED + POSSIBLY_COMMITTED; discovery only. */
      discoveryRequired: true;
      attemptId: string;
      executionId: string;
    };

export type GovernedJeCreatePostOnce = (args: {
  accountingConnectionId: string;
  realmId: string;
  accessToken: string;
  wireBody: ReturnType<typeof toGovernedQboJournalEntryWireBody>;
}) => Promise<GovernedQboCreateTransportResult>;

export type GovernedJeCreateOrchestrationDeps = {
  resolveActor: (args: {
    engagementId: string;
    userId: string;
  }) => Promise<EngagementActor>;
  loadExecution: typeof loadExactExecution;
  loadProposal: (
    proposalId: string,
  ) => Promise<JournalEntryProposalRow>;
  loadAttempt: typeof loadProviderAttemptByExecutionId;
  loadFirmId: (engagementId: string) => Promise<string>;
  revalidateConnection: typeof revalidateCanonicalExecutionConnection;
  resolveToken: (
    accountingConnectionId: string,
    opts: { forceRefresh: boolean },
  ) => Promise<{
    accessToken: string;
    realmId: string;
  } | null>;
  applyDispatchStarted: (input: {
    attemptId: string;
    expectedStatus: string;
    eventPayload: Record<string, unknown>;
    firmId: string;
    firmClientId: string | null;
    engagementId: string;
    closePeriodId: string | null;
    actorId: string;
  }) => Promise<{
    attempt: JournalEntryProviderAttemptRow;
    execution: JournalEntryExecutionRow;
    ledgerEventId: string | null;
  }>;
  applyPosted: (input: {
    attemptId: string;
    expectedStatus: string;
    qboJeId: string;
    intuitTid: string | null;
    providerResponseHash: string | null;
    eventPayload: Record<string, unknown>;
    firmId: string;
    firmClientId: string | null;
    engagementId: string;
    closePeriodId: string | null;
    actorId: string;
  }) => Promise<{
    attempt: JournalEntryProviderAttemptRow;
    execution: JournalEntryExecutionRow;
    ledgerEventId: string | null;
  }>;
  applyPostUnknown: (input: {
    attemptId: string;
    expectedStatus: string;
    intuitTid: string | null;
    providerErrorCode: string | null;
    providerErrorMessage: string | null;
    eventPayload: Record<string, unknown>;
    firmId: string;
    firmClientId: string | null;
    engagementId: string;
    closePeriodId: string | null;
    actorId: string;
  }) => Promise<{
    attempt: JournalEntryProviderAttemptRow;
    execution: JournalEntryExecutionRow;
    ledgerEventId: string | null;
  }>;
  /** Required mock or gated production wiring — never auto-selected here. */
  postOnce: GovernedJeCreatePostOnce;
};

function failClosed(
  code: string,
  message: string,
): Extract<ExecuteGovernedJeCreateResult, { ok: false; providerPostIssued: false }> {
  return {
    ok: false,
    code,
    message,
    providerPostIssued: false,
    memoryWritten: false,
    discoveryRequired: false,
  };
}

function postDispatchPersistenceFailed(args: {
  message: string;
  attemptId: string;
  executionId: string;
}): Extract<
  ExecuteGovernedJeCreateResult,
  { code: "je_3b2_post_dispatch_persistence_failed" }
> {
  return {
    ok: false,
    code: "je_3b2_post_dispatch_persistence_failed",
    message: args.message,
    providerPostIssued: true,
    memoryWritten: false,
    discoveryRequired: true,
    attemptId: args.attemptId,
    executionId: args.executionId,
  };
}

/**
 * Pure orchestration factory entry. All network/RPC deps must be injected.
 * Does not read JE_3B2_FEATURE_GATE and cannot select the real QBO transport.
 */
export async function runGovernedJournalEntryCreateOrchestration(
  input: ExecuteGovernedJeCreateInput,
  ctx: JeExecutionContext,
  deps: GovernedJeCreateOrchestrationDeps,
): Promise<ExecuteGovernedJeCreateResult> {
  void JE_MEMORY_PROJECTION_CONTRACT;

  let providerPostIssued = false;
  let postIssuedAttemptId: string | null = null;
  let postIssuedExecutionId: string | null = null;

  try {
    if (
      !ctx.principal ||
      ctx.principal.type !== "user" ||
      !ctx.principal.userId
    ) {
      return failClosed(
        "je_execution_principal_required",
        "Verified user principal required.",
      );
    }
    const userId = ctx.principal.userId;

    const execution = await deps.loadExecution(input.executionId);
    if (!execution) {
      return failClosed("je_execution_not_found", "Execution not found.");
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
      return failClosed(auth.code, auth.message);
    }

    if (execution.status !== "POSTING") {
      return failClosed(
        JE_PROVIDER_ATTEMPT_ERROR.EXECUTION_STATUS_INVALID,
        `Governed create requires execution POSTING; found ${execution.status}`,
      );
    }

    const connectionOk = await deps.revalidateConnection({ execution });
    if (!connectionOk.ok) {
      return failClosed(connectionOk.code, connectionOk.message);
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
      return failClosed(
        JE_PROVIDER_ATTEMPT_ERROR.REQUEST_HASH_MISMATCH,
        "Reconstructed provider_request_hash mismatch immediately before dispatch.",
      );
    }

    assertWirePrivateNoteContainsMarker({
      privateNote: preview.PrivateNote,
      correlationMarker: execution.correlation_marker,
    });

    const attempt = await deps.loadAttempt(execution.id);
    if (!attempt) {
      return failClosed(
        JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
        "Provider attempt must exist before governed create dispatch.",
      );
    }
    if (
      attempt.accounting_connection_id !== execution.accounting_connection_id ||
      attempt.provider_request_hash !== execution.provider_request_hash ||
      attempt.correlation_marker !== execution.correlation_marker
    ) {
      return failClosed(
        JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
        "Provider attempt binding mismatch.",
      );
    }

    // Crash / duplicate window: once dispatch has begun, never POST again.
    if (
      attempt.status !== "RESERVED" ||
      attempt.commit_certainty !== "NOT_SENT"
    ) {
      return failClosed(
        JE_PROVIDER_ATTEMPT_ERROR.NO_GOVERNED_POST,
        "Dispatch already started or terminal custody. No second POST. Discovery/recovery only.",
      );
    }

    // Resolve token before dispatch receipt so local token failure keeps NOT_SENT.
    const token = await deps.resolveToken(execution.accounting_connection_id, {
      forceRefresh: false,
    });
    if (!token) {
      return failClosed(
        JE_PROVIDER_ATTEMPT_ERROR.CONNECTION_UNUSABLE,
        "Canonical accounting connection token unavailable.",
      );
    }

    const firmId = await deps.loadFirmId(execution.engagement_id);
    const bindingReceipt = {
      execution_id: execution.id,
      provider_attempt_id: attempt.id,
      provider_request_hash: attempt.provider_request_hash,
      correlation_marker: attempt.correlation_marker,
      accounting_connection_id: attempt.accounting_connection_id,
      proposal_id: execution.proposal_id,
      approval_id: execution.approval_id,
    };

    const dispatched = await deps.applyDispatchStarted({
      attemptId: attempt.id,
      expectedStatus: "RESERVED",
      eventPayload: {
        ...bindingReceipt,
        attempt_status: "REQUEST_STARTED",
        commit_certainty: "POSSIBLY_COMMITTED",
      },
      firmId,
      firmClientId: execution.firm_client_id,
      engagementId: execution.engagement_id,
      closePeriodId: null,
      actorId: userId,
    });
    void dispatched;

    const wireBody = toGovernedQboJournalEntryWireBody(preview);
    // Once dispatch is receipted, any transport attempt may have left the
    // process. Mark POST issued before await so a reject mid-flight never
    // falsely reports providerPostIssued=false.
    providerPostIssued = true;
    postIssuedAttemptId = attempt.id;
    postIssuedExecutionId = execution.id;
    const transport = await deps.postOnce({
      accountingConnectionId: execution.accounting_connection_id,
      realmId: token.realmId,
      accessToken: token.accessToken,
      wireBody,
    });

    if (transport.postAttempts !== 1) {
      return postDispatchPersistenceFailed({
        message:
          "Governed transport violated single-POST contract after provider request issued. Discovery/recovery only; no second POST.",
        attemptId: attempt.id,
        executionId: execution.id,
      });
    }

    const outcome = classifyJeProviderCreateOutcome({
      requestStarted: transport.requestStarted,
      responseReceived: transport.responseReceived,
      httpStatus: transport.httpStatus,
      providerId: transport.providerId,
      networkError: transport.networkError,
    });
    const terminal = mapCreateOutcomeToJe3b2TerminalAction(outcome);

    try {
      if (terminal === "PROVIDER_POSTED" && outcome.providerId) {
        const posted = await deps.applyPosted({
          attemptId: attempt.id,
          expectedStatus: "REQUEST_STARTED",
          qboJeId: outcome.providerId,
          intuitTid: transport.intuitTid,
          providerResponseHash: transport.providerResponseHash,
          eventPayload: {
            ...bindingReceipt,
            status: "POSTED_UNVERIFIED",
            commit_certainty: "COMMITTED",
            qbo_je_id: outcome.providerId,
            intuit_tid: transport.intuitTid,
            provider_response_hash: transport.providerResponseHash,
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
          discoveryRequired: false,
        };
      }

      const unknown = await deps.applyPostUnknown({
        attemptId: attempt.id,
        expectedStatus: "REQUEST_STARTED",
        intuitTid: transport.intuitTid,
        providerErrorCode: outcome.errorClass,
        providerErrorMessage: outcome.errorMessage || transport.errorMessage,
        eventPayload: {
          ...bindingReceipt,
          status: "UNKNOWN_COMMIT",
          commit_certainty: "POSSIBLY_COMMITTED",
          http_status: transport.httpStatus,
          error_class: outcome.errorClass,
          intuit_tid: transport.intuitTid,
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
        discoveryRequired: false,
      };
    } catch (persistErr) {
      return postDispatchPersistenceFailed({
        message:
          persistErr instanceof Error
            ? `Local persistence failed after provider POST issued: ${persistErr.message}. Custody remains REQUEST_STARTED+POSSIBLY_COMMITTED. Discovery/recovery only; no second POST.`
            : "Local persistence failed after provider POST issued. Discovery/recovery only; no second POST.",
        attemptId: attempt.id,
        executionId: execution.id,
      });
    }
  } catch (err) {
    if (providerPostIssued && postIssuedAttemptId && postIssuedExecutionId) {
      return postDispatchPersistenceFailed({
        message:
          err instanceof Error
            ? `Failure after provider POST issued: ${err.message}. Discovery/recovery only; no second POST.`
            : "Failure after provider POST issued. Discovery/recovery only; no second POST.",
        attemptId: postIssuedAttemptId,
        executionId: postIssuedExecutionId,
      });
    }
    if (err instanceof Je3b2GateError) {
      return failClosed(err.code, err.message);
    }
    if (err instanceof JeProviderAttemptPersistError) {
      return failClosed(err.code, err.message);
    }
    return failClosed(
      JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
      err instanceof Error ? err.message : String(err),
    );
  }
}
