// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  SANDBOX_JE_ACCEPTED_APPROVAL_ID,
  SANDBOX_JE_ACCEPTED_PROPOSAL_ID,
} from "../sandbox-je-execution-prepare-shared";
import {
  SANDBOX_JE_DESIGNATED_APPROVER_USER_ID,
  SANDBOX_JE_DESIGNATED_PROPOSER_USER_ID,
} from "../sandbox-je-proposal-shared";
import {
  buildSandboxTwoPersonPrepareEventPayload,
  canonicalizeSandboxTwoPersonExecutionPolicySnapshot,
  hashSandboxTwoPersonExecutionPolicy,
  SANDBOX_TWO_PERSON_PREPARE_AUTHORITY_V1,
} from "../sandbox-two-person-prepare-policy";

describe("sandbox JE two-person execution prepare", () => {
  const root = process.cwd();
  const prepareApi = path.join(
    root,
    "lib/journal-entry-governance/sandbox-je-execution-prepare-api.ts",
  );
  const prepareCore = path.join(
    root,
    "lib/journal-entry-governance/sandbox-two-person-prepare-core.ts",
  );
  const prepareRoute = path.join(
    root,
    "app/api/governed/journal-entries/sandbox/proposals/[proposalId]/prepare/route.ts",
  );
  const cockpitClient = path.join(
    root,
    "app/admin/sandbox-je/SandboxJeCockpitClient.tsx",
  );
  const activation = path.join(
    root,
    "lib/journal-entry-governance/je3d-first-controlled-create-activation.ts",
  );
  const indexBarrel = path.join(root, "lib/journal-entry-governance/index.ts");

  it("PREPARE_SANDBOX_JE defaults OFF in activation policy", () => {
    const src = fs.readFileSync(activation, "utf8");
    expect(src).toMatch(/PREPARE_SANDBOX_JE:\s*false/);
    expect(src).toMatch(/CREATE_SANDBOX_JE:\s*false/);
    expect(src).toMatch(/VERIFY_SANDBOX_JE:\s*false/);
    expect(src).toMatch(/sandboxDispatchKillSwitch:\s*true/);
  });

  it("prepare API forbids provider/token/QBO/Memory imports", () => {
    const src = fs.readFileSync(prepareApi, "utf8");
    expect(src).not.toMatch(/provider-attempt-service/);
    expect(src).not.toMatch(/token-resolver/);
    expect(src).not.toMatch(/provider-qbo-read/);
    expect(src).not.toMatch(/provider-create-service/);
    expect(src).not.toMatch(/verified-memory-projection/);
    expect(src).not.toMatch(/client-memory-service/);
    expect(src).toContain("assertPrepareCapabilityBeforeWrites");
    expect(src).toContain("assertStrictEmptyPrepareBody");
  });

  it("prepare core is not exported from index barrel", () => {
    const src = fs.readFileSync(indexBarrel, "utf8");
    expect(src).not.toMatch(/sandbox-two-person-prepare-core/);
    expect(src).not.toMatch(/sandbox-je-execution-prepare-api/);
    expect(src).not.toMatch(/demo-a-authoritative-connection/);
    expect(src).not.toMatch(/prepareGovernedJournalEntryExecutionWithCustodyOverrides/);
    expect(src).not.toMatch(/PrepareJeExecutionCustodyOverrideDeps/);
  });

  it("public PrepareJeExecutionDeps cannot accept custody payload/policy overrides", () => {
    const src = fs.readFileSync(
      path.join(root, "lib/journal-entry-governance/execution-service.ts"),
      "utf8",
    );
    const depsBlock = src.slice(
      src.indexOf("export type PrepareJeExecutionDeps"),
      src.indexOf("export type PrepareJeExecutionCustodyOverrideDeps"),
    );
    expect(depsBlock).not.toMatch(/buildExecutionEventPayload/);
    expect(depsBlock).not.toMatch(/canonicalizeExecutionPolicySnapshot/);
    expect(depsBlock).not.toMatch(/hashExecutionPolicy/);
    expect(src).toContain("prepareGovernedJournalEntryExecutionWithCustodyOverrides");
  });

  it("prepare route only exports POST", () => {
    const src = fs.readFileSync(prepareRoute, "utf8");
    expect(src).toContain("export async function POST");
    expect(src).not.toMatch(/export async function GET/);
    expect(src).toContain("guardSandboxJePrepareMutate");
  });

  it("cockpit shows PREPARE OFF and custody-only labeling", () => {
    const src = fs.readFileSync(cockpitClient, "utf8");
    expect(src).toContain("Prepare execution custody");
    expect(src).toContain("Custody preparation only — no QuickBooks posting");
    expect(src).toContain("Prepare execution (PREPARE OFF)");
    expect(src).toContain("historical reference only");
    const prepareSubmit = src.slice(
      src.indexOf("const submitPrepare"),
      src.indexOf("}, [proposal?.proposal_id]);") + "}, [proposal?.proposal_id]);".length,
    );
    expect(prepareSubmit).toContain("JSON.stringify({})");
    expect(prepareSubmit).not.toContain("clientMutationId");
  });

  it("authority snapshot binds preparation constants and Demo A identity", () => {
    const snapshot = canonicalizeSandboxTwoPersonExecutionPolicySnapshot();
    expect(snapshot.preparation_authority).toBe(
      SANDBOX_TWO_PERSON_PREPARE_AUTHORITY_V1,
    );
    expect(snapshot.preparation_mode).toBe("APPROVER_MECHANICAL_CUSTODY");
    expect(snapshot.canonical_connection_id).toBe(
      "dfef5e96-e717-4e3e-afac-fde0de1b5b23",
    );
    expect(snapshot.requireExecutorDifferentFromProposer).toBe(true);
    expect(snapshot.requireExecutorDifferentFromApprover).toBe(false);
    expect(snapshot.requireFreshMfa).toBe(true);
    expect(snapshot.locked_amount_cents).toBe(100);
    const hash = hashSandboxTwoPersonExecutionPolicy();
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("Patent #6 prepare payload contains required custody bindings", () => {
    const payload = buildSandboxTwoPersonPrepareEventPayload({
      execution: {
        id: "exec-1",
        proposal_id: SANDBOX_JE_ACCEPTED_PROPOSAL_ID,
        approval_id: SANDBOX_JE_ACCEPTED_APPROVAL_ID,
        company_id: "aaaaaaaa-2222-4222-8222-222222222222",
        engagement_id: "eng-1",
        source_continuous_close_run_id: "cc-1",
        source_accounting_sync_id: "sync-1",
        accounting_connection_id: "dfef5e96-e717-4e3e-afac-fde0de1b5b23",
        provider: "quickbooks",
        proposal_hash: "a".repeat(64),
        approval_policy_hash: "b".repeat(64),
        execution_policy_hash: "c".repeat(64),
        execution_hash: "d".repeat(64),
        idempotency_key: "e".repeat(64),
        status: "READY_TO_POST",
        correlation_marker: "ADVJE:exec-1",
        execution_policy_snapshot: {},
        preflight_result: { eligible: true, checks: [] },
        requested_by: SANDBOX_JE_DESIGNATED_APPROVER_USER_ID,
        requested_at: "2026-09-01T00:00:00.000Z",
        state_version: 2,
        firm_client_id: "aaaaaaaa-1111-4111-8111-111111111111",
        provider_journal_id: null,
        provider_request_hash: "f".repeat(64),
        provider_response_hash: null,
        last_error_code: null,
        last_error_message: null,
      },
      proposal: {
        id: SANDBOX_JE_ACCEPTED_PROPOSAL_ID,
        company_id: "aaaaaaaa-2222-4222-8222-222222222222",
        engagement_id: "eng-1",
        firm_client_id: "aaaaaaaa-1111-4111-8111-111111111111",
        period_end: "2026-08-31",
        source_continuous_close_run_id: "cc-1",
        source_accounting_sync_id: "sync-1",
        source_recon_run_ids: ["recon-1"],
        origin_type: "ACCRUAL",
        reason_code: "X",
        memo: "m",
        currency: "USD",
        txn_date: "2026-08-31",
        lines: [
          { sequence: 1, accountId: "15", debitCents: 100, creditCents: 0 },
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
        policy_hash: "b".repeat(64),
        proposal_hash: "a".repeat(64),
        status: "SUBMITTED",
        proposed_by: SANDBOX_JE_DESIGNATED_PROPOSER_USER_ID,
        proposed_at: "2026-09-01T00:00:00.000Z",
        idempotency_key: "x".repeat(64),
      },
      approval: {
        id: SANDBOX_JE_ACCEPTED_APPROVAL_ID,
        proposal_id: SANDBOX_JE_ACCEPTED_PROPOSAL_ID,
        company_id: "aaaaaaaa-2222-4222-8222-222222222222",
        engagement_id: "eng-1",
        proposal_hash: "a".repeat(64),
        policy_hash: "b".repeat(64),
        decision: "APPROVED",
        approval_mode: "REVIEW_REQUIRED",
        reviewer_user_id: SANDBOX_JE_DESIGNATED_APPROVER_USER_ID,
        reviewer_role: null,
        mfa_level: "aal2",
        mfa_verified_at: "2026-09-01T00:00:00.000Z",
        decision_reason: null,
        policy_snapshot: {},
        approved_at: "2026-09-01T00:00:00.000Z",
        idempotency_key: "y".repeat(64),
      },
      connection: {
        id: "dfef5e96-e717-4e3e-afac-fde0de1b5b23",
        tenant_or_realm_id: "9341457151063823",
        provider: "quickbooks",
        provider_environment: "sandbox",
      } as never,
      initiatingUserId: SANDBOX_JE_DESIGNATED_APPROVER_USER_ID,
      prepareAssurance: {
        satisfied: true,
        level: "aal2",
        verifiedAt: "2026-09-01T01:00:00.000Z",
        method: "totp",
        source: "mfa_step_up_cookie",
      },
      preflightEligible: true,
      preflightSummary: "all_checks_pass",
      providerRequestHash: "f".repeat(64),
    });

    for (const key of [
      "execution_id",
      "proposal_id",
      "proposal_hash",
      "approval_id",
      "approval_policy_hash",
      "approval_reviewer_user_id",
      "initiating_user_id",
      "prepare_mfa_level",
      "prepare_mfa_verified_at",
      "prepare_mfa_source",
      "preparation_authority",
      "preparation_mode",
      "accounting_connection_id",
      "realm_id",
      "provider_environment",
      "execution_policy_hash",
      "execution_hash",
      "idempotency_key",
      "correlation_marker",
      "provider_request_hash",
      "total_debits_cents",
      "currency",
      "txn_date",
      "account_ids",
      "status",
    ]) {
      expect(payload).toHaveProperty(key);
    }
  });
});

describe("sandbox JE prepare route guards", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns empty 404 in production before auth or DB", async () => {
    vi.stubEnv("QB_ENVIRONMENT", "production");
    const { guardSandboxJePrepareMutate } = await import(
      "../sandbox-je-execution-prepare-route"
    );
    const result = await guardSandboxJePrepareMutate({
      request: new Request("https://app.advisacor.com/api/x", { method: "POST" }),
      proposalId: SANDBOX_JE_ACCEPTED_PROPOSAL_ID,
      body: {},
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(404);
      const text = await result.response.text();
      expect(text).toBe("");
    }
  });

  it("rejects capability OFF before session resolution", async () => {
    vi.stubEnv("QB_ENVIRONMENT", "sandbox");
    const { guardSandboxJePrepareMutate } = await import(
      "../sandbox-je-execution-prepare-route"
    );
    const result = await guardSandboxJePrepareMutate({
      request: new Request("https://app.advisacor.com/api/x", {
        method: "POST",
        headers: {
          origin: "https://app.advisacor.com",
          "sec-fetch-site": "same-origin",
        },
      }),
      proposalId: SANDBOX_JE_ACCEPTED_PROPOSAL_ID,
      body: {},
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      const body = await result.response.json();
      expect(body.code).toBe("je_3d_prepare_capability_off");
    }
  });
});

describe("sandbox JE prepare route static boundary", () => {
  const root = process.cwd();
  const prepareRoute = path.join(
    root,
    "app/api/governed/journal-entries/sandbox/proposals/[proposalId]/prepare/route.ts",
  );

  it("prepare route does not import provider/token/QBO/Memory modules", () => {
    const src = fs.readFileSync(prepareRoute, "utf8");
    expect(src).not.toMatch(/provider-attempt-service/);
    expect(src).not.toMatch(/token-resolver/);
    expect(src).not.toMatch(/provider-qbo-read/);
    expect(src).not.toMatch(/provider-create-service/);
    expect(src).not.toMatch(/verified-memory-projection/);
    expect(src).not.toMatch(/client-memory-service/);
    expect(src).not.toMatch(/prepareGovernedJournalEntryExecution/);
    expect(src).toContain("guardSandboxJePrepareMutate");
    expect(src).toContain("prepareAcceptedDemoATwoPersonExecution");
  });
});

describe("sandbox JE prepare capability OFF guards", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("rejects prepare before DB when PREPARE capability is OFF", async () => {
    const { assertPrepareCapabilityBeforeWrites, SandboxJePrepareApiError } =
      await import("../sandbox-je-execution-prepare-api");
    expect(() => assertPrepareCapabilityBeforeWrites()).toThrow(
      SandboxJePrepareApiError,
    );
    try {
      assertPrepareCapabilityBeforeWrites();
    } catch (err) {
      expect((err as { code: string }).code).toBe("je_3d_prepare_capability_off");
    }
  });

  it("rejects non-empty body mass assignment", async () => {
    const { assertStrictEmptyPrepareBody, SandboxJePrepareApiError } =
      await import("../sandbox-je-execution-prepare-api");
    expect(() =>
      assertStrictEmptyPrepareBody({ approvalId: SANDBOX_JE_ACCEPTED_APPROVAL_ID }),
    ).toThrow(SandboxJePrepareApiError);
    expect(() =>
      assertStrictEmptyPrepareBody({ clientMutationId: "x" }),
    ).toThrow(SandboxJePrepareApiError);
    expect(() => assertStrictEmptyPrepareBody({})).not.toThrow();
    expect(() => assertStrictEmptyPrepareBody(null)).not.toThrow();
  });

  it("rejects proposer from prepare path", async () => {
    const { assertProposerForbiddenForPrepare, SandboxJePrepareApiError } =
      await import("../sandbox-je-execution-prepare-api");
    expect(() =>
      assertProposerForbiddenForPrepare(SANDBOX_JE_DESIGNATED_PROPOSER_USER_ID),
    ).toThrow(SandboxJePrepareApiError);
  });

  it("rejects missing MFA before mechanical prepare is invoked", async () => {
    vi.stubEnv("QB_ENVIRONMENT", "sandbox");
    vi.doMock("../je3d-activation-guards", async (importOriginal) => {
      const orig = await importOriginal<typeof import("../je3d-activation-guards")>();
      return { ...orig, assertJe3dPrepareActivationPolicy: vi.fn() };
    });
    vi.doMock("../approval-custody", async (importOriginal) => {
      const orig = await importOriginal<typeof import("../approval-custody")>();
      return {
        ...orig,
        resolveJeAuthenticationAssurance: vi.fn(async () => ({
          satisfied: false,
          level: "none",
          verifiedAt: null,
          method: null,
          source: "none",
        })),
      };
    });
    const coreSpy = vi.fn();
    vi.doMock("../sandbox-two-person-prepare-core", () => ({
      executeSandboxTwoPersonMechanicalPrepare: coreSpy,
    }));
    const { prepareAcceptedDemoATwoPersonExecution, SandboxJePrepareApiError } =
      await import("../sandbox-je-execution-prepare-api");
    await expect(
      prepareAcceptedDemoATwoPersonExecution({
        proposalId: SANDBOX_JE_ACCEPTED_PROPOSAL_ID,
        approverUserId: SANDBOX_JE_DESIGNATED_APPROVER_USER_ID,
        approverEmail: "jwiseman@advisacor.com",
        body: {},
      }),
    ).rejects.toThrow(SandboxJePrepareApiError);
    expect(coreSpy).not.toHaveBeenCalled();
  });
});

describe("sandbox JE prepare enabled-path (module mock only)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns READY_TO_POST when capability mocked ON and core succeeds", async () => {
    vi.stubEnv("QB_ENVIRONMENT", "sandbox");
    vi.doMock("../je3d-activation-guards", async (importOriginal) => {
      const orig = await importOriginal<typeof import("../je3d-activation-guards")>();
      return {
        ...orig,
        assertJe3dPrepareActivationPolicy: vi.fn(),
      };
    });
    vi.doMock("../approval-custody", async (importOriginal) => {
      const orig = await importOriginal<typeof import("../approval-custody")>();
      return {
        ...orig,
        resolveJeAuthenticationAssurance: vi.fn(async () => ({
          satisfied: true,
          level: "aal2",
          verifiedAt: "2026-09-01T01:00:00.000Z",
          method: "totp",
          source: "mfa_step_up_cookie",
        })),
      };
    });
    vi.doMock("../sandbox-two-person-prepare-core", () => ({
      executeSandboxTwoPersonMechanicalPrepare: vi.fn(async () => ({
        ok: true,
        reused: false,
        execution: {
          id: "exec-mock-1",
          proposal_id: SANDBOX_JE_ACCEPTED_PROPOSAL_ID,
          approval_id: SANDBOX_JE_ACCEPTED_APPROVAL_ID,
          status: "READY_TO_POST",
          execution_hash: "a".repeat(64),
          correlation_marker: "ADVJE:exec-mock-1",
          preflight_result: { eligible: true, checks: [] },
        },
        preflight: { eligible: true, checks: [] },
        ledgerEventIds: { requested: "ev-1", transition: "ev-2" },
      })),
    }));
    vi.doMock("@/lib/supabase-admin.js", () => ({
      getSupabaseAdmin: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: async () => ({ data: [], error: null }),
              }),
            }),
          }),
        }),
      }),
    }));

    const { prepareAcceptedDemoATwoPersonExecution } = await import(
      "../sandbox-je-execution-prepare-api"
    );
    const result = await prepareAcceptedDemoATwoPersonExecution({
      proposalId: SANDBOX_JE_ACCEPTED_PROPOSAL_ID,
      approverUserId: SANDBOX_JE_DESIGNATED_APPROVER_USER_ID,
      approverEmail: "jwiseman@advisacor.com",
      body: {},
    });
    expect(result.status).toBe("READY_TO_POST");
    expect(result.reused).toBe(false);
    expect(result.preparation_authority).toBe(
      SANDBOX_TWO_PERSON_PREPARE_AUTHORITY_V1,
    );
  });
});
