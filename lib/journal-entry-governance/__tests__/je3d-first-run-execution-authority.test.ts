/**
 * JE-3D — First controlled sandbox JE execution authority tests.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hashProviderRequestPreview } from "../execution-hash";
import { mapGovernedProposalToQboPayload } from "../execution-payload";
import {
  isJe3dCreateCapabilityEnabled,
  isJe3dVerifyCapabilityEnabled,
} from "../je3d-activation-policy";
import { resolveJe3dActivationPolicy } from "../je3d-first-controlled-create-activation";
import {
  FIRST_RUN_JE_AMOUNT_CENTS,
  FIRST_RUN_JE_CURRENCY,
  type CoaMirrorAccountRow,
} from "../je3d-first-run-account-authority";
import {
  FIRST_RUN_EXECUTION_AUTHORITY_ERROR,
  FIRST_RUN_REASON_CODE,
  evaluateFirstRunCreateAuthority,
  evaluateFirstRunExecutionEconomicsGate,
  evaluateFirstRunExecutionIdentityGate,
} from "../je3d-first-run-execution-authority";
import { JE_MEMORY_PROJECTION_CONTRACT } from "../memory-projection-contract";
import type { JournalEntryExecutionRow } from "../execution-types";
import type { JournalEntryProposalRow } from "../types";

const EXPENSE = "exp-7";
const LIABILITY = "liab-33";
const EXEC_ID = "550e8400-e29b-41d4-a716-446655440000";

function mirrorRows(): CoaMirrorAccountRow[] {
  return [
    {
      accountId: EXPENSE,
      accountName: "Advertising",
      accountType: "Expense",
      accountSubtype: null,
      active: true,
    },
    {
      accountId: LIABILITY,
      accountName: "Accrued Liabilities",
      accountType: "Other Current Liability",
      accountSubtype: "OtherCurrentLiabilities",
      active: true,
    },
  ];
}

function proposal(
  over: Partial<JournalEntryProposalRow> = {},
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
    reason_code: FIRST_RUN_REASON_CODE,
    memo: "first run",
    currency: FIRST_RUN_JE_CURRENCY,
    txn_date: "2026-08-31",
    lines: [
      {
        sequence: 1,
        accountId: EXPENSE,
        debitCents: FIRST_RUN_JE_AMOUNT_CENTS,
        creditCents: 0,
      },
      {
        sequence: 2,
        accountId: LIABILITY,
        debitCents: 0,
        creditCents: FIRST_RUN_JE_AMOUNT_CENTS,
      },
    ],
    total_debits_cents: FIRST_RUN_JE_AMOUNT_CENTS,
    total_credits_cents: FIRST_RUN_JE_AMOUNT_CENTS,
    expected_effects: [],
    policy_snapshot: {},
    policy_hash: "a".repeat(64),
    proposal_hash: "b".repeat(64),
    status: "SUBMITTED",
    proposed_by: "user-proposer",
    proposed_at: "2026-08-15T00:00:00.000Z",
    idempotency_key: "c".repeat(64),
    ...over,
  };
}

function execution(
  over: Partial<JournalEntryExecutionRow> = {},
): JournalEntryExecutionRow {
  const p = proposal();
  const marker = `ADVJE:${EXEC_ID}`;
  const providerRequestHash = hashProviderRequestPreview(
    mapGovernedProposalToQboPayload({
      proposal: p,
      correlationMarker: marker,
    }) as unknown as Record<string, unknown>,
  );
  return {
    id: EXEC_ID,
    proposal_id: p.id,
    approval_id: "appr-1",
    company_id: p.company_id,
    engagement_id: p.engagement_id,
    firm_client_id: p.firm_client_id,
    source_continuous_close_run_id: p.source_continuous_close_run_id,
    source_accounting_sync_id: p.source_accounting_sync_id,
    accounting_connection_id: "conn-1",
    provider: "quickbooks",
    proposal_hash: p.proposal_hash,
    approval_policy_hash: "d".repeat(64),
    execution_policy_hash: "e".repeat(64),
    execution_hash: "f".repeat(64),
    idempotency_key: "g".repeat(64),
    status: "POSTING",
    correlation_marker: marker,
    execution_policy_snapshot: {},
    preflight_result: { eligible: true, checks: [] },
    requested_by: "user-executor",
    requested_at: "2026-08-15T00:00:00.000Z",
    state_version: 1,
    provider_journal_id: null,
    provider_request_hash: providerRequestHash,
    provider_response_hash: null,
    provider_readback_hash: null,
    last_error_code: null,
    last_error_message: null,
    ...over,
  };
}

const approvedIdentity = {
  approvedExecutionId: EXEC_ID,
  executionReviewedAndApproved: true,
};

const approvedAccountEvidence = {
  expenseAccountId: EXPENSE,
  accruedLiabilityAccountId: LIABILITY,
  accountsReviewedAndApproved: true,
};

describe("JE-3D first-run execution authority", () => {
  it("1. CREATE ON + approved execution ID null → no POST path", () => {
    const result = evaluateFirstRunExecutionIdentityGate(EXEC_ID, {
      approvedExecutionId: null,
      executionReviewedAndApproved: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(
      FIRST_RUN_EXECUTION_AUTHORITY_ERROR.EXECUTION_ID_NOT_SET,
    );
  });

  it("2. CREATE ON + approval flag false → no POST path", () => {
    const result = evaluateFirstRunExecutionIdentityGate(EXEC_ID, {
      approvedExecutionId: EXEC_ID,
      executionReviewedAndApproved: false,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(
      FIRST_RUN_EXECUTION_AUTHORITY_ERROR.EXECUTION_REVIEW_REQUIRED,
    );
  });

  it("3. wrong execution ID → rejected", () => {
    const result = evaluateFirstRunExecutionIdentityGate("other-exec", approvedIdentity);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(
      FIRST_RUN_EXECUTION_AUTHORITY_ERROR.EXECUTION_ID_MISMATCH,
    );
  });

  it("4. exact approved execution ID passes identity gate", () => {
    expect(evaluateFirstRunExecutionIdentityGate(EXEC_ID, approvedIdentity).ok).toBe(
      true,
    );
  });

  it("5. different Demo A POSTING execution → rejected by identity gate", () => {
    const other = evaluateFirstRunExecutionIdentityGate(
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      approvedIdentity,
    );
    expect(other.ok).toBe(false);
  });

  it("6. exact execution but proposal account mismatch → rejected", () => {
    const result = evaluateFirstRunExecutionEconomicsGate({
      proposal: proposal({
        lines: [
          {
            sequence: 1,
            accountId: "wrong-exp",
            debitCents: FIRST_RUN_JE_AMOUNT_CENTS,
            creditCents: 0,
          },
          {
            sequence: 2,
            accountId: LIABILITY,
            debitCents: 0,
            creditCents: FIRST_RUN_JE_AMOUNT_CENTS,
          },
        ],
      }),
      execution: execution(),
      mirrorRows: mirrorRows(),
      accountEvidence: approvedAccountEvidence,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(
      FIRST_RUN_EXECUTION_AUTHORITY_ERROR.ECONOMICS_ACCOUNT_MISMATCH,
    );
  });

  it("7. exact execution but amount != 100 cents → rejected", () => {
    const result = evaluateFirstRunExecutionEconomicsGate({
      proposal: proposal({ total_debits_cents: 200, total_credits_cents: 200 }),
      execution: execution(),
      mirrorRows: mirrorRows(),
      accountEvidence: approvedAccountEvidence,
    });
    expect(result.ok).toBe(false);
  });

  it("8. exact execution but currency != USD → rejected", () => {
    const result = evaluateFirstRunExecutionEconomicsGate({
      proposal: proposal({ currency: "CAD" }),
      execution: execution(),
      mirrorRows: mirrorRows(),
      accountEvidence: approvedAccountEvidence,
    });
    expect(result.ok).toBe(false);
  });

  it("9. approved account becomes inactive → rejected", () => {
    const result = evaluateFirstRunExecutionEconomicsGate({
      proposal: proposal(),
      execution: execution(),
      mirrorRows: mirrorRows().map((row) =>
        row.accountId === EXPENSE ? { ...row, active: false } : row,
      ),
      accountEvidence: approvedAccountEvidence,
    });
    expect(result.ok).toBe(false);
  });

  it("10. approved account becomes prohibited → rejected", () => {
    const result = evaluateFirstRunExecutionEconomicsGate({
      proposal: proposal({
        lines: [
          {
            sequence: 1,
            accountId: "bank-1",
            debitCents: FIRST_RUN_JE_AMOUNT_CENTS,
            creditCents: 0,
          },
          {
            sequence: 2,
            accountId: LIABILITY,
            debitCents: 0,
            creditCents: FIRST_RUN_JE_AMOUNT_CENTS,
          },
        ],
      }),
      execution: execution(),
      mirrorRows: [
        {
          accountId: "bank-1",
          accountName: "Checking",
          accountType: "Bank",
          accountSubtype: null,
          active: true,
        },
        mirrorRows()[1]!,
      ],
      accountEvidence: {
        expenseAccountId: "bank-1",
        accruedLiabilityAccountId: LIABILITY,
        accountsReviewedAndApproved: true,
      },
    });
    expect(result.ok).toBe(false);
  });

  it("11. provider_request_hash mismatch → rejected", () => {
    const result = evaluateFirstRunExecutionEconomicsGate({
      proposal: proposal(),
      execution: execution({ provider_request_hash: "f".repeat(64) }),
      mirrorRows: mirrorRows(),
      accountEvidence: approvedAccountEvidence,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(
      FIRST_RUN_EXECUTION_AUTHORITY_ERROR.PROVIDER_REQUEST_HASH_MISMATCH,
    );
  });

  it("12. exact staged custody still no POST until execution approval is set", () => {
    const createSrc = readFileSync(
      join(process.cwd(), "lib/journal-entry-governance/provider-create-service.ts"),
      "utf8",
    );
    expect(createSrc).toContain("evaluateFirstRunCreateAuthority");
    expect(
      evaluateFirstRunCreateAuthority({
        executionId: EXEC_ID,
        execution: execution(),
        proposal: proposal(),
        mirrorRows: mirrorRows(),
        identityEvidence: {
          approvedExecutionId: EXEC_ID,
          executionReviewedAndApproved: false,
        },
      }).ok,
    ).toBe(false);
  });

  it("13. VERIFY remains OFF", () => {
    expect(isJe3dVerifyCapabilityEnabled(resolveJe3dActivationPolicy())).toBe(false);
  });

  it("14. no Memory", () => {
    expect(resolveJe3dActivationPolicy().memoryWriteAllowed).toBe(false);
    expect(JE_MEMORY_PROJECTION_CONTRACT.je3cWritesMemory).toBe(false);
  });

  it("15. no worker", () => {
    expect(resolveJe3dActivationPolicy().workerAllowed).toBe(false);
  });

  it("16. no GOVERNED_AUTO", () => {
    expect(resolveJe3dActivationPolicy().governedAutoAllowed).toBe(false);
  });

  it("valid exact execution + economics passes combined gate", () => {
    const result = evaluateFirstRunCreateAuthority({
      executionId: EXEC_ID,
      execution: execution(),
      proposal: proposal(),
      mirrorRows: mirrorRows(),
      identityEvidence: approvedIdentity,
      accountEvidence: approvedAccountEvidence,
    });
    expect(result.ok).toBe(true);
  });

  it("CREATE capability OFF in prep; identity gate still required when CREATE later enabled", () => {
    expect(isJe3dCreateCapabilityEnabled(resolveJe3dActivationPolicy())).toBe(false);
    expect(
      evaluateFirstRunCreateAuthority({
        executionId: EXEC_ID,
        execution: execution(),
        proposal: proposal(),
        mirrorRows: mirrorRows(),
      }).ok,
    ).toBe(false);
  });
});

describe("JE-3D first-run account approval custody", () => {
  it("1. both valid account IDs + accountsReviewedAndApproved=false → deny", () => {
    const result = evaluateFirstRunExecutionEconomicsGate({
      proposal: proposal(),
      execution: execution(),
      mirrorRows: mirrorRows(),
      accountEvidence: {
        expenseAccountId: EXPENSE,
        accruedLiabilityAccountId: LIABILITY,
        accountsReviewedAndApproved: false,
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(
      FIRST_RUN_EXECUTION_AUTHORITY_ERROR.ECONOMICS_ACCOUNT_AUTHORITY_FAILED,
    );
    expect(result.message).toContain("FIRST_RUN_ACCOUNTS_REVIEWED_AND_APPROVED");
  });

  it("2. both valid account IDs + accountsReviewedAndApproved=true → account authority may pass", () => {
    const result = evaluateFirstRunExecutionEconomicsGate({
      proposal: proposal(),
      execution: execution(),
      mirrorRows: mirrorRows(),
      accountEvidence: approvedAccountEvidence,
    });
    expect(result.ok).toBe(true);
  });

  it("3. matching execution approval + account review false → full create authority denies", () => {
    const result = evaluateFirstRunCreateAuthority({
      executionId: EXEC_ID,
      execution: execution(),
      proposal: proposal(),
      mirrorRows: mirrorRows(),
      identityEvidence: approvedIdentity,
      accountEvidence: {
        expenseAccountId: EXPENSE,
        accruedLiabilityAccountId: LIABILITY,
        accountsReviewedAndApproved: false,
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(
      FIRST_RUN_EXECUTION_AUTHORITY_ERROR.ECONOMICS_ACCOUNT_AUTHORITY_FAILED,
    );
  });

  it("7. test-injected account evidence false cannot be silently overridden", () => {
    const src = readFileSync(
      join(
        process.cwd(),
        "lib/journal-entry-governance/je3d-first-run-execution-authority.ts",
      ),
      "utf8",
    );
    expect(src).toContain("resolveFirstRunExplicitAccountEvidence()");
    expect(src).not.toMatch(/accountsReviewedAndApproved:\s*true/);
    const result = evaluateFirstRunExecutionEconomicsGate({
      proposal: proposal(),
      execution: execution(),
      mirrorRows: mirrorRows(),
      accountEvidence: {
        expenseAccountId: EXPENSE,
        accruedLiabilityAccountId: LIABILITY,
        accountsReviewedAndApproved: false,
      },
    });
    expect(result.ok).toBe(false);
  });

  it("8. account evidence true still requires mirror rows active/eligible", () => {
    const result = evaluateFirstRunExecutionEconomicsGate({
      proposal: proposal(),
      execution: execution(),
      mirrorRows: mirrorRows().map((row) =>
        row.accountId === EXPENSE ? { ...row, active: false } : row,
      ),
      accountEvidence: approvedAccountEvidence,
    });
    expect(result.ok).toBe(false);
  });

  it("9. missing account ID still fails", () => {
    const result = evaluateFirstRunExecutionEconomicsGate({
      proposal: proposal(),
      execution: execution(),
      mirrorRows: mirrorRows(),
      accountEvidence: {
        expenseAccountId: null,
        accruedLiabilityAccountId: LIABILITY,
        accountsReviewedAndApproved: true,
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe(
      FIRST_RUN_EXECUTION_AUTHORITY_ERROR.ECONOMICS_ACCOUNT_MISMATCH,
    );
  });

  it("10. prohibited/control account still fails regardless of approval=true", () => {
    const result = evaluateFirstRunExecutionEconomicsGate({
      proposal: proposal({
        lines: [
          {
            sequence: 1,
            accountId: "bank-1",
            debitCents: FIRST_RUN_JE_AMOUNT_CENTS,
            creditCents: 0,
          },
          {
            sequence: 2,
            accountId: LIABILITY,
            debitCents: 0,
            creditCents: FIRST_RUN_JE_AMOUNT_CENTS,
          },
        ],
      }),
      execution: execution(),
      mirrorRows: [
        {
          accountId: "bank-1",
          accountName: "Checking",
          accountType: "Bank",
          accountSubtype: null,
          active: true,
        },
        mirrorRows()[1]!,
      ],
      accountEvidence: {
        expenseAccountId: "bank-1",
        accruedLiabilityAccountId: LIABILITY,
        accountsReviewedAndApproved: true,
      },
    });
    expect(result.ok).toBe(false);
  });
});

describe("JE-3D staging human approval regression", () => {
  it("staging cannot synthesize human approval via decideJournalEntryProposal", () => {
    const src = readFileSync(
      join(process.cwd(), "scripts/je3d/stage-first-controlled-create-pre-dispatch.ts"),
      "utf8",
    );
    expect(src).not.toContain("decideJournalEntryProposal");
    expect(src).toContain("human_approval_required");
    expect(src).toContain("human_approval_synthesis_forbidden");
    expect(src).toContain("loadHumanApprovedApprovalForProposal");
  });
});
