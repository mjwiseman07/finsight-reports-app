import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/governed/journal-entries/executions/[executionId]/post-write-verification/route";
import type { AuthoritativeObservationResult } from "@/lib/audit-ready/authoritative-observation/types";
import type { ContinuousCloseObserveResult } from "@/lib/continuous-close/observe";
import { DEFAULT_OBSERVE_POLICY } from "@/lib/continuous-close/policy";
import type { RunAndPersistAuthoritativeObserveResult } from "@/lib/continuous-close/persistence/types";
import { JE_3B2_FEATURE_GATE } from "../je3b2-feature-gate";
import { JE_3C_FEATURE_GATE } from "../je3c-feature-gate";
import { JE_3D_ACTIVATION_POLICY } from "../je3d-activation-policy";
import { PRODUCTION_JE_ACTIVATION_POLICY } from "../production-activation-policy";
import { PRODUCTION_JE_WORKFLOW_POLICY } from "../production-workflow-policy";
import { assertGovernedProviderPostNotEnabled } from "../provider-attempt-service";
import type { JournalEntryExecutionRow } from "../execution-types";
import type { JournalEntryProposalRow, JeProposalLine } from "../types";
import { extractPostWriteCanonicalEvidence } from "../post-write-verification-canonical";
import { JE4_POST_WRITE_FEATURE_GATE } from "../post-write-verification-feature-gate";
import { hashJe4IdempotencyKey, hashJe4Policy } from "../post-write-verification-hash";
import { runProductionPostWriteVerification } from "../post-write-verification-production";
import type { PostWriteVerificationRepository } from "../post-write-verification-repository";
import { selectPostWriteRecomputeScope } from "../post-write-verification-scope";
import {
  runPostWriteVerification,
  type PostWriteVerificationDeps,
  type RunPostWriteVerificationInput,
} from "../post-write-verification-service";
import {
  PostWriteVerificationError,
  type Je4RunRow,
  type PostWriteCanonicalEvidence,
} from "../post-write-verification-types";
import type { VerificationLedgerEventCustody } from "../verified-memory-projection-custody";

const EXEC = "exec-1";
const PROPOSAL = "proposal-1";
const COMPANY = "company-1";
const ENGAGEMENT = "engagement-1";
const FIRM_CLIENT = "firm-client-1";
const CONNECTION = "connection-1";
const SOURCE_SYNC = "sync-pre";
const SOURCE_CC = "cc-pre";
const NEW_SYNC = "sync-post";
const NEW_CC = "cc-post";
const LEDGER = "ledger-1";
const HASH = "a".repeat(64);
const READBACK = "b".repeat(64);
const PERIOD = "2026-07-31";
const VERIFIED_AT = "2026-08-01T00:00:00.000Z";
const SYNCED_AT = "2026-08-02T00:00:00.000Z";

const lines: JeProposalLine[] = [
  { sequence: 1, accountId: "exp-1", debitCents: 1000, creditCents: 0 },
  { sequence: 2, accountId: "liab-1", debitCents: 0, creditCents: 1000 },
];

class MemoryRepo implements PostWriteVerificationRepository {
  rows: Je4RunRow[] = [];

  async listByExecutionPolicy(args: { executionId: string; policyHash: string }) {
    return this.rows.filter(
      (row) =>
        row.execution_id === args.executionId && row.policy_hash === args.policyHash,
    );
  }

  async insert(row: Je4RunRow) {
    if (this.rows.some((item) => item.idempotency_key === row.idempotency_key)) {
      throw new PostWriteVerificationError("je4_idempotency_conflict", "conflict");
    }
    this.rows.push({ ...row, evidence: { ...row.evidence } });
    return { ...row, evidence: { ...row.evidence } };
  }

  async update(row: Je4RunRow) {
    const index = this.rows.findIndex((item) => item.id === row.id);
    if (index < 0) throw new Error("missing row");
    this.rows[index] = { ...row, evidence: { ...row.evidence } };
    return { ...this.rows[index] };
  }
}

function execution(status: JournalEntryExecutionRow["status"] = "VERIFIED"): JournalEntryExecutionRow {
  return {
    id: EXEC,
    proposal_id: PROPOSAL,
    approval_id: "approval-1",
    company_id: COMPANY,
    engagement_id: ENGAGEMENT,
    firm_client_id: FIRM_CLIENT,
    source_continuous_close_run_id: SOURCE_CC,
    source_accounting_sync_id: SOURCE_SYNC,
    accounting_connection_id: CONNECTION,
    provider: "quickbooks",
    proposal_hash: HASH,
    approval_policy_hash: HASH,
    execution_policy_hash: HASH,
    execution_hash: HASH,
    idempotency_key: HASH,
    status,
    correlation_marker: "marker-1",
    execution_policy_snapshot: {},
    preflight_result: { eligible: true, checks: [] },
    requested_by: "user-1",
    requested_at: "2026-07-31T00:00:00.000Z",
    state_version: 4,
    provider_journal_id: "je-100",
    provider_request_hash: HASH,
    provider_response_hash: HASH,
    provider_readback_hash: READBACK,
    verification_snapshot: {
      txnDate: PERIOD,
      currency: "USD",
      totalDebitsCents: 1000,
      totalCreditsCents: 1000,
    },
    verification_ledger_event_id: LEDGER,
    verified_at: VERIFIED_AT,
    last_error_code: null,
    last_error_message: null,
  };
}

function proposal(): JournalEntryProposalRow {
  return {
    id: PROPOSAL,
    company_id: COMPANY,
    engagement_id: ENGAGEMENT,
    firm_client_id: FIRM_CLIENT,
    period_end: PERIOD,
    source_continuous_close_run_id: SOURCE_CC,
    source_accounting_sync_id: SOURCE_SYNC,
    source_recon_run_ids: ["recon-ar"],
    origin_type: "ACCRUAL",
    reason_code: "cutoff",
    memo: null,
    currency: "USD",
    txn_date: PERIOD,
    lines,
    total_debits_cents: 1000,
    total_credits_cents: 1000,
    expected_effects: [
      { type: "CC_EXCEPTION_CLEAR", exceptionCode: "cutoff_open" },
      { type: "RECON_OUTCOME_TARGET", reconKind: "ar_aging", targetOutcome: "tie" },
    ],
    policy_snapshot: {},
    policy_hash: HASH,
    proposal_hash: HASH,
    status: "SUBMITTED",
    proposed_by: "user-proposer",
    proposed_at: "2026-07-30T00:00:00.000Z",
    idempotency_key: HASH,
  };
}

function receipt(): VerificationLedgerEventCustody {
  return {
    event_id: LEDGER,
    event_type: "journal_entry.verified",
    event_hash: "c".repeat(64),
    previous_event_hash: null,
    chain_index: 0,
    firm_client_id: FIRM_CLIENT,
    engagement_id: ENGAGEMENT,
    aggregate_type: "journal_entry_execution",
    aggregate_id: EXEC,
    event_payload: {
      execution_id: EXEC,
      accounting_connection_id: CONNECTION,
      provider_journal_id: "je-100",
      provider_readback_hash: READBACK,
      provider_attempt_id: "attempt-1",
      correlation_marker: "marker-1",
      company_id: COMPANY,
      firm_client_id: FIRM_CLIENT,
      engagement_id: ENGAGEMENT,
      provider: "quickbooks",
    },
  };
}

function slot(syncId: string, runId: string, measurementSource: "persisted_sync_snapshot" | "live_provider" = "persisted_sync_snapshot") {
  return {
    runId,
    status: "completed" as const,
    totalsStatus: "tie" as const,
    baselineSyncId: syncId,
    measurementSource,
    authoritative: true,
  };
}

function observation(syncId: string, measurementSource: "persisted_sync_snapshot" | "live_provider" = "persisted_sync_snapshot"): AuthoritativeObservationResult {
  return {
    observationId: "obs-1",
    acquisitionId: "acq-1",
    mode: "FRESH_CAPTURE",
    accountingSyncId: syncId,
    companyId: COMPANY,
    engagementId: ENGAGEMENT,
    periodEnd: PERIOD,
    status: "completed",
    reconciliations: {
      ar: slot(syncId, "tie-ar", measurementSource),
      ap: slot(syncId, "tie-ap", measurementSource),
      inventory: slot(syncId, "tie-inv", measurementSource),
    },
    custody: {
      allSameSync: true,
      snapshotsPresent: ["ar_aging", "ap_aging", "inventory"],
      snapshotHashes: { ar: "h1", ap: "h2", inventory: "h3" },
    },
    failures: [],
  };
}

function canonical(syncId: string, overrides: Partial<PostWriteCanonicalEvidence> = {}): PostWriteCanonicalEvidence {
  return {
    accountingSyncId: syncId,
    companyId: COMPANY,
    connectionId: CONNECTION,
    periodEnd: PERIOD,
    validationStatus: "SUCCESS",
    syncedAt: SYNCED_AT,
    partial: false,
    visibleJournalLines: lines.map((line) => ({
      accountId: line.accountId,
      debitCents: line.debitCents,
      creditCents: line.creditCents,
    })),
    accountBalancesCents: { "liab-1": 5000 },
    reconEvidence: {},
    ...overrides,
  };
}

function observeResult(
  syncId: string,
  overrides: { runId?: string; syncId?: string; readiness?: "READY" | "READY_WITH_REVIEW" | "BLOCKED" } = {},
): RunAndPersistAuthoritativeObserveResult {
  const readiness = overrides.readiness || "READY";
  const exceptions =
    readiness === "BLOCKED"
      ? [
          {
            exceptionId: "statement_control_fail:other:x",
            exceptionClass: "statement_control_fail" as const,
            code: "other_blocker",
            disposition: "block" as const,
            message: "unrelated blocker",
          },
        ]
      : [];
  const observe = {
    exceptions,
    readiness: {
      state: readiness,
      blockerCodes: readiness === "BLOCKED" ? ["other_blocker"] : [],
      reviewCodes: [],
    },
  } as unknown as ContinuousCloseObserveResult;
  return {
    ok: true,
    reused: false,
    ledgerEventId: null,
    observation: observation(syncId),
    observe,
    run: {
      id: overrides.runId || NEW_CC,
      company_id: COMPANY,
      engagement_id: ENGAGEMENT,
      firm_client_id: FIRM_CLIENT,
      close_period_id: null,
      accounting_sync_id: overrides.syncId || syncId,
      period_end: PERIOD,
      mode: "OBSERVE",
      readiness,
      status: "completed",
      policy_hash: HASH,
      input_hash: HASH,
      policy_snapshot: {},
      observation_summary: {},
      result: { exceptions },
      created_by: "user-1",
      started_at: SYNCED_AT,
      completed_at: SYNCED_AT,
      supersedes_run_id: null,
      idempotency_key: HASH,
    },
  };
}

function harness(options?: {
  executionStatus?: JournalEntryExecutionRow["status"];
  canonical?: PostWriteCanonicalEvidence;
  observation?: AuthoritativeObservationResult;
  observe?: RunAndPersistAuthoritativeObserveResult;
  observePolicy?: typeof DEFAULT_OBSERVE_POLICY | null;
}) {
  const repo = new MemoryRepo();
  let observationCalls = 0;
  let observeCalls = 0;
  const observationInputs: Array<Record<string, unknown>> = [];
  const observeInputs: Array<Record<string, unknown>> = [];
  let clock = Date.parse("2026-08-02T03:00:00.000Z");
  let ids = 0;
  const deps: PostWriteVerificationDeps = {
    loadExecution: async () => execution(options?.executionStatus),
    loadVerificationReceipt: async () => receipt(),
    loadPriorLedgerEvent: async () => null,
    loadProposal: async () => proposal(),
    loadSourceReconKinds: async () => ["ar_aging"],
    loadObservePolicy: async () =>
      options && "observePolicy" in options ? options.observePolicy! : DEFAULT_OBSERVE_POLICY,
    runObservation: async (input) => {
      observationCalls += 1;
      observationInputs.push(input as unknown as Record<string, unknown>);
      return options?.observation || observation(NEW_SYNC);
    },
    loadCanonicalEvidence: async () => options?.canonical || canonical(NEW_SYNC),
    runObserve: async (input) => {
      observeCalls += 1;
      observeInputs.push(input as unknown as Record<string, unknown>);
      return options?.observe || observeResult(NEW_SYNC);
    },
    repository: repo,
    newId: () => `je4-${++ids}`,
    nowIso: () => new Date(clock++).toISOString(),
  };
  return { deps, repo, counts: () => ({ observationCalls, observeCalls, observationInputs, observeInputs }) };
}

describe("JE-4 post-write verification", () => {
  it("verifies effects from a fresh sync, snapshot tie-out, and a new OBSERVE run", async () => {
    const { deps, repo, counts } = harness();
    const result = await runPostWriteVerification({ executionId: EXEC }, deps);
    expect(result.ok).toBe(true);
    expect(result.reused).toBe(false);
    expect(result.run?.status).toBe("EFFECTS_VERIFIED");
    expect(result.run?.effect_conclusion).toBe("VERIFIED");
    expect(result.run?.readiness).toBe("READY");
    expect(result.run?.accounting_sync_id).toBe(NEW_SYNC);
    expect(result.run?.continuous_close_run_id).toBe(NEW_CC);
    expect(result.run?.continuous_close_run_id).not.toBe(SOURCE_CC);
    expect(result.run?.evidence.memory_used_as_close_proof).toBe(false);
    expect(counts().observationInputs[0]).toMatchObject({ mode: "FRESH_CAPTURE", engagementId: ENGAGEMENT });
    expect(counts().observationInputs[0]).not.toHaveProperty("accountingSyncId");
    expect(counts().observeInputs[0]).toMatchObject({
      mode: "REPLAY_EXISTING_SYNC",
      accountingSyncId: NEW_SYNC,
    });
    expect(repo.rows).toHaveLength(1);
  });

  it("keeps readiness BLOCKED while still proving effects", async () => {
    const { deps } = harness({
      observe: observeResult(NEW_SYNC, { readiness: "BLOCKED" }),
    });
    const result = await runPostWriteVerification({ executionId: EXEC }, deps);
    expect(result.ok).toBe(true);
    expect(result.run?.readiness).toBe("BLOCKED");
    expect(result.message).toContain("BLOCKED");
  });

  it("fails closed on line mismatch and does not report verified", async () => {
    const { deps } = harness({
      canonical: canonical(NEW_SYNC, {
        visibleJournalLines: [
          { accountId: "exp-1", debitCents: 900, creditCents: 0 },
          { accountId: "liab-1", debitCents: 0, creditCents: 900 },
        ],
      }),
    });
    const result = await runPostWriteVerification({ executionId: EXEC }, deps);
    expect(result.ok).toBe(false);
    expect(result.run?.status).toBe("EFFECTS_MISMATCH");
    expect(result.run?.effect_conclusion).toBe("MISMATCH");
  });

  it("reuses the verified row without a second observation or observe", async () => {
    const { deps, counts } = harness();
    const first = await runPostWriteVerification({ executionId: EXEC }, deps);
    const second = await runPostWriteVerification({ executionId: EXEC }, deps);
    expect(second.reused).toBe(true);
    expect(second.run?.id).toBe(first.run?.id);
    expect(counts().observationCalls).toBe(1);
    expect(counts().observeCalls).toBe(1);
  });

  it("records provider refresh failure without observing", async () => {
    const failed: AuthoritativeObservationResult = {
      ...observation(NEW_SYNC),
      status: "failed",
      accountingSyncId: null,
      custody: { allSameSync: false, snapshotsPresent: [] },
      failures: [{ code: "provider_down", message: "refresh failed", recon: "acquisition" }],
    };
    const { deps, counts } = harness({ observation: failed });
    const result = await runPostWriteVerification({ executionId: EXEC }, deps);
    expect(result.ok).toBe(false);
    expect(result.run?.status).toBe("REFRESH_FAILED");
    expect(counts().observeCalls).toBe(0);
  });

  it("fails closed when tie-out measurement is live provider", async () => {
    const { deps, counts } = harness({
      observation: observation(NEW_SYNC, "live_provider"),
    });
    const result = await runPostWriteVerification({ executionId: EXEC }, deps);
    expect(result.run?.status).toBe("TIE_OUT_FAILED");
    expect(result.run?.failure_code).toBe("je4_tie_out_live_not_authoritative");
    expect(counts().observeCalls).toBe(0);
  });

  it("returns pending visibility instead of verified when the journal is absent", async () => {
    const { deps, counts } = harness({
      canonical: canonical(NEW_SYNC, { visibleJournalLines: null }),
    });
    const result = await runPostWriteVerification({ executionId: EXEC }, deps);
    expect(result.ok).toBe(false);
    expect(result.run?.status).toBe("PENDING_PROVIDER_VISIBILITY");
    expect(result.run?.retryable).toBe(true);
    expect(result.run?.effect_conclusion).not.toBe("VERIFIED");
    expect(counts().observeCalls).toBe(1);
    const replay = await runPostWriteVerification({ executionId: EXEC }, deps);
    expect(replay.reused).toBe(true);
    expect(counts().observationCalls).toBe(1);
  });

  it("retries pending visibility into a new sync without dropping the prior row", async () => {
    let pass = 0;
    const { deps, repo } = harness();
    deps.runObservation = async () => {
      pass += 1;
      return observation(pass === 1 ? NEW_SYNC : "sync-later");
    };
    deps.loadCanonicalEvidence = async ({ accountingSyncId }) =>
      canonical(accountingSyncId, {
        visibleJournalLines: accountingSyncId === NEW_SYNC ? null : canonical(accountingSyncId).visibleJournalLines,
      });
    deps.runObserve = async (input) =>
      observeResult(String((input as { accountingSyncId: string }).accountingSyncId), {
        runId: input && "accountingSyncId" in input && input.accountingSyncId === NEW_SYNC ? NEW_CC : "cc-later",
      });
    const pending = await runPostWriteVerification({ executionId: EXEC }, deps);
    expect(pending.run?.status).toBe("PENDING_PROVIDER_VISIBILITY");
    const retried = await runPostWriteVerification({ executionId: EXEC, retry: true }, deps);
    expect(retried.ok).toBe(true);
    expect(retried.run?.accounting_sync_id).toBe("sync-later");
    expect(repo.rows.map((row) => row.status).sort()).toEqual([
      "EFFECTS_VERIFIED",
      "PENDING_PROVIDER_VISIBILITY",
    ]);
  });

  it("rejects a stale sync before observe", async () => {
    const { deps, counts } = harness({
      canonical: canonical(NEW_SYNC, { syncedAt: "2026-07-01T00:00:00.000Z" }),
    });
    const result = await runPostWriteVerification({ executionId: EXEC }, deps);
    expect(result.run?.status).toBe("CANONICAL_INCOMPLETE");
    expect(result.run?.failure_code).toBe("je4_sync_stale");
    expect(result.run?.retryable).toBe(true);
    expect(counts().observeCalls).toBe(0);
  });

  it("rejects the pre-write continuous close run", async () => {
    const { deps } = harness({
      observe: observeResult(NEW_SYNC, { runId: SOURCE_CC }),
    });
    const result = await runPostWriteVerification({ executionId: EXEC }, deps);
    expect(result.run?.status).toBe("OBSERVE_FAILED");
    expect(result.run?.failure_code).toBe("je4_pre_write_cc_reused");
    expect(result.ok).toBe(false);
  });

  it("rejects an observe run bound to a different sync", async () => {
    const { deps } = harness({
      observe: observeResult(NEW_SYNC, { syncId: "sync-other" }),
    });
    const result = await runPostWriteVerification({ executionId: EXEC }, deps);
    expect(result.run?.failure_code).toBe("je4_observe_sync_mismatch");
  });

  it("refuses caller company or sync overrides before any refresh", async () => {
    const { deps, counts, repo } = harness();
    const result = await runPostWriteVerification(
      { executionId: EXEC, companyId: "other-company" } as RunPostWriteVerificationInput,
      deps,
    );
    expect(result.code).toBe("je4_caller_authority_override");
    expect(counts().observationCalls).toBe(0);
    expect(repo.rows).toHaveLength(0);
  });

  it("requires VERIFIED custody", async () => {
    const { deps, repo, counts } = harness({ executionStatus: "READY_TO_POST" });
    const result = await runPostWriteVerification({ executionId: EXEC }, deps);
    expect(result.code).toBe("je4_requires_verified");
    expect(repo.rows).toHaveLength(0);
    expect(counts().observationCalls).toBe(0);
  });

  it("does not observe when the source observe policy is missing", async () => {
    const { deps, counts } = harness({ observePolicy: null });
    const result = await runPostWriteVerification({ executionId: EXEC }, deps);
    expect(result.code).toBe("je4_observe_policy_missing");
    expect(counts().observationCalls).toBe(0);
  });

  it("retries transient refresh errors and stops on auth errors", async () => {
    const transient = harness();
    let attempts = 0;
    transient.deps.runObservation = async () => {
      attempts += 1;
      if (attempts < 3) {
        throw Object.assign(new Error("timeout"), { retryable: true, code: "network_timeout" });
      }
      return observation(NEW_SYNC);
    };
    const recovered = await runPostWriteVerification({ executionId: EXEC }, transient.deps);
    expect(recovered.ok).toBe(true);
    expect(attempts).toBe(3);

    const auth = harness();
    let authAttempts = 0;
    auth.deps.runObservation = async () => {
      authAttempts += 1;
      throw Object.assign(new Error("unauthorized"), { retryable: true, code: "auth_forbidden" });
    };
    const denied = await runPostWriteVerification({ executionId: EXEC }, auth.deps);
    expect(denied.run?.status).toBe("REFRESH_FAILED");
    expect(denied.run?.retryable).toBe(false);
    expect(authAttempts).toBe(1);
  });
});

describe("JE-4 pure helpers", () => {
  it("hashes idempotency by execution, sync, and policy", () => {
    const policyHash = hashJe4Policy({
      executionId: EXEC,
      proposalHash: HASH,
      companyId: COMPANY,
      engagementId: ENGAGEMENT,
      accountingConnectionId: CONNECTION,
      periodEnd: PERIOD,
      sourceContinuousCloseRunId: SOURCE_CC,
      sourceAccountingSyncId: SOURCE_SYNC,
      verificationLedgerEventId: LEDGER,
      expectedEffects: [{ type: "CC_EXCEPTION_CLEAR", exceptionCode: "cutoff_open" }],
    });
    const left = hashJe4IdempotencyKey({
      executionId: EXEC,
      accountingSyncId: NEW_SYNC,
      policyHash,
    });
    const right = hashJe4IdempotencyKey({
      executionId: EXEC,
      accountingSyncId: "sync-other",
      policyHash,
    });
    expect(left).toHaveLength(64);
    expect(left).not.toBe(right);
  });

  it("documents trio recompute and refuses live regenerate as the close path", () => {
    const uncertain = selectPostWriteRecomputeScope({
      expectedEffects: [{ type: "CC_EXCEPTION_CLEAR", exceptionCode: "cutoff_open" }],
      sourceReconKinds: [],
    });
    expect(uncertain.uncertain).toBe(true);
    expect(uncertain.recomputeMode).toBe("authoritative_trio");
    expect(uncertain.reason).toContain("regenerate-run is not invoked");

    const resolved = selectPostWriteRecomputeScope({
      expectedEffects: [
        {
          type: "BS_ACCOUNT_GL_DELTA",
          sourceKind: "bs_account_recon",
          sourceRunId: "bs-1",
          qboAccountId: "liab-1",
          classification: "Liability",
          baselineGlBalanceCents: 4000,
          expectedDeltaCents: 1000,
          expectedPostGlBalanceCents: 5000,
          signConvention: "qbo_natural_sign",
        },
      ],
      sourceReconKinds: ["bs_account_recon"],
    });
    expect(resolved.uncertain).toBe(false);
    expect(resolved.affectedReconKinds).toEqual(["bs_account_recon"]);
    expect(resolved.reason).toContain("null baseline");
  });

  it("extracts journal visibility and trial-balance cents without copying secrets", () => {
    const visible = extractPostWriteCanonicalEvidence({
      accountingSyncId: NEW_SYNC,
      companyId: COMPANY,
      connectionId: CONNECTION,
      periodEnd: PERIOD,
      validationStatus: "SUCCESS",
      syncedAt: SYNCED_AT,
      providerJournalId: "je-100",
      normalizedPayload: {
        normalizedTrialBalance: [{ accountId: "liab-1", netAmount: 25.5 }],
        normalizedTransactions: [
          {
            id: "je-100",
            metadata: {
              lines: [{ accountId: "exp-1", debitCents: 1000, creditCents: 0 }],
            },
          },
        ],
      },
    });
    expect(visible.accountBalancesCents["liab-1"]).toBe(2550);
    expect(visible.visibleJournalLines).toEqual([
      { accountId: "exp-1", debitCents: 1000, creditCents: 0 },
    ]);
    expect(visible.partial).toBe(false);
    expect(JSON.stringify(visible)).not.toMatch(/access_token/);

    const lagged = extractPostWriteCanonicalEvidence({
      accountingSyncId: NEW_SYNC,
      companyId: COMPANY,
      connectionId: CONNECTION,
      periodEnd: PERIOD,
      validationStatus: "SUCCESS",
      syncedAt: SYNCED_AT,
      providerJournalId: "je-100",
      normalizedPayload: {
        normalizedTrialBalance: [{ accountId: "liab-1", netAmount: 1 }],
        normalizedTransactions: [],
      },
    });
    expect(lagged.visibleJournalLines).toBeNull();
    expect(lagged.partial).toBe(false);

    const partial = extractPostWriteCanonicalEvidence({
      accountingSyncId: NEW_SYNC,
      companyId: COMPANY,
      connectionId: CONNECTION,
      periodEnd: PERIOD,
      validationStatus: "SUCCESS",
      syncedAt: null,
      providerJournalId: "je-100",
      normalizedPayload: { normalizedTrialBalance: [], normalizedTransactions: [] },
    });
    expect(partial.partial).toBe(true);
    expect(partial.syncedAt).toBeNull();
  });
});

describe("JE-4 gates and schema", () => {
  it("leaves create, verify, and production kill switches disabled", () => {
    expect(JE4_POST_WRITE_FEATURE_GATE.apiTriggerEnabled).toBe(false);
    expect(JE4_POST_WRITE_FEATURE_GATE.authorizesProviderCreate).toBe(false);
    expect(JE_3B2_FEATURE_GATE.governedCreateEnabled).toBe(false);
    expect(JE_3B2_FEATURE_GATE.allowLiveQboPost).toBe(false);
    expect(JE_3C_FEATURE_GATE.verificationEnabled).toBe(false);
    expect(JE_3C_FEATURE_GATE.allowLiveQboGet).toBe(false);
    expect(JE_3D_ACTIVATION_POLICY.capabilities.CREATE_SANDBOX_JE).toBe(false);
    expect(JE_3D_ACTIVATION_POLICY.capabilities.VERIFY_SANDBOX_JE).toBe(false);
    expect(PRODUCTION_JE_ACTIVATION_POLICY.capabilities.CREATE_PRODUCTION_JE).toBe(false);
    expect(PRODUCTION_JE_ACTIVATION_POLICY.capabilities.VERIFY_PRODUCTION_JE).toBe(false);
    expect(PRODUCTION_JE_ACTIVATION_POLICY.productionDispatchKillSwitch).toBe(true);
    expect(PRODUCTION_JE_WORKFLOW_POLICY.ERP_API).toBe(false);
    expect(() => assertGovernedProviderPostNotEnabled()).toThrow(/not enabled/);
  });

  it("does not import create transport or regenerate-run", () => {
    const root = process.cwd();
    const files = readdirSync(join(root, "lib/journal-entry-governance"))
      .filter((name) => name.startsWith("post-write-verification"))
      .map((name) => join(root, "lib/journal-entry-governance", name));
    files.push(
      join(
        root,
        "app/api/governed/journal-entries/executions/[executionId]/post-write-verification/route.ts",
      ),
    );
    const banned = [
      "provider-qbo-create-transport",
      "tie-out/regenerate-run",
      "regenerateRun(",
    ];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const token of banned) {
        expect(src, file).not.toContain(token);
      }
    }
  });

  it("keeps the HTTP trigger disabled", async () => {
    await expect(runProductionPostWriteVerification({ executionId: EXEC })).rejects.toMatchObject({
      code: "je4_api_trigger_disabled",
    });
    const response = await GET();
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("je4_api_trigger_disabled");
  });

  it("adds select-only authenticated RLS and verified lineage checks", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20260925120000_journal_entry_post_write_verifications.sql"),
      "utf8",
    );
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toContain("journal_entry_post_write_verifications_select");
    expect(sql).toContain("FOR SELECT");
    expect(sql).toContain("TO authenticated");
    expect(sql).not.toContain("FOR INSERT");
    expect(sql).not.toContain("FOR UPDATE");
    expect(sql).toContain("TO service_role");
    expect(sql).toContain("cu.status = 'active'");
    expect(sql).toContain("fm.status = 'active'");
    expect(sql).toContain("journal_entry_post_write_verifications_exec_sync_policy_uidx");
    expect(sql).toContain("EFFECTS_VERIFIED");
    expect(sql).toContain("continuous_close_run_id IS DISTINCT FROM source_continuous_close_run_id");
    expect(sql).toContain("REVOKE ALL ON TABLE public.journal_entry_post_write_verifications FROM anon, authenticated");
  });
});
