/**
 * JE-3B2 — Governed create boundary tests.
 * Hard-disabled gate, dispatch receipt, one-shot transport, crash windows,
 * conservative 4xx→UNKNOWN, no Memory, no legacy poster.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { EngagementActor } from "@/lib/audit-ready/server-auth";
import {
  JE_3B2_FEATURE_GATE,
  assertJe3b2GovernedCreateEnabled,
  assertJe3b2MemoryWriteNotEnabled,
} from "../je3b2-feature-gate";
import {
  JE_MEMORY_PROJECTION_CONTRACT,
  buildVerifiedJeMemoryProjectionDraft,
} from "../memory-projection-contract";
import {
  classifyJeProviderCreateOutcome,
  mapCreateOutcomeToJe3b2TerminalAction,
} from "../provider-attempt-types";
import {
  executeGovernedJournalEntryCreate,
  executeGovernedJournalEntryCreateOrchestration,
} from "../provider-create-service";
import { postGovernedQboJournalEntryOnce } from "../provider-qbo-create-transport";
import {
  assertWirePrivateNoteContainsMarker,
  toGovernedQboJournalEntryWireBody,
} from "../provider-qbo-create-wire";
import { mapGovernedProposalToQboPayload } from "../execution-payload";
import { hashProviderRequestPreview } from "../execution-hash";
import { JE_GOVERNED_EXECUTION_FEATURE_BOUNDARY } from "../execution-types";
import type { JournalEntryExecutionRow } from "../execution-types";
import type { JournalEntryProposalRow } from "../types";
import type { JournalEntryProviderAttemptRow } from "../provider-attempt-types";
import { patchJournalEntryProviderAttempt } from "../provider-attempt-repository";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260822011500_journal_entry_provider_dispatch_and_outcomes.sql",
);

const HASH = "a".repeat(64);
const USER = "user-1";

function writeActor(): EngagementActor {
  return {
    userId: USER,
    canRead: true,
    canWrite: true,
    scope: "company",
  };
}

function proposal(): JournalEntryProposalRow {
  return {
    id: "prop-1",
    company_id: "co-1",
    engagement_id: "eng-1",
    firm_client_id: "fc-1",
    period_end: "2026-08-15",
    source_continuous_close_run_id: "cc-1",
    source_accounting_sync_id: "sync-1",
    source_recon_run_ids: [],
    origin_type: "ACCRUAL",
    reason_code: "ACCRUAL_EXPENSE",
    memo: "Accrue rent",
    currency: "USD",
    txn_date: "2026-08-15",
    lines: [
      {
        sequence: 1,
        accountId: "acct-dr",
        debitCents: 10050,
        creditCents: 0,
        description: "Rent expense",
      },
      {
        sequence: 2,
        accountId: "acct-cr",
        debitCents: 0,
        creditCents: 10050,
        description: "Accrued rent",
      },
    ],
    total_debits_cents: 10050,
    total_credits_cents: 10050,
    expected_effects: [],
    policy_snapshot: {},
    policy_hash: HASH,
    proposal_hash: HASH,
    status: "SUBMITTED",
    proposed_by: USER,
    proposed_at: "2026-08-15T00:00:00.000Z",
    idempotency_key: HASH,
  };
}

function alignedHash(p: JournalEntryProposalRow, marker = "ADVJE:exec-1") {
  return hashProviderRequestPreview(
    mapGovernedProposalToQboPayload({
      proposal: p,
      correlationMarker: marker,
    }) as unknown as Record<string, unknown>,
  );
}

function execution(
  over: Partial<JournalEntryExecutionRow> = {},
): JournalEntryExecutionRow {
  const p = proposal();
  const provider_request_hash = alignedHash(p);
  return {
    id: "exec-1",
    proposal_id: "prop-1",
    approval_id: "appr-1",
    company_id: "co-1",
    engagement_id: "eng-1",
    firm_client_id: "fc-1",
    source_continuous_close_run_id: "cc-1",
    source_accounting_sync_id: "sync-1",
    accounting_connection_id: "conn-1",
    provider: "quickbooks",
    proposal_hash: HASH,
    approval_policy_hash: HASH,
    execution_policy_hash: HASH,
    execution_hash: HASH,
    idempotency_key: HASH,
    status: "POSTING",
    correlation_marker: "ADVJE:exec-1",
    execution_policy_snapshot: {},
    preflight_result: { eligible: true, checks: [] },
    requested_by: USER,
    requested_at: "2026-08-15T00:00:00.000Z",
    state_version: 3,
    provider_journal_id: null,
    provider_request_hash,
    provider_response_hash: null,
    last_error_code: null,
    last_error_message: null,
    ...over,
  };
}

function attempt(
  over: Partial<JournalEntryProviderAttemptRow> = {},
): JournalEntryProviderAttemptRow {
  const exec = execution();
  return {
    id: "att-1",
    execution_id: "exec-1",
    accounting_connection_id: "conn-1",
    provider: "quickbooks",
    provider_request_hash: String(exec.provider_request_hash),
    correlation_marker: "ADVJE:exec-1",
    status: "RESERVED",
    commit_certainty: "NOT_SENT",
    request_started_at: null,
    request_completed_at: null,
    qbo_je_id: null,
    intuit_tid: null,
    provider_response_hash: null,
    provider_error_code: null,
    provider_error_message: null,
    discovery_summary: {},
    created_at: "2026-08-15T00:00:00.000Z",
    updated_at: "2026-08-15T00:00:00.000Z",
    ...over,
  };
}

describe("JE-3B2 migration contracts", () => {
  const src = readFileSync(MIGRATION, "utf8");

  it("adds dispatch + outcome RPCs and Patent #6 events", () => {
    expect(src).toContain("apply_journal_entry_provider_dispatch_started");
    expect(src).toContain("journal_entry.provider_dispatch_started");
    expect(src).toContain("apply_journal_entry_provider_posted");
    expect(src).toContain("journal_entry.provider_posted");
    expect(src).toContain("apply_journal_entry_provider_post_unknown");
    expect(src).toContain("journal_entry.post_unknown");
    expect(src).toContain("apply_journal_entry_provider_precommit_failed");
    expect(src).toContain("REQUEST_STARTED");
    expect(src).toContain("POSSIBLY_COMMITTED");
    expect(src).toContain("RESPONSE_RECEIVED");
    expect(src).toContain("FAILED_PRECOMMIT");
  });

  it("blocks create-lifecycle statuses via generic patch", () => {
    expect(src).toContain("'REQUEST_STARTED'");
    expect(src).toContain("'RESPONSE_RECEIVED'");
    expect(src).toContain("'UNKNOWN_RESULT'");
    expect(src).toContain("'FAILED_PRECOMMIT'");
    expect(src).toContain("commit_certainty is immutable via generic patch");
  });

  it("does not enable Memory / VERIFIED / live POST", () => {
    expect(src).toMatch(/Does NOT enable production invocation/i);
    expect(src).toMatch(/Memory/i);
    expect(src).toMatch(/VERIFIED/i);
    expect(src).not.toContain("qboJournalEntryPoster");
  });
});

describe("JE-3B2 hard-disable gate", () => {
  it("feature gate constants are all false", () => {
    expect(JE_3B2_FEATURE_GATE.governedCreateEnabled).toBe(false);
    expect(JE_3B2_FEATURE_GATE.allowLiveQboPost).toBe(false);
    expect(JE_3B2_FEATURE_GATE.allowMemoryWrite).toBe(false);
    expect(JE_3B2_FEATURE_GATE.allowWorker).toBe(false);
    expect(JE_3B2_FEATURE_GATE.allowGovernedAuto).toBe(false);
    expect(JE_GOVERNED_EXECUTION_FEATURE_BOUNDARY.providerWriteAllowed).toBe(
      false,
    );
    expect(JE_GOVERNED_EXECUTION_FEATURE_BOUNDARY.je3b2GovernedCreateEnabled).toBe(
      false,
    );
  });

  it("public entry throws hard-disabled", async () => {
    await expect(
      executeGovernedJournalEntryCreate(
        { executionId: "exec-1" },
        { principal: { type: "user", userId: USER } },
      ),
    ).rejects.toMatchObject({ code: "je_3b2_governed_create_disabled" });
    expect(() => assertJe3b2GovernedCreateEnabled()).toThrow(/hard-disabled/i);
    expect(() => assertJe3b2MemoryWriteNotEnabled()).toThrow(/Memory/i);
  });

  it("orchestration refuses without bypass", async () => {
    const r = await executeGovernedJournalEntryCreateOrchestration(
      { executionId: "exec-1" },
      { principal: { type: "user", userId: USER } },
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("je_3b2_governed_create_disabled");
    expect(r.providerPostIssued).toBe(false);
    expect(r.memoryWritten).toBe(false);
  });
});

describe("JE-3B2 classification + terminal mapping", () => {
  it("success with id → PROVIDER_POSTED", () => {
    const o = classifyJeProviderCreateOutcome({
      requestStarted: true,
      responseReceived: true,
      httpStatus: 200,
      providerId: "99",
    });
    expect(o.commitCertainty).toBe("COMMITTED");
    expect(mapCreateOutcomeToJe3b2TerminalAction(o)).toBe("PROVIDER_POSTED");
  });

  it("401/429/4xx/5xx/network/malformed → POST_UNKNOWN (not DEFINITELY_NOT_COMMITTED)", () => {
    for (const httpStatus of [401, 429, 400, 403, 500, 503]) {
      const o = classifyJeProviderCreateOutcome({
        requestStarted: true,
        responseReceived: true,
        httpStatus,
      });
      expect(o.commitCertainty).toBe("POSSIBLY_COMMITTED");
      expect(mapCreateOutcomeToJe3b2TerminalAction(o)).toBe("POST_UNKNOWN");
    }
    const net = classifyJeProviderCreateOutcome({
      requestStarted: true,
      responseReceived: false,
      networkError: true,
    });
    expect(mapCreateOutcomeToJe3b2TerminalAction(net)).toBe("POST_UNKNOWN");
  });
});

describe("JE-3B2 wire + PrivateNote marker", () => {
  it("wire body preserves marker and posting types", () => {
    const preview = mapGovernedProposalToQboPayload({
      proposal: proposal(),
      correlationMarker: "ADVJE:exec-1",
    });
    assertWirePrivateNoteContainsMarker({
      privateNote: preview.PrivateNote,
      correlationMarker: "ADVJE:exec-1",
    });
    const wire = toGovernedQboJournalEntryWireBody(preview);
    expect(wire.PrivateNote).toContain("ADVJE:exec-1");
    expect(wire.Line[0]?.JournalEntryLineDetail.PostingType).toBe("Debit");
    expect(wire.Line[1]?.JournalEntryLineDetail.PostingType).toBe("Credit");
  });
});

describe("JE-3B2 transport single-POST", () => {
  it("refuses live POST while gate is off without test override", async () => {
    await expect(
      postGovernedQboJournalEntryOnce({
        accountingConnectionId: "conn-1",
        realmId: "realm-1",
        accessToken: "tok",
        wireBody: {
          TxnDate: "2026-08-15",
          PrivateNote: "ADVJE:x",
          Line: [],
        },
      }),
    ).rejects.toMatchObject({ code: "je_3b2_live_qbo_post_disabled" });
  });

  it("invokes fetch exactly once under test override", async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: { JournalEntry: { Id: "55" } },
      text: JSON.stringify({ JournalEntry: { Id: "55" } }),
      intuit_tid: "tid-1",
      url: "https://example.test",
      elapsed_ms: 1,
    }));
    const result = await postGovernedQboJournalEntryOnce({
      accountingConnectionId: "conn-1",
      realmId: "realm-1",
      accessToken: "tok",
      wireBody: {
        TxnDate: "2026-08-15",
        PrivateNote: "ADVJE:x",
        Line: [],
      },
      deps: { allowTransportInTests: true, fetchFn: fetchFn as never },
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(result.postAttempts).toBe(1);
    expect(result.providerId).toBe("55");
    expect(result.intuitTid).toBe("tid-1");
  });
});

describe("JE-3B2 orchestration crash windows", () => {
  it("duplicate invoke after REQUEST_STARTED refuses second POST", async () => {
    const postOnce = vi.fn(async () => {
      throw new Error("must not POST");
    });
    const r = await executeGovernedJournalEntryCreateOrchestration(
      { executionId: "exec-1" },
      { principal: { type: "user", userId: USER } },
      {
        bypassGateForTests: true,
        deps: {
          resolveActor: vi.fn(async () => writeActor()),
          loadExecution: vi.fn(async () => execution()),
          loadProposal: vi.fn(async () => proposal()),
          loadAttempt: vi.fn(async () =>
            attempt({
              status: "REQUEST_STARTED",
              commit_certainty: "POSSIBLY_COMMITTED",
              request_started_at: "2026-08-15T00:01:00.000Z",
            }),
          ),
          revalidateConnection: vi.fn(async () => ({ ok: true as const })),
          resolveToken: vi.fn(async () => ({
            accessToken: "tok",
            refreshToken: "r",
            realmId: "realm-1",
            tokenSource: "accounting_connections" as const,
            grantedScopes: [],
            connectionId: "conn-1",
            ownerUserId: USER,
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
          })),
          postOnce,
        },
      },
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toMatch(/No second POST/i);
    expect(postOnce).not.toHaveBeenCalled();
  });

  it("success path: dispatch then one POST then PROVIDER_POSTED; memoryWritten=false", async () => {
    const postOnce = vi.fn(async () => ({
      requestStarted: true as const,
      responseReceived: true,
      httpStatus: 200,
      intuitTid: "tid-ok",
      providerId: "123",
      providerResponseHash: "resp".padEnd(64, "0"),
      rawJson: { JournalEntry: { Id: "123" } },
      networkError: false,
      errorMessage: null,
      postAttempts: 1 as const,
    }));
    const applyDispatchStarted = vi.fn(async () => ({
      attempt: attempt({
        status: "REQUEST_STARTED",
        commit_certainty: "POSSIBLY_COMMITTED",
      }),
      execution: execution({ status: "POSTING" }),
      ledgerEventId: "evt-dispatch",
    }));
    const applyPosted = vi.fn(async () => ({
      attempt: attempt({
        status: "RESPONSE_RECEIVED",
        commit_certainty: "COMMITTED",
        qbo_je_id: "123",
        intuit_tid: "tid-ok",
      }),
      execution: execution({
        status: "POSTED_UNVERIFIED",
        provider_journal_id: "123",
      }),
      ledgerEventId: "evt-posted",
    }));
    const applyPostUnknown = vi.fn(async () => {
      throw new Error("should not unknown");
    });

    const r = await executeGovernedJournalEntryCreateOrchestration(
      { executionId: "exec-1" },
      { principal: { type: "user", userId: USER } },
      {
        bypassGateForTests: true,
        deps: {
          resolveActor: vi.fn(async () => writeActor()),
          loadExecution: vi.fn(async () => execution()),
          loadProposal: vi.fn(async () => proposal()),
          loadAttempt: vi.fn(async () => attempt()),
          loadFirmId: vi.fn(async () => "firm-1"),
          revalidateConnection: vi.fn(async () => ({ ok: true as const })),
          resolveToken: vi.fn(async () => ({
            accessToken: "tok",
            refreshToken: "r",
            realmId: "realm-1",
            tokenSource: "accounting_connections" as const,
            grantedScopes: [],
            connectionId: "conn-1",
            ownerUserId: USER,
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
          })),
          applyDispatchStarted,
          applyPosted,
          applyPostUnknown,
          postOnce,
        },
      },
    );

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(applyDispatchStarted).toHaveBeenCalledTimes(1);
    expect(postOnce).toHaveBeenCalledTimes(1);
    expect(applyPosted).toHaveBeenCalledTimes(1);
    expect(applyPostUnknown).not.toHaveBeenCalled();
    expect(r.memoryWritten).toBe(false);
    expect(r.providerPostIssued).toBe(true);
    expect(r.execution.status).toBe("POSTED_UNVERIFIED");
  });

  it("4xx after dispatch → UNKNOWN_COMMIT path; no Memory; no second POST", async () => {
    const postOnce = vi.fn(async () => ({
      requestStarted: true as const,
      responseReceived: true,
      httpStatus: 401,
      intuitTid: "tid-401",
      providerId: null,
      providerResponseHash: "h".padEnd(64, "1"),
      rawJson: { Fault: {} },
      networkError: false,
      errorMessage: "HTTP 401",
      postAttempts: 1 as const,
    }));
    const applyPostUnknown = vi.fn(async () => ({
      attempt: attempt({
        status: "UNKNOWN_RESULT",
        commit_certainty: "POSSIBLY_COMMITTED",
      }),
      execution: execution({ status: "UNKNOWN_COMMIT" }),
      ledgerEventId: "evt-unknown",
    }));

    const r = await executeGovernedJournalEntryCreateOrchestration(
      { executionId: "exec-1" },
      { principal: { type: "user", userId: USER } },
      {
        bypassGateForTests: true,
        deps: {
          resolveActor: vi.fn(async () => writeActor()),
          loadExecution: vi.fn(async () => execution()),
          loadProposal: vi.fn(async () => proposal()),
          loadAttempt: vi.fn(async () => attempt()),
          loadFirmId: vi.fn(async () => "firm-1"),
          revalidateConnection: vi.fn(async () => ({ ok: true as const })),
          resolveToken: vi.fn(async () => ({
            accessToken: "tok",
            refreshToken: "r",
            realmId: "realm-1",
            tokenSource: "accounting_connections" as const,
            grantedScopes: [],
            connectionId: "conn-1",
            ownerUserId: USER,
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
          })),
          applyDispatchStarted: vi.fn(async () => ({
            attempt: attempt({
              status: "REQUEST_STARTED",
              commit_certainty: "POSSIBLY_COMMITTED",
            }),
            execution: execution({ status: "POSTING" }),
            ledgerEventId: "evt-dispatch",
          })),
          applyPosted: vi.fn(async () => {
            throw new Error("no posted");
          }),
          applyPostUnknown,
          postOnce,
        },
      },
    );

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(applyPostUnknown).toHaveBeenCalledTimes(1);
    expect(r.execution.status).toBe("UNKNOWN_COMMIT");
    expect(r.memoryWritten).toBe(false);
    expect(postOnce).toHaveBeenCalledTimes(1);
  });

  it("request-hash mismatch before dispatch → no POST", async () => {
    const postOnce = vi.fn(async () => {
      throw new Error("no post");
    });
    const r = await executeGovernedJournalEntryCreateOrchestration(
      { executionId: "exec-1" },
      { principal: { type: "user", userId: USER } },
      {
        bypassGateForTests: true,
        deps: {
          resolveActor: vi.fn(async () => writeActor()),
          loadExecution: vi.fn(async () =>
            execution({ provider_request_hash: "b".repeat(64) }),
          ),
          loadProposal: vi.fn(async () => proposal()),
          loadAttempt: vi.fn(async () => attempt()),
          revalidateConnection: vi.fn(async () => ({ ok: true as const })),
          postOnce,
        },
      },
    );
    expect(r.ok).toBe(false);
    expect(postOnce).not.toHaveBeenCalled();
  });

  it("token failure before dispatch → no POST (NOT_SENT preserved)", async () => {
    const applyDispatchStarted = vi.fn(async () => {
      throw new Error("must not dispatch");
    });
    const postOnce = vi.fn(async () => {
      throw new Error("must not post");
    });
    const r = await executeGovernedJournalEntryCreateOrchestration(
      { executionId: "exec-1" },
      { principal: { type: "user", userId: USER } },
      {
        bypassGateForTests: true,
        deps: {
          resolveActor: vi.fn(async () => writeActor()),
          loadExecution: vi.fn(async () => execution()),
          loadProposal: vi.fn(async () => proposal()),
          loadAttempt: vi.fn(async () => attempt()),
          revalidateConnection: vi.fn(async () => ({ ok: true as const })),
          resolveToken: vi.fn(async () => null),
          applyDispatchStarted,
          postOnce,
        },
      },
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toMatch(/connection_unusable/i);
    expect(applyDispatchStarted).not.toHaveBeenCalled();
    expect(postOnce).not.toHaveBeenCalled();
  });
});

describe("JE-3B2 Memory projection contract", () => {
  it("documents VERIFIED-only projection; JE-3B2 writes false", () => {
    expect(JE_MEMORY_PROJECTION_CONTRACT.je3b2WritesMemory).toBe(false);
    expect(JE_MEMORY_PROJECTION_CONTRACT.requiredExecutionStatus).toBe(
      "VERIFIED",
    );
    const draft = buildVerifiedJeMemoryProjectionDraft({
      executionId: "exec-1",
      providerJournalId: "99",
      providerResponseHash: HASH,
      ledgerReceiptId: "evt-1",
      firmClientId: "fc-1",
    });
    expect(draft.memoryType).toBe("posted_je_verified");
    expect(draft.sourceSystem).toBe("je_governed_projection");
  });
});

describe("JE-3B2 generic patch cannot mint create conclusions", () => {
  it("rejects REQUEST_STARTED / RESPONSE_RECEIVED / FAILED_PRECOMMIT", async () => {
    for (const status of [
      "REQUEST_STARTED",
      "RESPONSE_RECEIVED",
      "FAILED_PRECOMMIT",
      "UNKNOWN_RESULT",
    ]) {
      await expect(
        patchJournalEntryProviderAttempt({
          attemptId: "att-1",
          expectedStatus: "RESERVED",
          patch: { status },
        }),
      ).rejects.toMatchObject({
        message: expect.stringMatching(/dedicated receipted RPC/i),
      });
    }
  });
});

describe("JE-3B2 source gates", () => {
  it("create modules never call legacy poster or Memory recordMemory", () => {
    const files = [
      "lib/journal-entry-governance/provider-create-service.ts",
      "lib/journal-entry-governance/provider-qbo-create-transport.ts",
      "lib/journal-entry-governance/provider-dispatch-repository.ts",
      "lib/journal-entry-governance/je3b2-feature-gate.ts",
    ];
    for (const f of files) {
      const src = readFileSync(join(process.cwd(), f), "utf8");
      expect(src).not.toMatch(/qboJournalEntryPoster/);
      expect(src).not.toMatch(/recordMemory/);
      expect(src).not.toMatch(/je_post_attempts/);
      expect(src).not.toMatch(/GOVERNED_AUTO/);
    }
  });
});
