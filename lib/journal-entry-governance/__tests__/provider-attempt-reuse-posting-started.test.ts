/**
 * JE-3D — Pre-reserved attempt reuse must establish posting_started.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseAdmin } = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/supabase-admin.js", () => ({ getSupabaseAdmin }));

import {
  persistJournalEntryProviderAttempt,
  type PersistProviderAttemptInput,
} from "../provider-attempt-repository";

const REUSE_POSTING_MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260826043000_journal_entry_provider_attempt_reuse_posting_started.sql",
);

const HASH = "a".repeat(64);
const USER = "user-1";

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
    postingStartedEventPayload: {
      execution_id: "22222222-2222-2222-2222-222222222222",
      proposal_id: "prop-1",
      approval_id: "appr-1",
      accounting_connection_id: "33333333-3333-3333-3333-333333333333",
      execution_hash: HASH,
      provider_request_hash: HASH,
      correlation_marker: "ADVJE:exec-1",
      status: "POSTING",
      commit_certainty: "NOT_SENT",
    },
    firmId: "firm-1",
    firmClientId: "fc-1",
    engagementId: "eng-1",
    closePeriodId: null,
    actorId: USER,
    ...over,
  };
}

function attemptRow(over: Record<string, unknown> = {}) {
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
    ...over,
  };
}

function executionRaw(over: Record<string, unknown> = {}) {
  return {
    id: "22222222-2222-2222-2222-222222222222",
    engagement_id: "eng-1",
    firm_client_id: "fc-1",
    status: "READY_TO_POST",
    state_version: 2,
    provider_request_hash: HASH,
    correlation_marker: "ADVJE:exec-1",
    ...over,
  };
}

describe("JE-3D reuse posting_started migration", () => {
  const src = readFileSync(REUSE_POSTING_MIGRATION, "utf8");

  it("1. RESERVED reuse with publishPostingStarted establishes POSTING atomically", () => {
    expect(src).toContain("je_publish_posting_started_from_ready");
    expect(src).toContain("je_provider_attempt_reuse_posting_started_forbidden");
    expect(src).toMatch(
      /IF NOT p_publish_posting_started THEN[\s\S]*reused := true[\s\S]*ledger_event_id := NULL/,
    );
    expect(src).toMatch(
      /v_existing\.status IS DISTINCT FROM 'RESERVED'[\s\S]*je_provider_attempt_reuse_posting_started_forbidden/,
    );
    expect(src).toContain("journal_entry.posting_started");
    expect(src).toContain("attempt := to_jsonb(v_existing)");
  });

  it("2. publishPostingStarted=false leaves exact reuse unchanged", () => {
    expect(src).toMatch(
      /IF NOT p_publish_posting_started THEN[\s\S]*execution := to_jsonb\(v_execution\)/,
    );
  });

  it("3. execution already POSTING does not publish duplicate receipt", () => {
    expect(src).toMatch(
      /IF v_execution\.status = 'POSTING' THEN[\s\S]*ledger_event_id := NULL[\s\S]*RETURN NEXT/,
    );
  });

  it("4-5. non-RESERVED attempt cannot establish posting_started on reuse", () => {
    expect(src).toContain("je_provider_attempt_reuse_posting_started_forbidden");
    expect(src).not.toMatch(
      /REQUEST_STARTED[\s\S]*je_publish_posting_started_from_ready/,
    );
  });

  it("6. binding mismatch still rejects", () => {
    expect(src).toContain("je_provider_attempt_binding_conflict");
    expect(src).toContain("je_provider_attempt_connection_mismatch");
  });

  it("7. posting_started helper uses state_version concurrency", () => {
    expect(src).toContain(
      "journal_entry_execution state_version concurrency conflict during posting_started",
    );
    expect(src).toContain("AND state_version = v_execution.state_version");
  });

  it("8. scope binding preserved before posting_started", () => {
    expect(src).toContain("je_provider_attempt_engagement_mismatch");
    expect(src).toContain("je_provider_attempt_firm_client_mismatch");
  });

  it("9. unique_violation path re-evaluates posting_started semantics", () => {
    expect(src).toMatch(
      /WHEN unique_violation THEN[\s\S]*FOR UPDATE[\s\S]*je_publish_posting_started_from_ready/,
    );
  });

  it("10. one execution → one attempt invariant unchanged (no second INSERT on reuse)", () => {
    const reuseBlock = src.match(/IF FOUND THEN[\s\S]*?END IF;\s*\n\s*IF v_execution\.status IS DISTINCT FROM 'READY_TO_POST'/);
    expect(reuseBlock?.[0]).toBeTruthy();
    expect(reuseBlock?.[0]).toContain("reused := true");
    expect(reuseBlock?.[0]).not.toContain("INSERT INTO public.journal_entry_provider_attempts");
  });

  it("11-14. no provider POST / verify / memory / worker in migration", () => {
    expect(src).not.toMatch(/POST\s+\/journalentry/i);
    expect(src).not.toMatch(/VERIFY_SANDBOX_JE/);
    expect(src).not.toMatch(/memoryWriteAllowed/);
    expect(src).not.toMatch(/workerAllowed/);
    expect(src).not.toMatch(/GOVERNED_AUTO/);
  });
});

describe("persistJournalEntryProviderAttempt reuse posting_started RPC contract", () => {
  let rpcResult: { data: unknown; error: { message: string } | null };

  beforeEach(() => {
    rpcResult = {
      data: [
        {
          reused: true,
          attempt: attemptRow(),
          execution: executionRaw({ status: "POSTING", state_version: 3 }),
          ledger_event_id: "44444444-4444-4444-4444-444444444444",
        },
      ],
      error: null,
    };
    getSupabaseAdmin.mockReturnValue({
      rpc: vi.fn(async () => rpcResult),
    });
  });

  it("1. RESERVED reuse + publishPostingStarted=true → POSTING + receipt", async () => {
    const result = await persistJournalEntryProviderAttempt(
      basePersistInput({ publishPostingStarted: true }),
    );
    expect(result.reused).toBe(true);
    expect(result.execution.status).toBe("POSTING");
    expect(result.attempt.status).toBe("RESERVED");
    expect(result.attempt.commit_certainty).toBe("NOT_SENT");
    expect(result.ledgerEventId).toBe("44444444-4444-4444-4444-444444444444");
  });

  it("2. publishPostingStarted=false → READY_TO_POST unchanged, no receipt", async () => {
    rpcResult = {
      data: [
        {
          reused: true,
          attempt: attemptRow(),
          execution: executionRaw({ status: "READY_TO_POST", state_version: 2 }),
          ledger_event_id: null,
        },
      ],
      error: null,
    };
    const result = await persistJournalEntryProviderAttempt(basePersistInput());
    expect(result.reused).toBe(true);
    expect(result.execution.status).toBe("READY_TO_POST");
    expect(result.ledgerEventId).toBeNull();
  });

  it("3. POSTING replay → no duplicate receipt", async () => {
    rpcResult = {
      data: [
        {
          reused: true,
          attempt: attemptRow(),
          execution: executionRaw({ status: "POSTING", state_version: 3 }),
          ledger_event_id: null,
        },
      ],
      error: null,
    };
    const result = await persistJournalEntryProviderAttempt(
      basePersistInput({ publishPostingStarted: true }),
    );
    expect(result.execution.status).toBe("POSTING");
    expect(result.ledgerEventId).toBeNull();
  });

  it("4-5. non-RESERVED reuse rejects posting_started", async () => {
    for (const message of [
      "je_provider_attempt_reuse_posting_started_forbidden: REQUEST_STARTED",
      "je_provider_attempt_reuse_posting_started_forbidden: RESPONSE_RECEIVED",
    ]) {
      rpcResult = { data: null, error: { message } };
      await expect(
        persistJournalEntryProviderAttempt(
          basePersistInput({ publishPostingStarted: true }),
        ),
      ).rejects.toMatchObject({
        message: expect.stringMatching(/reuse_posting_started_forbidden/i),
      });
    }
  });

  it("7. receipt failure rolls back (RPC surfaces concurrency/ledger failure)", async () => {
    rpcResult = {
      data: null,
      error: {
        message:
          "journal_entry_execution state_version concurrency conflict during posting_started",
      },
    };
    await expect(
      persistJournalEntryProviderAttempt(
        basePersistInput({ publishPostingStarted: true }),
      ),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/state_version concurrency conflict/i),
    });
  });
});
