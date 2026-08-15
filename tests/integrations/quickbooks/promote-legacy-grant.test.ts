/**
 * Repair-path planning + execute semantics for legacy→canonical QBO promotion.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { planPromoteLegacyQboGrant } from "@/lib/integrations/quickbooks/promote-legacy-grant-plan";
import {
  bindExistingCompanyRealmVerified,
  executePromoteLegacyQboGrant,
} from "@/lib/integrations/quickbooks/promote-legacy-grant-execute";

const baseLegacy = {
  id: "e53c49f0-9686-44eb-b0ea-040ceedd02e4",
  userId: "a4ebf834-a698-4f79-a945-8498f2e6c45d",
  realmId: "9341454381415870",
  legacyTable: "quickbooks_connections" as const,
  hasAccessToken: true,
  hasRefreshToken: true,
  tokenExpiry: "2099-01-01T00:00:00.000Z",
};

const firmClient = {
  id: "c93b36e2-7f55-4581-a2b2-b43143763890",
  ownerUserId: "a4ebf834-a698-4f79-a945-8498f2e6c45d",
  companyId: "c93b36e2-7f55-4581-a2b2-b43143763889",
};

describe("planPromoteLegacyQboGrant", () => {
  it("plans bind_existing_company when firm-client company realm is NULL", () => {
    const plan = planPromoteLegacyQboGrant({
      expectedRealmId: "9341454381415870",
      legacy: baseLegacy,
      firmClient,
      company: { id: firmClient.companyId, qboRealmId: null },
      otherCompanyOwningRealm: null,
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.companyBind).toBe("bind_existing_company");
    expect(plan.companyId).toBe(firmClient.companyId);
  });

  it("plans noop bind when company realm already equals expected", () => {
    const plan = planPromoteLegacyQboGrant({
      expectedRealmId: "9341454381415870",
      legacy: baseLegacy,
      firmClient,
      company: { id: firmClient.companyId, qboRealmId: "9341454381415870" },
      otherCompanyOwningRealm: null,
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.companyBind).toBe("noop_already_bound");
    expect(plan.companyId).toBe(firmClient.companyId);
  });

  it("fails closed when existing company realm differs", () => {
    const plan = planPromoteLegacyQboGrant({
      expectedRealmId: "9341454381415870",
      legacy: baseLegacy,
      firmClient,
      company: { id: firmClient.companyId, qboRealmId: "1111111111111111" },
      otherCompanyOwningRealm: null,
    });
    expect(plan.ok).toBe(false);
    if (plan.ok) return;
    expect(plan.code).toBe("company_realm_conflict");
  });

  it("fails closed when another company already owns expected realm", () => {
    const plan = planPromoteLegacyQboGrant({
      expectedRealmId: "9341454381415870",
      legacy: baseLegacy,
      firmClient,
      company: { id: firmClient.companyId, qboRealmId: null },
      otherCompanyOwningRealm: { id: "aaaaaaaa-2222-4222-8222-222222222222" },
    });
    expect(plan.ok).toBe(false);
    if (plan.ok) return;
    expect(plan.code).toBe("realm_owned_by_other_company");
  });

  it("fails closed on owner mismatch", () => {
    const plan = planPromoteLegacyQboGrant({
      expectedRealmId: "9341454381415870",
      legacy: baseLegacy,
      firmClient: { ...firmClient, ownerUserId: "other-user" },
      company: { id: firmClient.companyId, qboRealmId: null },
      otherCompanyOwningRealm: null,
    });
    expect(plan.ok).toBe(false);
    if (plan.ok) return;
    expect(plan.code).toBe("owner_mismatch");
  });

  it("requires canonical grant companyId == firm_client.company_id", () => {
    const plan = planPromoteLegacyQboGrant({
      expectedRealmId: "9341454381415870",
      legacy: baseLegacy,
      firmClient,
      company: { id: firmClient.companyId, qboRealmId: null },
      otherCompanyOwningRealm: null,
      explicitCompanyId: firmClient.companyId,
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.companyId).toBe(firmClient.companyId);

    const bad = planPromoteLegacyQboGrant({
      expectedRealmId: "9341454381415870",
      legacy: baseLegacy,
      firmClient,
      company: { id: firmClient.companyId, qboRealmId: null },
      otherCompanyOwningRealm: null,
      explicitCompanyId: "different-company",
    });
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.code).toBe("company_mismatch");
  });
});

describe("executePromoteLegacyQboGrant", () => {
  const context = {
    legacy: {
      ...baseLegacy,
      accessToken: "at",
      refreshToken: "rt",
    },
    firmClient,
    company: { id: firmClient.companyId, qboRealmId: null as string | null, name: "Smoke" },
    otherCompanyOwningRealm: null as { id: string } | null,
  };

  beforeEach(() => {
    context.company.qboRealmId = null;
    context.otherCompanyOwningRealm = null;
  });

  it("dry-run performs ZERO mutations", async () => {
    const bindCompanyRealm = vi.fn();
    const persistGrant = vi.fn();
    const result = await executePromoteLegacyQboGrant({
      admin: {} as never,
      legacyConnectionId: baseLegacy.id,
      expectedRealmId: "9341454381415870",
      firmClientId: firmClient.id,
      dryRun: true,
      context,
      bindCompanyRealm,
      persistGrant,
    });
    expect(result.ok).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.mutations).toEqual([]);
    expect(bindCompanyRealm).not.toHaveBeenCalled();
    expect(persistGrant).not.toHaveBeenCalled();
  });

  it("execute binds existing company then persists grant with firm_client companyId", async () => {
    const bindCompanyRealm = vi.fn(async () => undefined);
    const persistGrant = vi.fn(async () => ({
      connectionId: "acct-canonical-1",
      outcome: "inserted",
    }));
    const result = await executePromoteLegacyQboGrant({
      admin: {} as never,
      legacyConnectionId: baseLegacy.id,
      expectedRealmId: "9341454381415870",
      firmClientId: firmClient.id,
      dryRun: false,
      context,
      bindCompanyRealm,
      persistGrant: persistGrant as never,
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.dryRun) return;
    expect(result.mutations).toEqual(["bind_company_realm", "persist_canonical_grant"]);
    expect(bindCompanyRealm).toHaveBeenCalledWith(firmClient.companyId, "9341454381415870");
    expect(persistGrant).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: firmClient.companyId,
        tenantOrRealmId: "9341454381415870",
        userId: firmClient.ownerUserId,
      }),
    );
    expect(result.accountingConnectionId).toBe("acct-canonical-1");
  });

  it("does not create a new company (no resolve-or-create path)", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(
      new URL("../../../lib/integrations/quickbooks/promote-legacy-grant-execute.ts", import.meta.url),
      "utf8",
    );
    const script = await fs.readFile(
      new URL("../../../scripts/ops/promote-qbo-legacy-grant-to-canonical.ts", import.meta.url),
      "utf8",
    );
    expect(src).not.toMatch(/from ["'][^"']*resolve-or-create-company["']/);
    expect(script).not.toMatch(/from ["'][^"']*resolve-or-create-company["']/);
    expect(src).not.toMatch(/import\s*\{[^}]*resolveOrCreateCompanyForProvider/);
    expect(script).not.toMatch(/import\s*\{[^}]*resolveOrCreateCompanyForProvider/);
  });

  it("retry after bind succeeded but grant failed is safe (noop bind + persist)", async () => {
    const bindCompanyRealm = vi.fn(async () => undefined);
    const persistGrant = vi
      .fn()
      .mockRejectedValueOnce(new Error("grant write failed"))
      .mockResolvedValueOnce({ connectionId: "acct-canonical-1", outcome: "updated_connected" });

    const first = await executePromoteLegacyQboGrant({
      admin: {} as never,
      legacyConnectionId: baseLegacy.id,
      expectedRealmId: "9341454381415870",
      firmClientId: firmClient.id,
      dryRun: false,
      context,
      bindCompanyRealm,
      persistGrant: persistGrant as never,
    });
    expect(first.ok).toBe(false);
    expect(first.mutations).toEqual(["bind_company_realm"]);

    // Simulate successful prior bind.
    context.company.qboRealmId = "9341454381415870";

    const second = await executePromoteLegacyQboGrant({
      admin: {} as never,
      legacyConnectionId: baseLegacy.id,
      expectedRealmId: "9341454381415870",
      firmClientId: firmClient.id,
      dryRun: false,
      context,
      bindCompanyRealm,
      persistGrant: persistGrant as never,
    });
    expect(second.ok).toBe(true);
    if (!second.ok || second.dryRun) return;
    expect(second.plan.companyBind).toBe("noop_already_bound");
    expect(second.mutations).toEqual(["persist_canonical_grant"]);
    expect(bindCompanyRealm).toHaveBeenCalledTimes(1);
    expect(persistGrant).toHaveBeenCalledTimes(2);
    expect(second.plan.companyId).toBe(firmClient.companyId);
  });

  it("production canonical grant ends scoped to expected realm/company", async () => {
    const persistGrant = vi.fn(async (args: { companyId?: string | null; tenantOrRealmId?: string | null }) => {
      expect(args.companyId).toBe(firmClient.companyId);
      expect(args.tenantOrRealmId).toBe("9341454381415870");
      return { connectionId: "acct-canonical-1", outcome: "inserted" };
    });
    context.company.qboRealmId = "9341454381415870";
    const result = await executePromoteLegacyQboGrant({
      admin: {} as never,
      legacyConnectionId: baseLegacy.id,
      expectedRealmId: "9341454381415870",
      firmClientId: firmClient.id,
      dryRun: false,
      context,
      bindCompanyRealm: vi.fn(),
      persistGrant: persistGrant as never,
    });
    expect(result.ok).toBe(true);
    expect(persistGrant).toHaveBeenCalled();
  });

  it("does not claim bind or persist grant when verified bind fails", async () => {
    const persistGrant = vi.fn();
    const result = await executePromoteLegacyQboGrant({
      admin: {} as never,
      legacyConnectionId: baseLegacy.id,
      expectedRealmId: "9341454381415870",
      firmClientId: firmClient.id,
      dryRun: false,
      context,
      bindCompanyRealm: async () => {
        throw new Error("Company realm bind affected zero rows and qbo_realm_id is still null");
      },
      persistGrant,
    });
    expect(result.ok).toBe(false);
    expect(result.mutations).toEqual([]);
    expect(persistGrant).not.toHaveBeenCalled();
  });
});

describe("bindExistingCompanyRealmVerified", () => {
  const companyId = firmClient.companyId;
  const expectedRealmId = "9341454381415870";

  function mockAdmin(handlers: {
    updateResult: { data: unknown; error: unknown };
    rereadResult: { data: unknown; error: unknown };
  }) {
    const selectAfterUpdate = vi.fn(async () => handlers.updateResult);
    const updateChain = {
      eq: vi.fn(() => updateChain),
      is: vi.fn(() => updateChain),
      select: selectAfterUpdate,
    };
    const maybeSingle = vi.fn(async () => handlers.rereadResult);
    const selectChain = {
      eq: vi.fn(() => selectChain),
      maybeSingle,
    };
    return {
      from: vi.fn((table: string) => {
        expect(table).toBe("companies");
        return {
          update: vi.fn(() => updateChain),
          select: vi.fn(() => selectChain),
        };
      }),
      _spies: { selectAfterUpdate, maybeSingle },
    };
  }

  it("succeeds when update returns the expected realm row", async () => {
    const admin = mockAdmin({
      updateResult: {
        data: [{ id: companyId, qbo_realm_id: expectedRealmId }],
        error: null,
      },
      rereadResult: { data: null, error: null },
    });
    await bindExistingCompanyRealmVerified({
      admin: admin as never,
      companyId,
      expectedRealmId,
      nowIso: "2099-01-01T00:00:00.000Z",
    });
    expect(admin._spies.maybeSingle).not.toHaveBeenCalled();
  });

  it("zero-row concurrent same-realm is idempotent success", async () => {
    const admin = mockAdmin({
      updateResult: { data: [], error: null },
      rereadResult: {
        data: { id: companyId, qbo_realm_id: expectedRealmId },
        error: null,
      },
    });
    await bindExistingCompanyRealmVerified({
      admin: admin as never,
      companyId,
      expectedRealmId,
      nowIso: "2099-01-01T00:00:00.000Z",
    });
    expect(admin._spies.maybeSingle).toHaveBeenCalled();
  });

  it("zero-row still NULL fails and must block grant", async () => {
    const admin = mockAdmin({
      updateResult: { data: [], error: null },
      rereadResult: {
        data: { id: companyId, qbo_realm_id: null },
        error: null,
      },
    });
    await expect(
      bindExistingCompanyRealmVerified({
        admin: admin as never,
        companyId,
        expectedRealmId,
        nowIso: "2099-01-01T00:00:00.000Z",
      }),
    ).rejects.toThrow(/still null/);
  });

  it("zero-row conflicting realm fails closed", async () => {
    const admin = mockAdmin({
      updateResult: { data: [], error: null },
      rereadResult: {
        data: { id: companyId, qbo_realm_id: "1111111111111111" },
        error: null,
      },
    });
    await expect(
      bindExistingCompanyRealmVerified({
        admin: admin as never,
        companyId,
        expectedRealmId,
        nowIso: "2099-01-01T00:00:00.000Z",
      }),
    ).rejects.toThrow(/conflicts with expected/);
  });

  it("unique violation during realm bind fails before grant", async () => {
    const admin = mockAdmin({
      updateResult: {
        data: null,
        error: { code: "23505", message: "duplicate key value violates unique constraint" },
      },
      rereadResult: { data: null, error: null },
    });
    await expect(
      bindExistingCompanyRealmVerified({
        admin: admin as never,
        companyId,
        expectedRealmId,
        nowIso: "2099-01-01T00:00:00.000Z",
      }),
    ).rejects.toThrow(/unique violation/);
  });
});
