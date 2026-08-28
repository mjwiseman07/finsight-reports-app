import { describe, expect, it } from "vitest";
import { buildJe3dPreDispatchChecklistReport } from "../je3d-pre-dispatch-checklist";
import {
  JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY,
  JE_3D_VERIFIED_DEMO_A_IDENTITY,
} from "../je3d-first-controlled-create-activation";
import { JE_3D_SANDBOX_QBO_API_BASE } from "../je3d-activation-policy";
import { JE_ACTIVATION_DEMO_ROLE_DEMO_A } from "../je3d-sandbox-company-authority";

describe("JE-3D pre-dispatch checklist", () => {
  it("activation gates pass with resolved Demo A authority and kill switch ON", () => {
    const report = buildJe3dPreDispatchChecklistReport({
      policy: JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY,
      qbEnvironment: "sandbox",
      allowlist: {
        allowlistResolution: "resolved",
        demoA: {
          companyId: JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId,
          companyName: "Demo A",
          accountingConnectionId:
            JE_3D_VERIFIED_DEMO_A_IDENTITY.accountingConnectionId,
          realmId: JE_3D_VERIFIED_DEMO_A_IDENTITY.realmId,
          provider: "quickbooks",
          connectionStatus: "connected",
          providerEnvironment: "sandbox",
          demoRole: JE_ACTIVATION_DEMO_ROLE_DEMO_A,
        },
        allowedCompanyIds: [JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId],
        canonicalConnectionByCompanyId: {
          [JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId]:
            JE_3D_VERIFIED_DEMO_A_IDENTITY.accountingConnectionId,
        },
      },
    });

    expect(report.all_activation_gates_pass).toBe(true);
    expect(report.create_capability_on).toBe(true);
    expect(report.verify_capability_off).toBe(true);
    expect(report.kill_switch_blocks_dispatch).toBe(true);
    expect(report.memory_off).toBe(true);
    expect(report.worker_off).toBe(true);
    expect(report.governed_auto_off).toBe(true);
    expect(report.production_allowed_off).toBe(true);
    expect(report.sandbox_api_base_exact).toBe(JE_3D_SANDBOX_QBO_API_BASE);
    expect(report.qbo_post_made).toBe(false);
    expect(report.qbo_get_made).toBe(false);
  });

  it("rejects wrong company in allowlist resolution", () => {
    const report = buildJe3dPreDispatchChecklistReport({
      policy: JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY,
      qbEnvironment: "sandbox",
      allowlist: {
        allowlistResolution: "resolved",
        demoA: {
          companyId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          companyName: "Wrong Co",
          accountingConnectionId:
            JE_3D_VERIFIED_DEMO_A_IDENTITY.accountingConnectionId,
          realmId: JE_3D_VERIFIED_DEMO_A_IDENTITY.realmId,
          provider: "quickbooks",
          connectionStatus: "connected",
          providerEnvironment: "sandbox",
          demoRole: JE_ACTIVATION_DEMO_ROLE_DEMO_A,
        },
        allowedCompanyIds: ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"],
        canonicalConnectionByCompanyId: {},
      },
    });
    expect(report.demo_a_company_authority_resolved).toBe(false);
    expect(report.all_activation_gates_pass).toBe(false);
  });

  it("rejects production QB environment", () => {
    const report = buildJe3dPreDispatchChecklistReport({
      policy: JE_3D_FIRST_CONTROLLED_CREATE_ACTIVATION_POLICY,
      qbEnvironment: "production",
      allowlist: {
        allowlistResolution: "resolved",
        demoA: {
          companyId: JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId,
          companyName: "Demo A",
          accountingConnectionId:
            JE_3D_VERIFIED_DEMO_A_IDENTITY.accountingConnectionId,
          realmId: JE_3D_VERIFIED_DEMO_A_IDENTITY.realmId,
          provider: "quickbooks",
          connectionStatus: "connected",
          providerEnvironment: "sandbox",
          demoRole: JE_ACTIVATION_DEMO_ROLE_DEMO_A,
        },
        allowedCompanyIds: [JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId],
        canonicalConnectionByCompanyId: {},
      },
    });
    expect(report.qb_environment_sandbox).toBe(false);
    expect(report.all_activation_gates_pass).toBe(false);
  });
});
