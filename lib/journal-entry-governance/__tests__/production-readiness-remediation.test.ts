import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { legacyPost, legacyReverse, loadExactExecutionMock, recordMemoryMock, getSupabaseAdminMock } =
  vi.hoisted(() => ({
    legacyPost: vi.fn(),
    legacyReverse: vi.fn(),
    loadExactExecutionMock: vi.fn(),
    recordMemoryMock: vi.fn(),
    getSupabaseAdminMock: vi.fn(),
  }));

vi.mock("@/lib/erp/quickbooks/journal-entry-poster", () => ({
  qboJournalEntryPoster: {
    post: legacyPost,
    reverse: legacyReverse,
  },
}));

vi.mock("../provider-attempt-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../provider-attempt-service")>();
  return {
    ...actual,
    loadExactExecution: loadExactExecutionMock,
  };
});

vi.mock("@/lib/memory/client-memory-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/memory/client-memory-service")>();
  return {
    ...actual,
    recordMemory: recordMemoryMock,
  };
});

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: getSupabaseAdminMock,
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
import { projectVerifiedJournalEntryToMemory } from "../verified-memory-projection";
import { getProductionJeExceptionDisposition } from "../production-exception-operations";
import {
  PRODUCTION_JE_WORKFLOW_POLICY,
  PRODUCTION_JE_WORKFLOWS,
  ProductionJeWorkflowError,
  assertProductionWorkflowGoverned,
  assertProductionWorkflowGovernedWhenApplicable,
} from "../production-workflow-policy";

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

function attemptMutate(mutator: () => void): void {
  try {
    mutator();
  } catch {
    // Frozen objects may throw TypeError in strict mode.
  }
}

describe("production JE remediation controls", () => {
  beforeEach(() => {
    legacyPost.mockReset();
    legacyReverse.mockReset();
    loadExactExecutionMock.mockReset();
    recordMemoryMock.mockReset();
    getSupabaseAdminMock.mockReset();
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
    expect(Object.values(PRODUCTION_JE_WORKFLOW_POLICY).every((v) => v === false)).toBe(
      true,
    );
  });

  it("deeply freezes activation and workflow policy against runtime mutation", () => {
    expect(Object.isFrozen(PRODUCTION_JE_ACTIVATION_POLICY)).toBe(true);
    expect(Object.isFrozen(PRODUCTION_JE_ACTIVATION_POLICY.capabilities)).toBe(true);
    expect(Object.isFrozen(PRODUCTION_JE_WORKFLOW_POLICY)).toBe(true);

    attemptMutate(() => {
      (PRODUCTION_JE_ACTIVATION_POLICY as { memoryProjectionAllowed: boolean })
        .memoryProjectionAllowed = true;
    });
    attemptMutate(() => {
      (PRODUCTION_JE_ACTIVATION_POLICY as { productionDispatchKillSwitch: boolean })
        .productionDispatchKillSwitch = false;
    });
    attemptMutate(() => {
      (PRODUCTION_JE_ACTIVATION_POLICY as { workerAllowed: boolean }).workerAllowed =
        true;
    });
    attemptMutate(() => {
      (PRODUCTION_JE_ACTIVATION_POLICY as { governedAutoAllowed: boolean })
        .governedAutoAllowed = true;
    });
    attemptMutate(() => {
      (PRODUCTION_JE_ACTIVATION_POLICY as { maxExecutionAmountCents: number | null })
        .maxExecutionAmountCents = 1;
    });
    attemptMutate(() => {
      (
        PRODUCTION_JE_ACTIVATION_POLICY.capabilities as {
          CREATE_PRODUCTION_JE: boolean;
        }
      ).CREATE_PRODUCTION_JE = true;
    });
    attemptMutate(() => {
      (
        PRODUCTION_JE_ACTIVATION_POLICY.capabilities as {
          VERIFY_PRODUCTION_JE: boolean;
        }
      ).VERIFY_PRODUCTION_JE = true;
    });
    attemptMutate(() => {
      (PRODUCTION_JE_ACTIVATION_POLICY as { pilotIdentity: unknown }).pilotIdentity = {
        companyId: "hijack",
        accountingConnectionId: "hijack",
        realmId: "hijack",
        provider: "quickbooks",
        providerEnvironment: "production",
      };
    });
    for (const workflow of PRODUCTION_JE_WORKFLOWS) {
      attemptMutate(() => {
        (PRODUCTION_JE_WORKFLOW_POLICY as Record<string, boolean>)[workflow] = true;
      });
    }

    expect(PRODUCTION_JE_ACTIVATION_POLICY.memoryProjectionAllowed).toBe(false);
    expect(PRODUCTION_JE_ACTIVATION_POLICY.productionDispatchKillSwitch).toBe(true);
    expect(PRODUCTION_JE_ACTIVATION_POLICY.workerAllowed).toBe(false);
    expect(PRODUCTION_JE_ACTIVATION_POLICY.governedAutoAllowed).toBe(false);
    expect(PRODUCTION_JE_ACTIVATION_POLICY.maxExecutionAmountCents).toBeNull();
    expect(PRODUCTION_JE_ACTIVATION_POLICY.pilotIdentity).toBeNull();
    expect(PRODUCTION_JE_ACTIVATION_POLICY.capabilities.CREATE_PRODUCTION_JE).toBe(
      false,
    );
    expect(PRODUCTION_JE_ACTIVATION_POLICY.capabilities.VERIFY_PRODUCTION_JE).toBe(
      false,
    );
    expect(Object.values(PRODUCTION_JE_WORKFLOW_POLICY).every((v) => v === false)).toBe(
      true,
    );

    // Assert paths still fail-closed after mutation attempts.
    expect(() => assertProductionJeActivation(validActivationInput())).toThrow(
      /CREATE_PRODUCTION_JE is disabled/,
    );
    expect(() =>
      assertProductionWorkflowGoverned({ workflow: "ERP_API", executionId: "exec-1" }),
    ).toThrow(/disabled/);
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
    expect(src).toContain("Object.freeze(policy.capabilities)");
    expect(src).toContain("Object.freeze(policy.pilotIdentity)");
    expect(src).toContain("Object.freeze(policy)");
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
    expect(src).toContain("Object.freeze({");
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

  it("keeps Memory projection OFF and stops before any database or Memory access", async () => {
    await expect(
      projectVerifiedJournalEntryToMemory({ executionId: "exec-1" }),
    ).rejects.toMatchObject({
      name: "VerifiedJeProjectionError",
      code: "memory_projection_capability_off",
    });
    expect(loadExactExecutionMock).not.toHaveBeenCalled();
    expect(getSupabaseAdminMock).not.toHaveBeenCalled();
    expect(recordMemoryMock).not.toHaveBeenCalled();
  });

  it("exports only the custody-only public projection and never a test harness", () => {
    const publicSrc = fs.readFileSync(
      path.join(root, "lib/journal-entry-governance/verified-memory-projection.ts"),
      "utf8",
    );
    expect(publicSrc).toContain("PRODUCTION_JE_ACTIVATION_POLICY.memoryProjectionAllowed");
    expect(publicSrc).toContain("loadExactExecution");
    expect(publicSrc).toContain("assertVerifiedJeMemoryProjectionCustody");
    expect(publicSrc).toContain("recordMemory");
    expect(publicSrc).not.toMatch(/policy\?\s*:/);
    expect(publicSrc).not.toContain("memoryProjectionAllowed: true");
    expect(publicSrc).not.toContain("projectVerifiedJournalEntryToMemoryForTests");
    expect(publicSrc).not.toContain("VerifiedJeProjectionHarness");
    expect(publicSrc).not.toContain("projectWithHarness");
    expect(publicSrc).not.toContain("createDefaultHarness");
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
    expect(barrel).not.toContain("VerifiedJeProjectionHarness");
    expect(barrel).not.toContain("VerifiedJeProjectionDeps");
  });

  it("proves no production source imports a projection test harness", () => {
    const candidates = ["app", "lib", "components"]
      .flatMap((dir) => {
        const abs = path.join(root, dir);
        return fs.existsSync(abs) ? walk(abs) : [];
      })
      .filter((file) => /\.(?:ts|tsx|js|mjs)$/.test(file))
      .filter((file) => !file.includes(`${path.sep}__tests__${path.sep}`));

    const harnessPatterns = [
      /projectVerifiedJournalEntryToMemoryForTests/,
      /VerifiedJeProjectionHarness/,
      /VerifiedJeProjectionDeps/,
      /from\s+["'][^"']*verified-memory-projection["'][^;]*ForTests/,
    ];
    const offenders = candidates.filter((file) => {
      const source = fs.readFileSync(file, "utf8");
      return harnessPatterns.some((pattern) => pattern.test(source));
    });
    expect(offenders).toEqual([]);
  });

  it("wires public projection to real execution, ledger, custody, and Memory writer", () => {
    const publicSrc = fs.readFileSync(
      path.join(root, "lib/journal-entry-governance/verified-memory-projection.ts"),
      "utf8",
    );
    expect(publicSrc).toContain("await loadExactExecution(executionId)");
    expect(publicSrc).toContain('.from("ledger_events")');
    expect(publicSrc).toContain("assertVerifiedJeMemoryProjectionCustody");
    expect(publicSrc).toContain("NON_AUTHORITATIVE_MEMORY_PROJECTION");
    expect(publicSrc).toContain("provider_success_authority: false");
    expect(publicSrc).toContain("PATENT_6_CHAIN_RECEIPT");
    expect(publicSrc).not.toMatch(/execution\.status\s*=/);
    expect(publicSrc).not.toMatch(/update\(.*status/);
  });
});

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.name === "node_modules" || entry.name === ".next") return [];
    return entry.isDirectory() ? walk(full) : [full];
  });
}
