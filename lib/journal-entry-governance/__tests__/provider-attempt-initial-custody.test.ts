/**
 * JE-3B1 — Provider-attempt creation owns RESERVED + NOT_SENT.
 * Caller cannot mint stronger certainty or non-RESERVED status at create.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EngagementActor } from "@/lib/audit-ready/server-auth";

const { getSupabaseAdmin } = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/supabase-admin.js", () => ({ getSupabaseAdmin }));

import {
  persistJournalEntryProviderAttempt,
  type PersistProviderAttemptInput,
} from "../provider-attempt-repository";
import { reserveGovernedProviderAttempt } from "../provider-attempt-service";
import type { JournalEntryExecutionRow } from "../execution-types";
import type { JournalEntryProposalRow } from "../types";
import type { JournalEntryProviderAttemptRow } from "../provider-attempt-types";

const CUSTODY_MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260821222342_journal_entry_provider_attempt_initial_custody.sql",
);

const CERTAINTY_MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260821221658_journal_entry_provider_attempt_certainty_immutable.sql",
);

const COMMIT_RPC_MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260821220646_journal_entry_provider_discovery_receipts.sql",
);

const HASH = "a".repeat(64);
const USER = "user-1";

type AttemptBinding = PersistProviderAttemptInput["attempt"];

/** Compile-time: reservation input must not expose status / commit_certainty. */
type _NoStatus = AttemptBinding extends { status?: unknown } ? never : true;
type _NoCertainty = AttemptBinding extends { commit_certainty?: unknown }
  ? never
  : true;
const _narrowed: [_NoStatus, _NoCertainty] = [true, true];
void _narrowed;

function basePersistInput(
  over: Partial<PersistProviderAttemptInput> = {},
): PersistProviderAttemptInput {
  return {
    attempt: {
      id: "11111111-1111-1111-1111-111111111111",
      execution_id: "22222222-2222-2222-2222-222222222222",
      accounting_connection_id: "33333333-3333-3333-3333-333333333333",
      provider: "quickbooks",
      provider_request_hash: HASH,
      correlation_marker: "ADVJE:exec-1",
    },
    publishPostingStarted: false,
    postingStartedEventPayload: {},
    firmId: "firm-1",
    firmClientId: "fc-1",
    engagementId: "eng-1",
    closePeriodId: null,
    actorId: USER,
    ...over,
  };
}

function attemptRow(
  over: Partial<JournalEntryProviderAttemptRow> = {},
): JournalEntryProviderAttemptRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    execution_id: "22222222-2222-2222-2222-222222222222",
    accounting_connection_id: "33333333-3333-3333-3333-333333333333",
    provider: "quickbooks",
    provider_request_hash: HASH,
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

function executionRaw(
  over: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: "22222222-2222-2222-2222-222222222222",
    proposal_id: "prop-1",
    approval_id: "appr-1",
    company_id: "co-1",
    engagement_id: "eng-1",
    firm_client_id: "fc-1",
    source_continuous_close_run_id: "cc-1",
    source_accounting_sync_id: "sync-1",
    accounting_connection_id: "33333333-3333-3333-3333-333333333333",
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
    state_version: 1,
    provider_journal_id: null,
    provider_request_hash: HASH,
    provider_response_hash: null,
    last_error_code: null,
    last_error_message: null,
    created_at: "2026-08-15T00:00:00.000Z",
    updated_at: "2026-08-15T00:00:00.000Z",
    ...over,
  };
}

describe("JE-3B1 initial custody migration", () => {
  const src = readFileSync(CUSTODY_MIGRATION, "utf8");

  it("1-2. INSERT hard-sets RESERVED + NOT_SENT (not COALESCE from p_row)", () => {
    expect(src).toContain("'RESERVED'");
    expect(src).toContain("'NOT_SENT'");
    expect(src).not.toMatch(/COALESCE\(\s*NULLIF\(\s*p_row->>'status'/);
    expect(src).not.toMatch(
      /COALESCE\(\s*NULLIF\(\s*p_row->>'commit_certainty'/,
    );
    expect(src).toMatch(/VALUES\s*\([\s\S]*?'RESERVED',\s*'NOT_SENT'/m);
  });

  it("3-7. rejects invalid supplied initial status / certainty", () => {
    expect(src).toContain("je_provider_attempt_initial_status_forbidden");
    expect(src).toContain("je_provider_attempt_initial_certainty_forbidden");
    expect(src).toContain("IS DISTINCT FROM 'RESERVED'");
    expect(src).toContain("IS DISTINCT FROM 'NOT_SENT'");
  });

  it("10-11. exact reuse preserves existing custody (no reset)", () => {
    expect(src).toMatch(/Exact reuse: preserve existing status\/certainty/i);
    expect(src).toContain("attempt := to_jsonb(v_existing)");
  });

  it("does not enable VERIFIED or governed POST", () => {
    expect(src).toMatch(/Does NOT enable governed POST\s*\/\s*VERIFIED/i);
  });
});

describe("persistJournalEntryProviderAttempt creation custody", () => {
  let lastRpcArgs: Record<string, unknown> | null = null;
  let rpcResult: { data: unknown; error: { message: string } | null };

  beforeEach(() => {
    lastRpcArgs = null;
    rpcResult = {
      data: [
        {
          reused: false,
          attempt: attemptRow(),
          execution: executionRaw(),
          ledger_event_id: null,
        },
      ],
      error: null,
    };
    getSupabaseAdmin.mockReturnValue({
      rpc: vi.fn(async (_name: string, args: Record<string, unknown>) => {
        lastRpcArgs = args;
        return rpcResult;
      }),
    });
  });

  it("8. normal reservation RPC p_row has binding only; result RESERVED+NOT_SENT", async () => {
    const result = await persistJournalEntryProviderAttempt(basePersistInput());
    expect(lastRpcArgs?.p_row).toEqual({
      id: "11111111-1111-1111-1111-111111111111",
      execution_id: "22222222-2222-2222-2222-222222222222",
      accounting_connection_id: "33333333-3333-3333-3333-333333333333",
      provider: "quickbooks",
      provider_request_hash: HASH,
      correlation_marker: "ADVJE:exec-1",
    });
    expect(
      Object.prototype.hasOwnProperty.call(lastRpcArgs?.p_row, "status"),
    ).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(
        lastRpcArgs?.p_row,
        "commit_certainty",
      ),
    ).toBe(false);
    expect(result.attempt.status).toBe("RESERVED");
    expect(result.attempt.commit_certainty).toBe("NOT_SENT");
    expect(result.reused).toBe(false);
  });

  it("3-7. maps RPC rejection of invalid initial custody", async () => {
    for (const message of [
      "je_provider_attempt_initial_certainty_forbidden: POSSIBLY_COMMITTED",
      "je_provider_attempt_initial_certainty_forbidden: DEFINITELY_NOT_COMMITTED",
      "je_provider_attempt_initial_certainty_forbidden: COMMITTED",
      "je_provider_attempt_initial_status_forbidden: DISCOVERED_COMMITTED",
      "je_provider_attempt_initial_status_forbidden: UNKNOWN_RESULT",
    ]) {
      rpcResult = { data: null, error: { message } };
      await expect(
        persistJournalEntryProviderAttempt(basePersistInput()),
      ).rejects.toMatchObject({
        message: expect.stringMatching(/initial_(status|certainty)_forbidden/i),
      });
    }
  });

  it("9. publishPostingStarted → execution POSTING, attempt stays NOT_SENT", async () => {
    rpcResult = {
      data: [
        {
          reused: false,
          attempt: attemptRow({
            status: "RESERVED",
            commit_certainty: "NOT_SENT",
          }),
          execution: executionRaw({ status: "POSTING", state_version: 2 }),
          ledger_event_id: "44444444-4444-4444-4444-444444444444",
        },
      ],
      error: null,
    };
    const result = await persistJournalEntryProviderAttempt(
      basePersistInput({
        publishPostingStarted: true,
        postingStartedEventPayload: { status: "POSTING" },
      }),
    );
    expect(lastRpcArgs?.p_publish_posting_started).toBe(true);
    expect(result.execution.status).toBe("POSTING");
    expect(result.attempt.status).toBe("RESERVED");
    expect(result.attempt.commit_certainty).toBe("NOT_SENT");
  });

  it("10-11. exact reuse returns existing custody unchanged", async () => {
    const existing = attemptRow({
      status: "UNKNOWN_RESULT",
      commit_certainty: "POSSIBLY_COMMITTED",
    });
    rpcResult = {
      data: [
        {
          reused: true,
          attempt: existing,
          execution: executionRaw({ status: "UNKNOWN_COMMIT" }),
          ledger_event_id: null,
        },
      ],
      error: null,
    };
    const result = await persistJournalEntryProviderAttempt(basePersistInput());
    expect(result.reused).toBe(true);
    expect(result.attempt.status).toBe("UNKNOWN_RESULT");
    expect(result.attempt.commit_certainty).toBe("POSSIBLY_COMMITTED");
  });
});

describe("reserveGovernedProviderAttempt does not pass custody fields", () => {
  function writeActor(): EngagementActor {
    return {
      userId: USER,
      canRead: true,
      canWrite: true,
      scope: "company",
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

  it("TS reservation input narrowed: persistAttempt receives no status/certainty", async () => {
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

    const persistAttempt = vi.fn(async (input: PersistProviderAttemptInput) => ({
      reused: false,
      attempt: attemptRow({
        execution_id: "exec-1",
        accounting_connection_id: "conn-1",
        provider_request_hash: providerRequestHash,
        correlation_marker: "ADVJE:exec-1",
      }),
      execution: baseExecution({
        status: input.publishPostingStarted ? "POSTING" : "READY_TO_POST",
        provider_request_hash: providerRequestHash,
      }),
      ledgerEventId: input.publishPostingStarted ? "evt-1" : null,
    }));

    const result = await reserveGovernedProviderAttempt(
      { executionId: "exec-1" },
      { principal: { type: "user", userId: USER } },
      {
        publishPostingStarted: true,
        deps: {
          resolveActor: vi.fn(async () => writeActor()),
          loadExecution: vi.fn(async () =>
            baseExecution({ provider_request_hash: providerRequestHash }),
          ),
          loadProposal: vi.fn(async () => proposal),
          revalidateConnection: vi.fn(async () => ({ ok: true as const })),
          persistAttempt,
          loadAttempt: vi.fn(async () => null),
          loadFirmId: vi.fn(async () => "firm-1"),
        },
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.attempt.commit_certainty).toBe("NOT_SENT");
    expect(result.execution.status).toBe("POSTING");
    expect(persistAttempt).toHaveBeenCalledTimes(1);
    expect(persistAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        publishPostingStarted: true,
        attempt: expect.not.objectContaining({
          status: expect.anything(),
          commit_certainty: expect.anything(),
        }),
      }),
    );
  });

  it("12. reuse path does not create second attempt (loadAttempt returns existing)", async () => {
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
    const existing = attemptRow({
      id: "existing-att",
      execution_id: "exec-1",
      accounting_connection_id: "conn-1",
      provider_request_hash: providerRequestHash,
      correlation_marker: "ADVJE:exec-1",
      status: "UNKNOWN_RESULT",
      commit_certainty: "POSSIBLY_COMMITTED",
    });

    const persistAttempt = vi.fn(async () => ({
      reused: true,
      attempt: existing,
      execution: baseExecution({
        status: "UNKNOWN_COMMIT",
        provider_request_hash: providerRequestHash,
      }),
      ledgerEventId: null,
    }));

    const result = await reserveGovernedProviderAttempt(
      { executionId: "exec-1" },
      { principal: { type: "user", userId: USER } },
      {
        deps: {
          resolveActor: vi.fn(async () => writeActor()),
          loadExecution: vi.fn(async () =>
            baseExecution({
              status: "POSTING",
              provider_request_hash: providerRequestHash,
            }),
          ),
          loadProposal: vi.fn(async () => proposal),
          revalidateConnection: vi.fn(async () => ({ ok: true as const })),
          persistAttempt,
          loadAttempt: vi.fn(async () => existing),
          loadFirmId: vi.fn(async () => "firm-1"),
        },
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reused).toBe(true);
    expect(result.attempt.status).toBe("UNKNOWN_RESULT");
    expect(result.attempt.commit_certainty).toBe("POSSIBLY_COMMITTED");
    expect(persistAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        attempt: expect.objectContaining({ id: "existing-att" }),
      }),
    );
  });
});

describe("prior JE-3B1 contracts unchanged (static)", () => {
  it("13. generic patch certainty immutability still present", () => {
    const src = readFileSync(CERTAINTY_MIGRATION, "utf8");
    expect(src).toContain("commit_certainty is immutable via generic patch");
    expect(src).not.toMatch(
      /commit_certainty\s*=\s*COALESCE\(v_new_certainty/,
    );
  });

  it("14-15. dedicated commit + not-found RPCs unchanged", () => {
    const src = readFileSync(COMMIT_RPC_MIGRATION, "utf8");
    expect(src).toContain("apply_journal_entry_provider_commit_discovered");
    expect(src).toContain("commit_certainty = 'COMMITTED'");
    expect(src).toContain("apply_journal_entry_provider_not_found_confirmed");
    expect(src).toContain("journal_entry.provider_not_found_confirmed");
  });

  it("14. DEFINITELY_NOT_COMMITTED has no creation mint path in custody migration", () => {
    const src = readFileSync(CUSTODY_MIGRATION, "utf8");
    expect(src).not.toMatch(
      /commit_certainty\s*=\s*'DEFINITELY_NOT_COMMITTED'/,
    );
    expect(src).not.toMatch(/VALUES[\s\S]*DEFINITELY_NOT_COMMITTED/m);
  });
});
