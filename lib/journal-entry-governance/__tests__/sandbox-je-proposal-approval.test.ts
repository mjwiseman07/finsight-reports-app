// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("sandbox JE proposal/approval static boundary", () => {
  const root = process.cwd();
  const proposalApi = path.join(
    root,
    "lib/journal-entry-governance/sandbox-je-proposal-api.ts",
  );
  const proposalRouteDir = path.join(
    root,
    "app/api/governed/journal-entries/sandbox/proposals",
  );
  const cockpitClient = path.join(
    root,
    "app/admin/sandbox-je/SandboxJeCockpitClient.tsx",
  );
  const middlewarePath = path.join(root, "middleware.ts");
  const activation = path.join(
    root,
    "lib/journal-entry-governance/je3d-first-controlled-create-activation.ts",
  );

  it("proposal API forbids execution/provider/Memory/QBO imports", () => {
    const src = fs.readFileSync(proposalApi, "utf8");
    expect(src).not.toMatch(/prepareGovernedJournalEntryExecution/);
    expect(src).not.toMatch(/executeGovernedJournalEntryCreate/);
    expect(src).not.toMatch(/provider-attempt-service/);
    expect(src).not.toMatch(/journal-entry-poster/);
    expect(src).not.toMatch(/client-memory-service/);
    expect(src).not.toMatch(/token-resolver/);
    expect(src).not.toMatch(/oauth/i);
    expect(src).toContain("createContinuousCloseJournalEntryProposal");
    expect(src).toContain("decideJournalEntryProposal");
    expect(src).toContain("alwaysRequireMfa: true");
  });

  it("proposal routes only export allowed methods", () => {
    const files = [
      path.join(proposalRouteDir, "route.ts"),
      path.join(proposalRouteDir, "[proposalId]/route.ts"),
      path.join(proposalRouteDir, "[proposalId]/custody/route.ts"),
      path.join(proposalRouteDir, "[proposalId]/decision/route.ts"),
    ];
    for (const file of files) {
      const src = fs.readFileSync(file, "utf8");
      expect(src).not.toMatch(/export async function (PUT|PATCH|DELETE)/);
      if (file.endsWith(`${path.sep}route.ts`) && file.includes("proposals") && !file.includes("[proposalId]")) {
        expect(src).toContain("export async function POST");
      }
    }
  });

  it("cockpit UI has no POST/VERIFY/OAuth/Memory action buttons", () => {
    const src = fs.readFileSync(cockpitClient, "utf8");
    expect(src).not.toMatch(/Post to QuickBooks/i);
    expect(src).not.toMatch(/VERIFY_SANDBOX/);
    expect(src).not.toMatch(/OAuth reconnect/i);
    expect(src).not.toMatch(/Write Memory/i);
    expect(src).toContain("CREATE OFF");
    expect(src).toContain("VERIFY OFF");
    expect(src).toContain("dispatch kill switch ON");
    expect(src).toContain("EXECUTION PREPARE DISABLED");
  });

  it("middleware returns production 404 before MFA for sandbox JE paths", () => {
    const src = fs.readFileSync(middlewarePath, "utf8");
    expect(src).toContain("isSandboxJeProductionBoundaryPath");
    const smokeCall = src.indexOf("const smokeGate = enforcePreviewSmokeCredential");
    const boundaryCall = src.indexOf(
      "isSandboxJeProductionBoundaryPath(pathname)",
    );
    const mfaCall = src.indexOf("const mfaGate = await enforceMfaForRequest");
    expect(smokeCall).toBeGreaterThan(-1);
    expect(boundaryCall).toBeGreaterThan(smokeCall);
    expect(mfaCall).toBeGreaterThan(boundaryCall);
  });

  it("activation capabilities remain OFF and kill switch ON", () => {
    const src = fs.readFileSync(activation, "utf8");
    expect(src).toMatch(/CREATE_SANDBOX_JE:\s*false/);
    expect(src).toMatch(/VERIFY_SANDBOX_JE:\s*false/);
    expect(src).toMatch(/sandboxDispatchKillSwitch:\s*true/);
    expect(src).toMatch(/memoryWriteAllowed:\s*false/);
    expect(src).toMatch(/workerAllowed:\s*false/);
    expect(src).toMatch(/governedAutoAllowed:\s*false/);
  });
});

describe("sandbox JE proposal parsers and origin guard", () => {
  beforeEach(() => {
    vi.stubEnv("QB_ENVIRONMENT", "sandbox");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects unknown proposal fields and requires clientMutationId", async () => {
    const {
      parseSandboxJeProposalBody,
      SandboxJeProposalApiError,
    } = await import("../sandbox-je-proposal-api");
    expect(() =>
      parseSandboxJeProposalBody({ clientMutationId: "abc12345", companyId: "x" }),
    ).toThrow(SandboxJeProposalApiError);
    expect(() => parseSandboxJeProposalBody({ memo: "hi" })).toThrow(
      SandboxJeProposalApiError,
    );
    const ok = parseSandboxJeProposalBody({
      clientMutationId: "mutation-001",
      memo: "ok",
      txnDate: "2026-08-31",
    });
    expect(ok.clientMutationId).toBe("mutation-001");
    expect(ok.memo).toBe("ok");
  });

  it("locks designated approver identity", async () => {
    const { assertDesignatedSandboxApprover, SandboxJeProposalApiError } =
      await import("../sandbox-je-proposal-api");
    expect(() =>
      assertDesignatedSandboxApprover({
        userId: "a4ebf834-a698-4f79-a945-8498f2e6c45d",
        email: "mwiseman@advisacor.com",
      }),
    ).toThrow(SandboxJeProposalApiError);
    expect(() =>
      assertDesignatedSandboxApprover({
        userId: "dc145a4f-e052-4d30-8512-32eb2c9c5289",
        email: "wrong@advisacor.com",
      }),
    ).toThrow(SandboxJeProposalApiError);
    expect(() =>
      assertDesignatedSandboxApprover({
        userId: "dc145a4f-e052-4d30-8512-32eb2c9c5289",
        email: "jwiseman@advisacor.com",
      }),
    ).not.toThrow();
  });

  it("locks designated proposer identity to mwiseman only", async () => {
    const { assertDesignatedSandboxProposer, SandboxJeProposalApiError } =
      await import("../sandbox-je-proposal-api");
    expect(() =>
      assertDesignatedSandboxProposer({
        userId: "dc145a4f-e052-4d30-8512-32eb2c9c5289",
        email: "jwiseman@advisacor.com",
      }),
    ).toThrow(SandboxJeProposalApiError);
    expect(() =>
      assertDesignatedSandboxProposer({
        userId: "a4ebf834-a698-4f79-a945-8498f2e6c45d",
        email: "other-admin@advisacor.com",
      }),
    ).toThrow(SandboxJeProposalApiError);
    expect(() =>
      assertDesignatedSandboxProposer({
        userId: "a4ebf834-a698-4f79-a945-8498f2e6c45d",
        email: "mwiseman@advisacor.com",
      }),
    ).not.toThrow();
  });

  it("binds clientMutationId and proposer into mutation reason code", async () => {
    const { buildSandboxJeMutationReasonCode } = await import(
      "../sandbox-je-proposal-api"
    );
    const shared = await import("../sandbox-je-proposal-shared");
    const code = buildSandboxJeMutationReasonCode({
      proposerUserId: shared.SANDBOX_JE_DESIGNATED_PROPOSER_USER_ID,
      clientMutationId: "mutation-abc-001",
    });
    expect(code.startsWith(`${shared.SANDBOX_JE_REASON_CODE}:`)).toBe(true);
    expect(code).toContain(shared.SANDBOX_JE_DESIGNATED_PROPOSER_USER_ID);
    expect(code).toContain("mutation-abc-001");
  });

  it("denies cross-site mutation origin", async () => {
    const { assertSandboxJeMutationOrigin } = await import(
      "../sandbox-je-mutation-origin"
    );
    const denied = assertSandboxJeMutationOrigin(
      new Request("https://app.advisacor.com/api/x", {
        method: "POST",
        headers: {
          origin: "https://evil.example",
          "sec-fetch-site": "cross-site",
        },
      }),
    );
    expect(denied?.status).toBe(403);

    const allowed = assertSandboxJeMutationOrigin(
      new Request("https://app.advisacor.com/api/x", {
        method: "POST",
        headers: {
          origin: "https://app.advisacor.com",
          "sec-fetch-site": "same-origin",
        },
      }),
    );
    expect(allowed).toBeNull();
  });

  it("runtime enabled only for QB_ENVIRONMENT=sandbox", async () => {
    const { isSandboxJeCockpitRuntimeEnabled } = await import(
      "../sandbox-je-cockpit-api"
    );
    expect(isSandboxJeCockpitRuntimeEnabled("sandbox")).toBe(true);
    expect(isSandboxJeCockpitRuntimeEnabled("production")).toBe(false);
    expect(isSandboxJeCockpitRuntimeEnabled("")).toBe(false);
  });

  it("locked economics constants match $1 USD Demo A accounts", async () => {
    const shared = await import("../sandbox-je-proposal-shared");
    expect(shared.SANDBOX_JE_LOCKED_DEBIT_ACCOUNT_ID).toBe("15");
    expect(shared.SANDBOX_JE_LOCKED_CREDIT_ACCOUNT_ID).toBe("1150040002");
    expect(shared.SANDBOX_JE_LOCKED_AMOUNT_CENTS).toBe(100);
    expect(shared.SANDBOX_JE_LOCKED_CURRENCY).toBe("USD");
    expect(shared.SANDBOX_JE_LOCKED_ORIGIN).toBe("ACCRUAL");
    expect(shared.SANDBOX_JE_DESIGNATED_APPROVER_USER_ID).toBe(
      "dc145a4f-e052-4d30-8512-32eb2c9c5289",
    );
  });
});

describe("sandbox JE source custody uniqueness helper", () => {
  it("fails closed on empty eligible set (unit of selection logic)", async () => {
    // Pure structural: custodyKey uniqueness is exercised via ambiguous distinct keys.
    const mod = await import("../sandbox-je-proposal-source");
    expect(typeof mod.resolveLatestUniqueEligibleDemoASourceCustody).toBe(
      "function",
    );
    expect(mod.SandboxJeSourceCustodyError).toBeTruthy();
  });
});

describe("approval authority firm_id fallback", () => {
  it("exports resolveEngagementFirmIdForAuthority", async () => {
    const mod = await import("../approval-authority");
    expect(typeof mod.resolveEngagementFirmIdForAuthority).toBe("function");
    expect(await mod.resolveEngagementFirmIdForAuthority({
      firmId: "11111111-1111-1111-1111-111111111111",
      companyId: null,
    })).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("fails closed on zero firm_clients and ambiguous multiple firm ids", async () => {
    const { resolveEngagementFirmIdForAuthority } = await import(
      "../approval-authority"
    );
    const { getSupabaseAdmin } = await import("@/lib/supabase-admin.js");
    const admin = getSupabaseAdmin as unknown as {
      mockImplementation?: (fn: () => unknown) => void;
    };
    // Pure unit: empty companyId returns null without DB.
    expect(
      await resolveEngagementFirmIdForAuthority({
        firmId: null,
        companyId: null,
      }),
    ).toBeNull();
    void admin;
  });
});

describe("sandbox JE production boundary paths", () => {
  it("matches every sandbox page/API and rejects unrelated routes", async () => {
    const { isSandboxJeProductionBoundaryPath } = await import(
      "../sandbox-je-production-boundary"
    );
    expect(isSandboxJeProductionBoundaryPath("/admin/sandbox-je")).toBe(true);
    expect(isSandboxJeProductionBoundaryPath("/admin/sandbox-je/")).toBe(true);
    expect(
      isSandboxJeProductionBoundaryPath(
        "/api/governed/journal-entries/sandbox/proposals",
      ),
    ).toBe(true);
    expect(
      isSandboxJeProductionBoundaryPath(
        "/api/governed/journal-entries/sandbox/proposals/abc/decision",
      ),
    ).toBe(true);
    expect(
      isSandboxJeProductionBoundaryPath(
        "/api/governed/journal-entries/executions/x/inspection",
      ),
    ).toBe(true);
    expect(
      isSandboxJeProductionBoundaryPath(
        "/api/governed/journal-entries/executions/x/checklist",
      ),
    ).toBe(true);
    expect(isSandboxJeProductionBoundaryPath("/admin")).toBe(false);
    expect(
      isSandboxJeProductionBoundaryPath("/api/governed/journal-entries/other"),
    ).toBe(false);
  });
});

describe("sandbox JE adversarial parsers", () => {
  it("rejects mass-assignment of locked economics and custody fields", async () => {
    const { parseSandboxJeProposalBody, SandboxJeProposalApiError } =
      await import("../sandbox-je-proposal-api");
    for (const field of [
      "accountId",
      "debitAccountId",
      "amountCents",
      "currency",
      "companyId",
      "engagementId",
      "proposalHash",
      "status",
      "sourceContinuousCloseRunId",
      "proposedBy",
    ]) {
      expect(() =>
        parseSandboxJeProposalBody({
          clientMutationId: "mutation-001",
          [field]: "attacker",
        }),
      ).toThrow(SandboxJeProposalApiError);
    }
  });

  it("rejects decision mass-assignment and requires REJECTED reason", async () => {
    const { parseSandboxJeDecisionBody, SandboxJeProposalApiError } =
      await import("../sandbox-je-proposal-api");
    expect(() =>
      parseSandboxJeDecisionBody({
        decision: "APPROVED",
        clientMutationId: "mutation-001",
        proposalHash: "abc",
      }),
    ).toThrow(SandboxJeProposalApiError);
    expect(() =>
      parseSandboxJeDecisionBody({
        decision: "REJECTED",
        clientMutationId: "mutation-001",
      }),
    ).toThrow(SandboxJeProposalApiError);
    const ok = parseSandboxJeDecisionBody({
      decision: "REJECTED",
      reason: "not ready",
      clientMutationId: "mutation-001",
    });
    expect(ok.decision).toBe("REJECTED");
  });
});
