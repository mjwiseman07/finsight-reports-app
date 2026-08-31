import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { legacyPost, legacyReverse } = vi.hoisted(() => ({
  legacyPost: vi.fn(),
  legacyReverse: vi.fn(),
}));

vi.mock("@/lib/erp/quickbooks/journal-entry-poster", () => ({
  qboJournalEntryPoster: {
    post: legacyPost,
    reverse: legacyReverse,
  },
}));

import {
  LEGACY_PRODUCTION_JE_BLOCK_REASON,
  legacyJournalEntryPostingService,
} from "@/lib/erp/quickbooks/legacy-je-posting-service";
import {
  PRODUCTION_JE_ACTIVATION_POLICY,
  ProductionJeActivationError,
  assertProductionJeActivation,
  assertProductionJeActivationWhenApplicable,
} from "../production-activation-policy";
import {
  VerifiedJeProjectionError,
  projectVerifiedJournalEntryToMemory,
  projectVerifiedJournalEntryToMemoryForTests,
  type VerifiedJeProjectionHarness,
} from "../verified-memory-projection";
import { getProductionJeExceptionDisposition } from "../production-exception-operations";
import {
  PRODUCTION_JE_WORKFLOW_POLICY,
  ProductionJeWorkflowError,
  assertProductionWorkflowGoverned,
  assertProductionWorkflowGovernedWhenApplicable,
} from "../production-workflow-policy";
import type { JournalEntryExecutionRow } from "../execution-types";

const root = process.cwd();

function validActivationInput() {
  return {
    capability: "CREATE_PRODUCTION_JE" as const,
    companyId: "company-1",
    accountingConnectionId: "connection-1",
    realmId: "realm-1",
    provider: "quickbooks",
    providerEnvironment: "production",
    totalDebitsCents: 100,
    qboEnvironment: "production",
  };
}

function verifiedExecution(
  overrides: Partial<JournalEntryExecutionRow> = {},
): JournalEntryExecutionRow {
  return {
    id: "exec-1",
    proposal_id: "prop-1",
    approval_id: "appr-1",
    company_id: "company-1",
    engagement_id: "eng-1",
    firm_client_id: "fc-1",
    source_continuous_close_run_id: "cc-1",
    source_accounting_sync_id: "sync-1",
    accounting_connection_id: "connection-1",
    provider: "quickbooks",
    proposal_hash: "a".repeat(64),
    approval_policy_hash: "b".repeat(64),
    execution_policy_hash: "c".repeat(64),
    execution_hash: "d".repeat(64),
    idempotency_key: "e".repeat(64),
    status: "VERIFIED",
    correlation_marker: "ADVJE:exec-1",
    execution_policy_snapshot: {},
    preflight_result: { eligible: true, checks: [] },
    requested_by: "user-1",
    requested_at: "2026-08-30T00:00:00.000Z",
    state_version: 3,
    provider_journal_id: "223",
    provider_request_hash: "f".repeat(64),
    provider_response_hash: "g".repeat(64),
    provider_readback_hash: "readback-hash",
    verification_snapshot: {
      txnDate: "2026-08-30",
      currency: "USD",
      totalDebitsCents: 100,
      totalCreditsCents: 100,
      providerJournalId: "223",
    },
    verification_ledger_event_id: "receipt-1",
    verified_at: "2026-08-30T12:00:00.000Z",
    last_error_code: null,
    last_error_message: null,
    ...overrides,
  };
}

function matchingReceipt(overrides: Record<string, unknown> = {}) {
  return {
    event_id: "receipt-1",
    event_type: "journal_entry.verified",
    event_hash: "event-hash-1",
    previous_event_hash: "prior-hash-1",
    chain_index: 2,
    firm_client_id: "fc-1",
    engagement_id: "eng-1",
    aggregate_type: "journal_entry_execution",
    aggregate_id: "exec-1",
    event_payload: {
      execution_id: "exec-1",
      accounting_connection_id: "connection-1",
      company_id: "company-1",
      firm_client_id: "fc-1",
      engagement_id: "eng-1",
      provider: "quickbooks",
      provider_journal_id: "223",
      provider_readback_hash: "readback-hash",
      status: "VERIFIED",
    },
    ...overrides,
  };
}

function harnessFor(
  overrides: Partial<VerifiedJeProjectionHarness> = {},
): VerifiedJeProjectionHarness {
  const record = vi.fn().mockResolvedValue({
    memory_id: "m-1",
    persistence_status: "persisted",
  });
  return {
    loadExecution: vi.fn().mockResolvedValue(verifiedExecution()),
    loadVerificationLedgerEvent: vi.fn().mockResolvedValue(matchingReceipt()),
    loadLedgerEventByHash: vi.fn().mockResolvedValue({
      event_id: "prior-1",
      event_hash: "prior-hash-1",
    }),
    record,
    ...overrides,
  };
}

describe("production JE remediation controls", () => {
  beforeEach(() => {
    legacyPost.mockReset();
    legacyReverse.mockReset();
    delete process.env.QB_ENVIRONMENT;
  });

  it("keeps production capabilities OFF with kill switch ON and no identity or amount authority", () => {
    expect(PRODUCTION_JE_ACTIVATION_POLICY).toMatchObject({
      capabilities: {
        CREATE_PRODUCTION_JE: false,
        VERIFY_PRODUCTION_JE: false,
      },
      productionDispatchKillSwitch: true,
      memoryProjectionAllowed: false,
      workerAllowed: false,
      governedAutoAllowed: false,
      requireFreshMfa: true,
      maxExecutionAmountCents: null,
      pilotIdentity: null,
    });
  });

  it("blocks legacy POST and reversal in production before provider dispatch", async () => {
    process.env.QB_ENVIRONMENT = "production";
    const request = {
      firm_client_id: "fc-1",
      idempotency_key: "idem-1",
      source_type: "manual" as const,
      posted_by: "human" as const,
      payload: {
        transaction_date: "2026-08-30",
        lines: [
          { account_id: "1", amount: 1, posting_type: "Debit" as const },
          { account_id: "2", amount: 1, posting_type: "Credit" as const },
        ],
      },
    };
    const post = await legacyJournalEntryPostingService.post(request);
    const reverse = await legacyJournalEntryPostingService.reverse("a", "r", "u");
    expect(post).toMatchObject({
      status: "rejected",
      reason: LEGACY_PRODUCTION_JE_BLOCK_REASON,
      details: { providerPostIssued: false, memoryWritten: false },
    });
    expect(reverse).toMatchObject({
      status: "rejected",
      reason: LEGACY_PRODUCTION_JE_BLOCK_REASON,
    });
    expect(legacyPost).not.toHaveBeenCalled();
    expect(legacyReverse).not.toHaveBeenCalled();
  });

  it("preserves non-production compatibility behind the named legacy boundary", async () => {
    legacyPost.mockResolvedValue({ status: "posted", attempt_id: "a", qbo_je_id: "1" });
    const request = {
      firm_client_id: "fc-1",
      idempotency_key: "idem-1",
      source_type: "manual" as const,
      posted_by: "human" as const,
      payload: { transaction_date: "2026-08-30", lines: [] },
    };
    await expect(legacyJournalEntryPostingService.post(request)).resolves.toMatchObject({
      status: "posted",
    });
    expect(legacyPost).toHaveBeenCalledOnce();
  });

  it("keeps production CREATE/VERIFY OFF and rejects injectable activation policy arguments", () => {
    expect(() => assertProductionJeActivation(validActivationInput())).toThrow(
      /CREATE_PRODUCTION_JE is disabled/,
    );
    expect(() =>
      assertProductionJeActivationWhenApplicable({
        ...validActivationInput(),
        qboEnvironment: "sandbox",
        providerEnvironment: "sandbox",
      }),
    ).not.toThrow();
    expect(() =>
      assertProductionJeActivationWhenApplicable(validActivationInput()),
    ).toThrowError(ProductionJeActivationError);

    const src = fs.readFileSync(
      path.join(root, "lib/journal-entry-governance/production-activation-policy.ts"),
      "utf8",
    );
    expect(src).toContain("const policy = PRODUCTION_JE_ACTIVATION_POLICY");
    expect(src).not.toMatch(/policy\?:\s*ProductionJeActivationPolicy/);
    expect(src).not.toMatch(/assertProductionJeActivation\(\s*input\s*,/);
    expect(src).toContain("production_amount_ceiling_missing");
    expect(src).toContain("production_pilot_identity_missing");
  });

  it("has no application-level direct legacy poster imports outside the compatibility boundary", () => {
    const candidates = ["app", "lib"]
      .flatMap((dir) => walk(path.join(root, dir)))
      .filter((file) => /\.(?:ts|tsx|js|mjs)$/.test(file));
    const allowed = new Set([
      path.normalize(path.join(root, "lib/erp/quickbooks/journal-entry-poster.ts")),
      path.normalize(path.join(root, "lib/erp/quickbooks/legacy-je-posting-service.ts")),
    ]);
    const offenders = candidates.filter((file) => {
      if (allowed.has(path.normalize(file)) || file.includes(`${path.sep}__tests__${path.sep}`)) {
        return false;
      }
      const source = fs.readFileSync(file, "utf8");
      return (
        source.includes("erp/quickbooks/journal-entry-poster") ||
        /qboJournalEntryPoster\s*\.\s*(?:post|reverse)\s*\(/.test(source)
      );
    });
    expect(offenders).toEqual([]);
  });

  it("keeps legacy transport one-shot and excludes provider-success Memory", () => {
    const source = fs.readFileSync(
      path.join(root, "lib/erp/quickbooks/journal-entry-poster.ts"),
      "utf8",
    );
    expect(source.match(/await\s+postToQBO\s*\(/g) ?? []).toHaveLength(1);
    expect(source).not.toContain("forceRefresh: true");
    expect(source).not.toContain("recordMemory(");
    expect(source).toContain("post_dispatch_unknown_commit");
    expect(source).toMatch(/retryable:\s*false/);
  });

  it("defines no-POST exception operations for every production exception state", () => {
    for (const status of [
      "POSTED_UNVERIFIED",
      "UNKNOWN_COMMIT",
      "VERIFICATION_MISMATCH",
      "REVERSAL_REQUIRED",
    ] as const) {
      const disposition = getProductionJeExceptionDisposition(status);
      expect(disposition).not.toBeNull();
      expect(disposition?.providerPostPermitted).toBe(false);
      expect(disposition?.permittedActions).not.toContain("PROVIDER_POST");
    }
    expect(getProductionJeExceptionDisposition("VERIFIED")).toBeNull();
  });

  it("keeps every production workflow disabled and rejects injectable workflow policy", () => {
    expect(Object.values(PRODUCTION_JE_WORKFLOW_POLICY).every((v) => v === false)).toBe(true);
    expect(() =>
      assertProductionWorkflowGoverned({ workflow: "ERP_API", executionId: "exec-1" }),
    ).toThrow(/disabled/);
    expect(() =>
      assertProductionWorkflowGoverned({
        workflow: "LEARNING_BULK",
        executionId: "exec-1",
      }),
    ).toThrow(/disabled/);
    expect(() =>
      assertProductionWorkflowGovernedWhenApplicable({
        workflow: "ERP_API",
        executionId: null,
        qboEnvironment: "sandbox",
      }),
    ).not.toThrow();
    expect(() =>
      assertProductionWorkflowGovernedWhenApplicable({
        workflow: "ERP_API",
        executionId: null,
        qboEnvironment: "production",
      }),
    ).toThrowError(ProductionJeWorkflowError);

    const src = fs.readFileSync(
      path.join(root, "lib/journal-entry-governance/production-workflow-policy.ts"),
      "utf8",
    );
    expect(src).toContain("const policy = PRODUCTION_JE_WORKFLOW_POLICY");
    expect(src).not.toMatch(/policy\?:\s*ProductionJeWorkflowPolicy/);
    expect(src).not.toMatch(/assertProductionWorkflowGoverned\(\{[\s\S]*?policy:/);
    expect(src).toContain("production_workflow_auto_phase_required");
    expect(src).toContain("LEARNING_BULK");
    expect(src).toContain("RECURRING_AUTO");
  });

  it("wires production fail-closed gates into create, verify, and workflow call sites", () => {
    const createSrc = fs.readFileSync(
      path.join(root, "lib/journal-entry-governance/provider-create-service.ts"),
      "utf8",
    );
    const verifySrc = fs.readFileSync(
      path.join(root, "lib/journal-entry-governance/provider-verification-service.ts"),
      "utf8",
    );
    expect(createSrc).toContain('process.env.QB_ENVIRONMENT === "production"');
    expect(createSrc).toContain('capability: "CREATE_PRODUCTION_JE"');
    expect(createSrc).toContain("production_governed_create_path_not_armed");
    expect(verifySrc).toContain('process.env.QB_ENVIRONMENT === "production"');
    expect(verifySrc).toContain('capability: "VERIFY_PRODUCTION_JE"');
    expect(verifySrc).toContain("production_governed_verify_path_not_armed");

    const callSites = [
      "app/api/erp/journal-entries/post/route.ts",
      "app/api/erp/journal-entries/reverse/route.ts",
      "app/api/pulse/je/confirm/route.ts",
      "lib/learning/proposal-service.ts",
      "lib/pre-close/post-approved-review-item.ts",
      "lib/recurring/je-poster.ts",
    ];
    for (const relative of callSites) {
      const src = fs.readFileSync(path.join(root, relative), "utf8");
      expect(src, relative).toContain("assertProductionWorkflowGovernedWhenApplicable");
    }
    expect(
      fs.readFileSync(path.join(root, "lib/recurring/auto-post-dispatcher.ts"), "utf8"),
    ).toContain('productionWorkflow: "RECURRING_AUTO"');
  });

  it("keeps Memory projection OFF and rejects public policy or fabricated custody input", async () => {
    const record = vi.fn();
    await expect(
      projectVerifiedJournalEntryToMemory({ executionId: "exec-1" }),
    ).rejects.toThrow(/capability is disabled/);
    expect(record).not.toHaveBeenCalled();

    const publicSrc = fs.readFileSync(
      path.join(root, "lib/journal-entry-governance/verified-memory-projection.ts"),
      "utf8",
    );
    expect(publicSrc).toContain("PRODUCTION_JE_ACTIVATION_POLICY.memoryProjectionAllowed");
    expect(publicSrc).not.toMatch(/policy\?\s*:/);
    expect(publicSrc).not.toContain("memoryProjectionAllowed: true");
    expect(publicSrc).toContain("export type ProjectVerifiedJeToMemoryInput");
    expect(publicSrc).toMatch(
      /export type ProjectVerifiedJeToMemoryInput = \{\s*executionId: string;\s*\}/,
    );
    expect(publicSrc).not.toContain("executionStatus:");
    expect(publicSrc).not.toMatch(
      /ProjectVerifiedJeToMemoryInput = \{[^}]*totalDebitsCents/,
    );

    const barrel = fs.readFileSync(
      path.join(root, "lib/journal-entry-governance/index.ts"),
      "utf8",
    );
    expect(barrel).toContain("projectVerifiedJournalEntryToMemory");
    expect(barrel).not.toContain("projectVerifiedJournalEntryToMemoryForTests");
    expect(barrel).not.toContain("VerifiedJeProjectionDeps");
  });

  it("projects only after loading exact VERIFIED custody and Patent #6 receipt", async () => {
    // Force the capability gate open only by temporarily mutating the const-shaped
    // object is impossible without changing checked-in policy; use Object.defineProperty
    // on a clone path is also blocked. Instead exercise the harness after swapping
    // the module-level read via a local spy on PRODUCTION_JE_ACTIVATION_POLICY.
    const policy = PRODUCTION_JE_ACTIVATION_POLICY as {
      memoryProjectionAllowed: boolean;
    };
    const previous = policy.memoryProjectionAllowed;
    policy.memoryProjectionAllowed = true;
    try {
      const h = harnessFor();
      await projectVerifiedJournalEntryToMemoryForTests({ executionId: "exec-1" }, h);
      expect(h.loadExecution).toHaveBeenCalledWith("exec-1");
      expect(h.loadVerificationLedgerEvent).toHaveBeenCalledWith("receipt-1");
      expect(h.loadLedgerEventByHash).toHaveBeenCalledWith("prior-hash-1");
      expect(h.record).toHaveBeenCalledWith(
        expect.objectContaining({
          memoryKey: "verified_je_exec-1",
          sourceSystem: "patent_6_verified_projection",
          payload: expect.objectContaining({
            authority: "NON_AUTHORITATIVE_MEMORY_PROJECTION",
            provider_success_authority: false,
            rebuild_source: "PATENT_6_CHAIN_RECEIPT",
            verification_ledger_event_id: "receipt-1",
            provider_journal_id: "223",
            provider_readback_hash: "readback-hash",
            total_debits_cents: 100,
            total_credits_cents: 100,
            transaction_date: "2026-08-30",
            currency: "USD",
          }),
        }),
      );
    } finally {
      policy.memoryProjectionAllowed = previous;
    }
  });

  it("blocks Memory when receipt, identity, readback, or chain linkage mismatches", async () => {
    const policy = PRODUCTION_JE_ACTIVATION_POLICY as {
      memoryProjectionAllowed: boolean;
    };
    const previous = policy.memoryProjectionAllowed;
    policy.memoryProjectionAllowed = true;
    try {
      const cases: Array<{
        name: string;
        harness: VerifiedJeProjectionHarness;
        code: string;
      }> = [
        {
          name: "not verified",
          harness: harnessFor({
            loadExecution: vi
              .fn()
              .mockResolvedValue(verifiedExecution({ status: "POSTED_UNVERIFIED" })),
          }),
          code: "memory_projection_requires_verified",
        },
        {
          name: "missing lineage",
          harness: harnessFor({
            loadExecution: vi.fn().mockResolvedValue(
              verifiedExecution({ provider_readback_hash: null }),
            ),
          }),
          code: "memory_projection_lineage_incomplete",
        },
        {
          name: "receipt missing",
          harness: harnessFor({
            loadVerificationLedgerEvent: vi.fn().mockResolvedValue(null),
          }),
          code: "memory_projection_receipt_not_found",
        },
        {
          name: "wrong event type",
          harness: harnessFor({
            loadVerificationLedgerEvent: vi.fn().mockResolvedValue(
              matchingReceipt({ event_type: "journal_entry.posted" }),
            ),
          }),
          code: "memory_projection_receipt_type_invalid",
        },
        {
          name: "connection mismatch",
          harness: harnessFor({
            loadVerificationLedgerEvent: vi.fn().mockResolvedValue(
              matchingReceipt({
                event_payload: {
                  ...matchingReceipt().event_payload,
                  accounting_connection_id: "other-connection",
                },
              }),
            ),
          }),
          code: "memory_projection_receipt_connection_mismatch",
        },
        {
          name: "provider id mismatch",
          harness: harnessFor({
            loadVerificationLedgerEvent: vi.fn().mockResolvedValue(
              matchingReceipt({
                event_payload: {
                  ...matchingReceipt().event_payload,
                  provider_journal_id: "999",
                },
              }),
            ),
          }),
          code: "memory_projection_receipt_provider_id_mismatch",
        },
        {
          name: "readback mismatch",
          harness: harnessFor({
            loadVerificationLedgerEvent: vi.fn().mockResolvedValue(
              matchingReceipt({
                event_payload: {
                  ...matchingReceipt().event_payload,
                  provider_readback_hash: "other-hash",
                },
              }),
            ),
          }),
          code: "memory_projection_receipt_readback_mismatch",
        },
        {
          name: "broken chain link",
          harness: harnessFor({
            loadLedgerEventByHash: vi.fn().mockResolvedValue(null),
          }),
          code: "memory_projection_chain_link_invalid",
        },
        {
          name: "company mismatch",
          harness: harnessFor({
            loadVerificationLedgerEvent: vi.fn().mockResolvedValue(
              matchingReceipt({
                event_payload: {
                  ...matchingReceipt().event_payload,
                  company_id: "other-company",
                },
              }),
            ),
          }),
          code: "memory_projection_receipt_company_mismatch",
        },
      ];

      for (const testCase of cases) {
        await expect(
          projectVerifiedJournalEntryToMemoryForTests(
            { executionId: "exec-1" },
            testCase.harness,
          ),
        ).rejects.toMatchObject({
          name: "VerifiedJeProjectionError",
          code: testCase.code,
        });
        expect(testCase.harness.record).not.toHaveBeenCalled();
      }
    } finally {
      policy.memoryProjectionAllowed = previous;
    }
  });
});

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.name === "node_modules" || entry.name === ".next") return [];
    return entry.isDirectory() ? walk(full) : [full];
  });
}
