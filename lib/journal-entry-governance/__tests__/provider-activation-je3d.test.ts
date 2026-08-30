/**
 * JE-3D — Controlled sandbox activation layer tests.
 * No live QBO POST/GET. No provider-attempt rows. Mocks/injected transports only.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  JE_3D_ACTIVATION_POLICY,
  JE_3D_ACTIVATION_ERROR,
  JE_3D_SANDBOX_QBO_API_BASE,
  isJe3dCreateCapabilityEnabled,
  isJe3dVerifyCapabilityEnabled,
} from "../je3d-activation-policy";
import {
  classifyQbEnvironment,
  assertJe3dSandboxQboEnvironment,
  rejectCallerTransportOverrides,
} from "../je3d-sandbox-environment";
import {
  buildSandboxAllowlistFromRows,
  assertExecutionOnAllowlistedSandbox,
  assertTokenRealmMatchesConnection,
  JE_ACTIVATION_DEMO_ROLE_DEMO_A,
} from "../je3d-sandbox-company-authority";
import {
  assertJe3dCreateActivationPolicy,
  assertJe3dVerifyActivationPolicy,
} from "../je3d-activation-guards";
import {
  resolveJe3dActivationPolicy,
  JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY,
  JE_3D_VERIFIED_DEMO_A_IDENTITY,
  isVerifiedDemoAIdentityMatch,
} from "../je3d-first-controlled-create-activation";
import {
  buildActivationInspectionFromCustody,
  inspectGovernedJeActivationCustody,
} from "../je3d-activation-inspection";
import { executeGovernedJournalEntryCreate } from "../provider-create-service";
import { verifyGovernedJournalEntry } from "../provider-verification-service";
import { postGovernedQboJournalEntryOnce } from "../provider-qbo-create-transport";
import { hashProviderRequestPreview } from "../execution-hash";
import { mapGovernedProposalToQboPayload } from "../execution-payload";
import { JE_3B2_FEATURE_GATE } from "../je3b2-feature-gate";
import { JE_3C_FEATURE_GATE } from "../je3c-feature-gate";
import { JE_MEMORY_PROJECTION_CONTRACT } from "../memory-projection-contract";
import type { JournalEntryExecutionRow } from "../execution-types";
import * as packageIndex from "../index";

const USER = "user-1";

import type { Je3dActivationPolicyView } from "../je3d-activation-policy";

function enabledCreatePolicy(): Je3dActivationPolicyView {
  return {
    ...JE_3D_ACTIVATION_POLICY,
    capabilities: {
      CREATE_SANDBOX_JE: true,
      VERIFY_SANDBOX_JE: false,
    },
    sandboxDispatchKillSwitch: false,
  };
}

function enabledVerifyPolicy(): Je3dActivationPolicyView {
  return {
    ...JE_3D_ACTIVATION_POLICY,
    capabilities: {
      CREATE_SANDBOX_JE: false,
      VERIFY_SANDBOX_JE: true,
    },
    sandboxDispatchKillSwitch: false,
  };
}

function execution(
  over: Partial<JournalEntryExecutionRow> = {},
): JournalEntryExecutionRow {
  return {
    id: "exec-1",
    proposal_id: "prop-1",
    approval_id: "appr-1",
    company_id: "co-demo-a",
    engagement_id: "eng-1",
    firm_client_id: "fc-1",
    source_continuous_close_run_id: "cc-1",
    source_accounting_sync_id: "sync-1",
    accounting_connection_id: "conn-demo-a",
    provider: "quickbooks",
    proposal_hash: "a".repeat(64),
    approval_policy_hash: "a".repeat(64),
    execution_policy_hash: "a".repeat(64),
    execution_hash: "a".repeat(64),
    idempotency_key: "a".repeat(64),
    status: "POSTING",
    correlation_marker: "ADVJE:exec-1",
    execution_policy_snapshot: {},
    preflight_result: { eligible: true, checks: [] },
    requested_by: USER,
    requested_at: "2026-08-15T00:00:00.000Z",
    state_version: 1,
    provider_journal_id: null,
    provider_request_hash: "b".repeat(64),
    provider_response_hash: null,
    provider_readback_hash: null,
    last_error_code: null,
    last_error_message: null,
    ...over,
  };
}

function exactSandboxDemoARow(over: {
  connId?: string;
  companyId?: string;
  realm?: string;
  companyName?: string;
} = {}) {
  const companyId = over.companyId ?? "co-demo-a";
  const connId = over.connId ?? "conn-demo-a";
  const realm = over.realm ?? "9341457151063823";
  return {
    connections: [
      {
        id: connId,
        provider: "quickbooks",
        status: "connected",
        provider_environment: "sandbox",
        tenant_or_realm_id: realm,
        external_entity_id: null,
        metadata_json: { company_id: companyId },
      },
    ],
    companies: [
      {
        id: companyId,
        name: over.companyName ?? "Demo Accounting Group",
        qbo_realm_id: realm,
        je_activation_demo_role: JE_ACTIVATION_DEMO_ROLE_DEMO_A,
      },
    ],
  };
}

function demoAAllowlist() {
  return buildSandboxAllowlistFromRows(exactSandboxDemoARow());
}

describe("JE-3D full-cycle closed activation", () => {
  it("keeps CREATE/VERIFY/Memory/worker/GOVERNED_AUTO/production OFF; kill switch ON", () => {
    const p = resolveJe3dActivationPolicy();
    expect(p).toEqual(JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY);
    expect(isJe3dCreateCapabilityEnabled(p)).toBe(false);
    expect(isJe3dVerifyCapabilityEnabled(p)).toBe(false);
    expect(p.memoryWriteAllowed).toBe(false);
    expect(p.workerAllowed).toBe(false);
    expect(p.governedAutoAllowed).toBe(false);
    expect(p.productionAllowed).toBe(false);
    expect(p.sandboxDispatchKillSwitch).toBe(true);
  });

  it("verified Demo A identity matcher is exact", () => {
    expect(
      isVerifiedDemoAIdentityMatch({
        companyId: JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId,
        accountingConnectionId: JE_3D_VERIFIED_DEMO_A_IDENTITY.accountingConnectionId,
        realmId: JE_3D_VERIFIED_DEMO_A_IDENTITY.realmId,
        providerEnvironment: JE_3D_VERIFIED_DEMO_A_IDENTITY.providerEnvironment,
        demoRole: JE_3D_VERIFIED_DEMO_A_IDENTITY.demoRole,
      }),
    ).toBe(true);
    expect(
      isVerifiedDemoAIdentityMatch({
        companyId: "other",
        accountingConnectionId: JE_3D_VERIFIED_DEMO_A_IDENTITY.accountingConnectionId,
        realmId: JE_3D_VERIFIED_DEMO_A_IDENTITY.realmId,
        providerEnvironment: JE_3D_VERIFIED_DEMO_A_IDENTITY.providerEnvironment,
        demoRole: JE_3D_VERIFIED_DEMO_A_IDENTITY.demoRole,
      }),
    ).toBe(false);
  });
});

describe("JE-3D activation policy defaults", () => {
  it("two-key capabilities default OFF; compile-time JE gates remain false", () => {
    expect(JE_3D_ACTIVATION_POLICY.mode).toBe("CONTROLLED_SANDBOX");
    expect(isJe3dCreateCapabilityEnabled()).toBe(false);
    expect(isJe3dVerifyCapabilityEnabled()).toBe(false);
    expect(JE_3B2_FEATURE_GATE.governedCreateEnabled).toBe(false);
    expect(JE_3C_FEATURE_GATE.verificationEnabled).toBe(false);
    expect(JE_3D_ACTIVATION_POLICY.allowedCompanyIds).toEqual([]);
    expect(JE_3D_ACTIVATION_POLICY.memoryWriteAllowed).toBe(false);
    expect(JE_3D_ACTIVATION_POLICY.workerAllowed).toBe(false);
    expect(JE_3D_ACTIVATION_POLICY.governedAutoAllowed).toBe(false);
    expect(JE_3D_ACTIVATION_POLICY.productionAllowed).toBe(false);
    expect(JE_MEMORY_PROJECTION_CONTRACT.je3cWritesMemory).toBe(false);
  });

  it("create ON does not imply verification ON", () => {
    const p = enabledCreatePolicy();
    expect(isJe3dCreateCapabilityEnabled(p)).toBe(true);
    expect(isJe3dVerifyCapabilityEnabled(p)).toBe(false);
  });

  it("verification ON does not permit POST (create capability stays off)", () => {
    const p = enabledVerifyPolicy();
    expect(isJe3dVerifyCapabilityEnabled(p)).toBe(true);
    expect(isJe3dCreateCapabilityEnabled(p)).toBe(false);
  });
});

describe("JE-3D QB_ENVIRONMENT sandbox enforcement", () => {
  const prev = process.env.QB_ENVIRONMENT;

  afterEach(() => {
    process.env.QB_ENVIRONMENT = prev;
  });

  it("1 production QB_ENVIRONMENT rejected", () => {
    expect(classifyQbEnvironment("production").ok).toBe(false);
    expect(() => assertJe3dSandboxQboEnvironment("production")).toThrow(
      /production/i,
    );
  });

  it("2 missing QB_ENVIRONMENT rejected", () => {
    expect(classifyQbEnvironment(undefined).ok).toBe(false);
    expect(classifyQbEnvironment("").ok).toBe(false);
  });

  it("3 invalid QB_ENVIRONMENT rejected", () => {
    expect(classifyQbEnvironment("prod").ok).toBe(false);
    expect(classifyQbEnvironment("staging").ok).toBe(false);
  });

  it("4 sandbox accepted with exact governed API base", () => {
    const r = classifyQbEnvironment("sandbox");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.apiBase).toBe(JE_3D_SANDBOX_QBO_API_BASE);
    expect(assertJe3dSandboxQboEnvironment("sandbox")).toBe(
      JE_3D_SANDBOX_QBO_API_BASE,
    );
  });
});

describe("JE-3D company allowlist authority", () => {
  it("5 non-allowlisted company rejected", () => {
    const allowlist = demoAAllowlist();
    expect(() =>
      assertExecutionOnAllowlistedSandbox({
        executionCompanyId: "co-other",
        executionConnectionId: "conn-demo-a",
        allowlist,
      }),
    ).toThrow(/allowlist/i);
  });

  it("6 production connected QBO alone does not enter allowlist", () => {
    const allowlist = buildSandboxAllowlistFromRows({
      connections: [
        {
          id: "conn-prod",
          provider: "quickbooks",
          status: "connected",
          provider_environment: "production",
          tenant_or_realm_id: "999999999",
          external_entity_id: null,
          metadata_json: { company_id: "co-prod" },
        },
      ],
      companies: [
        {
          id: "co-prod",
          name: "Production Client",
          qbo_realm_id: "999999999",
          je_activation_demo_role: JE_ACTIVATION_DEMO_ROLE_DEMO_A,
        },
      ],
    });
    expect(allowlist.allowlistResolution).toBe("unresolved");
    expect(allowlist.allowedCompanyIds).toEqual([]);
  });

  it("7 wrong canonical connection rejected", () => {
    const allowlist = demoAAllowlist();
    expect(() =>
      assertExecutionOnAllowlistedSandbox({
        executionCompanyId: "co-demo-a",
        executionConnectionId: "conn-wrong",
        allowlist,
      }),
    ).toThrow(/canonical/i);
  });

  it("8 token realm mismatch rejected", () => {
    expect(() =>
      assertTokenRealmMatchesConnection({
        tokenRealmId: "111",
        connectionRealmId: "222",
      }),
    ).toThrow(/realm/i);
  });
});

describe("JE-3D durable sandbox identity authority (production negatives)", () => {
  it("A only production connected QBO → no allowlist", () => {
    const allowlist = buildSandboxAllowlistFromRows({
      connections: [
        {
          id: "conn-prod",
          provider: "quickbooks",
          status: "connected",
          provider_environment: "production",
          tenant_or_realm_id: "9341454381415870",
          external_entity_id: null,
          metadata_json: { company_id: "co-prod" },
        },
      ],
      companies: [
        {
          id: "co-prod",
          name: "Live Client",
          qbo_realm_id: "9341454381415870",
          je_activation_demo_role: JE_ACTIVATION_DEMO_ROLE_DEMO_A,
        },
      ],
    });
    expect(allowlist.allowlistResolution).toBe("unresolved");
    expect(allowlist.demoA).toBeNull();
  });

  it("B production company name contains Demo Accounting Group → no allowlist", () => {
    const allowlist = buildSandboxAllowlistFromRows({
      connections: [
        {
          id: "conn-prod",
          provider: "quickbooks",
          status: "connected",
          provider_environment: "production",
          tenant_or_realm_id: "111",
          external_entity_id: null,
          metadata_json: { company_id: "co-prod" },
        },
      ],
      companies: [
        {
          id: "co-prod",
          name: "Demo Accounting Group",
          qbo_realm_id: "111",
          je_activation_demo_role: null,
        },
      ],
    });
    expect(allowlist.allowlistResolution).toBe("unresolved");
  });

  it("C production connection with demo role metadata but environment=production → no allowlist", () => {
    const allowlist = buildSandboxAllowlistFromRows({
      connections: [
        {
          id: "conn-prod",
          provider: "quickbooks",
          status: "connected",
          provider_environment: "production",
          tenant_or_realm_id: "222",
          external_entity_id: null,
          metadata_json: { company_id: "co-prod", demo_role: "DEMO_A" },
        },
      ],
      companies: [
        {
          id: "co-prod",
          name: "Whatever",
          qbo_realm_id: "222",
          je_activation_demo_role: JE_ACTIVATION_DEMO_ROLE_DEMO_A,
        },
      ],
    });
    expect(allowlist.allowlistResolution).toBe("unresolved");
  });

  it("D sandbox connection UNCLASSIFIED (no demo role) → no allowlist", () => {
    const allowlist = buildSandboxAllowlistFromRows({
      connections: [
        {
          id: "conn-sb",
          provider: "quickbooks",
          status: "connected",
          provider_environment: "sandbox",
          tenant_or_realm_id: "333",
          external_entity_id: null,
          metadata_json: { company_id: "co-sb" },
        },
      ],
      companies: [
        {
          id: "co-sb",
          name: "Demo Accounting Group",
          qbo_realm_id: "333",
          je_activation_demo_role: null,
        },
      ],
    });
    expect(allowlist.allowlistResolution).toBe("unresolved");
  });

  it("E sandbox DEMO_B only → no allowlist", () => {
    const allowlist = buildSandboxAllowlistFromRows({
      connections: [
        {
          id: "conn-b",
          provider: "quickbooks",
          status: "connected",
          provider_environment: "sandbox",
          tenant_or_realm_id: "444",
          external_entity_id: null,
          metadata_json: { company_id: "co-b" },
        },
      ],
      companies: [
        {
          id: "co-b",
          name: "Fixed Asset Specialty",
          qbo_realm_id: "444",
          je_activation_demo_role: "DEMO_B_SPECIALTY",
        },
      ],
    });
    expect(allowlist.allowlistResolution).toBe("unresolved");
  });

  it("F one exact sandbox DEMO_A + production rows → only sandbox DEMO_A allowed", () => {
    const allowlist = buildSandboxAllowlistFromRows({
      connections: [
        ...exactSandboxDemoARow().connections,
        {
          id: "conn-prod",
          provider: "quickbooks",
          status: "connected",
          provider_environment: "production",
          tenant_or_realm_id: "999",
          external_entity_id: null,
          metadata_json: { company_id: "co-prod" },
        },
      ],
      companies: [
        ...exactSandboxDemoARow().companies,
        {
          id: "co-prod",
          name: "Demo Accounting Group",
          qbo_realm_id: "999",
          je_activation_demo_role: JE_ACTIVATION_DEMO_ROLE_DEMO_A,
        },
      ],
    });
    expect(allowlist.allowlistResolution).toBe("resolved");
    expect(allowlist.demoA?.companyId).toBe("co-demo-a");
    expect(allowlist.allowedCompanyIds).toEqual(["co-demo-a"]);
  });

  it("G two exact sandbox DEMO_A rows → ambiguous; no silent choice", () => {
    const allowlist = buildSandboxAllowlistFromRows({
      connections: [
        {
          id: "conn-a1",
          provider: "quickbooks",
          status: "connected",
          provider_environment: "sandbox",
          tenant_or_realm_id: "111",
          external_entity_id: null,
          metadata_json: { company_id: "co-a1" },
        },
        {
          id: "conn-a2",
          provider: "quickbooks",
          status: "connected",
          provider_environment: "sandbox",
          tenant_or_realm_id: "222",
          external_entity_id: null,
          metadata_json: { company_id: "co-a2" },
        },
      ],
      companies: [
        {
          id: "co-a1",
          name: "Demo A One",
          qbo_realm_id: "111",
          je_activation_demo_role: JE_ACTIVATION_DEMO_ROLE_DEMO_A,
        },
        {
          id: "co-a2",
          name: "Demo A Two",
          qbo_realm_id: "222",
          je_activation_demo_role: JE_ACTIVATION_DEMO_ROLE_DEMO_A,
        },
      ],
    });
    expect(allowlist.allowlistResolution).toBe("ambiguous");
    expect(allowlist.demoA).toBeNull();
    expect(() =>
      assertExecutionOnAllowlistedSandbox({
        executionCompanyId: "co-a1",
        executionConnectionId: "conn-a1",
        allowlist,
      }),
    ).toThrow(/authorities resolved/i);
  });

  it("zero exact Demo A → unresolved", () => {
    const allowlist = buildSandboxAllowlistFromRows({ connections: [], companies: [] });
    expect(allowlist.allowlistResolution).toBe("unresolved");
    expect(allowlist.allowedCompanyIds).toEqual([]);
  });

  it("exact one sandbox Demo A → resolved with durable fields", () => {
    const allowlist = demoAAllowlist();
    expect(allowlist.allowlistResolution).toBe("resolved");
    expect(allowlist.demoA?.providerEnvironment).toBe("sandbox");
    expect(allowlist.demoA?.demoRole).toBe(JE_ACTIVATION_DEMO_ROLE_DEMO_A);
    expect(allowlist.allowedCompanyIds).toEqual(["co-demo-a"]);
  });

  it("company name is not activation authority (metadata demo_role ignored)", () => {
    const allowlist = buildSandboxAllowlistFromRows({
      connections: [
        {
          id: "conn-x",
          provider: "quickbooks",
          status: "connected",
          provider_environment: "sandbox",
          tenant_or_realm_id: "555",
          external_entity_id: null,
          metadata_json: { company_id: "co-x", demo_role: "DEMO_A" },
        },
      ],
      companies: [
        {
          id: "co-x",
          name: "Demo Accounting Group Advisory",
          qbo_realm_id: "555",
          je_activation_demo_role: null,
        },
      ],
    });
    expect(allowlist.allowlistResolution).toBe("unresolved");
  });
});

describe("JE-3D caller override rejection", () => {
  it("9-11 caller cannot supply realm/connection/provider ID/API host", () => {
    expect(() =>
      rejectCallerTransportOverrides({ callerRealmId: "r" }),
    ).toThrow(/forbidden/i);
    expect(() =>
      rejectCallerTransportOverrides({ callerConnectionId: "c" }),
    ).toThrow(/forbidden/i);
    expect(() =>
      rejectCallerTransportOverrides({ callerProviderId: "99" }),
    ).toThrow(/forbidden/i);
    expect(() =>
      rejectCallerTransportOverrides({ callerApiHost: "https://evil" }),
    ).toThrow(/forbidden/i);
    expect(() =>
      rejectCallerTransportOverrides({ callerAccessToken: "tok" }),
    ).toThrow(/forbidden/i);
    expect(() =>
      rejectCallerTransportOverrides({ callerCompanyId: "co" }),
    ).toThrow(/forbidden/i);
  });
});

describe("JE-3D capability gates", () => {
  const prev = process.env.QB_ENVIRONMENT;
  beforeEach(() => {
    process.env.QB_ENVIRONMENT = "sandbox";
  });
  afterEach(() => {
    process.env.QB_ENVIRONMENT = prev;
  });

  it("12 create capability OFF and dispatch kill switch ON", () => {
    expect(() => assertJe3dCreateActivationPolicy()).toThrow(/CREATE_SANDBOX_JE/);
    expect(isJe3dCreateCapabilityEnabled(resolveJe3dActivationPolicy())).toBe(false);
    expect(resolveJe3dActivationPolicy().sandboxDispatchKillSwitch).toBe(true);
  });

  it("13 verification capability OFF", () => {
    expect(() => assertJe3dVerifyActivationPolicy()).toThrow(/VERIFY_SANDBOX_JE/);
    expect(isJe3dVerifyCapabilityEnabled(resolveJe3dActivationPolicy())).toBe(false);
  });

  it("24 kill switch blocks new dispatch when create capability enabled", () => {
    const policy: Je3dActivationPolicyView = {
      ...enabledCreatePolicy(),
      sandboxDispatchKillSwitch: true,
    };
    expect(() => assertJe3dCreateActivationPolicy(policy)).toThrow(
      /kill switch/i,
    );
  });

  it("27 kill switch does not block verification capability check path", () => {
    const policy: Je3dActivationPolicyView = {
      ...enabledVerifyPolicy(),
      sandboxDispatchKillSwitch: true,
    };
    expect(() => assertJe3dVerifyActivationPolicy(policy)).not.toThrow();
  });
});

describe("JE-3D transport invariants", () => {
  it("21 one POST maximum enforced by transport contract", async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: { JournalEntry: { Id: "99" } },
      text: "{}",
      intuit_tid: "tid",
    }));
    const r = await postGovernedQboJournalEntryOnce({
      accountingConnectionId: "conn-1",
      realmId: "realm",
      accessToken: "tok",
      wireBody: {
        TxnDate: "2026-08-15",
        PrivateNote: "x",
        Line: [],
      },
      apiBase: JE_3D_SANDBOX_QBO_API_BASE,
      fetchFn,
    });
    expect(r.postAttempts).toBe(1);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("22 transport contains no internal retry loop", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/journal-entry-governance/provider-qbo-create-transport.ts"),
      "utf8",
    );
    expect(src).toContain("Exactly one POST");
    expect(src).not.toMatch(/for\s*\(.*retry/i);
    expect(src).not.toMatch(/while\s*\(.*retry/i);
  });

  it("28 public create wiring does not use legacy poster", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/journal-entry-governance/provider-create-service.ts"),
      "utf8",
    );
    expect(src).not.toContain("qboJournalEntryPoster");
    expect(src).toContain("runGovernedJournalEntryCreateOrchestration");
    expect(src).toContain("assertJe3dCreateActivationPolicy");
  });

  it("public verification wiring does not chain POST", () => {
    const src = readFileSync(
      join(
        process.cwd(),
        "lib/journal-entry-governance/provider-verification-service.ts",
      ),
      "utf8",
    );
    expect(src).not.toContain("executeGovernedJournalEntryCreate");
    expect(src).toContain("runGovernedJournalEntryVerification");
  });
});

describe("JE-3D activation inspection", () => {
  it("32 inspection contains complete Patent #6 custody chain fields", () => {
    const proposal = {
      id: "prop-1",
      company_id: "co-demo-a",
      engagement_id: "eng-1",
      firm_client_id: "fc-1",
      source_continuous_close_run_id: "cc-1",
      source_accounting_sync_id: "sync-1",
      origin_type: "ACCRUAL" as const,
      reason_code: "cutoff",
      memo: "July accrual",
      currency: "USD",
      txn_date: "2026-08-15",
      lines: [
        {
          sequence: 1,
          accountId: "exp-7",
          debitCents: 2500,
          creditCents: 0,
          description: "Advertising",
        },
        {
          sequence: 2,
          accountId: "liab-1",
          debitCents: 0,
          creditCents: 2500,
          description: "Accrued",
        },
      ],
      total_debits_cents: 2500,
      total_credits_cents: 2500,
      period_end: "2026-08-31",
      policy_snapshot: {},
      proposal_hash: "c".repeat(64),
      policy_hash: "d".repeat(64),
      idempotency_key: "e".repeat(64),
      proposed_by: USER,
      proposed_at: "2026-08-15T00:00:00.000Z",
      status: "SUBMITTED" as const,
      expected_effects: [],
      source_recon_run_ids: [],
    };
    const alignedProviderHash = hashProviderRequestPreview(
      mapGovernedProposalToQboPayload({
        proposal,
        correlationMarker: "ADVJE:exec-1",
      }) as unknown as Record<string, unknown>,
    );
    const view = buildActivationInspectionFromCustody({
      execution: execution({
        status: "READY_TO_POST",
        provider_journal_id: null,
        provider_response_hash: null,
        verification_ledger_event_id: null,
        proposal_hash: proposal.proposal_hash,
        approval_policy_hash: "d".repeat(64),
        execution_hash: "e".repeat(64),
        provider_request_hash: alignedProviderHash,
      }),
      proposal,
      realmId: "9341457151063823",
      accountNames: new Map([
        ["exp-7", "Advertising"],
        ["liab-1", "Accrued Liabilities"],
      ]),
      attempt: {
        id: "att-1",
        execution_id: "exec-1",
        accounting_connection_id: "conn-demo-a",
        provider: "quickbooks",
        provider_request_hash: alignedProviderHash,
        correlation_marker: "ADVJE:exec-1",
        status: "RESPONSE_RECEIVED",
        commit_certainty: "COMMITTED",
        request_started_at: "2026-08-15T00:00:00.000Z",
        request_completed_at: "2026-08-15T00:01:00.000Z",
        qbo_je_id: "99",
        intuit_tid: "tid-post",
        provider_response_hash: "b".repeat(64),
        provider_error_code: null,
        provider_error_message: null,
        discovery_summary: {},
        created_at: "2026-08-15T00:00:00.000Z",
        updated_at: "2026-08-15T00:01:00.000Z",
      },
      ledgerEvents: [
        {
          event_id: "evt-dispatch",
          event_type: "journal_entry.provider_dispatch_started",
          created_at: "t1",
        },
        {
          event_id: "evt-posted",
          event_type: "journal_entry.provider_posted",
          created_at: "t2",
        },
      ],
      sandboxDemoRole: "DEMO_A_GENERAL_ACCOUNTING",
      canonicalSandboxConnectionId: "conn-demo-a",
    });
    expect(view.proposal_id).toBe("prop-1");
    expect(view.approval_id).toBe("appr-1");
    expect(view.execution_id).toBe("exec-1");
    expect(view.dispatch_receipt_id).toBe("evt-dispatch");
    expect(view.provider_outcome_receipt_id).toBe("evt-posted");
    expect(view.qbo_je_id).toBe("99");
    expect(view.provider_request_hash).toBe(alignedProviderHash);
    expect(view.correlation_marker).toBe("ADVJE:exec-1");
    expect(view.proposal_hash).toBe("c".repeat(64));
    expect(view.approval_policy_hash).toBe("d".repeat(64));
    expect(view.execution_hash).toBe("e".repeat(64));
    expect(view.realm_id).toBe("9341457151063823");
    expect(view.je_lines).toHaveLength(2);
    expect(view.total_debits_cents).toBe(2500);
    expect(view.qbo_post_made).toBe(false);
    expect(view.private_note_contains_marker).toBe(true);
    expect(view.provider_request_hash_reconstructs).toBe(true);
  });

  it("25 kill switch still permits inspection (sandbox custody only)", async () => {
    const prev = process.env.QB_ENVIRONMENT;
    process.env.QB_ENVIRONMENT = "sandbox";
    try {
      const view = await inspectGovernedJeActivationCustody("exec-1", {
        loadExecution: async () => execution({ status: "POSTED_UNVERIFIED" }),
        loadProposal: async () => null as unknown as import("../types").JournalEntryProposalRow,
        loadAttempt: async () => null,
        loadLedgerEvents: async () => [],
        guardDeps: {
          resolveAllowlist: async () => demoAAllowlist(),
        },
      });
      expect(view.execution_id).toBe("exec-1");
    } finally {
      process.env.QB_ENVIRONMENT = prev;
    }
  });
});

describe("JE-3D package surface", () => {
  it("exports activation policy + inspection; not production wiring internals", () => {
    const exported = Object.keys(packageIndex);
    expect(exported).toContain("JE_3D_ACTIVATION_POLICY");
    expect(exported).toContain("inspectGovernedJeActivationCustody");
    expect(exported).not.toContain("buildJe3dProductionCreateDeps");
    expect(exported).not.toContain("buildJe3dProductionVerificationDeps");
    expect(exported).not.toContain("runGovernedJournalEntryCreateOrchestration");
    expect(exported).not.toContain("runGovernedJournalEntryVerification");
  });

  it("29 no Memory write; 30 no worker; 31 no GOVERNED_AUTO", () => {
    expect(JE_3D_ACTIVATION_POLICY.memoryWriteAllowed).toBe(false);
    expect(JE_3D_ACTIVATION_POLICY.workerAllowed).toBe(false);
    expect(JE_3D_ACTIVATION_POLICY.governedAutoAllowed).toBe(false);
  });
});

