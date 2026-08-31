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
  type ProductionJeActivationPolicy,
} from "../production-activation-policy";
import {
  VerifiedJeProjectionError,
  projectVerifiedJournalEntryToMemory,
} from "../verified-memory-projection";
import { getProductionJeExceptionDisposition } from "../production-exception-operations";
import {
  PRODUCTION_JE_WORKFLOW_POLICY,
  ProductionJeWorkflowError,
  assertProductionWorkflowGoverned,
  assertProductionWorkflowGovernedWhenApplicable,
} from "../production-workflow-policy";

const root = process.cwd();

function activePilotPolicy(): ProductionJeActivationPolicy {
  return {
    capabilities: {
      CREATE_PRODUCTION_JE: true,
      VERIFY_PRODUCTION_JE: false,
    },
    productionDispatchKillSwitch: false,
    memoryProjectionAllowed: false,
    workerAllowed: false,
    governedAutoAllowed: false,
    requireFreshMfa: true,
    maxExecutionAmountCents: 100,
    pilotIdentity: {
      companyId: "company-1",
      accountingConnectionId: "connection-1",
      realmId: "realm-1",
      provider: "quickbooks",
      providerEnvironment: "production",
    },
  };
}

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

  it("requires a separately enabled exact production identity and bounded amount", () => {
    expect(() => assertProductionJeActivation(validActivationInput())).toThrow(
      /CREATE_PRODUCTION_JE is disabled/,
    );
    expect(() =>
      assertProductionJeActivation(validActivationInput(), activePilotPolicy()),
    ).not.toThrow();

    const missingLimit = { ...activePilotPolicy(), maxExecutionAmountCents: null };
    expect(() =>
      assertProductionJeActivation(validActivationInput(), missingLimit),
    ).toThrowError(ProductionJeActivationError);

    expect(() =>
      assertProductionJeActivation(
        { ...validActivationInput(), accountingConnectionId: "wrong" },
        activePilotPolicy(),
      ),
    ).toThrow(/exact approved production pilot identity/);

    expect(() =>
      assertProductionJeActivation(
        { ...validActivationInput(), totalDebitsCents: 101 },
        activePilotPolicy(),
      ),
    ).toThrow(/exceeds the production ceiling/);
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

  it("keeps every production workflow disabled and requires governed execution custody", () => {
    expect(Object.values(PRODUCTION_JE_WORKFLOW_POLICY).every((v) => v === false)).toBe(true);
    expect(() =>
      assertProductionWorkflowGoverned({ workflow: "ERP_API", executionId: "exec-1" }),
    ).toThrow(/disabled/);
    expect(() =>
      assertProductionWorkflowGoverned({
        workflow: "ERP_API",
        executionId: null,
        policy: { ...PRODUCTION_JE_WORKFLOW_POLICY, ERP_API: true },
      }),
    ).toThrow(/executionId/);
    expect(() =>
      assertProductionWorkflowGoverned({
        workflow: "RECURRING_AUTO",
        executionId: "exec-1",
        policy: { ...PRODUCTION_JE_WORKFLOW_POLICY, RECURRING_AUTO: true },
      }),
    ).toThrow(/later separate phase/);
  });

  it("applies production workflow asserts only for production QB_ENVIRONMENT", () => {
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
  });

  it("applies production activation asserts only for production context", () => {
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

  it("projects only VERIFIED custody and labels Memory non-authoritative", async () => {
    const record = vi.fn().mockResolvedValue({
      memory_id: "m-1",
      persistence_status: "persisted",
    });
    const base = {
      firmClientId: "fc-1",
      executionId: "exec-1",
      executionStatus: "VERIFIED",
      providerJournalId: "223",
      providerReadbackHash: "readback-hash",
      verificationLedgerEventId: "receipt-1",
      verifiedAt: "2026-08-30T00:00:00Z",
      transactionDate: "2026-08-30",
      currency: "USD",
      totalDebitsCents: 100,
      totalCreditsCents: 100,
    };
    await expect(
      projectVerifiedJournalEntryToMemory(base, { record }),
    ).rejects.toThrow(/capability is disabled/);
    expect(record).not.toHaveBeenCalled();

    const enabledDeps = {
      record,
      policy: { memoryProjectionAllowed: true },
    };
    await projectVerifiedJournalEntryToMemory(base, enabledDeps);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        memoryKey: "verified_je_exec-1",
        sourceSystem: "patent_6_verified_projection",
        payload: expect.objectContaining({
          authority: "NON_AUTHORITATIVE_MEMORY_PROJECTION",
          verification_ledger_event_id: "receipt-1",
          provider_success_authority: false,
        }),
      }),
    );
    await expect(
      projectVerifiedJournalEntryToMemory(
        { ...base, executionStatus: "POSTED_UNVERIFIED" },
        enabledDeps,
      ),
    ).rejects.toThrowError(VerifiedJeProjectionError);
    expect(record).toHaveBeenCalledTimes(1);
  });
});

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.name === "node_modules" || entry.name === ".next") return [];
    return entry.isDirectory() ? walk(full) : [full];
  });
}
