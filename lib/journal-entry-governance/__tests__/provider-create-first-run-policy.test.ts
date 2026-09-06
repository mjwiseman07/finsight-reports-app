/**
 * JE-3D — Public create policy wiring + first-run authority surface tests.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  JE_3D_ACTIVATION_POLICY,
  JE_3D_ACTIVATION_ERROR,
  isJe3dCreateCapabilityEnabled,
  isJe3dVerifyCapabilityEnabled,
  type Je3dActivationPolicyView,
} from "../je3d-activation-policy";
import {
  JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY,
  resolveJe3dActivationPolicy,
} from "../je3d-first-controlled-create-activation";
import {
  FIRST_RUN_APPROVED_EXECUTION_ID,
  FIRST_RUN_EXECUTION_AUTHORITY_ERROR,
  FIRST_RUN_EXECUTION_REVIEWED_AND_APPROVED,
  evaluateFirstRunExecutionIdentityGate,
} from "../je3d-first-run-execution-authority";
import { executeGovernedJournalEntryCreate } from "../provider-create-service";
import type { JournalEntryExecutionRow } from "../execution-types";
import type { JournalEntryProposalRow } from "../types";

const EXEC_ID = "08bbbd62-8c4e-4463-b96e-2bd8bfdce603";
const USER = "user-1";

/** Path tests that exercise post-CREATE gates inject CREATE ON + kill OFF. */
function createEnabledPathPolicy(): Je3dActivationPolicyView {
  return {
    ...JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY,
    capabilities: {
      CREATE_SANDBOX_JE: true,
      VERIFY_SANDBOX_JE: false,
      PREPARE_SANDBOX_JE: false,
    },
    sandboxDispatchKillSwitch: false,
  };
}

vi.mock("../je3d-first-controlled-create-activation", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("../je3d-first-controlled-create-activation")
    >();
  return {
    ...actual,
    resolveJe3dActivationPolicy: vi.fn(() =>
      actual.JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY,
    ),
  };
});

vi.mock("../provider-attempt-service", () => ({
  loadExactExecution: vi.fn(),
}));

vi.mock("../approval-custody", () => ({
  loadExactJournalEntryProposal: vi.fn(),
}));

vi.mock("../source-custody", () => ({
  loadAccountsFromCoaMirror: vi.fn(),
}));

vi.mock("../je3d-activation-guards", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../je3d-activation-guards")>();
  return {
    ...actual,
    assertJe3dSandboxExecutionCustody: vi.fn(async () => ({
      allowlistResolution: "resolved",
      allowedCompanyIds: ["co-1"],
      demoA: null,
    })),
  };
});

vi.mock("../provider-create-posting-handoff", () => ({
  establishGovernedPostingStartedHandoff: vi.fn(),
}));

vi.mock("../provider-create-orchestration", () => ({
  runGovernedJournalEntryCreateOrchestration: vi.fn(),
}));

vi.mock("../je3d-production-wiring", () => ({
  buildJe3dProductionCreateDeps: vi.fn(() => ({})),
}));

import { loadExactExecution } from "../provider-attempt-service";
import { loadExactJournalEntryProposal } from "../approval-custody";
import { loadAccountsFromCoaMirror } from "../source-custody";
import { runGovernedJournalEntryCreateOrchestration } from "../provider-create-orchestration";
import { establishGovernedPostingStartedHandoff } from "../provider-create-posting-handoff";

function baseExecution(
  overrides: Partial<JournalEntryExecutionRow> = {},
): JournalEntryExecutionRow {
  return {
    id: EXEC_ID,
    proposal_id: "prop-1",
    approval_id: "appr-1",
    company_id: "co-1",
    engagement_id: "eng-1",
    firm_client_id: "fc-1",
    source_continuous_close_run_id: "cc-1",
    source_accounting_sync_id: "sync-1",
    accounting_connection_id: "conn-1",
    provider: "quickbooks",
    proposal_hash: "a".repeat(64),
    approval_policy_hash: "b".repeat(64),
    execution_policy_hash: "c".repeat(64),
    execution_hash: "d".repeat(64),
    idempotency_key: "e".repeat(64),
    status: "POSTING",
    correlation_marker: `ADVJE:${EXEC_ID}`,
    execution_policy_snapshot: {},
    preflight_result: { eligible: true, checks: [] },
    requested_by: USER,
    requested_at: "2026-08-15T00:00:00.000Z",
    state_version: 1,
    provider_journal_id: null,
    provider_request_hash: "f".repeat(64),
    provider_response_hash: null,
    provider_readback_hash: null,
    last_error_code: null,
    last_error_message: null,
    ...overrides,
  };
}

function baseProposal(
  overrides: Partial<JournalEntryProposalRow> = {},
): JournalEntryProposalRow {
  return {
    id: "prop-1",
    company_id: "co-1",
    engagement_id: "eng-1",
    firm_client_id: "fc-1",
    period_end: "2026-08-31",
    source_continuous_close_run_id: "cc-1",
    source_accounting_sync_id: "sync-1",
    source_recon_run_ids: [],
    origin_type: "ACCRUAL",
    reason_code: "cutoff_accrual",
    memo: "first run",
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
    policy_hash: "a".repeat(64),
    proposal_hash: "b".repeat(64),
    status: "SUBMITTED",
    proposed_by: USER,
    proposed_at: "2026-08-15T00:00:00.000Z",
    idempotency_key: "c".repeat(64),
    ...overrides,
  };
}

describe("JE-3D public create policy wiring", () => {
  const prevEnv = process.env.QB_ENVIRONMENT;

  beforeEach(() => {
    process.env.QB_ENVIRONMENT = "sandbox";
    vi.mocked(resolveJe3dActivationPolicy).mockImplementation(
      () => JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY,
    );
    vi.mocked(loadExactExecution).mockReset();
    vi.mocked(loadExactJournalEntryProposal).mockReset();
    vi.mocked(loadAccountsFromCoaMirror).mockReset();
    vi.mocked(runGovernedJournalEntryCreateOrchestration).mockReset();
  });

  afterEach(() => {
    process.env.QB_ENVIRONMENT = prevEnv;
  });

  it("1. base JE_3D_ACTIVATION_POLICY remains CREATE=false", () => {
    expect(isJe3dCreateCapabilityEnabled(JE_3D_ACTIVATION_POLICY)).toBe(false);
  });

  it("2. effective policy has CREATE=false, VERIFY=false, kill switch ON", () => {
    const policy = resolveJe3dActivationPolicy();
    expect(policy).toEqual(JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY);
    expect(isJe3dCreateCapabilityEnabled(policy)).toBe(false);
    expect(isJe3dVerifyCapabilityEnabled(policy)).toBe(false);
    expect(policy.sandboxDispatchKillSwitch).toBe(true);
    expect(FIRST_RUN_APPROVED_EXECUTION_ID).toBe(EXEC_ID);
    expect(FIRST_RUN_EXECUTION_REVIEWED_AND_APPROVED).toBe(true);
  });

  it("2b. kill switch can still block when forced ON", async () => {
    vi.mocked(resolveJe3dActivationPolicy).mockReturnValueOnce({
      ...JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY,
      capabilities: {
        CREATE_SANDBOX_JE: true,
        VERIFY_SANDBOX_JE: false,
        PREPARE_SANDBOX_JE: false,
      },
      sandboxDispatchKillSwitch: true,
    });
    await expect(
      executeGovernedJournalEntryCreate(
        { executionId: EXEC_ID },
        { principal: { type: "user", userId: USER } },
      ),
    ).rejects.toMatchObject({
      code: JE_3D_ACTIVATION_ERROR.KILL_SWITCH_ACTIVE,
    });
    expect(runGovernedJournalEntryCreateOrchestration).not.toHaveBeenCalled();
  });

  it("3. public create uses effective policy for capability guard (single snapshot)", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/journal-entry-governance/provider-create-service.ts"),
      "utf8",
    );
    expect(src).toContain("const activationPolicy = resolveJe3dActivationPolicy();");
    expect(src).toContain("assertJe3dCreateActivationPolicy(activationPolicy)");
    expect(src).toContain("policy: activationPolicy");
    expect(src).not.toMatch(/assertJe3dCreateActivationPolicy\(\s*\)/);
    expect((src.match(/resolveJe3dActivationPolicy\(\)/g) || []).length).toBe(1);
  });

  it("4. CREATE=true + approvedExecutionId=null → fails before orchestration", async () => {
    vi.mocked(resolveJe3dActivationPolicy).mockReturnValue(
      createEnabledPathPolicy(),
    );
    expect(
      evaluateFirstRunExecutionIdentityGate(EXEC_ID, {
        stagedExecutionId: null,
        approvedExecutionId: null,
        executionReviewedAndApproved: true,
      }),
    ).toMatchObject({
      ok: false,
      code: FIRST_RUN_EXECUTION_AUTHORITY_ERROR.EXECUTION_ID_NOT_SET,
    });

    const authority = await import("../je3d-first-run-execution-authority");
    const authoritySpy = vi
      .spyOn(authority, "evaluateFirstRunCreateAuthority")
      .mockReturnValue({
        ok: false,
        code: FIRST_RUN_EXECUTION_AUTHORITY_ERROR.EXECUTION_ID_NOT_SET,
        message: "not set",
      });

    vi.mocked(loadExactExecution).mockResolvedValue(baseExecution());
    vi.mocked(loadExactJournalEntryProposal).mockResolvedValue(baseProposal());
    vi.mocked(loadAccountsFromCoaMirror).mockResolvedValue(
      new Map([
        [
          "15",
          {
            accountId: "15",
            accountType: "Expense",
            accountSubtype: null,
            active: true,
            name: "Advertising",
          },
        ],
        [
          "1150040002",
          {
            accountId: "1150040002",
            accountType: "Other Current Liability",
            accountSubtype: null,
            active: true,
            name: "Accrued Liabilities",
          },
        ],
      ]),
    );

    const result = await executeGovernedJournalEntryCreate(
      { executionId: EXEC_ID },
      { principal: { type: "user", userId: USER } },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.providerPostIssued).toBe(false);
    expect(result.code).toBe(
      FIRST_RUN_EXECUTION_AUTHORITY_ERROR.EXECUTION_ID_NOT_SET,
    );
    expect(runGovernedJournalEntryCreateOrchestration).not.toHaveBeenCalled();
    expect(establishGovernedPostingStartedHandoff).not.toHaveBeenCalled();
    authoritySpy.mockRestore();
  });

  it("5. CREATE=true + review flag=false → no POST", async () => {
    vi.mocked(resolveJe3dActivationPolicy).mockReturnValue(
      createEnabledPathPolicy(),
    );
    expect(
      evaluateFirstRunExecutionIdentityGate(EXEC_ID, {
        stagedExecutionId: EXEC_ID,
        approvedExecutionId: EXEC_ID,
        executionReviewedAndApproved: false,
      }),
    ).toMatchObject({
      ok: false,
      code: FIRST_RUN_EXECUTION_AUTHORITY_ERROR.EXECUTION_REVIEW_REQUIRED,
    });

    const authority = await import("../je3d-first-run-execution-authority");
    const authoritySpy = vi
      .spyOn(authority, "evaluateFirstRunCreateAuthority")
      .mockReturnValue({
        ok: false,
        code: FIRST_RUN_EXECUTION_AUTHORITY_ERROR.EXECUTION_REVIEW_REQUIRED,
        message: "review required",
      });

    vi.mocked(loadExactExecution).mockResolvedValue(baseExecution());
    vi.mocked(loadExactJournalEntryProposal).mockResolvedValue(baseProposal());
    vi.mocked(loadAccountsFromCoaMirror).mockResolvedValue(new Map());

    const result = await executeGovernedJournalEntryCreate(
      { executionId: EXEC_ID },
      { principal: { type: "user", userId: USER } },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.providerPostIssued).toBe(false);
    expect(result.code).toBe(
      FIRST_RUN_EXECUTION_AUTHORITY_ERROR.EXECUTION_REVIEW_REQUIRED,
    );
    expect(runGovernedJournalEntryCreateOrchestration).not.toHaveBeenCalled();
    expect(establishGovernedPostingStartedHandoff).not.toHaveBeenCalled();
    authoritySpy.mockRestore();
  });

  it("6. CREATE=true + wrong execution ID → fails", async () => {
    vi.mocked(resolveJe3dActivationPolicy).mockReturnValue(
      createEnabledPathPolicy(),
    );
    expect(
      evaluateFirstRunExecutionIdentityGate("wrong-exec-id", {
        stagedExecutionId: EXEC_ID,
        executionReviewedAndApproved: true,
      }),
    ).toMatchObject({
      ok: false,
      code: FIRST_RUN_EXECUTION_AUTHORITY_ERROR.EXECUTION_ID_MISMATCH,
    });

    const authority = await import("../je3d-first-run-execution-authority");
    const originalCreateAuthority = authority.evaluateFirstRunCreateAuthority;
    const authoritySpy = vi
      .spyOn(authority, "evaluateFirstRunCreateAuthority")
      .mockImplementation((args) =>
        originalCreateAuthority({
          ...args,
          identityEvidence: {
            stagedExecutionId: EXEC_ID,
            executionReviewedAndApproved: true,
          },
          accountEvidence: {
            expenseAccountId: "15",
            accruedLiabilityAccountId: "1150040002",
            accountsReviewedAndApproved: true,
          },
        }),
      );

    vi.mocked(loadExactExecution).mockResolvedValue(
      baseExecution({ id: "wrong-exec-id" }),
    );
    vi.mocked(loadExactJournalEntryProposal).mockResolvedValue(baseProposal());
    vi.mocked(loadAccountsFromCoaMirror).mockResolvedValue(new Map());

    const result = await executeGovernedJournalEntryCreate(
      { executionId: "wrong-exec-id" },
      { principal: { type: "user", userId: USER } },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.providerPostIssued).toBe(false);
    expect(result.code).toBe(
      FIRST_RUN_EXECUTION_AUTHORITY_ERROR.EXECUTION_ID_MISMATCH,
    );
    expect(runGovernedJournalEntryCreateOrchestration).not.toHaveBeenCalled();
    authoritySpy.mockRestore();
  });

  it("7. CREATE=true + invalid economics → fails", async () => {
    vi.mocked(resolveJe3dActivationPolicy).mockReturnValue(
      createEnabledPathPolicy(),
    );
    vi.mocked(loadExactExecution).mockResolvedValue(baseExecution());
    vi.mocked(loadExactJournalEntryProposal).mockResolvedValue(
      baseProposal({ currency: "CAD" }),
    );
    vi.mocked(loadAccountsFromCoaMirror).mockResolvedValue(
      new Map([
        [
          "15",
          {
            accountId: "15",
            accountType: "Expense",
            accountSubtype: null,
            active: true,
          },
        ],
        [
          "1150040002",
          {
            accountId: "1150040002",
            accountType: "Other Current Liability",
            accountSubtype: null,
            active: true,
          },
        ],
      ]),
    );

    const result = await executeGovernedJournalEntryCreate(
      { executionId: EXEC_ID },
      { principal: { type: "user", userId: USER } },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.providerPostIssued).toBe(false);
    expect(runGovernedJournalEntryCreateOrchestration).not.toHaveBeenCalled();
  });

  it("8. mocked orchestration receives at most one POST when first-run authority passes", async () => {
    vi.mocked(resolveJe3dActivationPolicy).mockReturnValue(
      createEnabledPathPolicy(),
    );
    const authority = await import("../je3d-first-run-execution-authority");
    const evaluateSpy = vi
      .spyOn(authority, "evaluateFirstRunCreateAuthority")
      .mockReturnValue({ ok: true });

    vi.mocked(loadExactExecution).mockResolvedValue(baseExecution());
    vi.mocked(loadExactJournalEntryProposal).mockResolvedValue(baseProposal());
    vi.mocked(loadAccountsFromCoaMirror).mockResolvedValue(new Map());
    vi.mocked(establishGovernedPostingStartedHandoff).mockResolvedValue({
      ok: true,
      execution: baseExecution(),
      attempt: {
        id: "attempt-1",
        execution_id: EXEC_ID,
        accounting_connection_id: "conn-1",
        provider: "quickbooks",
        provider_request_hash: "f".repeat(64),
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
      },
      postingStartedLedgerEventId: "ledger-1",
    });
    vi.mocked(runGovernedJournalEntryCreateOrchestration).mockResolvedValue({
      ok: true,
      gated: false,
      providerPostIssued: true,
      memoryWritten: false,
      discoveryRequired: false,
      attempt: {} as never,
      execution: baseExecution(),
      outcome: {} as never,
      transport: { postAttempts: 1 } as never,
      dispatchLedgerEventId: null,
      terminalLedgerEventId: null,
    });

    const result = await executeGovernedJournalEntryCreate(
      { executionId: EXEC_ID },
      { principal: { type: "user", userId: USER } },
    );

    expect(result.ok).toBe(true);
    expect(establishGovernedPostingStartedHandoff).toHaveBeenCalledTimes(1);
    expect(runGovernedJournalEntryCreateOrchestration).toHaveBeenCalledTimes(1);
    evaluateSpy.mockRestore();
  });

  it("9. VERIFY remains OFF throughout", () => {
    expect(isJe3dVerifyCapabilityEnabled(resolveJe3dActivationPolicy())).toBe(
      false,
    );
  });

  it("10. no caller can inject an alternative policy into public create", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/journal-entry-governance/provider-create-service.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/assertJe3dCreateActivationPolicy\([^)]*input/);
    expect(src).not.toContain("policy?:");
    expect(src).not.toContain("activationPolicy?:");
  });
});

describe("JE-3D public create account approval custody", () => {
  const prevEnv = process.env.QB_ENVIRONMENT;

  beforeEach(() => {
    process.env.QB_ENVIRONMENT = "sandbox";
    vi.mocked(resolveJe3dActivationPolicy).mockImplementation(
      () => JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY,
    );
    vi.mocked(loadExactExecution).mockReset();
    vi.mocked(loadExactJournalEntryProposal).mockReset();
    vi.mocked(loadAccountsFromCoaMirror).mockReset();
    vi.mocked(runGovernedJournalEntryCreateOrchestration).mockReset();
  });

  afterEach(() => {
    process.env.QB_ENVIRONMENT = prevEnv;
  });

  const mirrorMap = () =>
    new Map([
      [
        "15",
        {
          accountId: "15",
          accountType: "Expense",
          accountSubtype: null,
          active: true,
          name: "Advertising",
        },
      ],
      [
        "1150040002",
        {
          accountId: "1150040002",
          accountType: "Other Current Liability",
          accountSubtype: null,
          active: true,
          name: "Accrued Liabilities",
        },
      ],
    ]);

  async function runCreateWithUnreviewedAccounts() {
    vi.mocked(resolveJe3dActivationPolicy).mockReturnValue(
      createEnabledPathPolicy(),
    );
    const authority = await import("../je3d-first-run-execution-authority");
    const authoritySpy = vi
      .spyOn(authority, "evaluateFirstRunCreateAuthority")
      .mockImplementation((args) => {
        const identity = authority.evaluateFirstRunExecutionIdentityGate(
          args.executionId,
          {
            stagedExecutionId: EXEC_ID,
            approvedExecutionId: EXEC_ID,
            executionReviewedAndApproved: true,
          },
        );
        if (!identity.ok) return identity;
        return authority.evaluateFirstRunExecutionEconomicsGate({
          proposal: args.proposal,
          execution: args.execution,
          mirrorRows: args.mirrorRows,
          accountEvidence: {
            expenseAccountId: "15",
            accruedLiabilityAccountId: "1150040002",
            accountsReviewedAndApproved: false,
          },
        });
      });

    vi.mocked(loadExactExecution).mockResolvedValue(baseExecution());
    vi.mocked(loadExactJournalEntryProposal).mockResolvedValue(baseProposal());
    vi.mocked(loadAccountsFromCoaMirror).mockResolvedValue(mirrorMap());

    const result = await executeGovernedJournalEntryCreate(
      { executionId: EXEC_ID },
      { principal: { type: "user", userId: USER } },
    );

    authoritySpy.mockRestore();
    return result;
  }

  it("4. public create blocked when account review false", async () => {
    const result = await runCreateWithUnreviewedAccounts();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.providerPostIssued).toBe(false);
    expect(result.code).toBe(
      FIRST_RUN_EXECUTION_AUTHORITY_ERROR.ECONOMICS_ACCOUNT_AUTHORITY_FAILED,
    );
    expect(runGovernedJournalEntryCreateOrchestration).not.toHaveBeenCalled();
  });

  it("5. no dispatch repository path when account review false", async () => {
    await runCreateWithUnreviewedAccounts();
    expect(runGovernedJournalEntryCreateOrchestration).not.toHaveBeenCalled();
  });

  it("6. no postOnce path when account review false", async () => {
    await runCreateWithUnreviewedAccounts();
    expect(runGovernedJournalEntryCreateOrchestration).not.toHaveBeenCalled();
  });
});

