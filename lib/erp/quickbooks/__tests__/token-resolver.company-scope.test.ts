/**
 * Canonical-only QBO token resolution — fail-closed contract.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

const { getSupabaseAdmin, getQuotaGuardUndiciDispatcher } = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
  getQuotaGuardUndiciDispatcher: vi.fn(() => null),
}));

vi.mock("@/lib/supabase-admin.js", () => ({ getSupabaseAdmin }));
vi.mock("@/lib/network/quotaguard-proxy", () => ({ getQuotaGuardUndiciDispatcher }));

import {
  loadAccountingConnectionForScope,
  loadFirmClientQboScope,
  resolveQBOTokenForFirmClient,
  refreshQBOToken,
} from "@/lib/erp/quickbooks/token-resolver";

type Row = Record<string, unknown>;

function createQueryBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  for (const method of ["select", "eq", "order", "limit", "in", "is", "neq", "filter"]) {
    builder[method] = vi.fn(self);
  }
  builder.maybeSingle = vi.fn(async () => {
    const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
    return { data: rows[0] ?? null, error: result.error };
  });
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

const usableProd: Row = {
  id: "acct-prod",
  access_token: "at-prod",
  refresh_token: "rt-prod",
  tenant_or_realm_id: "9341454381415870",
  token_expires_at: "2099-01-01T00:00:00.000Z",
  scopes: ["com.intuit.quickbooks.accounting"],
  external_entity_id: "qbo:9341454381415870",
  metadata_json: { company_id: "co-prod" },
  status: "connected",
  provider: "quickbooks",
  provider_environment: "production",
  superseded_by_connection_id: null,
  credentials_cleared_at: null,
  updated_at: "2099-01-01T00:00:00.000Z",
};

describe("loadFirmClientQboScope", () => {
  it("resolves owner + company realm", async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "firm_clients") {
          return createQueryBuilder({
            data: { id: "fc-1", owner_user_id: "user-1", company_id: "co-1" },
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

describe("loadAccountingConnectionForScope fail-closed", () => {
  beforeEach(() => {
    process.env.QB_ENVIRONMENT = "production";
  });

  it("resolves uniquely for scoped realm", async () => {
    const supabase = {
      from: vi.fn(() => createQueryBuilder({ data: [usableProd], error: null })),
    };
    const conn = await loadAccountingConnectionForScope(supabase as never, {
      ownerUserId: "user-1",
      companyId: "co-prod",
      realmId: "9341454381415870",
    });
    expect(conn?.connectionId).toBe("acct-prod");
    expect(supabase.from).toHaveBeenCalledWith("accounting_connections");
  });

  it("fails closed on zero matches", async () => {
    const supabase = {
      from: vi.fn(() => createQueryBuilder({ data: [], error: null })),
    };
    const conn = await loadAccountingConnectionForScope(supabase as never, {
      ownerUserId: "user-1",
      companyId: "co-prod",
      realmId: "9341454381415870",
    });
    expect(conn).toBeNull();
  });

  it("fails closed on multiple usable matches", async () => {
    const second = { ...usableProd, id: "acct-2" };
    const supabase = {
      from: vi.fn(() => createQueryBuilder({ data: [usableProd, second], error: null })),
    };
    const conn = await loadAccountingConnectionForScope(supabase as never, {
      ownerUserId: "user-1",
      companyId: "co-prod",
      realmId: "9341454381415870",
    });
    expect(conn).toBeNull();
  });

  it("fails closed on realm mismatch", async () => {
    const wrongRealm = { ...usableProd, tenant_or_realm_id: "other-realm" };
    const supabase = {
      from: vi.fn(() => createQueryBuilder({ data: [wrongRealm], error: null })),
    };
    const conn = await loadAccountingConnectionForScope(supabase as never, {
      ownerUserId: "user-1",
      companyId: "co-prod",
      realmId: "9341454381415870",
    });
    // Query filters by realm; returned row with wrong realm still fails usability if slipped through
    expect(conn).toBeNull();
  });

  it("fails closed on provider_environment mismatch", async () => {
    const sandbox = { ...usableProd, provider_environment: "sandbox" };
    const supabase = {
      from: vi.fn(() => createQueryBuilder({ data: [sandbox], error: null })),
    };
    const conn = await loadAccountingConnectionForScope(supabase as never, {
      ownerUserId: "user-1",
      companyId: "co-prod",
      realmId: "9341454381415870",
    });
    expect(conn).toBeNull();
  });

  it("fails closed on company metadata mismatch", async () => {
    const otherCo = {
      ...usableProd,
      metadata_json: { company_id: "co-other" },
      tenant_or_realm_id: null,
      external_entity_id: null,
    };
    const supabase = {
      from: vi.fn(() => createQueryBuilder({ data: [otherCo], error: null })),
    };
    const conn = await loadAccountingConnectionForScope(supabase as never, {
      ownerUserId: "user-1",
      companyId: "co-prod",
      realmId: null,
    });
    expect(conn).toBeNull();
  });

  it("fails closed on inactive status", async () => {
    const inactive = { ...usableProd, status: "disconnected" };
    const supabase = {
      from: vi.fn(() => createQueryBuilder({ data: [inactive], error: null })),
    };
    const conn = await loadAccountingConnectionForScope(supabase as never, {
      ownerUserId: "user-1",
      companyId: "co-prod",
      realmId: "9341454381415870",
    });
    expect(conn).toBeNull();
  });

  it("fails closed on superseded rows", async () => {
    const superseded = { ...usableProd, superseded_by_connection_id: "newer-id" };
    const supabase = {
      from: vi.fn(() => createQueryBuilder({ data: [superseded], error: null })),
    };
    const conn = await loadAccountingConnectionForScope(supabase as never, {
      ownerUserId: "user-1",
      companyId: "co-prod",
      realmId: "9341454381415870",
    });
    expect(conn).toBeNull();
  });

  it("fails closed on missing token material", async () => {
    const missing = { ...usableProd, access_token: "", refresh_token: null };
    const supabase = {
      from: vi.fn(() => createQueryBuilder({ data: [missing], error: null })),
    };
    const conn = await loadAccountingConnectionForScope(supabase as never, {
      ownerUserId: "user-1",
      companyId: "co-prod",
      realmId: "9341454381415870",
    });
    expect(conn).toBeNull();
  });
});

describe("resolveQBOTokenForFirmClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.QB_CLIENT_ID = "cid";
    process.env.QB_CLIENT_SECRET = "csecret";
    process.env.QB_ENVIRONMENT = "production";
  });

  it("uses accounting_connections only (no erp/legacy tables)", async () => {
    const tables: string[] = [];
    getSupabaseAdmin.mockReturnValue({
      from: (table: string) => {
        tables.push(table);
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
        builder.is = vi.fn(self);
        builder.maybeSingle = vi.fn(async () => {
          if (table === "firm_clients") {
            return {
              data: { id: "fc-1", owner_user_id: "user-1", company_id: "co-prod" },
              error: null,
            };
          }
          if (table === "companies") {
            return {
              data: { id: "co-prod", qbo_realm_id: "9341454381415870" },
              error: null,
            };
          }
          return { data: null, error: null };
        });
        Object.assign(builder, {
          then(
            onfulfilled?: ((value: unknown) => unknown) | null,
            onrejected?: ((reason: unknown) => unknown) | null,
          ) {
            if (table === "accounting_connections") {
              return Promise.resolve({ data: [usableProd], error: null }).then(
                onfulfilled ?? undefined,
                onrejected ?? undefined,
              );
            }
            return Promise.resolve({ data: null, error: null }).then(
              onfulfilled ?? undefined,
              onrejected ?? undefined,
            );
          },
        });
        return builder;
      },
    });

    const bundle = await resolveQBOTokenForFirmClient("fc-1");
    expect(bundle?.connectionId).toBe("acct-prod");
    expect(bundle?.tokenSource).toBe("accounting_connections");
    expect(tables).not.toContain("quickbooks_connections");
    expect(tables).not.toContain("erp_connections");
    expect(tables).toContain("accounting_connections");
  });

  it("refreshQBOToken rejects non-canonical sources", async () => {
    await expect(refreshQBOToken("fc-1", "erp_connections" as never)).rejects.toThrow(
      /Only accounting_connections/,
    );
  });
});

describe("static legacy coupling", () => {
  it("runtime modules do not query quickbooks_connections", () => {
    const roots = [
      path.join(process.cwd(), "lib/erp/quickbooks/token-resolver.ts"),
      path.join(process.cwd(), "lib/erp-adapters/quickbooks-adapter.js"),
      path.join(process.cwd(), "lib/integrations/quickbooks/promote-legacy-grant-execute.ts"),
      path.join(process.cwd(), "scripts/verify-accounting-connections.js"),
    ];
    for (const file of roots) {
      const src = fs.readFileSync(file, "utf8");
      expect(src).not.toMatch(/\.from\(\s*["']quickbooks_connections["']\s*\)/);
      expect(src).not.toMatch(/from\(\s*`quickbooks_connections`\s*\)/);
    }
  });

  it("token-resolver is server-only (not under app/ client components)", () => {
    const resolver = path.join(process.cwd(), "lib/erp/quickbooks/token-resolver.ts");
    expect(fs.existsSync(resolver)).toBe(true);
    expect(resolver.includes(`${path.sep}app${path.sep}`)).toBe(false);
    const src = fs.readFileSync(resolver, "utf8");
    expect(src).not.toMatch(/["']use client["']/);
  });

  it("JE-3D capabilities remain OFF and are not flipped by this change", () => {
    const policy = fs.readFileSync(
      path.join(process.cwd(), "lib/journal-entry-governance/je3d-activation-policy.ts"),
      "utf8",
    );
    expect(policy).toMatch(/CREATE_SANDBOX_JE:\s*false/);
    expect(policy).toMatch(/VERIFY_SANDBOX_JE:\s*false/);
    expect(policy).toMatch(/PREPARE_SANDBOX_JE:\s*false/);
  });
});
