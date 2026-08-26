/**
 * JE-3D — Governed posting_started handoff + company-scoped Patent #6 scope tests.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  FIRST_RUN_ACCRUED_LIABILITY_ACCOUNT_ID,
  FIRST_RUN_ACCOUNTS_REVIEWED_AND_APPROVED,
  FIRST_RUN_EXPENSE_ACCOUNT_ID,
} from "../je3d-first-run-account-authority";
import {
  FIRST_RUN_APPROVED_EXECUTION_ID,
  FIRST_RUN_EXECUTION_REVIEWED_AND_APPROVED,
} from "../je3d-first-run-execution-authority";
import {
  JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY,
  resolveJe3dActivationPolicy,
} from "../je3d-first-controlled-create-activation";
import {
  isJe3dCreateCapabilityEnabled,
  isJe3dVerifyCapabilityEnabled,
} from "../je3d-activation-policy";
import { loadEngagementFirmId } from "../approval-custody";
import { buildJe3dProductionCreateDeps } from "../je3d-production-wiring";
import { loadProviderAttemptByExecutionId } from "../provider-attempt-repository";
import {
  loadExactExecution,
  reserveGovernedProviderAttempt,
} from "../provider-attempt-service";
import { establishGovernedPostingStartedHandoff } from "../provider-create-posting-handoff";
import type { JournalEntryExecutionRow } from "../execution-types";
import type { JournalEntryProviderAttemptRow } from "../provider-attempt-types";
import type { JournalEntryProposalRow } from "../types";

const EXEC_ID = "6d9579ad-0020-42b5-9521-db68a5d0edda";
const ATTEMPT_ID = "2ffffef6-746a-4c85-ad7b-2596be0c0eaf";
const ENGAGEMENT_ID = "74da484f-c065-4b6b-84cc-6822335af2ee";
const FIRM_CLIENT_ID = "aaaaaaaa-1111-4111-8111-111111111111";
const USER = "user-executor";
const HASH = "a".repeat(64);

function readyExecution(
  over: Partial<JournalEntryExecutionRow> = {},
): JournalEntryExecutionRow {
  return {
    id: EXEC_ID,
    proposal_id: "prop-1",
    approval_id: "appr-1",
    company_id: "aaaaaaaa-2222-4222-8222-222222222222",
    engagement_id: ENGAGEMENT_ID,
    firm_client_id: FIRM_CLIENT_ID,
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
    correlation_marker: `ADVJE:${EXEC_ID}`,
    execution_policy_snapshot: {},
    preflight_result: { eligible: true, checks: [] },
    requested_by: USER,
    requested_at: "2026-08-25T04:00:00.000Z",
    state_version: 2,
    provider_journal_id: null,
    provider_request_hash: HASH,
    provider_response_hash: null,
    last_error_code: null,
    last_error_message: null,
    ...over,
  };
}

function postingExecution(): JournalEntryExecutionRow {
  return readyExecution({ status: "POSTING", state_version: 3 });
}

function reservedAttempt(
  over: Partial<JournalEntryProviderAttemptRow> = {},
): JournalEntryProviderAttemptRow {
  return {
    id: ATTEMPT_ID,
    execution_id: EXEC_ID,
    accounting_connection_id: "conn-1",
    provider: "quickbooks",
    provider_request_hash: HASH,
    correlation_marker: `ADVJE:${EXEC_ID}`,
    status: "RESERVED",
    commit_certainty: "NOT_SENT",
    qbo_je_id: null,
    intuit_tid: null,
    provider_response_hash: null,
    request_started_at: null,
    request_completed_at: null,
    provider_error_code: null,
    provider_error_message: null,
    discovery_summary: {},
    created_at: "2026-08-25T04:00:00.000Z",
    updated_at: "2026-08-25T04:00:00.000Z",
    ...over,
  };
}

function baseProposal(): JournalEntryProposalRow {
  return {
    id: "prop-1",
    company_id: "aaaaaaaa-2222-4222-8222-222222222222",
    engagement_id: ENGAGEMENT_ID,
    firm_client_id: FIRM_CLIENT_ID,
    period_end: "2026-08-31",
    source_continuous_close_run_id: "cc-1",
    source_accounting_sync_id: "sync-1",
    source_recon_run_ids: [],
    origin_type: "ACCRUAL",
    reason_code: "cutoff_accrual",
    memo: "First controlled Advisacor governed JE sandbox validation",
    currency: "USD",
    txn_date: "2026-08-31",
    lines: [
      {
        sequence: 1,
        accountId: "15",
        debitCents: 100,
        creditCents: 0,
      },
      {
        sequence: 2,
        accountId: "1150040002",
        debitCents: 0,
        creditCents: 100,
      },
    ],
    total_debits_cents: 100,
    total_credits_cents: 100,
    expected_effects: [],
    policy_snapshot: {},
    policy_hash: HASH,
    proposal_hash: HASH,
    status: "SUBMITTED",
    proposed_by: "user-proposer",
    proposed_at: "2026-08-25T04:00:00.000Z",
    idempotency_key: HASH,
  };
}

vi.mock("../provider-attempt-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../provider-attempt-service")>();
  return {
    ...actual,
    loadExactExecution: vi.fn(),
    reserveGovernedProviderAttempt: vi.fn(),
  };
});

vi.mock("../provider-attempt-repository", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../provider-attempt-repository")>();
  return {
    ...actual,
    loadProviderAttemptByExecutionId: vi.fn(),
    persistJournalEntryProviderAttempt: vi.fn(),
  };
});

vi.mock("../approval-custody", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../approval-custody")>();
  return {
    ...actual,
    loadEngagementFirmId: vi.fn(),
    loadExactJournalEntryProposal: vi.fn(),
  };
});

const ctx = { principal: { type: "user" as const, userId: USER } };

describe("JE-3D pre-activation locked first-run facts", () => {
  it("1-2. approved execution and account IDs are exact", () => {
    expect(FIRST_RUN_APPROVED_EXECUTION_ID).toBe(EXEC_ID);
    expect(FIRST_RUN_EXPENSE_ACCOUNT_ID).toBe("15");
    expect(FIRST_RUN_ACCRUED_LIABILITY_ACCOUNT_ID).toBe("1150040002");
  });

  it("3-5. review flags true; CREATE/VERIFY off; kill switch ON", () => {
    expect(FIRST_RUN_EXECUTION_REVIEWED_AND_APPROVED).toBe(true);
    expect(FIRST_RUN_ACCOUNTS_REVIEWED_AND_APPROVED).toBe(true);
    const policy = resolveJe3dActivationPolicy();
    expect(isJe3dCreateCapabilityEnabled(policy)).toBe(true);
    expect(isJe3dVerifyCapabilityEnabled(policy)).toBe(false);
    expect(policy.sandboxDispatchKillSwitch).toBe(true);
  });
});

describe("establishGovernedPostingStartedHandoff", () => {
  beforeEach(() => {
    vi.mocked(loadExactExecution).mockReset();
    vi.mocked(reserveGovernedProviderAttempt).mockReset();
    vi.mocked(loadProviderAttemptByExecutionId).mockReset();
  });

  it("6. READY_TO_POST + RESERVED/NOT_SENT enters posting_started handoff", async () => {
    const attempt = reservedAttempt();
    const { loadProviderAttemptByExecutionId } = await import(
      "../provider-attempt-repository"
    );
    vi.mocked(loadExactExecution)
      .mockResolvedValueOnce(readyExecution())
      .mockResolvedValueOnce(postingExecution());
    vi.mocked(loadProviderAttemptByExecutionId)
      .mockResolvedValueOnce(attempt)
      .mockResolvedValueOnce(attempt);
    vi.mocked(reserveGovernedProviderAttempt).mockResolvedValue({
      ok: true,
      attempt,
      execution: postingExecution(),
      reused: true,
      ledgerEventId: "ledger-posting-started",
      providerPostIssued: false,
    });

    const result = await establishGovernedPostingStartedHandoff({
      executionId: EXEC_ID,
      ctx,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.execution.status).toBe("POSTING");
    expect(result.attempt.status).toBe("RESERVED");
    expect(result.attempt.commit_certainty).toBe("NOT_SENT");
    expect(reserveGovernedProviderAttempt).toHaveBeenCalledWith(
      { executionId: EXEC_ID },
      ctx,
      expect.objectContaining({ publishPostingStarted: true }),
    );
  });

  it("7-8. posting_started leaves attempt RESERVED/NOT_SENT before dispatch", async () => {
    const attempt = reservedAttempt();
    const { loadProviderAttemptByExecutionId } = await import(
      "../provider-attempt-repository"
    );
    vi.mocked(loadExactExecution)
      .mockResolvedValueOnce(readyExecution())
      .mockResolvedValueOnce(postingExecution());
    vi.mocked(loadProviderAttemptByExecutionId)
      .mockResolvedValueOnce(attempt)
      .mockResolvedValueOnce(attempt);
    vi.mocked(reserveGovernedProviderAttempt).mockResolvedValue({
      ok: true,
      attempt,
      execution: postingExecution(),
      reused: true,
      ledgerEventId: "ledger-posting-started",
      providerPostIssued: false,
    });

    const result = await establishGovernedPostingStartedHandoff({
      executionId: EXEC_ID,
      ctx,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.postingStartedLedgerEventId).toBe("ledger-posting-started");
    expect(result.attempt.qbo_je_id).toBeNull();
    expect(result.attempt.request_started_at).toBeNull();
  });

  it("9. already POSTING reuses custody without second reserve publish", async () => {
    const attempt = reservedAttempt();
    const { loadProviderAttemptByExecutionId } = await import(
      "../provider-attempt-repository"
    );
    vi.mocked(loadExactExecution)
      .mockResolvedValueOnce(postingExecution())
      .mockResolvedValueOnce(postingExecution());
    vi.mocked(loadProviderAttemptByExecutionId)
      .mockResolvedValueOnce(attempt)
      .mockResolvedValueOnce(attempt);

    const result = await establishGovernedPostingStartedHandoff({
      executionId: EXEC_ID,
      ctx,
    });

    expect(result.ok).toBe(true);
    expect(reserveGovernedProviderAttempt).not.toHaveBeenCalled();
  });

  it("10. posting transition failure → zero provider POST path", async () => {
    const attempt = reservedAttempt();
    const { loadProviderAttemptByExecutionId } = await import(
      "../provider-attempt-repository"
    );
    vi.mocked(loadExactExecution).mockResolvedValue(readyExecution());
    vi.mocked(loadProviderAttemptByExecutionId).mockResolvedValue(attempt);
    vi.mocked(reserveGovernedProviderAttempt).mockResolvedValue({
      ok: false,
      code: "je_provider_attempt_ledger_failed",
      message: "posting_started failed",
    });

    const result = await establishGovernedPostingStartedHandoff({
      executionId: EXEC_ID,
      ctx,
    });

    expect(result.ok).toBe(false);
  });

  it("11. no second provider attempt — reserve reuses existing attempt id", async () => {
    const attempt = reservedAttempt();
    const { loadProviderAttemptByExecutionId } = await import(
      "../provider-attempt-repository"
    );
    vi.mocked(loadExactExecution)
      .mockResolvedValueOnce(readyExecution())
      .mockResolvedValueOnce(postingExecution());
    vi.mocked(loadProviderAttemptByExecutionId)
      .mockResolvedValueOnce(attempt)
      .mockResolvedValueOnce(attempt);
    vi.mocked(reserveGovernedProviderAttempt).mockResolvedValue({
      ok: true,
      attempt,
      execution: postingExecution(),
      reused: true,
      ledgerEventId: "ledger-1",
      providerPostIssued: false,
    });

    await establishGovernedPostingStartedHandoff({
      executionId: EXEC_ID,
      ctx,
    });

    expect(reserveGovernedProviderAttempt).toHaveBeenCalledTimes(1);
    expect(vi.mocked(reserveGovernedProviderAttempt).mock.calls[0]?.[0]).toEqual({
      executionId: EXEC_ID,
    });
  });
});

describe("company-scoped Patent #6 firm scope", () => {
  const prevEnv = process.env.QB_ENVIRONMENT;

  beforeEach(() => {
    process.env.QB_ENVIRONMENT = "sandbox";
  });

  afterEach(() => {
    process.env.QB_ENVIRONMENT = prevEnv;
  });

  it("13-15. company-scoped engagement firm_id NULL accepted; scope preserved on posting_started", async () => {
    vi.mocked(loadEngagementFirmId).mockResolvedValue(null);
    const deps = buildJe3dProductionCreateDeps();
    await expect(
      deps.loadFirmId(ENGAGEMENT_ID),
    ).resolves.toBeNull();

    const src = readFileSync(
      join(process.cwd(), "lib/journal-entry-governance/je3d-production-wiring.ts"),
      "utf8",
    );
    expect(src).toContain("loadFirmId: loadEngagementFirmId");
    expect(src).not.toContain("Engagement firm_id required");

    const repoSrc = readFileSync(
      join(process.cwd(), "lib/journal-entry-governance/provider-attempt-repository.ts"),
      "utf8",
    );
    expect(repoSrc).toContain("firmId: string | null");
    expect(repoSrc).toContain("p_firm_id: input.firmId");
  });

  it("16. firm-scoped wiring still uses loadEngagementFirmId without substitution", async () => {
    vi.mocked(loadEngagementFirmId).mockResolvedValue("11111111-1111-1111-1111-111111111111");
    const deps = buildJe3dProductionCreateDeps();
    await expect(deps.loadFirmId(ENGAGEMENT_ID)).resolves.toBe(
      "11111111-1111-1111-1111-111111111111",
    );
  });
});

describe("public create path wiring", () => {
  it("12. public create establishes posting_started before orchestration", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/journal-entry-governance/provider-create-service.ts"),
      "utf8",
    );
    expect(src).toContain("establishGovernedPostingStartedHandoff");
    expect(src).toMatch(
      /establishGovernedPostingStartedHandoff[\s\S]*runGovernedJournalEntryCreateOrchestration/,
    );
  });

  it("17. token failure before dispatch remains pre-POST in orchestration", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/journal-entry-governance/provider-create-orchestration.ts"),
      "utf8",
    );
    expect(src).toContain(
      "Resolve token before dispatch receipt so local token failure keeps NOT_SENT",
    );
    expect(src).toMatch(/if \(!token\)/);
    expect(src).toContain('execution.status !== "POSTING"');
  });
});
