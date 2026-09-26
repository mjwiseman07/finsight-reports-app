/**
 * JE-4 post-write verification orchestrator.
 *
 * Order, after VERIFIED custody + ledger receipt:
 *   FRESH_CAPTURE authoritative observation (provider refresh + AR/AP/Inventory
 *   recompute; the observation forbids a caller sync id)
 *   → SUCCESS sync identity, company/connection/period, at-or-after verified_at
 *   → snapshot-backed Tie-Out baseline check (no regenerate-run)
 *   → Continuous Close OBSERVE via REPLAY_EXISTING_SYNC on that new sync
 *   → expected-effect verification
 *   → readiness composed from the new OBSERVE exceptions
 *   → evidence row keyed by (execution_id, accounting_sync_id, policy_hash)
 *
 * Memory is not close proof. Pre-write sync and pre-write CC runs are rejected.
 * Identical replay reuses the prior row. retry=true re-enters only retryable
 * conclusions and still refuses to duplicate an EFFECTS_VERIFIED row.
 * An IN_PROGRESS row is single-flighted. A second caller returns that row
 * unless it wins a compare-and-set claim, and only a stale claim can be
 * reclaimed after a crash.
 */

import { composeContinuousCloseReadiness } from "@/lib/continuous-close/readiness";
import type { ContinuousCloseException } from "@/lib/continuous-close/exceptions";
import type { ContinuousCloseObservePolicy } from "@/lib/continuous-close/policy";
import type {
  AuthoritativeObservationExecutionContext,
  AuthoritativeObservationInput,
  AuthoritativeObservationResult,
  AuthoritativeReconSlot,
} from "@/lib/audit-ready/authoritative-observation/types";
import type { RunAndPersistAuthoritativeObserveResult } from "@/lib/continuous-close/persistence/types";
import type { JournalEntryExecutionRow } from "./execution-types";
import type { JournalEntryProposalRow } from "./types";
import { assertPostWriteVerificationCustody } from "./post-write-verification-custody";
import {
  applyPostWriteProofRows,
  type PostWriteTieOutProofRow,
} from "./post-write-verification-canonical";
import { verifyPostWriteExpectedEffects } from "./post-write-verification-effects";
import {
  hashJe4IdempotencyKey,
  hashJe4Input,
  hashJe4Policy,
} from "./post-write-verification-hash";
import type { PostWriteVerificationRepository } from "./post-write-verification-repository";
import { selectPostWriteRecomputeScope } from "./post-write-verification-scope";
import { evaluateSnapshotBackedTieOut } from "./post-write-verification-tie-out";
import type { PriorLedgerEventCustody, VerificationLedgerEventCustody } from "./verified-memory-projection-custody";
import {
  JE4_FORBIDDEN_CALLER_KEYS,
  JE4_TRANSIENT_ATTEMPT_LIMIT,
  PostWriteVerificationError,
  type Je4EffectConclusion,
  type Je4ReadinessState,
  type Je4RunRow,
  type Je4RunStatus,
  type PostWriteCanonicalEvidence,
  type PostWriteExecutionCustody,
  type PostWriteVerificationResult,
} from "./post-write-verification-types";

const SECRET_JSON_RE =
  /access[_-]?token|refresh[_-]?token|"authorization"|authorization:/i;

const NON_RETRYABLE_CODE =
  /auth|permission|forbidden|gate|disabled|credential|safety/i;

/**
 * An open row stays owned while this claim is in the future. Crash resume
 * may reclaim it only after the claim expires.
 */
export const JE4_FLIGHT_CLAIM_TTL_MS = 15 * 60 * 1000;

type FlightClaim = {
  token: string;
  expires_at: string;
};

function readFlightClaim(evidence: Record<string, unknown>): FlightClaim | null {
  const raw = evidence.flight_claim;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const token = (raw as { token?: unknown }).token;
  const expiresAt = (raw as { expires_at?: unknown }).expires_at;
  if (typeof token !== "string" || token.length === 0) return null;
  if (typeof expiresAt !== "string" || Number.isNaN(Date.parse(expiresAt))) return null;
  return { token, expires_at: expiresAt };
}

function flightClaimExpiresAt(nowIso: string): string {
  const nowMs = Date.parse(nowIso);
  if (!Number.isFinite(nowMs)) return nowIso;
  return new Date(nowMs + JE4_FLIGHT_CLAIM_TTL_MS).toISOString();
}

function claimIsFresh(claim: FlightClaim | null, nowIso: string): boolean {
  if (!claim) return false;
  const expiresMs = Date.parse(claim.expires_at);
  const nowMs = Date.parse(nowIso);
  if (!Number.isFinite(expiresMs) || !Number.isFinite(nowMs)) return false;
  return expiresMs > nowMs;
}

function withFlightClaim(
  evidence: Record<string, unknown>,
  token: string,
  expiresAt: string,
): Record<string, unknown> {
  return {
    ...evidence,
    flight_claim: { token, expires_at: expiresAt },
  };
}

function withoutFlightClaim(evidence: Record<string, unknown>): Record<string, unknown> {
  if (!("flight_claim" in evidence)) return evidence;
  const next = { ...evidence };
  delete next.flight_claim;
  return next;
}

export type RunPostWriteVerificationInput = {
  executionId: string;
  /**
   * Re-enter a retryable conclusion (provider lag, transient refresh, stale sync).
   * Does not override company, connection, or sync custody.
   */
  retry?: boolean;
};

export type PostWriteVerificationDeps = {
  loadExecution: (executionId: string) => Promise<JournalEntryExecutionRow | null>;
  loadVerificationReceipt: (
    eventId: string,
  ) => Promise<VerificationLedgerEventCustody | null>;
  loadPriorLedgerEvent: (
    eventHash: string,
  ) => Promise<PriorLedgerEventCustody | null>;
  loadProposal: (proposalId: string) => Promise<JournalEntryProposalRow | null>;
  loadSourceReconKinds: (runIds: readonly string[]) => Promise<string[]>;
  loadObservePolicy: (args: {
    sourceContinuousCloseRunId: string;
    companyId: string;
    engagementId: string;
  }) => Promise<ContinuousCloseObservePolicy | null>;
  runObservation: (
    input: AuthoritativeObservationInput,
    executionContext: AuthoritativeObservationExecutionContext,
  ) => Promise<AuthoritativeObservationResult>;
  loadCanonicalEvidence: (args: {
    accountingSyncId: string;
    providerJournalId: string;
  }) => Promise<PostWriteCanonicalEvidence | null>;
  /**
   * Tie-out rows for effect proof. Engagement, period, sync, and run ids
   * are taken from execution custody and the observation, never from the caller.
   */
  loadPostWriteProofRows: (args: {
    engagementId: string;
    periodEnd: string;
    accountingSyncId: string;
    verifiedAt: string;
    syncBackedRunIds: readonly string[];
    glAccountIds: readonly string[];
  }) => Promise<PostWriteTieOutProofRow[]>;
  runObserve: (
    input: AuthoritativeObservationInput,
    executionContext: AuthoritativeObservationExecutionContext,
    policy: ContinuousCloseObservePolicy,
  ) => Promise<RunAndPersistAuthoritativeObserveResult>;
  repository: PostWriteVerificationRepository;
  newId: () => string;
  nowIso: () => string;
};

type StoredSlot = {
  runId: string | null;
  authoritative: boolean;
  baselineSyncId: string | null;
  measurementSource: "persisted_sync_snapshot" | "live_provider" | null;
  totalsStatus: string | null;
};

function failureResult(
  code: string,
  message: string,
  run: Je4RunRow | null = null,
): PostWriteVerificationResult {
  return { ok: false, reused: false, code, message, run };
}

function assertNoCallerAuthorityOverride(input: RunPostWriteVerificationInput): void {
  const raw = input as Record<string, unknown>;
  for (const key of JE4_FORBIDDEN_CALLER_KEYS) {
    if (raw[key] !== undefined && raw[key] !== null) {
      throw new PostWriteVerificationError(
        "je4_caller_authority_override",
        `Caller must not supply ${key}; custody loads authority fields.`,
      );
    }
  }
}

function resultFromRow(row: Je4RunRow, reused: boolean): PostWriteVerificationResult {
  const verified =
    row.status === "EFFECTS_VERIFIED" && row.effect_conclusion === "VERIFIED";
  return {
    ok: verified,
    reused,
    code: verified ? "je4_effects_verified" : row.failure_code || row.status,
    message: verified
      ? `Expected accounting effects are verified. Close readiness is ${row.readiness} from the post-write OBSERVE run.`
      : row.failure_message || `Post-write verification concluded ${row.status}.`,
    run: row,
  };
}

function newest(rows: readonly Je4RunRow[]): Je4RunRow | null {
  if (rows.length === 0) return null;
  return [...rows].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
}

export function selectPostWriteReuseRow(
  rows: readonly Je4RunRow[],
  retry: boolean,
): Je4RunRow | null {
  const verified = newest(rows.filter((row) => row.status === "EFFECTS_VERIFIED"));
  if (verified) return verified;
  const settled = rows.filter((row) => row.status !== "IN_PROGRESS");
  if (!retry) return newest(settled);
  const terminal = newest(settled.filter((row) => !row.retryable));
  return terminal;
}

function conclusionForStatus(status: Je4RunStatus): Je4EffectConclusion {
  switch (status) {
    case "PENDING_PROVIDER_VISIBILITY":
      return "PENDING_PROVIDER_VISIBILITY";
    case "EFFECTS_MISMATCH":
      return "MISMATCH";
    case "EFFECTS_VERIFIED":
      return "VERIFIED";
    case "IN_PROGRESS":
      return "NOT_EVALUATED";
    default:
      return "INCOMPLETE";
  }
}

function scrubEvidence(
  evidence: Record<string, unknown>,
): { evidence: Record<string, unknown>; rejected: boolean } {
  const json = JSON.stringify(evidence);
  if (json && SECRET_JSON_RE.test(json)) {
    return {
      evidence: { redacted: true, reason: "je4_evidence_secret_rejected" },
      rejected: true,
    };
  }
  return { evidence, rejected: false };
}

function slotSnapshot(slot: AuthoritativeReconSlot | null): StoredSlot {
  const source = slot?.measurementSource;
  return {
    runId: slot?.runId ?? null,
    authoritative: Boolean(slot?.authoritative),
    baselineSyncId: slot?.baselineSyncId ?? null,
    measurementSource:
      source === "persisted_sync_snapshot" || source === "live_provider"
        ? source
        : null,
    totalsStatus: slot?.totalsStatus ?? null,
  };
}

function measurementSource(
  value: unknown,
): "persisted_sync_snapshot" | "live_provider" | null {
  if (value === "persisted_sync_snapshot" || value === "live_provider") return value;
  return null;
}

function readStoredSlots(
  evidence: Record<string, unknown>,
): { ar: StoredSlot; ap: StoredSlot; inventory: StoredSlot } | null {
  const reconciliations = evidence.reconciliations;
  if (!reconciliations || typeof reconciliations !== "object") return null;
  const raw = reconciliations as Record<string, unknown>;
  const read = (name: string): StoredSlot | null => {
    const slot = raw[name];
    if (!slot || typeof slot !== "object") return null;
    const row = slot as Record<string, unknown>;
    return {
      runId: row.runId ? String(row.runId) : null,
      authoritative: Boolean(row.authoritative),
      baselineSyncId: row.baselineSyncId ? String(row.baselineSyncId) : null,
      measurementSource: measurementSource(row.measurementSource),
      totalsStatus: row.totalsStatus ? String(row.totalsStatus) : null,
    };
  };
  const ar = read("ar");
  const ap = read("ap");
  const inventory = read("inventory");
  if (!ar || !ap || !inventory) return null;
  return { ar, ap, inventory };
}

function trioComplete(observation: AuthoritativeObservationResult): boolean {
  const present = new Set(observation.custody.snapshotsPresent || []);
  return (
    present.has("ar_aging") &&
    present.has("ap_aging") &&
    present.has("inventory") &&
    Boolean(observation.accountingSyncId)
  );
}

function isRetryableThrown(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const row = error as { retryable?: boolean; code?: string };
  if (row.retryable !== true) return false;
  if (NON_RETRYABLE_CODE.test(String(row.code || ""))) return false;
  return true;
}

async function withTransientRetries<T>(fn: () => Promise<T>): Promise<T> {
  let last: unknown;
  for (let attempt = 1; attempt <= JE4_TRANSIENT_ATTEMPT_LIMIT; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      last = error;
      if (!isRetryableThrown(error) || attempt === JE4_TRANSIENT_ATTEMPT_LIMIT) {
        throw error;
      }
    }
  }
  throw last;
}

function exceptionsFromRunResult(
  result: Record<string, unknown> | null | undefined,
): ContinuousCloseException[] | null {
  const raw = result?.exceptions;
  if (!Array.isArray(raw)) return null;
  const exceptions: ContinuousCloseException[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    const code = String(row.code || "").trim();
    const disposition = row.disposition;
    if (!code) return null;
    if (disposition !== "block" && disposition !== "review" && disposition !== "info") {
      return null;
    }
    exceptions.push(item as ContinuousCloseException);
  }
  return exceptions;
}

function syncTimingFailure(args: {
  evidence: PostWriteCanonicalEvidence;
  custody: PostWriteExecutionCustody;
}): { code: string; message: string; retryable: boolean } | null {
  const { evidence, custody } = args;
  if (evidence.accountingSyncId === custody.sourceAccountingSyncId) {
    return {
      code: "je4_pre_write_sync_reused",
      message: "The pre-write accounting sync cannot be the post-write baseline.",
      retryable: false,
    };
  }
  if (evidence.validationStatus !== "SUCCESS") {
    return {
      code: "je4_sync_not_success",
      message: "Post-write accounting sync validation_status must be SUCCESS.",
      retryable: false,
    };
  }
  if (evidence.companyId !== custody.companyId) {
    return {
      code: "je4_sync_company_mismatch",
      message: "Post-write sync company does not match execution custody.",
      retryable: false,
    };
  }
  if (evidence.connectionId !== custody.accountingConnectionId) {
    return {
      code: "je4_sync_connection_mismatch",
      message: "Post-write sync connection does not match execution custody.",
      retryable: false,
    };
  }
  if (evidence.periodEnd !== custody.periodEnd) {
    return {
      code: "je4_sync_period_mismatch",
      message: "Post-write sync period does not match proposal custody.",
      retryable: false,
    };
  }
  if (!evidence.syncedAt) {
    return {
      code: "je4_sync_timestamp_missing",
      message: "Post-write sync last_synced_at is required to prove it is at-or-after VERIFIED.",
      retryable: true,
    };
  }
  const syncedMs = Date.parse(evidence.syncedAt);
  const verifiedMs = Date.parse(custody.verifiedAt);
  if (!Number.isFinite(syncedMs) || !Number.isFinite(verifiedMs) || syncedMs < verifiedMs) {
    return {
      code: "je4_sync_stale",
      message: "Post-write sync is older than VERIFIED custody.",
      retryable: true,
    };
  }
  if (evidence.partial) {
    return {
      code: "je4_partial_sync",
      message: "Partial canonical sync cannot be a post-write baseline.",
      retryable: true,
    };
  }
  return null;
}

export async function runPostWriteVerification(
  input: RunPostWriteVerificationInput,
  deps: PostWriteVerificationDeps,
): Promise<PostWriteVerificationResult> {
  try {
    assertNoCallerAuthorityOverride(input);
  } catch (error) {
    if (error instanceof PostWriteVerificationError) {
      return failureResult(error.code, error.message);
    }
    throw error;
  }

  const executionId = String(input.executionId || "").trim();
  if (!executionId) {
    return failureResult("je4_execution_required", "executionId is required.");
  }
  const retry = input.retry === true;

  let execution: JournalEntryExecutionRow | null;
  try {
    execution = await deps.loadExecution(executionId);
  } catch (error) {
    return failureResult(
      "je4_execution_load_failed",
      error instanceof Error ? error.message : "Execution load failed.",
    );
  }
  if (!execution) {
    return failureResult("je4_execution_not_found", "Exact execution custody was not found.");
  }
  if (execution.status !== "VERIFIED") {
    return failureResult(
      "je4_requires_verified",
      "Post-write verification requires VERIFIED execution custody.",
    );
  }

  const verificationLedgerEventId = String(
    execution.verification_ledger_event_id || "",
  ).trim();
  if (!verificationLedgerEventId) {
    return failureResult(
      "je4_receipt_required",
      "VERIFIED execution is missing verification_ledger_event_id.",
    );
  }

  let proposal: JournalEntryProposalRow | null;
  let receipt: VerificationLedgerEventCustody | null;
  try {
    [proposal, receipt] = await Promise.all([
      deps.loadProposal(execution.proposal_id),
      deps.loadVerificationReceipt(verificationLedgerEventId),
    ]);
  } catch (error) {
    return failureResult(
      "je4_custody_load_failed",
      error instanceof Error ? error.message : "Custody load failed.",
    );
  }
  if (!proposal) {
    return failureResult("je4_proposal_not_found", "Proposal custody was not found.");
  }
  if (!receipt) {
    return failureResult(
      "je4_receipt_not_found",
      "Verification ledger receipt was not found.",
    );
  }

  let prior: PriorLedgerEventCustody | null = null;
  if (receipt.previous_event_hash) {
    try {
      prior = await deps.loadPriorLedgerEvent(receipt.previous_event_hash);
    } catch (error) {
      return failureResult(
        "je4_receipt_chain_load_failed",
        error instanceof Error ? error.message : "Ledger chain load failed.",
      );
    }
  }

  let custody: PostWriteExecutionCustody;
  try {
    custody = assertPostWriteVerificationCustody({
      execution,
      proposal,
      receipt,
      priorEventByPreviousHash: prior,
    });
  } catch (error) {
    if (error instanceof PostWriteVerificationError) {
      return failureResult(error.code, error.message);
    }
    throw error;
  }

  let sourceReconKinds: string[];
  let observePolicy: ContinuousCloseObservePolicy | null;
  try {
    [sourceReconKinds, observePolicy] = await Promise.all([
      deps.loadSourceReconKinds(custody.sourceReconRunIds),
      deps.loadObservePolicy({
        sourceContinuousCloseRunId: custody.sourceContinuousCloseRunId,
        companyId: custody.companyId,
        engagementId: custody.engagementId,
      }),
    ]);
  } catch (error) {
    return failureResult(
      error instanceof PostWriteVerificationError
        ? error.code
        : "je4_scope_load_failed",
      error instanceof Error ? error.message : "Scope load failed.",
    );
  }
  if (!observePolicy) {
    return failureResult(
      "je4_observe_policy_missing",
      "Observe policy must be loaded from the source Continuous Close run.",
    );
  }

  const scope = selectPostWriteRecomputeScope({
    expectedEffects: custody.expectedEffects,
    sourceReconKinds,
  });
  const policyHash = hashJe4Policy({
    executionId: custody.executionId,
    proposalHash: custody.proposalHash,
    companyId: custody.companyId,
    engagementId: custody.engagementId,
    accountingConnectionId: custody.accountingConnectionId,
    periodEnd: custody.periodEnd,
    sourceContinuousCloseRunId: custody.sourceContinuousCloseRunId,
    sourceAccountingSyncId: custody.sourceAccountingSyncId,
    verificationLedgerEventId: custody.verificationLedgerEventId,
    expectedEffects: custody.expectedEffects,
  });
  const inputHash = hashJe4Input({
    executionId: custody.executionId,
    providerJournalId: custody.providerJournalId,
    providerReadbackHash: custody.providerReadbackHash,
    proposalHash: custody.proposalHash,
    policyHash,
  });

  let existing: Je4RunRow[];
  try {
    existing = await deps.repository.listByExecutionPolicy({
      executionId: custody.executionId,
      policyHash,
    });
  } catch (error) {
    return failureResult(
      "je4_run_load_failed",
      error instanceof Error ? error.message : "Run load failed.",
    );
  }

  const reuse = selectPostWriteReuseRow(existing, retry);
  if (reuse) return resultFromRow(reuse, true);

  const now = deps.nowIso();
  let heldClaimToken: string | null = null;

  async function readPersistedRun(id: string): Promise<Je4RunRow | null> {
    try {
      const rows = await deps.repository.listByExecutionPolicy({
        executionId: custody.executionId,
        policyHash,
      });
      return rows.find((item) => item.id === id) ?? null;
    } catch {
      return null;
    }
  }

  async function acquireOpenRow(
    open: Je4RunRow,
  ): Promise<
    | { action: "return"; row: Je4RunRow }
    | { action: "held"; row: Je4RunRow; token: string }
  > {
    const observedAt = deps.nowIso();
    if (claimIsFresh(readFlightClaim(open.evidence), observedAt)) {
      return { action: "return", row: open };
    }
    const token = deps.newId();
    const next: Je4RunRow = {
      ...open,
      evidence: withFlightClaim(open.evidence, token, flightClaimExpiresAt(observedAt)),
      updated_at: observedAt,
    };
    try {
      const swapped = await deps.repository.compareAndSwap({
        id: open.id,
        executionId: open.execution_id,
        expectedUpdatedAt: open.updated_at,
        expectedStatus: "IN_PROGRESS",
        next,
      });
      if (swapped) return { action: "held", row: swapped, token };
    } catch {
      return { action: "return", row: open };
    }
    const latest = await readPersistedRun(open.id);
    if (latest) return { action: "return", row: latest };
    const again = await deps.repository.listByExecutionPolicy({
      executionId: custody.executionId,
      policyHash,
    });
    const settled = selectPostWriteReuseRow(again, retry);
    if (settled) return { action: "return", row: settled };
    const stillOpen = newest(again.filter((item) => item.status === "IN_PROGRESS"));
    return { action: "return", row: stillOpen ?? open };
  }

  let row: Je4RunRow;
  const open = newest(existing.filter((item) => item.status === "IN_PROGRESS"));
  if (open) {
    const acquired = await acquireOpenRow(open);
    if (acquired.action === "return") return resultFromRow(acquired.row, true);
    row = acquired.row;
    heldClaimToken = acquired.token;
  } else {
    const claimToken = deps.newId();
    heldClaimToken = claimToken;
    row = {
      id: deps.newId(),
      execution_id: custody.executionId,
      company_id: custody.companyId,
      engagement_id: custody.engagementId,
      firm_client_id: custody.firmClientId,
      accounting_connection_id: custody.accountingConnectionId,
      provider_journal_id: custody.providerJournalId,
      provider_readback_hash: custody.providerReadbackHash,
      verification_ledger_event_id: custody.verificationLedgerEventId,
      source_accounting_sync_id: custody.sourceAccountingSyncId,
      accounting_sync_id: null,
      observation_id: null,
      tie_out_run_ids: [],
      continuous_close_run_id: null,
      source_continuous_close_run_id: custody.sourceContinuousCloseRunId,
      policy_hash: policyHash,
      input_hash: inputHash,
      idempotency_key: hashJe4IdempotencyKey({
        executionId: custody.executionId,
        accountingSyncId: null,
        policyHash,
      }),
      status: "IN_PROGRESS",
      effect_conclusion: "NOT_EVALUATED",
      retryable: false,
      readiness: null,
      evidence: withFlightClaim(
        {
          authority: "JE4_POST_WRITE_VERIFICATION",
          scope,
          memory_used_as_close_proof: false,
        },
        claimToken,
        flightClaimExpiresAt(now),
      ),
      failure_code: null,
      failure_message: null,
      created_at: now,
      updated_at: now,
    };
    try {
      row = await deps.repository.insert(row);
    } catch (error) {
      if (
        error instanceof PostWriteVerificationError &&
        error.code === "je4_idempotency_conflict"
      ) {
        const again = await deps.repository.listByExecutionPolicy({
          executionId: custody.executionId,
          policyHash,
        });
        const raced = selectPostWriteReuseRow(again, retry);
        if (raced) return resultFromRow(raced, true);
        const inProgress = newest(again.filter((item) => item.status === "IN_PROGRESS"));
        if (!inProgress) return failureResult(error.code, error.message);
        const acquired = await acquireOpenRow(inProgress);
        if (acquired.action === "return") return resultFromRow(acquired.row, true);
        row = acquired.row;
        heldClaimToken = acquired.token;
      } else {
        return failureResult(
          "je4_run_insert_failed",
          error instanceof Error ? error.message : "Run insert failed.",
        );
      }
    }
  }

  const executionContext: AuthoritativeObservationExecutionContext = {
    principal: { type: "user", userId: custody.requestedBy },
  };

  const persist = async (
    patch: Partial<Je4RunRow> & { status: Je4RunStatus },
  ): Promise<PostWriteVerificationResult> => {
    const nextStatus = patch.status;
    let effectConclusion = patch.effect_conclusion || conclusionForStatus(nextStatus);
    if (nextStatus === "EFFECTS_VERIFIED" && effectConclusion !== "VERIFIED") {
      effectConclusion = "INCOMPLETE";
    }
    const scrubbed = scrubEvidence({
      ...(row.evidence || {}),
      ...(patch.evidence || {}),
      memory_used_as_close_proof: false,
    });
    let status = nextStatus;
    let failureCode = patch.failure_code ?? null;
    let failureMessage = patch.failure_message ?? null;
    if (scrubbed.rejected && status === "EFFECTS_VERIFIED") {
      status = "EFFECTS_INCOMPLETE";
      effectConclusion = "INCOMPLETE";
      failureCode = "je4_evidence_secret_rejected";
      failureMessage = "Evidence contained a secret pattern and was not stored.";
    }
    if (status !== "EFFECTS_VERIFIED" && effectConclusion === "VERIFIED") {
      effectConclusion = "INCOMPLETE";
    }
    const updatedAt = deps.nowIso();
    const updated: Je4RunRow = {
      ...row,
      ...patch,
      status,
      effect_conclusion: effectConclusion,
      evidence: scrubbed.evidence,
      failure_code: status === "EFFECTS_VERIFIED" ? null : failureCode,
      failure_message: status === "EFFECTS_VERIFIED" ? null : failureMessage,
      retryable: status === "EFFECTS_VERIFIED" ? false : Boolean(patch.retryable),
      updated_at: updatedAt,
    };
    if (updated.status === "EFFECTS_VERIFIED") {
      if (
        !updated.accounting_sync_id ||
        !updated.continuous_close_run_id ||
        updated.continuous_close_run_id === updated.source_continuous_close_run_id ||
        !updated.readiness
      ) {
        updated.status = "EFFECTS_INCOMPLETE";
        updated.effect_conclusion = "INCOMPLETE";
        updated.failure_code = "je4_verified_lineage_incomplete";
        updated.failure_message =
          "Effects cannot be verified without a new sync, CC run, and readiness.";
        updated.retryable = false;
      }
    }
    if (updated.status === "IN_PROGRESS") {
      if (!heldClaimToken) {
        return failureResult(
          "je4_run_update_failed",
          "In-progress post-write verification has no flight claim.",
          await readPersistedRun(row.id),
        );
      }
      updated.evidence = withFlightClaim(
        updated.evidence,
        heldClaimToken,
        flightClaimExpiresAt(updatedAt),
      );
    } else {
      updated.evidence = withoutFlightClaim(updated.evidence);
    }
    const expectedUpdatedAt = row.updated_at;
    try {
      const saved = await deps.repository.compareAndSwap({
        id: row.id,
        executionId: row.execution_id,
        expectedUpdatedAt,
        next: updated,
      });
      if (!saved) {
        return failureResult(
          "je4_run_update_failed",
          "Post-write verification update lost the compare-and-set claim.",
          await readPersistedRun(row.id),
        );
      }
      row = saved;
    } catch (error) {
      return failureResult(
        "je4_run_update_failed",
        error instanceof Error ? error.message : "Run update failed.",
        await readPersistedRun(row.id),
      );
    }
    return resultFromRow(row, false);
  };

  async function lostClaimResult(): Promise<PostWriteVerificationResult | null> {
    const current = await readPersistedRun(row.id);
    const claim = current ? readFlightClaim(current.evidence) : null;
    if (
      current &&
      current.status === "IN_PROGRESS" &&
      claim &&
      claim.token === heldClaimToken &&
      claimIsFresh(claim, deps.nowIso())
    ) {
      return null;
    }
    if (!current) {
      return failureResult(
        "je4_run_update_failed",
        "Post-write verification row is no longer persisted.",
        null,
      );
    }
    return resultFromRow(current, true);
  }

  let slots = readStoredSlots(row.evidence);
  let syncId = row.accounting_sync_id;
  let observationId = row.observation_id;

  if (syncId && (!slots || !observationId)) {
    return persist({
      status: "RECON_FAILED",
      retryable: false,
      accounting_sync_id: syncId,
      failure_code: "je4_observation_evidence_missing",
      failure_message: "Stored post-write observation evidence is incomplete.",
      evidence: { ...row.evidence, scope },
    });
  }

  if (!syncId || !slots || !observationId) {
    const lostBeforeCapture = await lostClaimResult();
    if (lostBeforeCapture) return lostBeforeCapture;
    let observation: AuthoritativeObservationResult;
    try {
      observation = await withTransientRetries(() =>
        deps.runObservation(
          {
            mode: "FRESH_CAPTURE",
            engagementId: custody.engagementId,
            triggerReason: "api",
          },
          executionContext,
        ),
      );
    } catch (error) {
      const retryable = isRetryableThrown(error);
      return persist({
        status: "REFRESH_FAILED",
        retryable,
        failure_code:
          error instanceof PostWriteVerificationError
            ? error.code
            : "je4_refresh_failed",
        failure_message:
          error instanceof Error ? error.message : "Provider refresh failed.",
        evidence: { ...row.evidence, scope },
      });
    }

    if (observation.status !== "completed" || !trioComplete(observation)) {
      const failure = observation.failures[0];
      const hasSync = Boolean(observation.accountingSyncId);
      return persist({
        status: hasSync ? "RECON_FAILED" : "REFRESH_FAILED",
        retryable: false,
        accounting_sync_id: observation.accountingSyncId,
        observation_id: observation.observationId,
        failure_code: failure?.code || "je4_observation_failed",
        failure_message:
          failure?.message ||
          "Authoritative observation did not establish a complete post-write snapshot trio.",
        evidence: {
          ...row.evidence,
          scope,
          observation_status: observation.status,
        },
      });
    }

    syncId = String(observation.accountingSyncId);
    observationId = observation.observationId;
    slots = {
      ar: slotSnapshot(observation.reconciliations.ar),
      ap: slotSnapshot(observation.reconciliations.ap),
      inventory: slotSnapshot(observation.reconciliations.inventory),
    };
    if (syncId === custody.sourceAccountingSyncId) {
      return persist({
        status: "CANONICAL_INCOMPLETE",
        retryable: false,
        accounting_sync_id: null,
        observation_id: observationId,
        failure_code: "je4_pre_write_sync_reused",
        failure_message: "The pre-write accounting sync cannot be the post-write baseline.",
        evidence: {
          ...row.evidence,
          scope,
          reconciliations: slots,
          observation_status: observation.status,
        },
      });
    }

    const checkpoint = await persist({
      status: "IN_PROGRESS",
      accounting_sync_id: syncId,
      observation_id: observationId,
      idempotency_key: hashJe4IdempotencyKey({
        executionId: custody.executionId,
        accountingSyncId: syncId,
        policyHash,
      }),
      effect_conclusion: "NOT_EVALUATED",
      retryable: false,
      failure_code: null,
      failure_message: null,
      evidence: {
        ...row.evidence,
        scope,
        reconciliations: slots,
        observation_status: observation.status,
      },
    });
    if (checkpoint.code === "je4_run_update_failed" || checkpoint.run?.status !== "IN_PROGRESS") {
      return checkpoint;
    }
  }

  if (!syncId || !slots || !observationId) {
    return persist({
      status: "RECON_FAILED",
      retryable: false,
      failure_code: "je4_observation_evidence_missing",
      failure_message: "Post-write observation evidence is incomplete.",
      evidence: { ...row.evidence, scope },
    });
  }

  const tieOut = evaluateSnapshotBackedTieOut({
    accountingSyncId: syncId,
    observation: { reconciliations: slots },
  });
  if (!tieOut.ok) {
    return persist({
      status: "TIE_OUT_FAILED",
      retryable: false,
      accounting_sync_id: syncId,
      observation_id: observationId,
      failure_code: tieOut.code,
      failure_message: tieOut.message,
      evidence: { ...row.evidence, scope, reconciliations: slots },
    });
  }

  let canonical: PostWriteCanonicalEvidence | null;
  try {
    canonical = await deps.loadCanonicalEvidence({
      accountingSyncId: syncId,
      providerJournalId: custody.providerJournalId,
    });
  } catch (error) {
    return persist({
      status: "CANONICAL_INCOMPLETE",
      retryable: isRetryableThrown(error),
      accounting_sync_id: syncId,
      observation_id: observationId,
      tie_out_run_ids: tieOut.tieOutRunIds,
      failure_code: "je4_canonical_load_failed",
      failure_message: error instanceof Error ? error.message : "Canonical load failed.",
      evidence: { ...row.evidence, scope, reconciliations: slots },
    });
  }
  if (!canonical) {
    return persist({
      status: "CANONICAL_INCOMPLETE",
      retryable: false,
      accounting_sync_id: syncId,
      observation_id: observationId,
      tie_out_run_ids: tieOut.tieOutRunIds,
      failure_code: "je4_sync_not_found",
      failure_message: "Post-write accounting sync row was not found.",
      evidence: { ...row.evidence, scope, reconciliations: slots },
    });
  }

  const timing = syncTimingFailure({ evidence: canonical, custody });
  if (timing) {
    return persist({
      status: "CANONICAL_INCOMPLETE",
      retryable: timing.retryable,
      accounting_sync_id: syncId,
      observation_id: observationId,
      tie_out_run_ids: tieOut.tieOutRunIds,
      failure_code: timing.code,
      failure_message: timing.message,
      evidence: { ...row.evidence, scope, reconciliations: slots },
    });
  }

  const lostBeforeObserve = await lostClaimResult();
  if (lostBeforeObserve) return lostBeforeObserve;

  const observed = await deps.runObserve(
    {
      mode: "REPLAY_EXISTING_SYNC",
      engagementId: custody.engagementId,
      accountingSyncId: syncId,
      triggerReason: "api",
    },
    executionContext,
    observePolicy,
  );
  if (!observed.ok) {
    return persist({
      status: "OBSERVE_FAILED",
      retryable: false,
      accounting_sync_id: syncId,
      observation_id: observationId,
      tie_out_run_ids: tieOut.tieOutRunIds,
      failure_code: observed.code,
      failure_message: observed.message,
      evidence: { ...row.evidence, scope, reconciliations: slots },
    });
  }
  if (observed.run.accounting_sync_id !== syncId) {
    return persist({
      status: "OBSERVE_FAILED",
      retryable: false,
      accounting_sync_id: syncId,
      observation_id: observationId,
      tie_out_run_ids: tieOut.tieOutRunIds,
      continuous_close_run_id: observed.run.id,
      failure_code: "je4_observe_sync_mismatch",
      failure_message: "Continuous Close run is not bound to the post-write sync.",
      evidence: { ...row.evidence, scope, reconciliations: slots },
    });
  }
  if (observed.run.id === custody.sourceContinuousCloseRunId) {
    return persist({
      status: "OBSERVE_FAILED",
      retryable: false,
      accounting_sync_id: syncId,
      observation_id: observationId,
      tie_out_run_ids: tieOut.tieOutRunIds,
      failure_code: "je4_pre_write_cc_reused",
      failure_message: "Pre-write Continuous Close run cannot be post-write truth.",
      evidence: { ...row.evidence, scope, reconciliations: slots },
    });
  }

  const exceptions =
    observed.observe?.exceptions ?? exceptionsFromRunResult(observed.run.result);
  if (!exceptions) {
    return persist({
      status: "OBSERVE_FAILED",
      retryable: false,
      accounting_sync_id: syncId,
      observation_id: observationId,
      tie_out_run_ids: tieOut.tieOutRunIds,
      continuous_close_run_id: observed.run.id,
      failure_code: "je4_observe_exceptions_missing",
      failure_message: "Post-write OBSERVE exceptions are required to compose readiness.",
      evidence: { ...row.evidence, scope, reconciliations: slots },
    });
  }
  const readiness = composeContinuousCloseReadiness(exceptions);
  if (readiness.state !== observed.run.readiness) {
    return persist({
      status: "OBSERVE_FAILED",
      retryable: false,
      accounting_sync_id: syncId,
      observation_id: observationId,
      tie_out_run_ids: tieOut.tieOutRunIds,
      continuous_close_run_id: observed.run.id,
      failure_code: "je4_readiness_mismatch",
      failure_message: "Composed readiness does not match the persisted OBSERVE run.",
      evidence: { ...row.evidence, scope, reconciliations: slots },
    });
  }

  const glAccountIds = custody.expectedEffects
    .filter((effect) => effect.type === "BS_ACCOUNT_GL_DELTA")
    .map((effect) => effect.qboAccountId);
  let proofRows: PostWriteTieOutProofRow[];
  try {
    proofRows = await deps.loadPostWriteProofRows({
      engagementId: custody.engagementId,
      periodEnd: custody.periodEnd,
      accountingSyncId: syncId,
      verifiedAt: custody.verifiedAt,
      syncBackedRunIds: [slots.ar.runId, slots.ap.runId, slots.inventory.runId].filter(
        (runId): runId is string => Boolean(runId),
      ),
      glAccountIds,
    });
  } catch (error) {
    return persist({
      status: "EFFECTS_INCOMPLETE",
      retryable: false,
      accounting_sync_id: syncId,
      observation_id: observationId,
      tie_out_run_ids: tieOut.tieOutRunIds,
      continuous_close_run_id: observed.run.id,
      failure_code: "je4_effect_proof_load_failed",
      failure_message:
        error instanceof Error ? error.message : "Post-write effect proof rows could not be loaded.",
      evidence: { ...row.evidence, scope, reconciliations: slots },
    });
  }
  const merged = applyPostWriteProofRows({
    evidence: canonical,
    accountingSyncId: syncId,
    engagementId: custody.engagementId,
    periodEnd: custody.periodEnd,
    verifiedAt: custody.verifiedAt,
    slots,
    rows: proofRows,
  });
  const effects = verifyPostWriteExpectedEffects({
    lines: custody.lines,
    totalDebitsCents: custody.totalDebitsCents,
    totalCreditsCents: custody.totalCreditsCents,
    expectedEffects: custody.expectedEffects,
    evidence: merged,
    exceptions,
    readiness: { state: readiness.state },
    continuousCloseRunId: observed.run.id,
    sourceContinuousCloseRunId: custody.sourceContinuousCloseRunId,
  });

  const status: Je4RunStatus =
    effects.conclusion === "VERIFIED"
      ? "EFFECTS_VERIFIED"
      : effects.conclusion === "MISMATCH"
        ? "EFFECTS_MISMATCH"
        : effects.conclusion === "PENDING_PROVIDER_VISIBILITY"
          ? "PENDING_PROVIDER_VISIBILITY"
          : "EFFECTS_INCOMPLETE";

  return persist({
    status,
    retryable: status === "PENDING_PROVIDER_VISIBILITY",
    accounting_sync_id: syncId,
    observation_id: observationId,
    tie_out_run_ids: tieOut.tieOutRunIds,
    continuous_close_run_id: observed.run.id,
    readiness: readiness.state as Je4ReadinessState,
    effect_conclusion: effects.conclusion,
    failure_code: status === "EFFECTS_VERIFIED" ? null : effects.code,
    failure_message: status === "EFFECTS_VERIFIED" ? null : effects.message,
    evidence: {
      authority: "JE4_POST_WRITE_VERIFICATION",
      execution_id: custody.executionId,
      provider_journal_id: custody.providerJournalId,
      provider_readback_hash: custody.providerReadbackHash,
      verification_ledger_event_id: custody.verificationLedgerEventId,
      accounting_sync_id: syncId,
      observation_id: observationId,
      tie_out_run_ids: tieOut.tieOutRunIds,
      continuous_close_run_id: observed.run.id,
      source_continuous_close_run_id: custody.sourceContinuousCloseRunId,
      policy_hash: policyHash,
      input_hash: inputHash,
      effect_conclusion: effects.conclusion,
      effect_checks: effects.checks,
      readiness: readiness.state,
      scope,
      reconciliations: slots,
      memory_used_as_close_proof: false,
    },
  });
}
