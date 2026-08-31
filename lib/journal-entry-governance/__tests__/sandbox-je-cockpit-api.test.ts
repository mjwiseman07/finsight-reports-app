// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

const {
  getSupabaseAdminMock,
  inspectMock,
  resolveAllowlistMock,
  loadExactExecutionMock,
  resolveSuperAdminAccessMock,
  rateLimitMock,
} = vi.hoisted(() => ({
  getSupabaseAdminMock: vi.fn(),
  inspectMock: vi.fn(),
  resolveAllowlistMock: vi.fn(),
  loadExactExecutionMock: vi.fn(),
  resolveSuperAdminAccessMock: vi.fn(),
  rateLimitMock: vi.fn(),
}));

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: getSupabaseAdminMock,
}));

vi.mock("../je3d-activation-inspection", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../je3d-activation-inspection")
  >();
  return {
    ...actual,
    inspectGovernedJeActivationCustody: inspectMock,
  };
});

vi.mock("../je3d-sandbox-company-authority", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../je3d-sandbox-company-authority")
  >();
  return {
    ...actual,
    resolveSandboxActivationAllowlist: resolveAllowlistMock,
  };
});

vi.mock("../provider-attempt-service", () => ({
  loadExactExecution: loadExactExecutionMock,
}));

vi.mock("@/lib/super-admin-security", () => ({
  resolveSuperAdminAccess: resolveSuperAdminAccessMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: rateLimitMock,
}));

import {
  JE_3D_ACTIVATION_ERROR,
  Je3dActivationError,
} from "../je3d-activation-policy";
import {
  JE_3D_VERIFIED_DEMO_A_IDENTITY,
} from "../je3d-first-controlled-create-activation";
import {
  buildSandboxAllowlistFromRows,
  JE_ACTIVATION_DEMO_ROLE_DEMO_A,
} from "../je3d-sandbox-company-authority";
import {
  buildActivationInspectionFromCustody,
} from "../je3d-activation-inspection";
import type { JournalEntryExecutionRow } from "../execution-types";
import {
  LEDGER_EVENTS_PATENT6_CHAIN_SELECT,
} from "../ledger-events-schema";
import {
  SANDBOX_JE_COCKPIT_CANADIAN_REALM_EXCLUDED,
  SANDBOX_JE_COCKPIT_RATE_LIMIT_KEY,
  SANDBOX_JE_COCKPIT_VERIFIED_EXECUTION_ID,
  SANDBOX_JE_COCKPIT_VERIFIED_PROVIDER_JOURNAL_ID,
  assertSandboxCockpitQbEnvironment,
  buildSafeAllowlistResponse,
  fetchSandboxAllowlistForCockpit,
  fetchSandboxChecklistForCockpit,
  fetchSandboxInspectionForCockpit,
  rejectSandboxCockpitRequestOverrides,
  resolveSandboxCockpitCapabilityState,
} from "../sandbox-je-cockpit-api";
import { formatDispatchKillSwitchLabel } from "../sandbox-je-cockpit-shared";
import { JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY } from "../je3d-first-controlled-create-activation";

function mockPatent6ChainSupabase(rows: Record<string, unknown>[]) {
  const finalOrder = vi.fn().mockResolvedValue({ data: rows, error: null });
  const firstOrder = vi.fn().mockReturnValue({ order: finalOrder });
  const secondEq = vi.fn().mockReturnValue({ order: firstOrder });
  const firstEq = vi.fn().mockReturnValue({ eq: secondEq });
  const select = vi.fn().mockReturnValue({ eq: firstEq });
  getSupabaseAdminMock.mockReturnValue({
    from: vi.fn().mockReturnValue({ select }),
  });
  return { select };
}

function patent6ChainRows() {
  return [
    {
      event_id: "evt-1",
      event_type: "journal_entry.provider_dispatch_started",
      event_hash: "h1",
      previous_event_hash: null,
      chain_index: 0,
      event_sequence: 1,
      aggregate_type: "journal_entry_execution",
      aggregate_id: SANDBOX_JE_COCKPIT_VERIFIED_EXECUTION_ID,
      occurred_at: "2026-08-28T11:00:00.000Z",
      recorded_at: "2026-08-28T11:00:00.000Z",
    },
    {
      event_id: "evt-2",
      event_type: "journal_entry.provider_posted",
      event_hash: "h2",
      previous_event_hash: "h1",
      chain_index: 1,
      event_sequence: 2,
      aggregate_type: "journal_entry_execution",
      aggregate_id: SANDBOX_JE_COCKPIT_VERIFIED_EXECUTION_ID,
      occurred_at: "2026-08-28T11:30:00.000Z",
      recorded_at: "2026-08-28T11:30:00.000Z",
    },
    {
      event_id: "evt-verify",
      event_type: "journal_entry.verified",
      event_hash: "h3",
      previous_event_hash: "h2",
      chain_index: 2,
      event_sequence: 3,
      aggregate_type: "journal_entry_execution",
      aggregate_id: SANDBOX_JE_COCKPIT_VERIFIED_EXECUTION_ID,
      occurred_at: "2026-08-28T12:00:00.000Z",
      recorded_at: "2026-08-28T12:00:00.000Z",
    },
  ];
}

function canonicalDemoAAllowlist() {
  return buildSandboxAllowlistFromRows({
    connections: [
      {
        id: JE_3D_VERIFIED_DEMO_A_IDENTITY.accountingConnectionId,
        provider: "quickbooks",
        status: "connected",
        provider_environment: "sandbox",
        tenant_or_realm_id: JE_3D_VERIFIED_DEMO_A_IDENTITY.realmId,
        external_entity_id: null,
        metadata_json: { company_id: JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId },
      },
    ],
    companies: [
      {
        id: JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId,
        name: "Demo A",
        qbo_realm_id: JE_3D_VERIFIED_DEMO_A_IDENTITY.realmId,
        je_activation_demo_role: JE_ACTIVATION_DEMO_ROLE_DEMO_A,
      },
    ],
  });
}

function duplicateDemoAAllowlist() {
  const base = {
    provider: "quickbooks",
    status: "connected",
    provider_environment: "sandbox",
    tenant_or_realm_id: JE_3D_VERIFIED_DEMO_A_IDENTITY.realmId,
    external_entity_id: null,
    metadata_json: { company_id: JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId },
  };
  return buildSandboxAllowlistFromRows({
    connections: [
      { ...base, id: "conn-a" },
      { ...base, id: "conn-b" },
    ],
    companies: [
      {
        id: JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId,
        name: "Demo A",
        qbo_realm_id: JE_3D_VERIFIED_DEMO_A_IDENTITY.realmId,
        je_activation_demo_role: JE_ACTIVATION_DEMO_ROLE_DEMO_A,
      },
    ],
  });
}

function verifiedInspectionView() {
  const execution: JournalEntryExecutionRow = {
    id: SANDBOX_JE_COCKPIT_VERIFIED_EXECUTION_ID,
    proposal_id: "prop-verified",
    approval_id: "appr-verified",
    company_id: JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId,
    engagement_id: "eng-1",
    firm_client_id: JE_3D_VERIFIED_DEMO_A_IDENTITY.firmClientId,
    source_continuous_close_run_id: "cc-1",
    source_accounting_sync_id: "sync-1",
    accounting_connection_id: JE_3D_VERIFIED_DEMO_A_IDENTITY.accountingConnectionId,
    provider: "quickbooks",
    proposal_hash: "a".repeat(64),
    approval_policy_hash: "b".repeat(64),
    execution_policy_hash: "c".repeat(64),
    execution_hash: "d".repeat(64),
    idempotency_key: "e".repeat(64),
    status: "VERIFIED",
    correlation_marker: "ADVJE:08bbbd62",
    execution_policy_snapshot: {},
    preflight_result: { eligible: true, checks: [] },
    requested_by: "user-1",
    requested_at: "2026-08-15T00:00:00.000Z",
    state_version: 4,
    provider_journal_id: SANDBOX_JE_COCKPIT_VERIFIED_PROVIDER_JOURNAL_ID,
    provider_request_hash: "f".repeat(64),
    provider_response_hash: "0".repeat(64),
    provider_readback_hash: "1".repeat(64),
    last_error_code: null,
    last_error_message: null,
    verified_at: "2026-08-28T12:00:00.000Z",
    verification_ledger_event_id: "evt-verify",
  };

  return buildActivationInspectionFromCustody({
    execution,
    attempt: {
      id: "attempt-1",
      execution_id: SANDBOX_JE_COCKPIT_VERIFIED_EXECUTION_ID,
      status: "VERIFIED_PROVIDER_ID",
      commit_certainty: "COMMITTED",
      qbo_je_id: SANDBOX_JE_COCKPIT_VERIFIED_PROVIDER_JOURNAL_ID,
      intuit_tid: "tid-1",
      provider_request_hash: "f".repeat(64),
      provider_response_hash: "0".repeat(64),
      reserved_at: "2026-08-28T11:00:00.000Z",
      sent_at: "2026-08-28T11:01:00.000Z",
      completed_at: "2026-08-28T11:02:00.000Z",
      created_at: "2026-08-28T11:00:00.000Z",
      updated_at: "2026-08-28T11:02:00.000Z",
      discovery_summary: {},
      provider_error_code: null,
      provider_error_message: null,
    } as unknown as import("../provider-attempt-types").JournalEntryProviderAttemptRow,
    ledgerEvents: [
      {
        event_id: "evt-dispatch",
        event_type: "journal_entry.provider_dispatch_started",
        chain_index: 0,
        event_sequence: 1,
      },
      {
        event_id: "evt-posted",
        event_type: "journal_entry.provider_posted",
        chain_index: 1,
        event_sequence: 2,
      },
      {
        event_id: "evt-verify",
        event_type: "journal_entry.verified",
        chain_index: 2,
        event_sequence: 3,
      },
    ],
    proposal: {
      id: "prop-verified",
      firm_client_id: JE_3D_VERIFIED_DEMO_A_IDENTITY.firmClientId,
      engagement_id: "eng-1",
      origin_type: "manual",
      txn_date: "2026-08-28",
      currency: "USD",
      memo: "Sandbox verified JE",
      total_debits_cents: 2500,
      total_credits_cents: 2500,
      lines: [
        {
          accountId: "acc-expense",
          debitCents: 2500,
          creditCents: 0,
          classId: null,
        },
        {
          accountId: "acc-liability",
          debitCents: 0,
          creditCents: 2500,
          classId: null,
        },
      ],
      proposal_hash: "a".repeat(64),
      status: "approved",
      created_at: "2026-08-28T10:00:00.000Z",
      updated_at: "2026-08-28T10:00:00.000Z",
    } as never,
    realmId: JE_3D_VERIFIED_DEMO_A_IDENTITY.realmId,
    sandboxDemoRole: JE_3D_VERIFIED_DEMO_A_IDENTITY.demoRole,
    canonicalSandboxConnectionId:
      JE_3D_VERIFIED_DEMO_A_IDENTITY.accountingConnectionId,
  });
}

describe("sandbox JE cockpit API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.QB_ENVIRONMENT = "sandbox";
    resolveAllowlistMock.mockResolvedValue(canonicalDemoAAllowlist());
    inspectMock.mockResolvedValue(verifiedInspectionView());
    loadExactExecutionMock.mockResolvedValue({
      id: SANDBOX_JE_COCKPIT_VERIFIED_EXECUTION_ID,
      verified_at: "2026-08-28T12:00:00.000Z",
    });
    mockPatent6ChainSupabase(patent6ChainRows());
  });

  afterEach(() => {
    delete process.env.QB_ENVIRONMENT;
  });

  it("requires sandbox QB_ENVIRONMENT", () => {
    process.env.QB_ENVIRONMENT = "production";
    expect(() => assertSandboxCockpitQbEnvironment()).toThrow(Je3dActivationError);
  });

  it("resolves canonical Demo A allowlist only", () => {
    const payload = buildSafeAllowlistResponse(canonicalDemoAAllowlist());
    expect(payload.demo_a?.company_id).toBe(
      JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId,
    );
    expect(payload.demo_a?.realm_id).toBe(JE_3D_VERIFIED_DEMO_A_IDENTITY.realmId);
    expect(payload.verified_provider_journal_id).toBe("223");
  });

  it("rejects ambiguous duplicate-connection allowlist", () => {
    expect(() =>
      buildSafeAllowlistResponse(duplicateDemoAAllowlist()),
    ).toThrow(Je3dActivationError);
  });

  it("rejects Canadian realm in allowlist response builder", () => {
    const caAllowlist = buildSandboxAllowlistFromRows({
      connections: [
        {
          id: "conn-ca",
          provider: "quickbooks",
          status: "connected",
          provider_environment: "sandbox",
          tenant_or_realm_id: SANDBOX_JE_COCKPIT_CANADIAN_REALM_EXCLUDED,
          external_entity_id: null,
          metadata_json: {
            company_id: JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId,
          },
        },
      ],
      companies: [
        {
          id: JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId,
          name: "CA sandbox",
          qbo_realm_id: SANDBOX_JE_COCKPIT_CANADIAN_REALM_EXCLUDED,
          je_activation_demo_role: JE_ACTIVATION_DEMO_ROLE_DEMO_A,
        },
      ],
    });
    expect(() => buildSafeAllowlistResponse(caAllowlist)).toThrow(
      Je3dActivationError,
    );
  });

  it("rejects request identity overrides", () => {
    const req = new Request(
      "http://localhost/api/governed/journal-entries/sandbox/allowlist?realmId=9341457539236929",
    );
    expect(() => rejectSandboxCockpitRequestOverrides(req)).toThrow(
      Je3dActivationError,
    );
  });

  it("selects authoritative ledger_events columns for Patent #6 chain load", async () => {
    const { select } = mockPatent6ChainSupabase(patent6ChainRows());
    await fetchSandboxInspectionForCockpit(
      SANDBOX_JE_COCKPIT_VERIFIED_EXECUTION_ID,
    );
    expect(select).toHaveBeenCalledWith(LEDGER_EVENTS_PATENT6_CHAIN_SELECT);
    expect(String(select.mock.calls[0]?.[0])).not.toContain("created_at");
  });

  it("returns verified JE 223 inspection with Patent #6 chain fields", async () => {
    const payload = await fetchSandboxInspectionForCockpit(
      SANDBOX_JE_COCKPIT_VERIFIED_EXECUTION_ID,
    );
    expect(payload.inspection.qbo_je_id).toBe("223");
    expect(payload.inspection.execution_status).toBe("VERIFIED");
    expect(payload.patent6_chain_receipt.events).toHaveLength(3);
    expect(payload.patent6_chain_receipt.events[1]?.previous_event_hash).toBe(
      "h1",
    );
    expect(payload.patent6_chain_receipt.events[2]?.event_id).toBe("evt-verify");
    expect(payload.patent6_chain_receipt.events[0]?.occurred_at).toBe(
      "2026-08-28T11:00:00.000Z",
    );
    expect(payload.inspection.provider_attempt_id).toBe("attempt-1");
    expect(payload.memory_is_display_context_only).toBe(true);
  });

  it("rejects wrong execution company/connection custody", async () => {
    inspectMock.mockResolvedValue({
      ...verifiedInspectionView(),
      company_id: "wrong-company",
    });
    await expect(
      fetchSandboxInspectionForCockpit(SANDBOX_JE_COCKPIT_VERIFIED_EXECUTION_ID),
    ).rejects.toMatchObject({
      code: JE_3D_ACTIVATION_ERROR.COMPANY_NOT_ALLOWLISTED,
    });
  });

  it("checklist is read-only and reports capabilities OFF / kill switch ON", async () => {
    const payload = await fetchSandboxChecklistForCockpit(
      SANDBOX_JE_COCKPIT_VERIFIED_EXECUTION_ID,
    );
    expect(payload.post_disabled).toBe(true);
    expect(payload.verify_disabled).toBe(true);
    expect(payload.capabilities.create_sandbox_je).toBe(false);
    expect(payload.capabilities.verify_sandbox_je).toBe(false);
    expect(payload.capabilities.memory).toBe(false);
    expect(payload.capabilities.worker).toBe(false);
    expect(payload.capabilities.governed_auto).toBe(false);
    expect(payload.capabilities.dispatch_kill_switch_engaged).toBe(true);
    expect(payload.checklist.kill_switch_blocks_dispatch).toBe(true);
    expect(payload.checklist.create_capability_on).toBe(false);
  });

  it("capability state remains fail-closed", () => {
    const caps = resolveSandboxCockpitCapabilityState();
    expect(caps.post_disabled).toBe(true);
    expect(caps.verify_disabled).toBe(true);
    expect(caps.dispatch_kill_switch_engaged).toBe(true);
  });

  it("dispatch kill switch label is unambiguous (engaged blocks dispatch)", () => {
    expect(formatDispatchKillSwitchLabel(true)).toBe("ON (dispatch blocked)");
    expect(formatDispatchKillSwitchLabel(false)).toBe("OFF (dispatch permitted)");
  });

  it("fail-closed activation policy maps to engaged dispatch kill switch", () => {
    expect(
      JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY.sandboxDispatchKillSwitch,
    ).toBe(true);
    const caps = resolveSandboxCockpitCapabilityState();
    expect(caps.dispatch_kill_switch_engaged).toBe(
      JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY.sandboxDispatchKillSwitch,
    );
    expect(formatDispatchKillSwitchLabel(caps.dispatch_kill_switch_engaged)).toBe(
      "ON (dispatch blocked)",
    );
  });

  it("allowlist response exposes engaged kill switch without inverting semantics", () => {
    const payload = buildSafeAllowlistResponse(canonicalDemoAAllowlist());
    expect(payload.capabilities.dispatch_kill_switch_engaged).toBe(true);
    expect(payload.capabilities.post_disabled).toBe(true);
    expect(payload.capabilities.verify_disabled).toBe(true);
    expect(formatDispatchKillSwitchLabel(payload.capabilities.dispatch_kill_switch_engaged)).toBe(
      "ON (dispatch blocked)",
    );
  });

  it("fetchSandboxAllowlistForCockpit fails closed in production env", async () => {
    process.env.QB_ENVIRONMENT = "production";
    await expect(fetchSandboxAllowlistForCockpit()).rejects.toMatchObject({
      code: JE_3D_ACTIVATION_ERROR.PRODUCTION_ENV_FORBIDDEN,
    });
  });
});

describe("sandbox JE cockpit routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.QB_ENVIRONMENT = "sandbox";
    rateLimitMock.mockReturnValue(null);
    resolveSuperAdminAccessMock.mockResolvedValue({
      userId: "admin-1",
      email: "admin@example.com",
    });
    resolveAllowlistMock.mockResolvedValue(canonicalDemoAAllowlist());
    inspectMock.mockResolvedValue(verifiedInspectionView());
    loadExactExecutionMock.mockResolvedValue({
      id: SANDBOX_JE_COCKPIT_VERIFIED_EXECUTION_ID,
      verified_at: "2026-08-28T12:00:00.000Z",
    });
    getSupabaseAdminMock.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }),
      }),
    });
  });

  afterEach(() => {
    delete process.env.QB_ENVIRONMENT;
  });

  it("denies unauthenticated allowlist access", async () => {
    resolveSuperAdminAccessMock.mockResolvedValue({
      response: NextResponse.json({ error: "Missing token" }, { status: 401 }),
    });
    const { GET } = await import(
      "@/app/api/governed/journal-entries/sandbox/allowlist/route"
    );
    const res = await GET(new Request("http://localhost/api/governed/journal-entries/sandbox/allowlist"));
    expect(res.status).toBe(401);
  });

  it("applies rate limiting", async () => {
    rateLimitMock.mockReturnValue(
      NextResponse.json({ error: "Too many requests" }, { status: 429 }),
    );
    const { GET } = await import(
      "@/app/api/governed/journal-entries/sandbox/allowlist/route"
    );
    const res = await GET(new Request("http://localhost/api/governed/journal-entries/sandbox/allowlist"));
    expect(res.status).toBe(429);
    expect(rateLimitMock).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({ key: SANDBOX_JE_COCKPIT_RATE_LIMIT_KEY }),
    );
  });

  it("allows super-admin allowlist access in sandbox", async () => {
    const { GET } = await import(
      "@/app/api/governed/journal-entries/sandbox/allowlist/route"
    );
    const res = await GET(new Request("http://localhost/api/governed/journal-entries/sandbox/allowlist"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.demo_a.company_id).toBe(JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId);
  });

  it("production environment rejects sandbox endpoints", async () => {
    process.env.QB_ENVIRONMENT = "production";
    const { GET } = await import(
      "@/app/api/governed/journal-entries/sandbox/allowlist/route"
    );
    const res = await GET(new Request("http://localhost/api/governed/journal-entries/sandbox/allowlist"));
    expect(res.status).toBe(403);
  });

  it("inspection route rejects provider journal override query param", async () => {
    const { GET } = await import(
      "@/app/api/governed/journal-entries/executions/[executionId]/inspection/route"
    );
    const res = await GET(
      new Request(
        `http://localhost/api/governed/journal-entries/executions/${SANDBOX_JE_COCKPIT_VERIFIED_EXECUTION_ID}/inspection?providerJournalId=999`,
      ),
      { params: Promise.resolve({ executionId: SANDBOX_JE_COCKPIT_VERIFIED_EXECUTION_ID }) },
    );
    expect(res.status).toBe(403);
  });
});

describe("sandbox JE cockpit static safety scans", () => {
  const root = process.cwd();
  const governedRoot = path.join(root, "app/api/governed/journal-entries");

  it("does not import legacy/direct poster modules", () => {
    const files = [
      path.join(governedRoot, "sandbox/allowlist/route.ts"),
      path.join(
        governedRoot,
        "executions/[executionId]/inspection/route.ts",
      ),
      path.join(
        governedRoot,
        "executions/[executionId]/checklist/route.ts",
      ),
    ];
    for (const file of files) {
      const src = fs.readFileSync(file, "utf8");
      expect(src).not.toMatch(/legacy-je-posting-service/);
      expect(src).not.toMatch(/qboJournalEntryPoster/);
      expect(src).not.toMatch(/journal-entry-poster/);
    }
  });

  it("does not define mutation HTTP handlers under governed sandbox routes", () => {
    const files = fs
      .readdirSync(governedRoot, { recursive: true })
      .filter((name): name is string => typeof name === "string" && name.endsWith("route.ts"))
      .map((name) => path.join(governedRoot, name));
    for (const file of files) {
      const src = fs.readFileSync(file, "utf8");
      expect(src).not.toMatch(/export async function POST/);
      expect(src).not.toMatch(/export async function PUT/);
      expect(src).not.toMatch(/export async function PATCH/);
      expect(src).not.toMatch(/export async function DELETE/);
    }
  });

  it("cockpit client has no POST/VERIFY controls", () => {
    const src = fs.readFileSync(
      path.join(root, "app/admin/sandbox-je/SandboxJeCockpitClient.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/method:\s*"POST"/);
    expect(src).not.toMatch(/method:\s*"PUT"/);
    expect(src).toMatch(/POST DISABLED/);
    expect(src).toMatch(/VERIFY DISABLED/);
  });

  it("cockpit client renders dispatch kill switch without inverted double-negative", () => {
    const src = fs.readFileSync(
      path.join(root, "app/admin/sandbox-je/SandboxJeCockpitClient.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/\binverted\b/);
    expect(src).toMatch(/DispatchKillSwitchBadge/);
    expect(src).toMatch(/dispatch_kill_switch_engaged/);
    expect(src).toMatch(/ON \(dispatch blocked\)/);
    expect(src).not.toMatch(/capabilities\.kill_switch/);
    expect(src).not.toMatch(/label="kill switch"/);
  });
});
