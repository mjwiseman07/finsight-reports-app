/**
 * Provider/tenant → companies.id resolution for accounting sync persist.
 * Never asserts or logs secrets. Never uses user_id as company_id.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const DEMO_COMPANY_ID = "02edb6c6-a4f1-4bae-825d-2680136dad24";
const DEMO_XERO_TENANT = "ceaea696-081f-491e-9daa-a9263a023ca9";
const QBO_COMPANY_ID = "aaaaaaaa-2222-4222-8222-222222222222";
const QBO_REALM = "9341457151063823";
const USER_ID = "a4ebf834-a698-4f79-a945-8498f2e6c45d";

const resolveCompanyIdForUser = vi.fn();

vi.mock("@/lib/integrations/accounting/resolve-company-id", () => ({
  resolveCompanyIdForUser: (...args: unknown[]) => resolveCompanyIdForUser(...args),
}));

import {
  deriveProviderTenantId,
  rejectUserIdShapedCompanyId,
  resolveCompanyIdForSyncPersist,
  resolveOrCreateCompanyForProvider,
} from "@/lib/integrations/accounting/resolve-or-create-company";

type QueryResult = { data: unknown; error: { message: string } | null };

describe("resolve-or-create-company (provider tenant → companies.id)", () => {
  beforeEach(() => {
    resolveCompanyIdForUser.mockReset();
    resolveCompanyIdForUser.mockResolvedValue(QBO_COMPANY_ID);
  });

  it("A: existing Xero tenant returns canonical companies.id (no insert)", async () => {
    const insert = vi.fn();
    const admin = {
      from: (table: string) => {
        if (table === "companies") {
          return {
            select: () => ({
              eq: (column: string, tenantId: string) => ({
                limit: async () => {
                  expect(column).toBe("xero_tenant_id");
                  expect(tenantId).toBe(DEMO_XERO_TENANT);
                  return { data: [{ id: DEMO_COMPANY_ID }], error: null };
                },
              }),
            }),
            insert,
          };
        }
        throw new Error(`unexpected ${table}`);
      },
    } as unknown as SupabaseClient;

    const id = await resolveOrCreateCompanyForProvider(admin, {
      provider: "xero",
      tenantId: DEMO_XERO_TENANT,
      userId: USER_ID,
      tenantName: "Demo Company (US)",
    });

    expect(id).toBe(DEMO_COMPANY_ID);
    expect(id).not.toBe(USER_ID);
    expect(insert).not.toHaveBeenCalled();
  });

  it("B+I: poisoned metadata user_id ignored; provider/tenant wins over user-level lookup", async () => {
    const admin = {
      from: (table: string) => {
        if (table === "companies") {
          return {
            select: () => ({
              eq: () => ({
                limit: async () => ({ data: [{ id: DEMO_COMPANY_ID }], error: null }),
              }),
            }),
            insert: vi.fn(),
          };
        }
        throw new Error(`unexpected ${table}`);
      },
    } as unknown as SupabaseClient;

    const id = await resolveCompanyIdForSyncPersist(admin, {
      provider: "xero",
      tenantId: DEMO_XERO_TENANT,
      userId: USER_ID,
      normalizedCompanyId: USER_ID,
      metadataCompanyId: USER_ID,
    });

    expect(id).toBe(DEMO_COMPANY_ID);
    expect(resolveCompanyIdForUser).not.toHaveBeenCalled();
  });

  it("C: sync persist path prefers canonical id for accounting_syncs.company_id", async () => {
    const admin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            limit: async () => ({ data: [{ id: DEMO_COMPANY_ID }], error: null }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const companyIdForSync = await resolveCompanyIdForSyncPersist(admin, {
      provider: "xero",
      tenantId: DEMO_XERO_TENANT,
      userId: USER_ID,
      metadataCompanyId: USER_ID,
    });

    // Mimic service uuidOrNull + insert payload field
    const uuidOrNull = (value: string | null) =>
      value && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
    expect(uuidOrNull(companyIdForSync)).toBe(DEMO_COMPANY_ID);
    expect(uuidOrNull(companyIdForSync)).not.toBe(USER_ID);
  });

  it("D: existing tenant match means INSERT is not called", async () => {
    const insert = vi.fn();
    const admin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            limit: async () => ({ data: [{ id: DEMO_COMPANY_ID }], error: null }),
          }),
        }),
        insert,
      }),
    } as unknown as SupabaseClient;

    await resolveOrCreateCompanyForProvider(admin, {
      provider: "xero",
      tenantId: DEMO_XERO_TENANT,
      userId: USER_ID,
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it("E: QBO realm mapping resolves existing qbo_realm_id", async () => {
    const admin = {
      from: () => ({
        select: () => ({
          eq: (column: string, realm: string) => ({
            limit: async () => {
              expect(column).toBe("qbo_realm_id");
              expect(realm).toBe(QBO_REALM);
              return { data: [{ id: QBO_COMPANY_ID }], error: null };
            },
          }),
        }),
        insert: vi.fn(),
      }),
    } as unknown as SupabaseClient;

    const id = await resolveOrCreateCompanyForProvider(admin, {
      provider: "quickbooks",
      tenantId: QBO_REALM,
      userId: USER_ID,
    });
    expect(id).toBe(QBO_COMPANY_ID);
  });

  it("F: unknown provider tenant uses create semantics", async () => {
    const newId = "bbbbbbbb-1111-4111-8111-111111111111";
    let insertPayload: Record<string, unknown> | null = null;
    const admin = {
      from: (table: string) => {
        if (table === "companies") {
          return {
            select: () => ({
              eq: () => ({
                limit: async () => ({ data: [], error: null }),
              }),
            }),
            insert: (payload: Record<string, unknown>) => {
              insertPayload = payload;
              return {
                select: () => ({
                  limit: async () => ({ data: [{ id: newId }], error: null }),
                }),
              };
            },
          };
        }
        if (table === "company_users") {
          return { insert: async () => ({ error: null }) };
        }
        throw new Error(`unexpected ${table}`);
      },
    } as unknown as SupabaseClient;

    const id = await resolveOrCreateCompanyForProvider(admin, {
      provider: "xero",
      tenantId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      userId: USER_ID,
      tenantName: "Brand New Org",
    });
    expect(id).toBe(newId);
    expect(insertPayload).toMatchObject({
      name: "Brand New Org",
      accounting_system: "xero",
      xero_tenant_id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    });
  });

  it("G: unique race — insert conflict reselects existing tenant row", async () => {
    let selectCount = 0;
    const admin = {
      from: (table: string) => {
        if (table === "companies") {
          return {
            select: () => ({
              eq: () => ({
                limit: async () => {
                  selectCount += 1;
                  if (selectCount === 1) return { data: [], error: null };
                  return { data: [{ id: DEMO_COMPANY_ID }], error: null };
                },
              }),
            }),
            insert: () => ({
              select: () => ({
                limit: async () => ({
                  data: null,
                  error: { message: "duplicate key value violates unique constraint companies_xero_tenant_id_key" },
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected ${table}`);
      },
    } as unknown as SupabaseClient;

    const id = await resolveOrCreateCompanyForProvider(admin, {
      provider: "xero",
      tenantId: DEMO_XERO_TENANT,
      userId: USER_ID,
    });
    expect(id).toBe(DEMO_COMPANY_ID);
    expect(selectCount).toBe(2);
  });

  it("H: resolution failure never falls back to user_id", async () => {
    expect(rejectUserIdShapedCompanyId(USER_ID, USER_ID)).toBeNull();
    expect(rejectUserIdShapedCompanyId(DEMO_COMPANY_ID, USER_ID)).toBe(DEMO_COMPANY_ID);

    const admin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            limit: async () => ({ data: [], error: { message: "select failed" } }),
          }),
        }),
        insert: vi.fn(),
      }),
    } as unknown as SupabaseClient;

    const id = await resolveCompanyIdForSyncPersist(admin, {
      provider: "xero",
      tenantId: DEMO_XERO_TENANT,
      userId: USER_ID,
      normalizedCompanyId: USER_ID,
      metadataCompanyId: USER_ID,
    });
    expect(id).toBeNull();
    expect(id).not.toBe(USER_ID);
    expect(resolveCompanyIdForUser).not.toHaveBeenCalled();
  });

  it("I: multi-company — tenant identity wins; user lookup not consulted when tenant present", async () => {
    const admin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            limit: async () => ({ data: [{ id: DEMO_COMPANY_ID }], error: null }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;

    const id = await resolveCompanyIdForSyncPersist(admin, {
      provider: "xero",
      tenantId: DEMO_XERO_TENANT,
      userId: USER_ID,
    });
    expect(id).toBe(DEMO_COMPANY_ID);
    expect(resolveCompanyIdForUser).not.toHaveBeenCalled();
  });

  it("deriveProviderTenantId strips xero:/qbo: prefixes", () => {
    expect(deriveProviderTenantId(`xero:${DEMO_XERO_TENANT}`)).toBe(DEMO_XERO_TENANT);
    expect(deriveProviderTenantId(`qbo:${QBO_REALM}`)).toBe(QBO_REALM);
    expect(deriveProviderTenantId(DEMO_XERO_TENANT)).toBe(DEMO_XERO_TENANT);
    expect(deriveProviderTenantId(null)).toBeNull();
  });
});
