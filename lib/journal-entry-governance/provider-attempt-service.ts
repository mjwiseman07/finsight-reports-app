/**
 * JE-3B1 — Provider-attempt reservation service + UNKNOWN_COMMIT recovery.
 *
 * Establishes:
 * - canonical connection revalidation
 * - exact attempt binding (execution_id, connection, request hash, marker)
 * - optional READY_TO_POST → POSTING + posting_started (durable "may leave" boundary)
 * - read-only discovery recovery for UNKNOWN_COMMIT
 *
 * Authority: current engagement write authority (same bar as JE-3A execute).
 * can_approve alone is insufficient. canRead-only is forbidden.
 *
 * Does NOT call the legacy QBO journal-entry poster.
 * Does NOT mint a new execution or idempotency key.
 * Does NOT enable auto-governed principals or workers.
 */

import { randomUUID } from "node:crypto";
import {
  resolveEngagementActorForVerifiedUser,
  type EngagementActor,
} from "@/lib/audit-ready/server-auth";
import { resolveQBOTokenForAccountingConnection } from "@/lib/erp/quickbooks/token-resolver";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { loadEngagementFirmId, loadExactJournalEntryProposal } from "./approval-custody";
import {
  assertNoExecutionCallerOverrides,
  JeExecutionCustodyError,
} from "./execution-custody";
import { hashProviderRequestPreview } from "./execution-hash";
import { mapGovernedProposalToQboPayload } from "./execution-payload";
import {
  classifyJeExecutionRetry,
} from "./execution-state";
import {
  JE_EXECUTION_ERROR,
  type JeExecutionContext,
  type JournalEntryExecutionRow,
} from "./execution-types";
import {
  JE_PROVIDER_ATTEMPT_ERROR,
  type JournalEntryProviderAttemptRow,
} from "./provider-attempt-types";
import {
  loadProviderAttemptByExecutionId,
  persistJournalEntryProviderAttempt,
  patchJournalEntryProviderAttempt,
  JeProviderAttemptPersistError,
} from "./provider-attempt-repository";
import {
  findJournalEntryByCorrelationMarker,
  mayRecordDiscoveredNotFound,
  type FindJournalEntryByCorrelationResult,
} from "./provider-qbo-read";

export type ProviderAttemptServiceDeps = {
  resolveActor: typeof resolveEngagementActorForVerifiedUser;
  loadExecution?: typeof loadExactExecution;
  loadProposal?: typeof loadExactJournalEntryProposal;
  revalidateConnection?: typeof revalidateCanonicalExecutionConnection;
  persistAttempt?: typeof persistJournalEntryProviderAttempt;
  patchAttempt?: typeof patchJournalEntryProviderAttempt;
  loadAttempt?: typeof loadProviderAttemptByExecutionId;
  loadFirmId?: typeof loadEngagementFirmId;
  resolveToken?: typeof resolveQBOTokenForAccountingConnection;
  findByMarker?: typeof findJournalEntryByCorrelationMarker;
};

export function createDefaultProviderAttemptDeps(): ProviderAttemptServiceDeps {
  return {
    resolveActor: resolveEngagementActorForVerifiedUser,
  };
}

/**
 * JE-3A-aligned write authority for provider attempt + recovery.
 * Requires actor exists, exact userId bind, and canWrite === true.
 * can_approve is never consulted here.
 */
export function assertProviderAttemptWriteAuthority(args: {
  actor: EngagementActor | null;
  principalUserId: string;
}): { ok: true; actor: EngagementActor } | { ok: false; code: string; message: string } {
  const { actor, principalUserId } = args;
  if (!actor) {
    return {
      ok: false,
      code: JE_EXECUTION_ERROR.WRITE_FORBIDDEN,
      message:
        "Executor must have current engagement write authority. Membership/read-only is insufficient; can_approve alone is insufficient.",
    };
  }
  if (actor.userId !== principalUserId) {
    return {
      ok: false,
      code: JE_EXECUTION_ERROR.WRITE_FORBIDDEN,
      message: "Engagement actor userId must match verified principal userId.",
    };
  }
  if (!actor.canWrite) {
    return {
      ok: false,
      code: JE_EXECUTION_ERROR.WRITE_FORBIDDEN,
      message:
        "Executor must have current engagement write authority (canWrite). canRead-only and can_approve alone are insufficient.",
    };
  }
  return { ok: true, actor };
}

export type ReserveProviderAttemptInput = {
  executionId: string;
  /** Forbidden — connection authority is execution.accounting_connection_id only. */
  callerRealmId?: string;
  callerConnectionId?: string;
};

export type ReserveProviderAttemptResult =
  | {
      ok: true;
      attempt: JournalEntryProviderAttemptRow;
      execution: JournalEntryExecutionRow;
      reused: boolean;
      ledgerEventId: string | null;
      /** Explicit: no provider POST was issued. */
      providerPostIssued: false;
    }
  | { ok: false; code: string; message: string };

export type RecoverUnknownExecutionInput = {
  executionId: string;
};

export type RecoverUnknownExecutionResult =
  | {
      ok: true;
      execution: JournalEntryExecutionRow;
      attempt: JournalEntryProviderAttemptRow | null;
      discovery: FindJournalEntryByCorrelationResult;
      retryClass: ReturnType<typeof classifyJeExecutionRetry>;
      /** Explicit: no provider POST retry. */
      providerPostRetryIssued: false;
      boundProviderJournalId: string | null;
    }
  | { ok: false; code: string; message: string };

async function loadExactExecution(
  executionId: string,
): Promise<JournalEntryExecutionRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("journal_entry_executions")
    .select("*")
    .eq("id", executionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return data as JournalEntryExecutionRow;
}

/**
 * Revalidate the exact accounting_connection bound on the execution.
 * Do not silently switch to a newer connection.
 */
export async function revalidateCanonicalExecutionConnection(args: {
  execution: JournalEntryExecutionRow;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("accounting_connections")
    .select("id, provider, status, metadata_json")
    .eq("id", args.execution.accounting_connection_id)
    .maybeSingle();
  if (error) {
    return {
      ok: false,
      code: JE_PROVIDER_ATTEMPT_ERROR.CONNECTION_UNUSABLE,
      message: error.message,
    };
  }
  if (!data) {
    return {
      ok: false,
      code: JE_PROVIDER_ATTEMPT_ERROR.CONNECTION_UNUSABLE,
      message: "Bound accounting_connection not found.",
    };
  }
  if (String(data.provider) !== "quickbooks") {
    return {
      ok: false,
      code: JE_PROVIDER_ATTEMPT_ERROR.CONNECTION_UNUSABLE,
      message: "Bound connection is not quickbooks.",
    };
  }
  if (String(data.status) !== "connected") {
    return {
      ok: false,
      code: JE_PROVIDER_ATTEMPT_ERROR.CONNECTION_UNUSABLE,
      message: "Bound connection is not connected.",
    };
  }
  const meta = (data.metadata_json || {}) as Record<string, unknown>;
  const metaCompany = String(meta.company_id || "");
  if (metaCompany && metaCompany !== args.execution.company_id) {
    return {
      ok: false,
      code: JE_PROVIDER_ATTEMPT_ERROR.CONNECTION_UNUSABLE,
      message: "Bound connection is not canonical for execution company.",
    };
  }
  return { ok: true };
}

/**
 * Assert reconstructed provider payload hash matches persisted authority.
 */
export function assertPersistedProviderRequestHashGate(args: {
  proposal: Parameters<typeof mapGovernedProposalToQboPayload>[0]["proposal"];
  correlationMarker: string;
  persistedHash: string | null;
}): void {
  const preview = mapGovernedProposalToQboPayload({
    proposal: args.proposal,
    correlationMarker: args.correlationMarker,
  });
  const hash = hashProviderRequestPreview(
    preview as unknown as Record<string, unknown>,
  );
  if (!args.persistedHash || hash !== args.persistedHash) {
    throw new JeProviderAttemptPersistError(
      JE_PROVIDER_ATTEMPT_ERROR.REQUEST_HASH_MISMATCH,
      "Reconstructed provider_request_hash does not match persisted execution hash.",
    );
  }
}

/**
 * Reserve (or reuse) the single provider CREATE attempt for an execution.
 * Optionally advances READY_TO_POST → POSTING before any future network call.
 * Never issues QBO POST.
 * Requires current engagement write authority (JE-3A execute bar).
 */
export async function reserveGovernedProviderAttempt(
  input: ReserveProviderAttemptInput,
  ctx: JeExecutionContext,
  options?: {
    publishPostingStarted?: boolean;
    deps?: Partial<ProviderAttemptServiceDeps>;
  },
): Promise<ReserveProviderAttemptResult> {
  const deps: ProviderAttemptServiceDeps = {
    ...createDefaultProviderAttemptDeps(),
    ...(options?.deps || {}),
  };
  const loadExecution = deps.loadExecution || loadExactExecution;
  const loadProposal = deps.loadProposal || loadExactJournalEntryProposal;
  const revalidateConnection =
    deps.revalidateConnection || revalidateCanonicalExecutionConnection;
  const persistAttempt = deps.persistAttempt || persistJournalEntryProviderAttempt;
  const loadAttempt = deps.loadAttempt || loadProviderAttemptByExecutionId;
  const loadFirmId = deps.loadFirmId || loadEngagementFirmId;

  try {
    if (!ctx.principal || ctx.principal.type !== "user" || !ctx.principal.userId) {
      return {
        ok: false,
        code: "je_execution_principal_required",
        message: "Verified user principal required.",
      };
    }
    const userId = ctx.principal.userId;

    try {
      assertNoExecutionCallerOverrides({
        ...(input.callerRealmId != null
          ? { realmId: input.callerRealmId }
          : {}),
        ...(input.callerConnectionId != null
          ? { accountingConnectionId: input.callerConnectionId }
          : {}),
      });
    } catch (err) {
      if (err instanceof JeExecutionCustodyError) {
        return {
          ok: false,
          code: JE_PROVIDER_ATTEMPT_ERROR.CALLER_REALM_FORBIDDEN,
          message: err.message,
        };
      }
      throw err;
    }

    const execution = await loadExecution(input.executionId);
    if (!execution) {
      return {
        ok: false,
        code: "je_execution_not_found",
        message: "Execution not found.",
      };
    }

    // Write authority BEFORE any attempt row / POSTING transition.
    const actor = await deps.resolveActor({
      engagementId: execution.engagement_id,
      userId,
    });
    const auth = assertProviderAttemptWriteAuthority({
      actor,
      principalUserId: userId,
    });
    if (!auth.ok) return auth;

    const connectionOk = await revalidateConnection({ execution });
    if (!connectionOk.ok) return connectionOk;

    const proposal = await loadProposal(execution.proposal_id);
    assertPersistedProviderRequestHashGate({
      proposal,
      correlationMarker: execution.correlation_marker,
      persistedHash: execution.provider_request_hash,
    });

    if (
      execution.status !== "READY_TO_POST" &&
      execution.status !== "POSTING"
    ) {
      return {
        ok: false,
        code: JE_PROVIDER_ATTEMPT_ERROR.EXECUTION_STATUS_INVALID,
        message: `Cannot reserve provider attempt from status ${execution.status}`,
      };
    }

    const firmId = await loadFirmId(execution.engagement_id);

    const publishPostingStarted =
      Boolean(options?.publishPostingStarted) &&
      execution.status === "READY_TO_POST";

    const eventPayload = publishPostingStarted
      ? {
          execution_id: execution.id,
          proposal_id: execution.proposal_id,
          approval_id: execution.approval_id,
          accounting_connection_id: execution.accounting_connection_id,
          execution_hash: execution.execution_hash,
          provider_request_hash: execution.provider_request_hash,
          correlation_marker: execution.correlation_marker,
          status: "POSTING",
          commit_certainty: "NOT_SENT",
        }
      : {};

    const existing = await loadAttempt(execution.id);
    const attemptId = existing?.id || randomUUID();

    const persisted = await persistAttempt({
      attempt: {
        id: attemptId,
        execution_id: execution.id,
        accounting_connection_id: execution.accounting_connection_id,
        provider: "quickbooks",
        provider_request_hash: String(execution.provider_request_hash),
        correlation_marker: execution.correlation_marker,
        status: "RESERVED",
        commit_certainty: "NOT_SENT",
      },
      publishPostingStarted,
      postingStartedEventPayload: eventPayload,
      firmId,
      firmClientId: execution.firm_client_id,
      engagementId: execution.engagement_id,
      closePeriodId: null,
      actorId: auth.actor.userId,
    });

    return {
      ok: true,
      attempt: persisted.attempt,
      execution: persisted.execution,
      reused: persisted.reused,
      ledgerEventId: persisted.ledgerEventId,
      providerPostIssued: false,
    };
  } catch (err) {
    if (err instanceof JeProviderAttemptPersistError) {
      return { ok: false, code: err.code, message: err.message };
    }
    return {
      ok: false,
      code: "je_provider_attempt_failed",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Read-only / local-state recovery for UNKNOWN_COMMIT.
 * Discovery only. Never posts. Never mints a new execution/idempotency key.
 * Requires current engagement write authority before QBO discovery or custody mutation.
 */
export async function recoverUnknownJournalEntryExecution(
  input: RecoverUnknownExecutionInput,
  ctx: JeExecutionContext,
  options?: {
    queryCandidates?: Parameters<
      typeof findJournalEntryByCorrelationMarker
    >[0]["queryCandidates"];
    deps?: Partial<ProviderAttemptServiceDeps>;
  },
): Promise<RecoverUnknownExecutionResult> {
  const deps: ProviderAttemptServiceDeps = {
    ...createDefaultProviderAttemptDeps(),
    ...(options?.deps || {}),
  };
  const loadExecution = deps.loadExecution || loadExactExecution;
  const loadProposal = deps.loadProposal || loadExactJournalEntryProposal;
  const revalidateConnection =
    deps.revalidateConnection || revalidateCanonicalExecutionConnection;
  const patchAttempt = deps.patchAttempt || patchJournalEntryProviderAttempt;
  const loadAttempt = deps.loadAttempt || loadProviderAttemptByExecutionId;
  const resolveToken =
    deps.resolveToken || resolveQBOTokenForAccountingConnection;
  const findByMarker = deps.findByMarker || findJournalEntryByCorrelationMarker;

  try {
    if (!ctx.principal || ctx.principal.type !== "user" || !ctx.principal.userId) {
      return {
        ok: false,
        code: JE_PROVIDER_ATTEMPT_ERROR.RECOVERY_UNAUTHORIZED,
        message: "Verified authorized user required for recovery.",
      };
    }
    const userId = ctx.principal.userId;

    const execution = await loadExecution(input.executionId);
    if (!execution) {
      return {
        ok: false,
        code: "je_execution_not_found",
        message: "Execution not found.",
      };
    }

    // Write authority BEFORE QBO discovery and before any custody mutation.
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
      };
    }

    // UNKNOWN_COMMIT: discovery/recovery only — never blind POST (no POST path here).
    const retryClass = classifyJeExecutionRetry(execution.status);
    if (
      execution.status !== "UNKNOWN_COMMIT" &&
      execution.status !== "POSTING"
    ) {
      return {
        ok: false,
        code: JE_PROVIDER_ATTEMPT_ERROR.EXECUTION_STATUS_INVALID,
        message: `Recovery discovery is for UNKNOWN_COMMIT/POSTING; got ${execution.status}`,
      };
    }
    if (execution.status === "UNKNOWN_COMMIT") {
      // Soft-lock: retry class must remain DISCOVERY_REQUIRED (no POST retry surface).
      if (retryClass !== "DISCOVERY_REQUIRED") {
        return {
          ok: false,
          code: JE_EXECUTION_ERROR.TRANSITION_INVALID,
          message: "UNKNOWN_COMMIT must only permit discovery/recovery.",
        };
      }
    }

    const proposal = await loadProposal(execution.proposal_id);
    assertPersistedProviderRequestHashGate({
      proposal,
      correlationMarker: execution.correlation_marker,
      persistedHash: execution.provider_request_hash,
    });

    const connectionOk = await revalidateConnection({ execution });
    if (!connectionOk.ok) {
      return {
        ok: false,
        code: connectionOk.code,
        message: connectionOk.message,
      };
    }

    const token = await resolveToken(execution.accounting_connection_id);
    if (!token?.accessToken || !token.realmId) {
      return {
        ok: false,
        code: JE_PROVIDER_ATTEMPT_ERROR.CONNECTION_UNUSABLE,
        message: "Token could not be resolved from bound accounting_connection_id.",
      };
    }

    const expectedLines = (proposal.lines || []).map((line) => ({
      accountId: String(line.accountId),
      debitCents: Number(line.debitCents) || 0,
      creditCents: Number(line.creditCents) || 0,
    }));

    const discovery = await findByMarker({
      auth: {
        realmId: token.realmId,
        accessToken: token.accessToken,
        userId: auth.actor.userId,
      },
      correlationMarker: execution.correlation_marker,
      txnDate: String(proposal.txn_date).slice(0, 10),
      dateWindowDays: 0,
      expected: {
        txnDate: String(proposal.txn_date).slice(0, 10),
        currency: String(proposal.currency || "USD"),
        lines: expectedLines,
        totalDebitsCents: Number(proposal.total_debits_cents) || 0,
        totalCreditsCents: Number(proposal.total_credits_cents) || 0,
      },
      queryCandidates: options?.queryCandidates,
    });

    const attempt = await loadAttempt(execution.id);
    let boundProviderJournalId: string | null = null;

    if (discovery.kind === "INDETERMINATE") {
      // Observation failure — not an accounting conclusion.
      // No DISCOVERED_NOT_FOUND, no qbo_je_id, no commit_certainty change.
      if (attempt) {
        await patchAttempt({
          attemptId: attempt.id,
          expectedStatus: attempt.status,
          patch: {
            discovery_summary: {
              kind: "INDETERMINATE",
              observation: "read_failed",
              reason: discovery.reason,
              httpStatus: discovery.httpStatus ?? null,
              errorClass: discovery.errorClass ?? null,
              candidateCount: discovery.candidateCount,
              recovered_at: new Date().toISOString(),
            },
          },
        });
      }
    } else if (discovery.kind === "EXACT_ONE" && attempt) {
      const match = discovery.matches[0];
      boundProviderJournalId = match.providerJournalId;
      await patchAttempt({
        attemptId: attempt.id,
        expectedStatus: attempt.status,
        patch: {
          status: "DISCOVERED_COMMITTED",
          commit_certainty: "COMMITTED",
          qbo_je_id: match.providerJournalId,
          provider_response_hash: undefined,
          discovery_summary: {
            kind: discovery.kind,
            observation: "successful_exact_one",
            reason: discovery.reason,
            candidateCount: discovery.candidateCount,
            recovered_at: new Date().toISOString(),
          },
        },
      });
    } else if (discovery.kind === "MULTIPLE" && attempt) {
      await patchAttempt({
        attemptId: attempt.id,
        expectedStatus: attempt.status,
        patch: {
          discovery_summary: {
            kind: discovery.kind,
            observation: "successful_multiple",
            reason: discovery.reason,
            candidateCount: discovery.candidateCount,
            match_ids: discovery.matches.map((m) => m.providerJournalId),
            recovered_at: new Date().toISOString(),
          },
        },
      });
    } else if (discovery.kind === "NONE" && attempt) {
      const recordNotFound = mayRecordDiscoveredNotFound({
        discoveryKind: discovery.kind,
        commitCertainty: attempt.commit_certainty,
      });
      await patchAttempt({
        attemptId: attempt.id,
        expectedStatus: attempt.status,
        patch: {
          ...(recordNotFound
            ? { status: "DISCOVERED_NOT_FOUND" }
            : {}),
          // POSSIBLY_COMMITTED + NONE stays unresolved — no certainty downgrade.
          discovery_summary: {
            kind: discovery.kind,
            observation: "successful_none",
            reason: discovery.reason,
            candidateCount: discovery.candidateCount,
            discovered_not_found_recorded: recordNotFound,
            unresolved_possibly_committed:
              attempt.commit_certainty === "POSSIBLY_COMMITTED",
            recovered_at: new Date().toISOString(),
          },
        },
      });
    }

    const refreshedAttempt = await loadAttempt(execution.id);

    // Execution status is never advanced by indeterminate/failed reads.
    // UNKNOWN_COMMIT / POSTING remain until a future successful discovery path.
    return {
      ok: true,
      execution,
      attempt: refreshedAttempt,
      discovery,
      retryClass:
        discovery.kind === "INDETERMINATE"
          ? "DISCOVERY_REQUIRED"
          : retryClass,
      providerPostRetryIssued: false,
      boundProviderJournalId,
    };
  } catch (err) {
    if (err instanceof JeProviderAttemptPersistError) {
      return { ok: false, code: err.code, message: err.message };
    }
    return {
      ok: false,
      code: "je_provider_recovery_failed",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Hard gate: JE-3B1 does not expose a governed provider POST entry point.
 */
export function assertGovernedProviderPostNotEnabled(): never {
  throw new JeProviderAttemptPersistError(
    JE_PROVIDER_ATTEMPT_ERROR.NO_GOVERNED_POST,
    "Governed QBO JournalEntry POST is not enabled in JE-3B1. Discovery/recovery only.",
  );
}
