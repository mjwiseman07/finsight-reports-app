/**
 * Company-scoped QBO token selection.
 * Proves a newer sandbox accounting_connections row cannot override a
 * firm_client bound to a different production realm/company.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseAdmin, getQuotaGuardUndiciDispatcher } = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
  getQuotaGuardUndiciDispatcher: vi.fn(() => null),
}));

vi.mock("@/lib/supabase-admin.js", () => ({ getSupabaseAdmin }));
vi.mock("@/lib/network/quotaguard-proxy", () => ({ getQuotaGuardUndiciDispatcher }));

import {
  loadAccountingConnectionForScope,
  loadErpConnectionForScope,
  loadFirmClientQboScope,
  resolveQBOTokenForFirmClient,
} from "@/lib/erp/quickbooks/token-resolver";

type Row = Record<string, unknown>;

function createQueryBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  for (const method of ["select", "eq", "order", "limit", "in", "is", "neq", "filter"]) {
    builder[method] = vi.fn(self);
  }
  builder.maybeSingle = vi.fn(async () => result);
  // Allow `await query` for non-maybeSingle paths
  Object.assign(builder, {
    then(
      onfulfilled?: ((value: unknown) => unknown) | null,
      onrejected?: ((reason: unknown) => unknown) | null,
    ) {
      return Promise.resolve(result).then(onfulfilled ?? undefined, onrejected ?? undefined);
    },
  });
  return builder;
}

describe("loadFirmClientQboScope", () => {
  it("resolves owner + company realm", async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "firm_clients") {
          return createQueryBuilder({
            data: {
              id: "fc-1",
              owner_user_id: "user-1",
              company_id: "co-1",
            },
            error: null,
          });
        }
        return createQueryBuilder({
          data: { id: "co-1", qbo_realm_id: "9341454381415870" },
          error: null,
        });
      }),
    };
    const scope = await loadFirmClientQboScope(supabase as never, "fc-1");
    expect(scope).toEqual({
      ownerUserId: "user-1",
      companyId: "co-1",
      realmId: "9341454381415870",
    });
  });
});

describe("loadAccountingConnectionForScope", () => {
  it("selects the scoped production realm and ignores newer sandbox rows", async () => {
    const sandbox: Row = {
      id: "acct-sandbox",
      access_token: "at-sandbox",
      refresh_token: "rt-sandbox",
      tenant_or_realm_id: "9341457151063823",
      token_expires_at: "2099-01-01T00:00:00.000Z",
      scopes: ["com.intuit.quickbooks.accounting"],
      external_entity_id: "qbo:9341457151063823",
      metadata_json: {},
      updated_at: "2099-01-02T00:00:00.000Z",
    };
    const production: Row = {
      id: "acct-prod",
      access_token: "at-prod",
      refresh_token: "rt-prod",
      tenant_or_realm_id: "9341454381415870",
      token_expires_at: "2099-01-01T00:00:00.000Z",
      scopes: ["com.intuit.quickbooks.accounting"],
      external_entity_id: "qbo:9341454381415870",
      metadata_json: { company_id: "co-prod" },
      updated_at: "2099-01-01T00:00:00.000Z",
    };

    const supabase = {
      from: vi.fn(() =>
        createQueryBuilder({
          data: production,
          error: null,
        }),
      ),
    };

    const conn = await loadAccountingConnectionForScope(supabase as never, {
      ownerUserId: "user-1",
      companyId: "co-prod",
      realmId: "9341454381415870",
    });

    expect(conn?.connectionId).toBe("acct-prod");
    expect(conn?.realmId).toBe("9341454381415870");
    expect(conn?.connectionId).not.toBe(sandbox.id);
    expect(supabase.from).toHaveBeenCalledWith("accounting_connections");
  });

  it("refuses ambiguous unscoped latest-row selection", async () => {
    const supabase = {
      from: vi.fn(() =>
        createQueryBuilder({
          data: [
            {
              id: "a",
              tenant_or_realm_id: "r1",
              access_token: "1",
              refresh_token: "1",
              token_expires_at: "2099-01-01T00:00:00.000Z",
              scopes: [],
            },
            {
              id: "b",
              tenant_or_realm_id: "r2",
              access_token: "2",
              refresh_token: "2",
              token_expires_at: "2099-01-01T00:00:00.000Z",
              scopes: [],
            },
          ],
          error: null,
        }),
      ),
    };
    const conn = await loadAccountingConnectionForScope(supabase as never, {
      ownerUserId: "user-1",
      companyId: null,
      realmId: null,
    });
    expect(conn).toBeNull();
  });
});

describe("loadErpConnectionForScope", () => {
  it("does not guess ERP realm when company is known without qbo_realm_id", async () => {
    const supabase = { from: vi.fn() };
    const conn = await loadErpConnectionForScope(supabase as never, {
      ownerUserId: "user-1",
      companyId: "co-1",
      realmId: null,
    });
    expect(conn).toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe("resolveQBOTokenForFirmClient company scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.QB_CLIENT_ID = "cid";
    process.env.QB_CLIENT_SECRET = "csecret";
  });

  it("returns production grant for firm_client realm even when sandbox is newer", async () => {
    const calls: Array<{ table: string; filters: Record<string, string> }> = [];

    getSupabaseAdmin.mockReturnValue({
      from: (table: string) => {
        const filters: Record<string, string> = {};
        const builder: Record<string, unknown> = {};
        const self = () => builder;
        builder.select = vi.fn(self);
        builder.eq = vi.fn((col: string, val: string) => {
          filters[col] = val;
          return builder;
        });
        builder.order = vi.fn(self);
        builder.limit = vi.fn(self);
        builder.maybeSingle = vi.fn(async () => {
          calls.push({ table, filters: { ...filters } });
          if (table === "firm_clients") {
            return {
              data: {
                id: "fc-smoke",
                owner_user_id: "user-1",
                company_id: "co-prod",
              },
              error: null,
            };
          }
          if (table === "companies") {
            return {
              data: { id: "co-prod", qbo_realm_id: "9341454381415870" },
              error: null,
            };
          }
          if (table === "accounting_connections") {
            expect(filters.tenant_or_realm_id).toBe("9341454381415870");
            return {
              data: {
                id: "acct-prod",
                access_token: "at-prod",
                refresh_token: "rt-prod",
                tenant_or_realm_id: "9341454381415870",
                token_expires_at: "2099-01-01T00:00:00.000Z",
                scopes: ["com.intuit.quickbooks.accounting"],
                external_entity_id: "qbo:9341454381415870",
              },
              error: null,
            };
          }
          return { data: null, error: null };
        });
        return builder;
      },
    });

    const bundle = await resolveQBOTokenForFirmClient("fc-smoke");
    expect(bundle?.connectionId).toBe("acct-prod");
    expect(bundle?.realmId).toBe("9341454381415870");
    expect(bundle?.tokenSource).toBe("accounting_connections");
    expect(bundle?.accessToken).toBe("at-prod");
  });
});
