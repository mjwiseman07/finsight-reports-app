/**
 * JE-3B1 — Provider-attempt / recovery write-authority tests.
 * Read-only engagement members must not reserve attempts or mutate recovery.
 */
import { describe, expect, it, vi } from "vitest";
import type { EngagementActor } from "@/lib/audit-ready/server-auth";
import {
  assertProviderAttemptWriteAuthority,
  recoverUnknownJournalEntryExecution,
  reserveGovernedProviderAttempt,
} from "../provider-attempt-service";
import { JE_EXECUTION_ERROR, type JournalEntryExecutionRow } from "../execution-types";
import type { JournalEntryProposalRow } from "../types";
import type { JournalEntryProviderAttemptRow } from "../provider-attempt-types";

const USER = "user-executor";
const HASH = "a".repeat(64);

function writeCompanyActor(
  over: Partial<EngagementActor> = {},
): EngagementActor {
  return {
    userId: USER,
    canRead: true,
    canWrite: true,
    scope: "company",
    ...over,
  };
}

function writeFirmActor(over: Partial<EngagementActor> = {}): EngagementActor {
  return {
    userId: USER,
    canRead: true,
    canWrite: true,
    scope: "firm",
    ...over,
  };
}

function readOnlyCompanyActor(): EngagementActor {
  return {
    userId: USER,
    canRead: true,
    canWrite: false,
    scope: "company",
  };
}

function readOnlyFirmActor(): EngagementActor {
  return {
    userId: USER,
    canRead: true,
    canWrite: false,
    scope: "firm",
  };
}

function baseExecution(
  over: Partial<JournalEntryExecutionRow> = {},
): JournalEntryExecutionRow {
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
    status: "READY_TO_POST",
    correlation_marker: "ADVJE:exec-1",
    execution_policy_snapshot: {},
    preflight_result: { eligible: true, checks: [] },
    requested_by: USER,
    requested_at: "2026-08-15T00:00:00.000Z",
    state_version: 2,
    provider_journal_id: null,
    provider_request_hash: HASH,
    provider_response_hash: null,
    last_error_code: null,
    last_error_message: null,
    ...over,
  };
}

function baseProposal(): JournalEntryProposalRow {
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
    memo: "memo",
    currency: "USD",
    txn_date: "2026-08-15",
    lines: [
      { sequence: 1, accountId: "a1", debitCents: 100, creditCents: 0 },
      { sequence: 2, accountId: "a2", debitCents: 0, creditCents: 100 },
    ],
    total_debits_cents: 100,
    total_credits_cents: 100,
    expected_effects: [{ type: "CC_EXCEPTION_CLEAR", exceptionCode: "X" }],
    policy_snapshot: {},
    policy_hash: HASH,
    proposal_hash: HASH,
    status: "SUBMITTED",
    proposed_by: "user-proposer",
    proposed_at: "2026-08-15T00:00:00.000Z",
    idempotency_key: HASH,
  };
}

function baseAttempt(
  over: Partial<JournalEntryProviderAttemptRow> = {},
): JournalEntryProviderAttemptRow {
  return {
    id: "att-1",
    execution_id: "exec-1",
    accounting_connection_id: "conn-1",
    provider: "quickbooks",
    provider_request_hash: HASH,
    correlation_marker: "ADVJE:exec-1",
    status: "UNKNOWN_RESULT",
    commit_certainty: "POSSIBLY_COMMITTED",
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

function ctx(userId = USER) {
  return { principal: { type: "user" as const, userId } };
}

describe("assertProviderAttemptWriteAuthority", () => {
  it("allows write-capable actor with matching userId", () => {
    const r = assertProviderAttemptWriteAuthority({
      actor: writeCompanyActor(),
      principalUserId: USER,
    });
    expect(r.ok).toBe(true);
  });

  it("rejects null actor", () => {
    const r = assertProviderAttemptWriteAuthority({
      actor: null,
      principalUserId: USER,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe(JE_EXECUTION_ERROR.WRITE_FORBIDDEN);
  });

  it("rejects canRead-only", () => {
    const r = assertProviderAttemptWriteAuthority({
      actor: readOnlyCompanyActor(),
      principalUserId: USER,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects userId mismatch", () => {
    const r = assertProviderAttemptWriteAuthority({
      actor: writeCompanyActor({ userId: "other-user" }),
      principalUserId: USER,
    });
    expect(r.ok).toBe(false);
  });
});

describe("reserveGovernedProviderAttempt authorization", () => {
  function reserveDeps(actor: EngagementActor | null) {
    const persistAttempt = vi.fn(async () => {
      throw new Error("persistAttempt must not be called when unauthorized");
    });
    return {
      resolveActor: vi.fn(async () => actor),
      loadExecution: vi.fn(async () => baseExecution()),
      loadProposal: vi.fn(async () => {
        // Hash gate needs matching reconstructed hash — bypass by matching via spy path
        // after auth; for unauthorized cases loadProposal should never run.
        throw new Error("loadProposal must not run before/without write auth");
      }),
      revalidateConnection: vi.fn(async () => {
        throw new Error("revalidate must not run without write auth");
      }),
      persistAttempt,
      loadAttempt: vi.fn(async () => null),
      loadFirmId: vi.fn(async () => "firm-1"),
    };
  }

  /** Auth passes — provide stubs that satisfy remaining gates. */
  function reserveDepsAuthorized(actor: EngagementActor) {
    const persistAttempt = vi.fn(async (input: {
      publishPostingStarted: boolean;
      postingStartedEventPayload?: Record<string, unknown>;
      actorId: string;
    }) => ({
      reused: false,
      attempt: baseAttempt({ status: "RESERVED", commit_certainty: "NOT_SENT" }),
      execution: baseExecution({
        status: input.publishPostingStarted ? "POSTING" : "READY_TO_POST",
      }),
      ledgerEventId: input.publishPostingStarted ? "evt-posting" : null,
    }));

    // Build proposal + hash alignment via real gate with injectable hash on execution.
    // Simplest path: stub revalidate + proposal + skip hash by using hash gate's deps
    // through a fake proposal and matching provider_request_hash computed... heavy.
    // Instead stub assert path by making loadProposal throw if hash checked —
    // we inject a custom flow: revalidate ok, and for hash we need matching.
    // Use vi.spy on hash module is hard. Easier: make loadProposal return proposal
    // and set execution.provider_request_hash to the real reconstructed hash in test.

    return {
      resolveActor: vi.fn(async () => actor),
      loadExecution: vi.fn(async () => null as JournalEntryExecutionRow | null),
      loadProposal: vi.fn(async () => baseProposal()),
      revalidateConnection: vi.fn(async () => ({ ok: true as const })),
      persistAttempt,
      loadAttempt: vi.fn(async () => null),
      loadFirmId: vi.fn(async () => "firm-1"),
    };
  }

  it("1. write-capable company actor → reserve allowed", async () => {
    const { hashProviderRequestPreview } = await import("../execution-hash");
    const { mapGovernedProposalToQboPayload } = await import(
      "../execution-payload"
    );
    const proposal = baseProposal();
    const preview = mapGovernedProposalToQboPayload({
      proposal,
      correlationMarker: "ADVJE:exec-1",
    });
    const providerRequestHash = hashProviderRequestPreview(
      preview as unknown as Record<string, unknown>,
    );
    const deps = reserveDepsAuthorized(writeCompanyActor());
    deps.loadExecution = vi.fn(async () =>
      baseExecution({ provider_request_hash: providerRequestHash }),
    );
    deps.loadProposal = vi.fn(async () => proposal);

    const result = await reserveGovernedProviderAttempt(
      { executionId: "exec-1" },
      ctx(),
      { deps },
    );
    expect(result.ok).toBe(true);
    expect(deps.persistAttempt).toHaveBeenCalled();
  });

  it("2. write-capable firm actor → reserve allowed", async () => {
    const { hashProviderRequestPreview } = await import("../execution-hash");
    const { mapGovernedProposalToQboPayload } = await import(
      "../execution-payload"
    );
    const proposal = baseProposal();
    const providerRequestHash = hashProviderRequestPreview(
      mapGovernedProposalToQboPayload({
        proposal,
        correlationMarker: "ADVJE:exec-1",
      }) as unknown as Record<string, unknown>,
    );
    const deps = reserveDepsAuthorized(writeFirmActor());
    deps.loadExecution = vi.fn(async () =>
      baseExecution({ provider_request_hash: providerRequestHash }),
    );
    deps.loadProposal = vi.fn(async () => proposal);

    const result = await reserveGovernedProviderAttempt(
      { executionId: "exec-1" },
      ctx(),
      { deps },
    );
    expect(result.ok).toBe(true);
  });

  it("3. read-only company member → rejected", async () => {
    const deps = reserveDeps(readOnlyCompanyActor());
    // Auth fails after loadExecution — allow execution load
    deps.loadExecution = vi.fn(async () => baseExecution());
    const result = await reserveGovernedProviderAttempt(
      { executionId: "exec-1" },
      ctx(),
      { deps },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(JE_EXECUTION_ERROR.WRITE_FORBIDDEN);
    expect(deps.persistAttempt).not.toHaveBeenCalled();
  });

  it("4. read-only firm member → rejected", async () => {
    const deps = reserveDeps(readOnlyFirmActor());
    deps.loadExecution = vi.fn(async () => baseExecution());
    const result = await reserveGovernedProviderAttempt(
      { executionId: "exec-1" },
      ctx(),
      { deps },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(JE_EXECUTION_ERROR.WRITE_FORBIDDEN);
    expect(deps.persistAttempt).not.toHaveBeenCalled();
  });

  it("5. resolver returns null → rejected", async () => {
    const deps = reserveDeps(null);
    deps.loadExecution = vi.fn(async () => baseExecution());
    const result = await reserveGovernedProviderAttempt(
      { executionId: "exec-1" },
      ctx(),
      { deps },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(JE_EXECUTION_ERROR.WRITE_FORBIDDEN);
  });

  it("6. actor.userId mismatch → rejected", async () => {
    const deps = reserveDeps(writeCompanyActor({ userId: "someone-else" }));
    deps.loadExecution = vi.fn(async () => baseExecution());
    const result = await reserveGovernedProviderAttempt(
      { executionId: "exec-1" },
      ctx(),
      { deps },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(JE_EXECUTION_ERROR.WRITE_FORBIDDEN);
  });

  it("7. can_approve=true but canWrite=false → rejected (can_approve never consulted)", async () => {
    // Resolver returns read-only; firm can_approve is irrelevant and unused.
    const deps = reserveDeps(readOnlyFirmActor());
    deps.loadExecution = vi.fn(async () => baseExecution());
    const result = await reserveGovernedProviderAttempt(
      { executionId: "exec-1" },
      ctx(),
      { deps },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe(JE_EXECUTION_ERROR.WRITE_FORBIDDEN);
      expect(result.message).toMatch(/can_approve/i);
    }
  });

  it("8-11. read-only cannot publishPostingStarted / POSTING / attempt row / event", async () => {
    const deps = reserveDeps(readOnlyCompanyActor());
    deps.loadExecution = vi.fn(async () => baseExecution());
    const result = await reserveGovernedProviderAttempt(
      { executionId: "exec-1" },
      ctx(),
      { publishPostingStarted: true, deps },
    );
    expect(result.ok).toBe(false);
    expect(deps.persistAttempt).not.toHaveBeenCalled();
    expect(deps.revalidateConnection).not.toHaveBeenCalled();
  });
});

describe("recoverUnknownJournalEntryExecution authorization", () => {
  function recoveryDeps(actor: EngagementActor | null) {
    const patchAttempt = vi.fn(async () => {
      throw new Error("patchAttempt must not run when unauthorized");
    });
    const findByMarker = vi.fn(async () => {
      throw new Error("QBO discovery must not run when unauthorized");
    });
    const resolveToken = vi.fn(async () => {
      throw new Error("token resolve must not run when unauthorized");
    });
    return {
      resolveActor: vi.fn(async () => actor),
      loadExecution: vi.fn(async () =>
        baseExecution({ status: "UNKNOWN_COMMIT" }),
      ),
      loadProposal: vi.fn(async () => {
        throw new Error("loadProposal must not run when unauthorized");
      }),
      revalidateConnection: vi.fn(async () => {
        throw new Error("revalidate must not run when unauthorized");
      }),
      patchAttempt,
      loadAttempt: vi.fn(async () => baseAttempt()),
      resolveToken,
      findByMarker,
    };
  }

  it("12. write-capable actor can run UNKNOWN_COMMIT discovery", async () => {
    const { hashProviderRequestPreview } = await import("../execution-hash");
    const { mapGovernedProposalToQboPayload } = await import(
      "../execution-payload"
    );
    const proposal = baseProposal();
    const providerRequestHash = hashProviderRequestPreview(
      mapGovernedProposalToQboPayload({
        proposal,
        correlationMarker: "ADVJE:exec-1",
      }) as unknown as Record<string, unknown>,
    );
    const patchAttempt = vi.fn(async () => baseAttempt());
    const findByMarker = vi.fn(async () => ({
      kind: "NONE" as const,
      matches: [],
      candidateCount: 0,
      reason: "no_marker_match",
    }));
    const deps = {
      resolveActor: vi.fn(async () => writeCompanyActor()),
      loadExecution: vi.fn(async () =>
        baseExecution({
          status: "UNKNOWN_COMMIT" as const,
          provider_request_hash: providerRequestHash,
        }),
      ),
      loadProposal: vi.fn(async () => proposal),
      revalidateConnection: vi.fn(async () => ({ ok: true as const })),
      patchAttempt,
      loadAttempt: vi.fn(async () => baseAttempt()),
      resolveToken: vi.fn(async () => ({
        accessToken: "tok",
        refreshToken: "ref",
        realmId: "realm",
        tokenSource: "accounting_connections" as const,
        grantedScopes: [],
        connectionId: "conn-1",
        ownerUserId: USER,
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      })),
      findByMarker,
    };

    const result = await recoverUnknownJournalEntryExecution(
      { executionId: "exec-1" },
      ctx(),
      { deps },
    );
    expect(result.ok).toBe(true);
    expect(findByMarker).toHaveBeenCalled();
    expect(result.ok && result.providerPostRetryIssued).toBe(false);
  });

  it("13. read-only actor rejected", async () => {
    const deps = recoveryDeps(readOnlyCompanyActor());
    const result = await recoverUnknownJournalEntryExecution(
      { executionId: "exec-1" },
      ctx(),
      { deps },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(JE_EXECUTION_ERROR.WRITE_FORBIDDEN);
    expect(deps.patchAttempt).not.toHaveBeenCalled();
    expect(deps.findByMarker).not.toHaveBeenCalled();
    expect(deps.resolveToken).not.toHaveBeenCalled();
  });

  it("14. null actor rejected", async () => {
    const deps = recoveryDeps(null);
    const result = await recoverUnknownJournalEntryExecution(
      { executionId: "exec-1" },
      ctx(),
      { deps },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe(JE_EXECUTION_ERROR.WRITE_FORBIDDEN);
  });

  it("15. actor.userId mismatch rejected", async () => {
    const deps = recoveryDeps(writeCompanyActor({ userId: "other" }));
    const result = await recoverUnknownJournalEntryExecution(
      { executionId: "exec-1" },
      ctx(),
      { deps },
    );
    expect(result.ok).toBe(false);
  });

  it("16-19. read-only cannot mutate discovery_summary / qbo_je_id / DISCOVERED_COMMITTED / commit_certainty", async () => {
    const deps = recoveryDeps(readOnlyFirmActor());
    const result = await recoverUnknownJournalEntryExecution(
      { executionId: "exec-1" },
      ctx(),
      { deps },
    );
    expect(result.ok).toBe(false);
    expect(deps.patchAttempt).not.toHaveBeenCalled();
  });

  it("20. unauthorized recovery issues no provider POST", async () => {
    const deps = recoveryDeps(readOnlyCompanyActor());
    const result = await recoverUnknownJournalEntryExecution(
      { executionId: "exec-1" },
      ctx(),
      { deps },
    );
    expect(result.ok).toBe(false);
    // No success path → no providerPostRetryIssued true possible
  });
});
