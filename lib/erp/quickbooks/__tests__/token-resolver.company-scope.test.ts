/**
 * Canonical-only QBO token resolution — hardened fail-closed contract.
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
  evaluateCanonicalAuthority,
  loadAccountingConnectionForScope,
  loadFirmClientQboScope,
  persistRefreshedTokenConditional,
  QboTokenAuthorityError,
  refreshQBOToken,
  requireExpectedProviderEnvironment,
  resolveQBOTokenForFirmClient,
} from "@/lib/erp/quickbooks/token-resolver";

type Row = Record<string, unknown>;

function createQueryBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  const filters: Record<string, unknown> = {};
  for (const method of ["select", "eq", "order", "limit", "in", "is", "neq", "filter", "not", "update"]) {
    builder[method] = vi.fn((...args: unknown[]) => {
      if (method === "eq" && typeof args[0] === "string") {
        filters[args[0]] = args[1];
      }
      if (method === "is" && typeof args[0] === "string") {
        filters[`is:${args[0]}`] = args[1];
      }
      return builder;
    });
  }
  builder.maybeSingle = vi.fn(async () => {
    const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
    return { data: rows[0] ?? null, error: result.error };
  });
  Object.assign(builder, {
    __filters: filters,
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
  access_token: "at-synthetic",
  refresh_token: "rt-synthetic",
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

describe("requireExpectedProviderEnvironment", () => {
  it("rejects missing server environment", () => {
    delete process.env.QB_ENVIRONMENT;
    expect(() => requireExpectedProviderEnvironment(undefined)).toThrow(QboTokenAuthorityError);
    try {
      requireExpectedProviderEnvironment(undefined);
    } catch (err) {
      expect(err).toBeInstanceOf(QboTokenAuthorityError);
      expect((err as QboTokenAuthorityError).code).toBe("missing_server_environment");
      expect(String(err)).not.toMatch(/at-synthetic|rt-synthetic|9341454381415870/);
    }
  });

  it("rejects invalid server environment", () => {
    expect(() => requireExpectedProviderEnvironment("staging")).toThrow(QboTokenAuthorityError);
    try {
      requireExpectedProviderEnvironment("staging");
    } catch (err) {
      expect((err as QboTokenAuthorityError).code).toBe("invalid_server_environment");
    }
  });

  it("accepts sandbox and production", () => {
    expect(requireExpectedProviderEnvironment("sandbox")).toBe("sandbox");
    expect(requireExpectedProviderEnvironment("production")).toBe("production");
  });
});

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
    expect(conn).toBeNull();
  });

  it("fails closed on null provider_environment", async () => {
    const nullEnv = { ...usableProd, provider_environment: null };
    const supabase = {
      from: vi.fn(() => createQueryBuilder({ data: [nullEnv], error: null })),
    };
    const conn = await loadAccountingConnectionForScope(supabase as never, {
      ownerUserId: "user-1",
      companyId: "co-prod",
      realmId: "9341454381415870",
    });
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

  it("fails closed when company scope lacks realm (schema has no company_id column)", async () => {
    const supabase = {
      from: vi.fn(() => createQueryBuilder({ data: [usableProd], error: null })),
    };
    const conn = await loadAccountingConnectionForScope(supabase as never, {
      ownerUserId: "user-1",
      companyId: "co-prod",
      realmId: null,
    });
    expect(conn).toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("fails closed when realm authority is missing", async () => {
    const supabase = {
      from: vi.fn(() => createQueryBuilder({ data: [usableProd], error: null })),
    };
    const conn = await loadAccountingConnectionForScope(supabase as never, {
      ownerUserId: "user-1",
      companyId: null,
      realmId: null,
    });
    expect(conn).toBeNull();
  });

  it("fails closed on wrong provider", async () => {
    const xero = { ...usableProd, provider: "xero" };
    expect(
      evaluateCanonicalAuthority(
        {
          tokenSource: "accounting_connections",
          storageTable: "accounting_connections",
          connectionId: "acct-prod",
          accessToken: "at-synthetic",
          refreshToken: "rt-synthetic",
          realmId: "9341454381415870",
          expiresAt: "2099-01-01T00:00:00.000Z",
          grantedScopes: [],
          providerEnvironment: "production",
          status: "connected",
          supersededBy: null,
          credentialsClearedAt: null,
          concurrencyToken: "2099-01-01T00:00:00.000Z",
          provider: "xero",
        },
        { ownerUserId: "user-1", companyId: "co-prod", realmId: "9341454381415870" },
        "production",
      ),
    ).toBe(false);
    void xero;
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

  it("fails closed on credentials cleared", async () => {
    const cleared = {
      ...usableProd,
      credentials_cleared_at: "2099-01-01T00:00:00.000Z",
    };
    const supabase = {
      from: vi.fn(() => createQueryBuilder({ data: [cleared], error: null })),
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

  it("does not treat metadata company_id as authority", async () => {
    // Row matches realm; metadata claims a different company — still usable via hard realm.
    const metaOther = {
      ...usableProd,
      metadata_json: { company_id: "co-other" },
    };
    const supabase = {
      from: vi.fn(() => createQueryBuilder({ data: [metaOther], error: null })),
    };
    const conn = await loadAccountingConnectionForScope(supabase as never, {
      ownerUserId: "user-1",
      companyId: "co-prod",
      realmId: "9341454381415870",
    });
    expect(conn?.connectionId).toBe("acct-prod");
  });
});

describe("persistRefreshedTokenConditional", () => {
  beforeEach(() => {
    process.env.QB_ENVIRONMENT = "production";
  });

  it("requires exactly one updated row under authority predicates", async () => {
    const builders: Array<ReturnType<typeof createQueryBuilder>> = [];
    const supabase = {
      from: vi.fn(() => {
        const b = createQueryBuilder({ data: [{ id: "acct-prod" }], error: null });
        builders.push(b);
        return b;
      }),
    };
    const next = await persistRefreshedTokenConditional(
      supabase as never,
      {
        tokenSource: "accounting_connections",
        storageTable: "accounting_connections",
        connectionId: "acct-prod",
        accessToken: "at-old",
        refreshToken: "rt-old",
        realmId: "9341454381415870",
        expiresAt: "2099-01-01T00:00:00.000Z",
        grantedScopes: [],
        providerEnvironment: "production",
        status: "connected",
        supersededBy: null,
        credentialsClearedAt: null,
        concurrencyToken: "2099-01-01T00:00:00.000Z",
        provider: "quickbooks",
      },
      "at-new",
      "rt-new",
      "2099-06-01T00:00:00.000Z",
      "production",
    );
    expect(typeof next).toBe("string");
    expect(builders[0].eq).toHaveBeenCalledWith("id", "acct-prod");
    expect(builders[0].eq).toHaveBeenCalledWith("provider", "quickbooks");
    expect(builders[0].eq).toHaveBeenCalledWith("provider_environment", "production");
    expect(builders[0].eq).toHaveBeenCalledWith("tenant_or_realm_id", "9341454381415870");
    expect(builders[0].eq).toHaveBeenCalledWith("status", "connected");
    expect(builders[0].eq).toHaveBeenCalledWith("updated_at", "2099-01-01T00:00:00.000Z");
    expect(builders[0].is).toHaveBeenCalledWith("superseded_by_connection_id", null);
    expect(builders[0].is).toHaveBeenCalledWith("credentials_cleared_at", null);
    expect(JSON.stringify(builders)).not.toMatch(/at-new|rt-new/);
  });

  it("throws stale_connection_state when zero rows update", async () => {
    const supabase = {
      from: vi.fn(() => createQueryBuilder({ data: [], error: null })),
    };
    await expect(
      persistRefreshedTokenConditional(
        supabase as never,
        {
          tokenSource: "accounting_connections",
          storageTable: "accounting_connections",
          connectionId: "acct-prod",
          accessToken: "at-old",
          refreshToken: "rt-old",
          realmId: "9341454381415870",
          expiresAt: "2099-01-01T00:00:00.000Z",
          grantedScopes: [],
          providerEnvironment: "production",
          status: "connected",
          supersededBy: null,
          credentialsClearedAt: null,
          concurrencyToken: "2099-01-01T00:00:00.000Z",
          provider: "quickbooks",
        },
        "at-new",
        "rt-new",
        "2099-06-01T00:00:00.000Z",
        "production",
      ),
    ).rejects.toMatchObject({ code: "stale_connection_state" });
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
        const builder: Record<string, unknown> = {};
        const self = () => builder;
        builder.select = vi.fn(self);
        builder.eq = vi.fn(self);
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

  it("refresh failure never queries legacy tables", async () => {
    const tables: string[] = [];
    getSupabaseAdmin.mockReturnValue({
      from: (table: string) => {
        tables.push(table);
        throw new Error("simulated refresh path failure");
      },
    });
    await expect(refreshQBOToken("fc-1")).rejects.toThrow(/simulated refresh path failure/);
    expect(tables).not.toContain("quickbooks_connections");
    expect(tables).not.toContain("erp_connections");
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

  it("promote path does not query erp_connections", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "lib/integrations/quickbooks/promote-legacy-grant-execute.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/\.from\(\s*["']erp_connections["']\s*\)/);
  });

  it("adapter saveConnection does not use .limit(1) as ambiguity hide", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "lib/erp-adapters/quickbooks-adapter.js"),
      "utf8",
    );
    const saveIdx = src.indexOf("async saveConnection");
    const getIdx = src.indexOf("async getConnection");
    const saveBlock = src.slice(saveIdx, getIdx);
    expect(saveBlock).not.toMatch(/\.limit\(\s*1\s*\)/);
    expect(saveBlock).toMatch(/\.limit\(\s*2\s*\)/);
    expect(saveBlock).toMatch(/Multiple QuickBooks accounting connections matched authority/);
  });

  it("token-resolver is server-only (not under app/ client components)", () => {
    const resolver = path.join(process.cwd(), "lib/erp/quickbooks/token-resolver.ts");
    expect(fs.existsSync(resolver)).toBe(true);
    expect(resolver.includes(`${path.sep}app${path.sep}`)).toBe(false);
    const src = fs.readFileSync(resolver, "utf8");
    expect(src).not.toMatch(/["']use client["']/);
  });

  it("typed authority errors never embed synthetic tokens or realm ids in messages", () => {
    const err = new QboTokenAuthorityError(
      "null_provider_environment",
      "Connection provider environment is missing or invalid",
    );
    expect(err.message).not.toMatch(/at-|rt-|9341454381415870|eyJ/);
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
