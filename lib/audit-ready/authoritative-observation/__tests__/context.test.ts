import { describe, expect, it } from "vitest";
import type { EngagementActor } from "@/lib/audit-ready/server-auth";
import { loadAuthoritativeObservationContext } from "../context";
import {
  AUTHORITATIVE_OBSERVATION_ERROR,
  type AuthoritativeObservationExecutionContext,
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

function pbcs(engagementId = "eng-1") {
  return [
    { id: "pbc-ar", engagement_id: engagementId, tie_out_kind: "ar_aging" },
    { id: "pbc-ap", engagement_id: engagementId, tie_out_kind: "ap_aging" },
    { id: "pbc-inv", engagement_id: engagementId, tie_out_kind: "inventory" },
  ];
}

function writer(over: Partial<EngagementActor> = {}): EngagementActor {
  return {
    userId: "user-1",
    canRead: true,
    canWrite: true,
    scope: "company",
    ...over,
  };
}

function executionContext(userId = "user-1"): AuthoritativeObservationExecutionContext {
  return { principal: { type: "user", userId } };
}

function deps(over: Partial<AuthoritativeContextDeps> = {}): AuthoritativeContextDeps {
  return {
    loadEngagement: async () => engagement(),
    authorize: async ({ userId }) => writer({ userId }),
    loadFirmClientCompanyId: async () => COMPANY,
    loadPolicy: async () => policy,
    loadPbcs: async () => pbcs(),
    selectConnection: async ({ userId }) => ({
      id: CONN,
      user_id: userId,
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
  triggerReason: "manual",
};

describe("authoritative observation context loader", () => {
  it("6. missing audit_period_end fails", async () => {
    await expect(
      loadAuthoritativeObservationContext(
        freshInput,
        executionContext(),
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
        executionContext(),
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
        executionContext(),
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
        executionContext(),
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
        executionContext(),
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
        executionContext(),
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
        executionContext(),
        deps({
          loadPbcs: async () =>
            pbcs().filter((row) => row.tie_out_kind !== "ar_aging"),
        }),
      ),
    ).rejects.toMatchObject({ code: AUTHORITATIVE_OBSERVATION_ERROR.MISSING_PBC_AR });

    await expect(
      loadAuthoritativeObservationContext(
        freshInput,
        executionContext(),
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
        executionContext(),
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
        executionContext(),
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
        executionContext(),
        deps(),
      ),
    ).rejects.toMatchObject({
      code: AUTHORITATIVE_OBSERVATION_ERROR.PBC_CALLER_MISMATCH,
    });
  });

  it("16. missing principal and system principal fail closed", async () => {
    await expect(
      loadAuthoritativeObservationContext(
        freshInput,
        undefined as never,
        deps(),
      ),
    ).rejects.toMatchObject({
      code: AUTHORITATIVE_OBSERVATION_ERROR.AUTHENTICATED_ACTOR_REQUIRED,
    });
    await expect(
      loadAuthoritativeObservationContext(
        freshInput,
        { principal: { type: "system", service: "cron" } },
        deps(),
      ),
    ).rejects.toMatchObject({
      code: AUTHORITATIVE_OBSERVATION_ERROR.UNSUPPORTED_PRINCIPAL,
    });
  });

  it("resolves canonical period, bindings, PBCs, and connection identity", async () => {
    const ctx = await loadAuthoritativeObservationContext(
      freshInput,
      executionContext(),
      deps(),
    );
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
    expect(ctx.triggeredByUserId).toBe("user-1");
    expect(ctx.actor).toEqual(writer());
  });
});

describe("authoritative observation engagement-scoped authorization", () => {
  it("1. writer for Engagement A cannot execute Engagement B", async () => {
    const lookedUp: string[] = [];
    await expect(
      loadAuthoritativeObservationContext(
        { ...freshInput, engagementId: "eng-b" },
        executionContext("user-a"),
        deps({
          loadEngagement: async (id) => engagement({ id }),
          loadPbcs: async (id) => pbcs(id),
          authorize: async ({ engagementId, userId }) => {
            lookedUp.push(engagementId);
            if (engagementId === "eng-1" && userId === "user-a") {
              return writer({ userId, scope: "company" });
            }
            return null;
          },
        }),
      ),
    ).rejects.toMatchObject({
      code: AUTHORITATIVE_OBSERVATION_ERROR.WRITE_FORBIDDEN,
    });
    expect(lookedUp).toEqual(["eng-b"]);
  });

  it("2. verified identity alone is not enough; engagement lookup must run", async () => {
    let authorized: { engagementId: string; userId: string } | null = null;
    await loadAuthoritativeObservationContext(
      freshInput,
      executionContext("user-1"),
      deps({
        authorize: async (args) => {
          authorized = args;
          return writer({ userId: args.userId });
        },
      }),
    );
    expect(authorized).toEqual({ engagementId: "eng-1", userId: "user-1" });
  });

  it("3. cached actor.canWrite=true cannot bypass engagement permission lookup", async () => {
    let authorized = false;
    await expect(
      loadAuthoritativeObservationContext(
        freshInput,
        {
          principal: {
            type: "user",
            userId: "ordinary-user",
            actor: {
              userId: "super-admin-id",
              canRead: true,
              canWrite: true,
              scope: "super_admin",
            },
          },
        } as never,
        deps({
          authorize: async ({ userId, engagementId }) => {
            authorized = true;
            expect(engagementId).toBe("eng-1");
            expect(userId).toBe("ordinary-user");
            return writer({ userId, canWrite: false, scope: "company" });
          },
        }),
      ),
    ).rejects.toMatchObject({
      code: AUTHORITATIVE_OBSERVATION_ERROR.WRITE_FORBIDDEN,
    });
    expect(authorized).toBe(true);
  });

  it("4. verified company writer for requested engagement succeeds", async () => {
    const ctx = await loadAuthoritativeObservationContext(
      freshInput,
      executionContext("company-writer"),
      deps({
        authorize: async ({ userId }) => writer({ userId, scope: "company" }),
      }),
    );
    expect(ctx.actor).toEqual(writer({ userId: "company-writer", scope: "company" }));
    expect(ctx.triggeredByUserId).toBe("company-writer");
  });

  it("5. verified firm writer for requested engagement succeeds", async () => {
    const ctx = await loadAuthoritativeObservationContext(
      freshInput,
      executionContext("firm-writer"),
      deps({
        authorize: async ({ userId }) => writer({ userId, scope: "firm" }),
      }),
    );
    expect(ctx.actor.scope).toBe("firm");
    expect(ctx.actor.userId).toBe("firm-writer");
    expect(ctx.actor.canWrite).toBe(true);
  });

  it("6. verified read-only user fails", async () => {
    await expect(
      loadAuthoritativeObservationContext(
        freshInput,
        executionContext("reader-1"),
        deps({
          authorize: async ({ userId }) =>
            writer({ userId, canWrite: false, scope: "company" }),
        }),
      ),
    ).rejects.toMatchObject({
      code: AUTHORITATIVE_OBSERVATION_ERROR.WRITE_FORBIDDEN,
    });
  });

  it("7. verified user with no membership for requested engagement fails", async () => {
    await expect(
      loadAuthoritativeObservationContext(
        freshInput,
        executionContext("stranger"),
        deps({ authorize: async () => null }),
      ),
    ).rejects.toMatchObject({
      code: AUTHORITATIVE_OBSERVATION_ERROR.WRITE_FORBIDDEN,
    });
  });

  it("8. verified super-admin identity succeeds", async () => {
    const ctx = await loadAuthoritativeObservationContext(
      freshInput,
      executionContext("super-admin-id"),
      deps({
        authorize: async ({ userId }) =>
          writer({ userId, scope: "super_admin" }),
      }),
    );
    expect(ctx.actor.scope).toBe("super_admin");
    expect(ctx.actor.userId).toBe("super-admin-id");
    expect(ctx.triggeredByUserId).toBe("super-admin-id");
  });

  it("9. leftover super-admin triggeredByUserId is still impersonation", async () => {
    let authorized = false;
    await expect(
      loadAuthoritativeObservationContext(
        { ...freshInput, triggeredByUserId: "super-admin-id" } as never,
        executionContext("ordinary-user"),
        deps({
          authorize: async () => {
            authorized = true;
            return writer({ userId: "ordinary-user" });
          },
        }),
      ),
    ).rejects.toMatchObject({
      code: AUTHORITATIVE_OBSERVATION_ERROR.TRIGGERED_BY_IMPERSONATION,
    });
    expect(authorized).toBe(false);
  });

  it("10. connection selection receives the engagement-authorized verified user id", async () => {
    const selected: string[] = [];
    const ctx = await loadAuthoritativeObservationContext(
      freshInput,
      executionContext("verified-writer"),
      deps({
        authorize: async ({ userId }) => writer({ userId, scope: "company" }),
        selectConnection: async ({ userId }) => {
          selected.push(userId);
          return {
            id: CONN,
            user_id: userId,
            provider: "quickbooks",
            tenant_or_realm_id: "realm-1",
            external_entity_id: "realm-1",
            external_entity_name: "Acme",
            access_token: "secret-token",
            metadata_json: {},
          };
        },
      }),
    );
    expect(selected).toEqual(["verified-writer"]);
    expect(ctx.triggeredByUserId).toBe("verified-writer");
    expect(ctx.actor.userId).toBe("verified-writer");
  });
});
