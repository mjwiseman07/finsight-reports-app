import { describe, expect, it } from "vitest";
import { loadAuthoritativeObservationContext } from "../context";
import {
  AUTHORITATIVE_OBSERVATION_ERROR,
  AuthoritativeObservationError,
  type AuthoritativeObservationInput,
} from "../types";
import type { AuthoritativeContextDeps } from "../context";

const COMPANY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CONN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const policy = {
  policy_mode: "standard",
  auto_reconcile_max_dollar: 1,
  auto_reconcile_max_percent: 0.01,
  kickout_min_dollar: 50,
  kickout_min_percent: 0.05,
  authoritative_comparison: "tighter_of_both" as const,
};

function engagement(over: Record<string, unknown> = {}) {
  return {
    id: "eng-1",
    company_id: COMPANY,
    firm_id: null,
    firm_client_id: null,
    audit_period_end: "2026-07-31",
    ar_control_qbo_account_id: "84",
    ap_control_qbo_account_id: "33",
    inventory_control_qbo_account_id: "81",
    ...over,
  };
}

function pbcs() {
  return [
    { id: "pbc-ar", engagement_id: "eng-1", tie_out_kind: "ar_aging" },
    { id: "pbc-ap", engagement_id: "eng-1", tie_out_kind: "ap_aging" },
    { id: "pbc-inv", engagement_id: "eng-1", tie_out_kind: "inventory" },
  ];
}

function deps(over: Partial<AuthoritativeContextDeps> = {}): AuthoritativeContextDeps {
  return {
    authorize: async () => ({
      userId: "user-1",
      canRead: true,
      canWrite: true,
      scope: "company",
    }),
    loadEngagement: async () => engagement(),
    loadFirmClientCompanyId: async () => COMPANY,
    loadPolicy: async () => policy,
    loadPbcs: async () => pbcs(),
    selectConnection: async () => ({
      id: CONN,
      user_id: "user-1",
      provider: "quickbooks",
      tenant_or_realm_id: "realm-1",
      external_entity_id: "realm-1",
      external_entity_name: "Acme",
      access_token: "secret-token",
      metadata_json: {},
    }),
    ...over,
  };
}

const freshInput: AuthoritativeObservationInput = {
  mode: "FRESH_CAPTURE",
  engagementId: "eng-1",
  triggeredByUserId: "user-1",
  triggerReason: "manual",
};

describe("authoritative observation context loader", () => {
  it("6. missing audit_period_end fails", async () => {
    await expect(
      loadAuthoritativeObservationContext(
        freshInput,
        deps({ loadEngagement: async () => engagement({ audit_period_end: null }) }),
      ),
    ).rejects.toMatchObject({
      code: AUTHORITATIVE_OBSERVATION_ERROR.CLOSE_PERIOD_UNRESOLVED,
    });
  });

  it("7. closePeriodEnd mismatch fails", async () => {
    await expect(
      loadAuthoritativeObservationContext(
        { ...freshInput, closePeriodEnd: "2026-06-30" },
        deps(),
      ),
    ).rejects.toMatchObject({
      code: AUTHORITATIVE_OBSERVATION_ERROR.CLOSE_PERIOD_MISMATCH,
    });
  });

  it("8. missing AR account binding fails before connection select", async () => {
    let selected = false;
    await expect(
      loadAuthoritativeObservationContext(
        freshInput,
        deps({
          loadEngagement: async () =>
            engagement({ ar_control_qbo_account_id: null }),
          selectConnection: async () => {
            selected = true;
            return null;
          },
        }),
      ),
    ).rejects.toMatchObject({
      code: AUTHORITATIVE_OBSERVATION_ERROR.AR_ACCOUNT_ID_REQUIRED,
    });
    expect(selected).toBe(false);
  });

  it("9. missing AP binding fails", async () => {
    await expect(
      loadAuthoritativeObservationContext(
        freshInput,
        deps({
          loadEngagement: async () =>
            engagement({ ap_control_qbo_account_id: null }),
        }),
      ),
    ).rejects.toMatchObject({
      code: AUTHORITATIVE_OBSERVATION_ERROR.AP_ACCOUNT_ID_REQUIRED,
    });
  });

  it("10. missing Inventory binding fails", async () => {
    await expect(
      loadAuthoritativeObservationContext(
        freshInput,
        deps({
          loadEngagement: async () =>
            engagement({ inventory_control_qbo_account_id: null }),
        }),
      ),
    ).rejects.toMatchObject({
      code: AUTHORITATIVE_OBSERVATION_ERROR.INVENTORY_ACCOUNT_ID_REQUIRED,
    });
  });

  it("11. missing policy fails", async () => {
    await expect(
      loadAuthoritativeObservationContext(
        freshInput,
        deps({ loadPolicy: async () => null }),
      ),
    ).rejects.toMatchObject({
      code: AUTHORITATIVE_OBSERVATION_ERROR.NO_TOLERANCE_POLICY,
    });
  });

  it("12. missing/ambiguous AR PBC fails", async () => {
    await expect(
      loadAuthoritativeObservationContext(
        freshInput,
        deps({
          loadPbcs: async () =>
            pbcs().filter((row) => row.tie_out_kind !== "ar_aging"),
        }),
      ),
    ).rejects.toMatchObject({ code: AUTHORITATIVE_OBSERVATION_ERROR.MISSING_PBC_AR });

    await expect(
      loadAuthoritativeObservationContext(
        freshInput,
        deps({
          loadPbcs: async () => [
            ...pbcs(),
            { id: "pbc-ar-2", engagement_id: "eng-1", tie_out_kind: "ar_aging" },
          ],
        }),
      ),
    ).rejects.toMatchObject({
      code: AUTHORITATIVE_OBSERVATION_ERROR.AMBIGUOUS_PBC_AR,
    });
  });

  it("13. missing/ambiguous AP PBC fails", async () => {
    await expect(
      loadAuthoritativeObservationContext(
        freshInput,
        deps({
          loadPbcs: async () =>
            pbcs().filter((row) => row.tie_out_kind !== "ap_aging"),
        }),
      ),
    ).rejects.toMatchObject({ code: AUTHORITATIVE_OBSERVATION_ERROR.MISSING_PBC_AP });
  });

  it("14. missing/ambiguous Inventory PBC fails", async () => {
    await expect(
      loadAuthoritativeObservationContext(
        freshInput,
        deps({
          loadPbcs: async () => [
            ...pbcs(),
            { id: "pbc-inv-2", engagement_id: "eng-1", tie_out_kind: "inventory" },
          ],
        }),
      ),
    ).rejects.toMatchObject({
      code: AUTHORITATIVE_OBSERVATION_ERROR.AMBIGUOUS_PBC_INVENTORY,
    });
  });

  it("15. caller-supplied PBC wrong kind/engagement fails", async () => {
    await expect(
      loadAuthoritativeObservationContext(
        {
          ...freshInput,
          pbcRequestIds: { ar: "pbc-ap" },
        },
        deps(),
      ),
    ).rejects.toMatchObject({
      code: AUTHORITATIVE_OBSERVATION_ERROR.PBC_CALLER_MISMATCH,
    });
  });

  it("16. cross-company authorization fails", async () => {
    await expect(
      loadAuthoritativeObservationContext(
        freshInput,
        deps({ authorize: async () => null }),
      ),
    ).rejects.toBeInstanceOf(AuthoritativeObservationError);
    await expect(
      loadAuthoritativeObservationContext(
        freshInput,
        deps({
          authorize: async () => ({
            userId: "user-other",
            canRead: true,
            canWrite: true,
            scope: "company",
          }),
        }),
      ),
    ).rejects.toMatchObject({
      code: AUTHORITATIVE_OBSERVATION_ERROR.WRITE_FORBIDDEN,
    });
  });

  it("resolves canonical period, bindings, PBCs, and connection identity", async () => {
    const ctx = await loadAuthoritativeObservationContext(freshInput, deps());
    expect(ctx.periodEnd).toBe("2026-07-31");
    expect(ctx.reportPeriod).toEqual({
      startDate: "2026-07-01",
      endDate: "2026-07-31",
    });
    expect(ctx.arAccountId).toBe("84");
    expect(ctx.apAccountId).toBe("33");
    expect(ctx.inventoryAccountId).toBe("81");
    expect(ctx.pbcRequestIds).toEqual({
      ar: "pbc-ar",
      ap: "pbc-ap",
      inventory: "pbc-inv",
    });
    expect(ctx.connectionId).toBe(CONN);
    expect(ctx.companyId).toBe(COMPANY);
  });
});
