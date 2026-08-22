/**
 * JE-3C — Exact QBO JournalEntry read-back verification orchestration (internal).
 *
 * Not a public package export. Requires injected deps — never defaults to live
 * QBO GET while the hard gate is off. Production wiring lives only in
 * provider-verification-service.ts behind assertJe3cVerificationEnabled.
 *
 * Primary authority: GET /journalentry/{persisted qbo_je_id} only.
 * Marker discovery is never used as the normal verification path.
 */

import type { EngagementActor } from "@/lib/audit-ready/server-auth";
import { hashProviderRequestPreview } from "./execution-hash";
import { mapGovernedProposalToQboPayload } from "./execution-payload";
import {
  JeProviderAttemptPersistError,
  loadProviderAttemptByExecutionId,
} from "./provider-attempt-repository";
import {
  JE_PROVIDER_ATTEMPT_ERROR,
  type JournalEntryProviderAttemptRow,
} from "./provider-attempt-types";
import type {
  JeExecutionContext,
  JournalEntryExecutionRow,
} from "./execution-types";
import { Je3cGateError } from "./je3c-feature-gate";
import { JE_MEMORY_PROJECTION_CONTRACT } from "./memory-projection-contract";
import {
  canonicalizeNormalizedProviderJe,
  compareProviderJeEconomics,
  hashNormalizedProviderJe,
  privateNoteContainsExactCorrelationMarker,
  type JeEconomicMismatchDimension,
  type NormalizedProviderJe,
} from "./provider-je-normalize";
import type { ReadJournalEntryByIdResult } from "./provider-qbo-read";
import {
  assertProviderAttemptWriteAuthority,
  assertPersistedProviderRequestHashGate,
  loadExactExecution,
  revalidateCanonicalExecutionConnection,
} from "./provider-attempt-service";
import type { JournalEntryProposalRow } from "./types";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

export type VerifyGovernedJeInput = {
  executionId: string;
};

export type VerifyGovernedJeResult =
  | {
      ok: true;
      gated: false;
      conclusion: "VERIFIED";
      attempt: JournalEntryProviderAttemptRow;
      execution: JournalEntryExecutionRow;
      providerReadbackHash: string;
      ledgerEventId: string | null;
      memoryWritten: false;
      getIssued: true;
      discoveryUsed: false;
    }
  | {
      ok: true;
      gated: false;
      conclusion: "VERIFICATION_MISMATCH";
      attempt: JournalEntryProviderAttemptRow;
      execution: JournalEntryExecutionRow;
      providerReadbackHash: string | null;
      mismatches: JeEconomicMismatchDimension[];
      ledgerEventId: string | null;
      memoryWritten: false;
      getIssued: true;
      discoveryUsed: false;
    }
  | {
      ok: true;
      gated: false;
      conclusion: "ALREADY_VERIFIED";
      attempt: JournalEntryProviderAttemptRow;
      execution: JournalEntryExecutionRow;
      providerReadbackHash: string | null;
      ledgerEventId: string | null;
      memoryWritten: false;
      getIssued: false;
      discoveryUsed: false;
    }
  | {
      ok: false;
      code: string;
      message: string;
      /** Read/transport failure — custody remains POSTED_UNVERIFIED. */
      conclusion: "INCONCLUSIVE";
      getIssued: boolean;
      memoryWritten: false;
      discoveryUsed: false;
    }
  | {
      ok: false;
      code: string;
      message: string;
      conclusion: "REJECTED";
      getIssued: false;
      memoryWritten: false;
      discoveryUsed: false;
    };

export type GovernedJeVerificationDeps = {
  resolveActor: (args: {
    engagementId: string;
    userId: string;
  }) => Promise<EngagementActor>;
  loadExecution: typeof loadExactExecution;
  loadProposal: (proposalId: string) => Promise<JournalEntryProposalRow>;
  loadAttempt: typeof loadProviderAttemptByExecutionId;
  loadFirmId: (engagementId: string) => Promise<string>;
  revalidateConnection: typeof revalidateCanonicalExecutionConnection;
  resolveToken: (
    accountingConnectionId: string,
    opts: { forceRefresh: boolean },
  ) => Promise<{
    accessToken: string;
    realmId: string;
    connectionId: string;
  } | null>;
  confirmRealmBelongsToConnection: (args: {
    accountingConnectionId: string;
    companyId: string;
    realmId: string;
  }) => Promise<{ ok: true } | { ok: false; code: string; message: string }>;
  readById: (args: {
    auth: { realmId: string; accessToken: string; userId?: string };
    qboJeId: string;
  }) => Promise<ReadJournalEntryByIdResult>;
  applyVerified: (input: {
    executionId: string;
    expectedStatus: "POSTED_UNVERIFIED";
    expectedStateVersion: number;
    attemptId: string;
    expectedAttemptStatus: "RESPONSE_RECEIVED";
    providerReadbackHash: string;
    verificationSnapshot: Record<string, unknown>;
    verificationMetadata: Record<string, unknown>;
    eventPayload: Record<string, unknown>;
    firmId: string | null;
    firmClientId: string | null;
    engagementId: string;
    closePeriodId: string | null;
    actorId: string;
  }) => Promise<{
    attempt: JournalEntryProviderAttemptRow;
    execution: JournalEntryExecutionRow;
    ledgerEventId: string | null;
  }>;
  applyMismatch: (input: {
    executionId: string;
    expectedStatus: "POSTED_UNVERIFIED";
    expectedStateVersion: number;
    attemptId: string;
    expectedAttemptStatus: "RESPONSE_RECEIVED";
    providerReadbackHash: string | null;
    verificationSnapshot: Record<string, unknown>;
    verificationMetadata: Record<string, unknown>;
    eventPayload: Record<string, unknown>;
    firmId: string | null;
    firmClientId: string | null;
    engagementId: string;
    closePeriodId: string | null;
    actorId: string;
  }) => Promise<{
    attempt: JournalEntryProviderAttemptRow;
    execution: JournalEntryExecutionRow;
    ledgerEventId: string | null;
  }>;
};

function reject(
  code: string,
  message: string,
): Extract<VerifyGovernedJeResult, { conclusion: "REJECTED" }> {
  return {
    ok: false,
    code,
    message,
    conclusion: "REJECTED",
    getIssued: false,
    memoryWritten: false,
    discoveryUsed: false,
  };
}

function inconclusive(
  code: string,
  message: string,
  getIssued: boolean,
): Extract<VerifyGovernedJeResult, { conclusion: "INCONCLUSIVE" }> {
  return {
    ok: false,
    code,
    message,
    conclusion: "INCONCLUSIVE",
    getIssued,
    memoryWritten: false,
    discoveryUsed: false,
  };
}

export async function confirmRealmBelongsToConnectionDefault(args: {
  accountingConnectionId: string;
  companyId: string;
  realmId: string;
}): Promise<{ ok: true } | { ok: false; code: string; message: string }> {
  const supabase = getSupabaseAdmin();
  const { data: conn, error } = await supabase
    .from("accounting_connections")
    .select("id, tenant_or_realm_id, external_entity_id, metadata_json, status")
    .eq("id", args.accountingConnectionId)
    .maybeSingle();
  if (error || !conn) {
    return {
      ok: false,
      code: JE_PROVIDER_ATTEMPT_ERROR.CONNECTION_UNUSABLE,
      message: "Bound accounting connection not found for realm confirmation.",
    };
  }
  if (String(conn.status) !== "connected") {
    return {
      ok: false,
      code: JE_PROVIDER_ATTEMPT_ERROR.CONNECTION_UNUSABLE,
      message: "Bound accounting connection is not connected.",
    };
  }
  const realmFromConn =
    String(conn.tenant_or_realm_id || "").trim() ||
    String(conn.external_entity_id || "")
      .replace(/^qbo:/i, "")
      .trim();
  if (!realmFromConn || realmFromConn !== args.realmId) {
    return {
      ok: false,
      code: JE_PROVIDER_ATTEMPT_ERROR.CONNECTION_UNUSABLE,
      message: "Resolved realm does not belong to the persisted accounting connection.",
    };
  }
  const meta = (conn.metadata_json || {}) as Record<string, unknown>;
  const metaCompany = String(meta.company_id || "");
  if (metaCompany && metaCompany !== args.companyId) {
    return {
      ok: false,
      code: JE_PROVIDER_ATTEMPT_ERROR.CONNECTION_UNUSABLE,
      message: "Resolved connection is not canonical for execution company.",
    };
  }
  const { data: company } = await supabase
    .from("companies")
    .select("id, qbo_realm_id")
    .eq("id", args.companyId)
    .maybeSingle();
  const companyRealm = company?.qbo_realm_id
    ? String(company.qbo_realm_id).trim()
    : "";
  if (companyRealm && companyRealm !== args.realmId) {
    return {
      ok: false,
      code: JE_PROVIDER_ATTEMPT_ERROR.CONNECTION_UNUSABLE,
      message: "Resolved realm does not match company qbo_realm_id.",
    };
  }
  return { ok: true };
}

/**
 * Pure orchestration. All network/RPC deps must be injected.
 */
export async function runGovernedJournalEntryVerification(
  input: VerifyGovernedJeInput,
  ctx: JeExecutionContext,
  deps: GovernedJeVerificationDeps,
): Promise<VerifyGovernedJeResult> {
  void JE_MEMORY_PROJECTION_CONTRACT;
  let getIssued = false;

  try {
    if (
      !ctx.principal ||
      ctx.principal.type !== "user" ||
      !ctx.principal.userId
    ) {
      return reject(
        "je_execution_principal_required",
        "Verified user principal required.",
      );
    }
    const userId = ctx.principal.userId;

    const execution = await deps.loadExecution(input.executionId);
    if (!execution) {
      return reject("je_execution_not_found", "Execution not found.");
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
      return reject(auth.code, auth.message);
    }

    const attempt = await deps.loadAttempt(execution.id);
    if (!attempt) {
      return reject(
        JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
        "Provider attempt must exist for verification.",
      );
    }

    // Idempotent identical replay after VERIFIED — fail closed if custody incomplete.
    if (execution.status === "VERIFIED") {
      const readback = String(execution.provider_readback_hash ?? "").trim();
      if (
        attempt.status !== "VERIFIED_PROVIDER_ID" ||
        attempt.accounting_connection_id !==
          execution.accounting_connection_id ||
        attempt.provider_request_hash !== execution.provider_request_hash ||
        attempt.correlation_marker !== execution.correlation_marker ||
        attempt.qbo_je_id !== execution.provider_journal_id
      ) {
        return reject(
          JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
          "Already VERIFIED but immutable bindings disagree; fail closed.",
        );
      }
      if (!/^[a-f0-9]{64}$/.test(readback)) {
        return reject(
          "je_verification_already_verified_readback_hash_invalid",
          "Already VERIFIED but provider_readback_hash missing/malformed; fail closed.",
        );
      }
      if (!execution.verification_ledger_event_id) {
        return reject(
          "je_verification_already_verified_receipt_missing",
          "Already VERIFIED but verification_ledger_event_id missing; fail closed.",
        );
      }
      return {
        ok: true,
        gated: false,
        conclusion: "ALREADY_VERIFIED",
        attempt,
        execution,
        providerReadbackHash: readback,
        ledgerEventId: execution.verification_ledger_event_id,
        memoryWritten: false,
        getIssued: false,
        discoveryUsed: false,
      };
    }

    if (execution.status === "VERIFICATION_MISMATCH") {
      return reject(
        "je_verification_already_mismatched",
        "Execution already VERIFICATION_MISMATCH; no automatic repost or re-verify conclusion.",
      );
    }

    if (execution.status !== "POSTED_UNVERIFIED") {
      return reject(
        JE_PROVIDER_ATTEMPT_ERROR.EXECUTION_STATUS_INVALID,
        `Verification requires POSTED_UNVERIFIED; found ${execution.status}`,
      );
    }

    if (
      attempt.status !== "RESPONSE_RECEIVED" ||
      attempt.commit_certainty !== "COMMITTED"
    ) {
      return reject(
        JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
        `Attempt must be RESPONSE_RECEIVED+COMMITTED; found ${attempt.status}/${attempt.commit_certainty}`,
      );
    }

    if (
      attempt.accounting_connection_id !== execution.accounting_connection_id ||
      attempt.provider_request_hash !== execution.provider_request_hash ||
      attempt.correlation_marker !== execution.correlation_marker ||
      !execution.provider_journal_id ||
      attempt.qbo_je_id !== execution.provider_journal_id
    ) {
      return reject(
        JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
        "Execution/attempt connection, request hash, marker, or provider JE ID mismatch.",
      );
    }

    const connectionOk = await deps.revalidateConnection({ execution });
    if (!connectionOk.ok) {
      return inconclusive(connectionOk.code, connectionOk.message, false);
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
      return reject(
        JE_PROVIDER_ATTEMPT_ERROR.REQUEST_HASH_MISMATCH,
        "Reconstructed provider_request_hash mismatch before verification GET.",
      );
    }

    const token = await deps.resolveToken(execution.accounting_connection_id, {
      forceRefresh: false,
    });
    if (!token?.accessToken || !token.realmId) {
      return inconclusive(
        JE_PROVIDER_ATTEMPT_ERROR.CONNECTION_UNUSABLE,
        "Canonical accounting connection token unavailable.",
        false,
      );
    }
    if (token.connectionId && token.connectionId !== execution.accounting_connection_id) {
      return reject(
        JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
        "Token resolver returned a different accounting_connection_id.",
      );
    }

    const realmOk = await deps.confirmRealmBelongsToConnection({
      accountingConnectionId: execution.accounting_connection_id,
      companyId: execution.company_id,
      realmId: token.realmId,
    });
    if (!realmOk.ok) {
      return inconclusive(realmOk.code, realmOk.message, false);
    }

    const persistedProviderId = String(execution.provider_journal_id);
    getIssued = true;
    const read = await deps.readById({
      auth: {
        realmId: token.realmId,
        accessToken: token.accessToken,
        userId,
      },
      qboJeId: persistedProviderId,
    });

    // Read/transport failures: leave POSTED_UNVERIFIED; no mismatch receipt.
    if (read.outcome !== "FOUND" || !read.normalized) {
      return inconclusive(
        "je_verification_read_inconclusive",
        `Provider GET inconclusive (${read.outcome}${read.httpStatus ? ` HTTP ${read.httpStatus}` : ""}). Custody remains POSTED_UNVERIFIED; safe GET retry only.`,
        true,
      );
    }

    const observed: NormalizedProviderJe = read.normalized;
    const mismatches: JeEconomicMismatchDimension[] = [];

    if (observed.providerJournalId !== persistedProviderId) {
      mismatches.push("provider_id");
    }
    if (
      !privateNoteContainsExactCorrelationMarker(
        observed.privateNote,
        execution.correlation_marker,
      )
    ) {
      mismatches.push("correlation_marker");
    }

    const expectedLines = preview.Line.map((line) => ({
      accountId: line.AccountRef.value,
      debitCents:
        line.posting_type === "Debit"
          ? Math.round(Number(line.Amount.toFixed(2)) * 100)
          : 0,
      creditCents:
        line.posting_type === "Credit"
          ? Math.round(Number(line.Amount.toFixed(2)) * 100)
          : 0,
      classId: line.ClassRef?.value ?? null,
    }));

    const economic = compareProviderJeEconomics({
      candidate: observed,
      expected: {
        txnDate: preview.TxnDate,
        currency: preview.currency,
        lines: expectedLines,
        totalDebitsCents: preview.domain_total_debits_cents,
        totalCreditsCents: preview.domain_total_credits_cents,
      },
    });
    mismatches.push(...economic.mismatches);

    const snapshot = canonicalizeNormalizedProviderJe(observed);
    const readbackHash = hashNormalizedProviderJe(observed);
    const firmId = await deps.loadFirmId(execution.engagement_id);
    const bindingReceipt = {
      execution_id: execution.id,
      provider_attempt_id: attempt.id,
      accounting_connection_id: attempt.accounting_connection_id,
      provider_request_hash: attempt.provider_request_hash,
      correlation_marker: attempt.correlation_marker,
      provider_journal_id: persistedProviderId,
      proposal_id: execution.proposal_id,
      approval_id: execution.approval_id,
      engagement_id: execution.engagement_id,
      firm_client_id: execution.firm_client_id,
      provider_readback_hash: readbackHash,
    };

    if (mismatches.length > 0) {
      const unique = [...new Set(mismatches)];
      const mismatch = await deps.applyMismatch({
        executionId: execution.id,
        expectedStatus: "POSTED_UNVERIFIED",
        expectedStateVersion: execution.state_version,
        attemptId: attempt.id,
        expectedAttemptStatus: "RESPONSE_RECEIVED",
        providerReadbackHash: readbackHash,
        verificationSnapshot: snapshot,
        verificationMetadata: {
          mismatches: unique,
          observed_provider_id: observed.providerJournalId,
          http_status: read.httpStatus,
        },
        eventPayload: {
          ...bindingReceipt,
          status: "VERIFICATION_MISMATCH",
          error_code: "je_verification_mismatch",
          error_message: `Verification mismatch: ${unique.join(",")}`,
          mismatches: unique,
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
        conclusion: "VERIFICATION_MISMATCH",
        attempt: mismatch.attempt,
        execution: mismatch.execution,
        providerReadbackHash: readbackHash,
        mismatches: unique,
        ledgerEventId: mismatch.ledgerEventId,
        memoryWritten: false,
        getIssued: true,
        discoveryUsed: false,
      };
    }

    const verified = await deps.applyVerified({
      executionId: execution.id,
      expectedStatus: "POSTED_UNVERIFIED",
      expectedStateVersion: execution.state_version,
      attemptId: attempt.id,
      expectedAttemptStatus: "RESPONSE_RECEIVED",
      providerReadbackHash: readbackHash,
      verificationSnapshot: snapshot,
      verificationMetadata: {
        http_status: read.httpStatus,
        intuit_tid: read.intuitTid,
        // Distinct from raw POST hash — do not compare.
        raw_post_response_hash: execution.provider_response_hash,
      },
      eventPayload: {
        ...bindingReceipt,
        status: "VERIFIED",
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
      conclusion: "VERIFIED",
      attempt: verified.attempt,
      execution: verified.execution,
      providerReadbackHash: readbackHash,
      ledgerEventId: verified.ledgerEventId,
      memoryWritten: false,
      getIssued: true,
      discoveryUsed: false,
    };
  } catch (err) {
    if (err instanceof Je3cGateError) {
      return reject(err.code, err.message);
    }
    if (err instanceof JeProviderAttemptPersistError) {
      // After GET, ledger/persist failure must not claim verified; leave inconclusive
      // if we already issued GET (crash window: POSTED_UNVERIFIED remains).
      if (getIssued) {
        return inconclusive(
          err.code,
          `${err.message} Custody remains POSTED_UNVERIFIED after GET; safe GET retry only.`,
          true,
        );
      }
      return reject(err.code, err.message);
    }
    if (getIssued) {
      return inconclusive(
        "je_verification_read_inconclusive",
        err instanceof Error
          ? `${err.message} Custody remains POSTED_UNVERIFIED after GET; safe GET retry only.`
          : "Verification failed after GET; custody remains POSTED_UNVERIFIED.",
        true,
      );
    }
    return reject(
      JE_PROVIDER_ATTEMPT_ERROR.BINDING_CONFLICT,
      err instanceof Error ? err.message : String(err),
    );
  }
}
