/**
 * Accounting connection selection safety.
 * Explicit connectionId fails closed; company scope uses companies.* tenant/realm
 * (not metadata); never newest-updated_at / never limit-25 authority windows.
 */
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { AccountingConnectionRecord, AccountingConnectionStatus } from "@/lib/integrations/accounting/types";
import {
  AccountingConnectionSelectionError,
  accountingConnectionSelectionErrorBody,
  assertExplicitConnectionAuthoritative,
  isExposableSupersessionSuccessor,
  isSelfSupersession,
  resolveCanonicalCompanyProviderTenant,
  selectAccountingConnectionForActiveContext,
} from "@/lib/integrations/accounting/connection-selection";

const USER = "a4ebf834-a698-4f79-a945-8498f2e6c45d";
const OTHER_USER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const STALE_CONNECTED = "ce526f9b-5d2c-46fc-b6f3-46617ab375bf";
const LIVE_CONNECTED = "b718823a-0eb8-437d-beba-05c41f6482f9";
const COMPANY_A = "02edb6c6-a4f1-4bae-825d-2680136dad24";
const COMPANY_B = "11111111-1111-4111-8111-111111111111";
const TENANT_A = "ceaea696-081f-491e-9daa-a9263a023ca9";
const TENANT_B = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const XERO_B = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const QBO_CONN = "93d2a5e4-a817-4a9b-a4f6-0e548a555790";
const QBO_REALM = "9341454381415870";
const QBO_COMPANY = "c93b36e2-7f55-4581-a2b2-b43143763889";

function makeRow(overrides: Partial<AccountingConnectionRecord> = {}): AccountingConnectionRecord {
  return {
    id: LIVE_CONNECTED,
    user_id: USER,
    provider: "xero",
    provider_family: "xero",
    provider_product: "xero_accounting",
    external_entity_id: `xero:${TENANT_A}`,
    external_entity_name: "Demo Company (US)",
    tenant_or_realm_id: TENANT_A,
    scopes: [],
    status: "connected",
    metadata_json: {
      // Poison/noise — must never drive company scope.
      company_id: USER,
      active_normalized_sync_id: "95da07be-8e2c-4b84-9dcc-8a98fa841273",
    },
    updated_at: "2026-08-13T03:28:57.315Z",
    created_at: "2026-08-12T21:30:33.617Z",
    ...overrides,
  };
}

type QueryCall = {
  table: string;
  filters: Record<string, string>;
  orderedBy?: string;
  ascending?: boolean;
  limit?: number;
};

function createSupabaseMock(args: {
  connections?: (call: QueryCall) => AccountingConnectionRecord | AccountingConnectionRecord[] | null;
  companies?: Record<
    string,
    { id: string; xero_tenant_id?: string | null; qbo_realm_id?: string | null }
  >;
}) {
  const calls: QueryCall[] = [];
  const from = vi.fn((table: string) => {
    const call: QueryCall = { table, filters: {} };
    const api: any = {
      select: () => api,
      eq: (key: string, value: string) => {
        call.filters[key] = value;
        return api;
      },
      order: (key: string, opts?: { ascending?: boolean }) => {
        call.orderedBy = key;
        call.ascending = opts?.ascending;
        return api;
      },
      limit: async (n?: number) => {
        call.limit = n;
        calls.push({ ...call, filters: { ...call.filters } });

        if (table === "companies") {
          const id = call.filters.id;
          const row = id ? args.companies?.[id] || null : null;
          return { data: row ? [row] : [], error: null };
        }

        const resolved = args.connections ? args.connections(call) : null;
        let rows = Array.isArray(resolved) ? resolved : resolved ? [resolved] : [];
        // Simulate PostgREST filters the mock may receive.
        if (call.filters.tenant_or_realm_id) {
          rows = rows.filter(
            (r) => String(r.tenant_or_realm_id) === call.filters.tenant_or_realm_id,
          );
        }
        if (call.filters.status) {
          rows = rows.filter((r) => String(r.status) === call.filters.status);
        }
        if (call.filters.provider) {
          rows = rows.filter((r) => String(r.provider) === call.filters.provider);
        }
        if (call.filters.id) {
          rows = rows.filter((r) => String(r.id) === call.filters.id);
        }
        if (call.filters.user_id) {
          rows = rows.filter((r) => String(r.user_id) === call.filters.user_id);
        }
        return { data: typeof n === "number" ? rows.slice(0, n) : rows, error: null };
      },
    };
    return api;
  });
  return { supabase: { from }, calls };
}

describe("assertExplicitConnectionAuthoritative", () => {
  it("explicit connected ID returns exact row", () => {
    expect(assertExplicitConnectionAuthoritative(makeRow())?.id).toBe(LIVE_CONNECTED);
  });

  it("explicit expired ID → ACCOUNTING_CONNECTION_EXPIRED", () => {
    try {
      assertExplicitConnectionAuthoritative(makeRow({ status: "expired" }));
      throw new Error("expected throw");
    } catch (error) {
      expect((error as AccountingConnectionSelectionError).code).toBe("ACCOUNTING_CONNECTION_EXPIRED");
      expect((error as AccountingConnectionSelectionError).httpStatus).toBe(409);
    }
  });

  it("unknown exact id → null", () => {
    expect(assertExplicitConnectionAuthoritative(null)).toBeNull();
  });
});

describe("resolveCanonicalCompanyProviderTenant", () => {
  it("Xero company → companies.xero_tenant_id", async () => {
    const { supabase } = createSupabaseMock({
      companies: {
        [COMPANY_A]: { id: COMPANY_A, xero_tenant_id: TENANT_A, qbo_realm_id: null },
      },
    });
    const resolved = await resolveCanonicalCompanyProviderTenant(supabase, {
      companyId: COMPANY_A,
      userId: USER,
      sourceSystem: "xero",
    });
    expect(resolved).toEqual({
      companyId: COMPANY_A,
      provider: "xero",
      tenantId: TENANT_A,
    });
  });

  it("QBO company → companies.qbo_realm_id", async () => {
    const { supabase } = createSupabaseMock({
      companies: {
        [QBO_COMPANY]: { id: QBO_COMPANY, xero_tenant_id: null, qbo_realm_id: QBO_REALM },
      },
    });
    const resolved = await resolveCanonicalCompanyProviderTenant(supabase, {
      companyId: QBO_COMPANY,
      userId: USER,
      sourceSystem: "quickbooks",
    });
    expect(resolved).toEqual({
      companyId: QBO_COMPANY,
      provider: "quickbooks",
      tenantId: QBO_REALM,
    });
  });

  it("user-id shaped companyId is rejected (poison protection)", async () => {
    const { supabase, calls } = createSupabaseMock({
      companies: {
        [USER]: { id: USER, xero_tenant_id: TENANT_A },
      },
    });
    const resolved = await resolveCanonicalCompanyProviderTenant(supabase, {
      companyId: USER,
      userId: USER,
      sourceSystem: "xero",
    });
    expect(resolved).toBeNull();
    expect(calls.filter((c) => c.table === "companies")).toHaveLength(0);
  });
});

describe("selectAccountingConnectionForActiveContext", () => {
  it("1. explicit connected ID returns exact row", async () => {
    const live = makeRow();
    const { supabase, calls } = createSupabaseMock({
      connections: (call) => {
        if (call.filters.id === LIVE_CONNECTED && call.filters.user_id === USER) return live;
        return null;
      },
    });
    const result = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      connectionId: LIVE_CONNECTED,
      sourceSystem: "xero",
    });
    expect(result?.id).toBe(LIVE_CONNECTED);
    expect(calls[0].filters).toEqual({
      id: LIVE_CONNECTED,
      user_id: USER,
      provider: "xero",
    });
  });

  it("2. explicit unknown ID → null; no fallback", async () => {
    const { supabase, calls } = createSupabaseMock({ connections: () => null });
    const result = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      connectionId: "00000000-0000-4000-8000-000000000000",
      sourceSystem: "xero",
    });
    expect(result).toBeNull();
    expect(calls).toHaveLength(1);
  });

  it("3. explicit wrong-user ID → null", async () => {
    const { supabase } = createSupabaseMock({
      connections: (call) =>
        call.filters.user_id === OTHER_USER ? null : makeRow(),
    });
    const miss = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: OTHER_USER,
      connectionId: LIVE_CONNECTED,
      sourceSystem: "xero",
    });
    expect(miss).toBeNull();
  });

  it("explicit non-connected statuses throw typed errors", async () => {
    for (const [status, code] of [
      ["expired", "ACCOUNTING_CONNECTION_EXPIRED"],
      ["disconnected", "ACCOUNTING_CONNECTION_DISCONNECTED"],
      ["failed", "ACCOUNTING_CONNECTION_FAILED"],
      ["pending", "ACCOUNTING_CONNECTION_NOT_READY"],
      ["needs_entity_selection", "ACCOUNTING_CONNECTION_ENTITY_SELECTION_REQUIRED"],
    ] as const) {
      const { supabase } = createSupabaseMock({
        connections: () => makeRow({ status, id: STALE_CONNECTED }),
      });
      await expect(
        selectAccountingConnectionForActiveContext({
          supabase,
          userId: USER,
          connectionId: STALE_CONNECTED,
          sourceSystem: "xero",
        }),
      ).rejects.toMatchObject({ code });
    }
  });

  it("no-ID + single connected → unambiguous candidate", async () => {
    const { supabase, calls } = createSupabaseMock({
      connections: () => [makeRow()],
    });
    const result = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      sourceSystem: "xero",
    });
    expect(result?.id).toBe(LIVE_CONNECTED);
    expect(calls[0].filters.status).toBe("connected");
    expect(calls[0].limit).toBe(2);
    expect(calls[0].orderedBy).toBeUndefined();
  });

  it("no connected row → null", async () => {
    const { supabase } = createSupabaseMock({ connections: () => null });
    const result = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      sourceSystem: "xero",
    });
    expect(result).toBeNull();
  });

  it("Xero company scope uses companies.xero_tenant_id (ignores poisoned metadata)", async () => {
    const companyA = makeRow({
      id: LIVE_CONNECTED,
      tenant_or_realm_id: TENANT_A,
      updated_at: "2026-08-10T00:00:00.000Z",
      metadata_json: { company_id: USER }, // poison
    });
    const companyBNewer = makeRow({
      id: XERO_B,
      tenant_or_realm_id: TENANT_B,
      updated_at: "2026-08-14T00:00:00.000Z",
      metadata_json: { company_id: COMPANY_B },
    });
    const { supabase, calls } = createSupabaseMock({
      companies: {
        [COMPANY_A]: { id: COMPANY_A, xero_tenant_id: TENANT_A, qbo_realm_id: null },
      },
      connections: () => [companyBNewer, companyA],
    });
    const result = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      sourceSystem: "xero",
      companyId: COMPANY_A,
    });
    expect(result?.id).toBe(LIVE_CONNECTED);
    expect(result?.tenant_or_realm_id).toBe(TENANT_A);
    expect(calls.some((c) => c.table === "companies")).toBe(true);
    expect(
      calls.find((c) => c.table === "accounting_connections" && c.filters.tenant_or_realm_id)?.filters
        .tenant_or_realm_id,
    ).toBe(TENANT_A);
  });

  it("QBO company scope uses companies.qbo_realm_id", async () => {
    const qbo = makeRow({
      id: QBO_CONN,
      provider: "quickbooks",
      provider_family: "quickbooks",
      tenant_or_realm_id: QBO_REALM,
      external_entity_id: QBO_REALM,
      metadata_json: { company_id: USER },
    });
    const { supabase } = createSupabaseMock({
      companies: {
        [QBO_COMPANY]: { id: QBO_COMPANY, xero_tenant_id: null, qbo_realm_id: QBO_REALM },
      },
      connections: () => [qbo],
    });
    const result = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      sourceSystem: "quickbooks",
      companyId: QBO_COMPANY,
    });
    expect(result?.id).toBe(QBO_CONN);
    expect(result?.tenant_or_realm_id).toBe(QBO_REALM);
  });

  it("tenant-only: two connected Xero tenants cannot cross-select", async () => {
    const tenantA = makeRow({
      id: LIVE_CONNECTED,
      tenant_or_realm_id: TENANT_A,
      updated_at: "2026-08-10T00:00:00.000Z",
    });
    const tenantB = makeRow({
      id: XERO_B,
      tenant_or_realm_id: TENANT_B,
      updated_at: "2026-08-14T00:00:00.000Z",
    });
    const { supabase } = createSupabaseMock({
      connections: () => [tenantB, tenantA],
    });
    const forA = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      sourceSystem: "xero",
      tenantOrRealmId: TENANT_A,
    });
    const forB = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      sourceSystem: "xero",
      tenantOrRealmId: TENANT_B,
    });
    expect(forA?.id).toBe(LIVE_CONNECTED);
    expect(forB?.id).toBe(XERO_B);
  });

  it("company+tenant mismatch → ACCOUNTING_CONNECTION_SCOPE_MISMATCH", async () => {
    const { supabase } = createSupabaseMock({
      companies: {
        [COMPANY_A]: { id: COMPANY_A, xero_tenant_id: TENANT_A, qbo_realm_id: null },
      },
      connections: () => [makeRow()],
    });
    await expect(
      selectAccountingConnectionForActiveContext({
        supabase,
        userId: USER,
        sourceSystem: "xero",
        companyId: COMPANY_A,
        tenantOrRealmId: TENANT_B,
      }),
    ).rejects.toMatchObject({
      code: "ACCOUNTING_CONNECTION_SCOPE_MISMATCH",
      httpStatus: 409,
    });
  });

  it("user-id poison companyId → null (no metadata fallback)", async () => {
    const { supabase, calls } = createSupabaseMock({
      connections: () => [
        makeRow({ metadata_json: { company_id: USER } }),
      ],
    });
    const result = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      sourceSystem: "xero",
      companyId: USER,
    });
    expect(result).toBeNull();
    expect(calls.filter((c) => c.table === "companies")).toHaveLength(0);
  });

  it("unscoped multi-tenant → ACCOUNTING_CONNECTION_AMBIGUOUS", async () => {
    const { supabase } = createSupabaseMock({
      connections: () => [
        makeRow({ id: XERO_B, tenant_or_realm_id: TENANT_B }),
        makeRow({ id: LIVE_CONNECTED, tenant_or_realm_id: TENANT_A }),
      ],
    });
    await expect(
      selectAccountingConnectionForActiveContext({
        supabase,
        userId: USER,
        sourceSystem: "xero",
      }),
    ).rejects.toMatchObject({
      code: "ACCOUNTING_CONNECTION_AMBIGUOUS",
      httpStatus: 409,
    });
  });

  it(">25-row proof: company tenant outside newest 25 still selected", async () => {
    const target = makeRow({
      id: LIVE_CONNECTED,
      tenant_or_realm_id: TENANT_A,
      updated_at: "2020-01-01T00:00:00.000Z",
    });
    const noise = Array.from({ length: 30 }, (_, i) =>
      makeRow({
        id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
        tenant_or_realm_id: `eeeeeeee-eeee-4eee-8eee-${String(i).padStart(12, "0")}`,
        updated_at: `2026-08-${String((i % 28) + 1).padStart(2, "0")}T00:00:00.000Z`,
      }),
    );
    const { supabase, calls } = createSupabaseMock({
      companies: {
        [COMPANY_A]: { id: COMPANY_A, xero_tenant_id: TENANT_A, qbo_realm_id: null },
      },
      connections: (call) => {
        // Exact tenant query should only see the target; noise must not gate eligibility.
        if (call.filters.tenant_or_realm_id === TENANT_A) return [target, ...noise];
        return [...noise, target];
      },
    });
    const result = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      sourceSystem: "xero",
      companyId: COMPANY_A,
    });
    expect(result?.id).toBe(LIVE_CONNECTED);
    const connCall = calls.find(
      (c) => c.table === "accounting_connections" && c.filters.tenant_or_realm_id === TENANT_A,
    );
    expect(connCall?.limit).toBe(2);
    expect(connCall?.orderedBy).toBeUndefined();
  });

  it("explicit-id contradictory tenant scope → SCOPE_MISMATCH", async () => {
    const { supabase } = createSupabaseMock({
      connections: () => makeRow({ tenant_or_realm_id: TENANT_A }),
    });
    await expect(
      selectAccountingConnectionForActiveContext({
        supabase,
        userId: USER,
        connectionId: LIVE_CONNECTED,
        sourceSystem: "xero",
        tenantOrRealmId: TENANT_B,
      }),
    ).rejects.toMatchObject({ code: "ACCOUNTING_CONNECTION_SCOPE_MISMATCH" });
  });

  it("explicit-id contradictory company scope → SCOPE_MISMATCH", async () => {
    const { supabase } = createSupabaseMock({
      companies: {
        [COMPANY_B]: { id: COMPANY_B, xero_tenant_id: TENANT_B, qbo_realm_id: null },
      },
      connections: () => makeRow({ tenant_or_realm_id: TENANT_A }),
    });
    await expect(
      selectAccountingConnectionForActiveContext({
        supabase,
        userId: USER,
        connectionId: LIVE_CONNECTED,
        sourceSystem: "xero",
        companyId: COMPANY_B,
      }),
    ).rejects.toMatchObject({ code: "ACCOUNTING_CONNECTION_SCOPE_MISMATCH" });
  });

  it("explicit-id matching company+tenant scope still returns row", async () => {
    const { supabase } = createSupabaseMock({
      companies: {
        [COMPANY_A]: { id: COMPANY_A, xero_tenant_id: TENANT_A, qbo_realm_id: null },
      },
      connections: () => makeRow({ tenant_or_realm_id: TENANT_A }),
    });
    const result = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      connectionId: LIVE_CONNECTED,
      sourceSystem: "xero",
      companyId: COMPANY_A,
      tenantOrRealmId: TENANT_A,
    });
    expect(result?.id).toBe(LIVE_CONNECTED);
  });

  it("Demo safety: disconnected explicit ID does not jump to another grant", async () => {
    const { supabase, calls } = createSupabaseMock({
      connections: (call) => {
        if (call.filters.id === STALE_CONNECTED) {
          return makeRow({ id: STALE_CONNECTED, status: "disconnected" });
        }
        return makeRow();
      },
    });
    await expect(
      selectAccountingConnectionForActiveContext({
        supabase,
        userId: USER,
        connectionId: STALE_CONNECTED,
        sourceSystem: "xero",
      }),
    ).rejects.toMatchObject({ code: "ACCOUNTING_CONNECTION_DISCONNECTED" });
    expect(calls).toHaveLength(1);
  });
});

describe("PR B supersession lifecycle (selection + types; no backfill)", () => {
  it("status union accepts superseded", () => {
    const status: AccountingConnectionStatus = "superseded";
    const row = makeRow({
      id: STALE_CONNECTED,
      status,
      superseded_by_connection_id: LIVE_CONNECTED,
    });
    expect(row.status).toBe("superseded");
  });

  it("rejects self-successor at business layer", () => {
    expect(isSelfSupersession({ id: LIVE_CONNECTED, superseded_by_connection_id: LIVE_CONNECTED })).toBe(true);
  });

  it("explicit superseded row → ACCOUNTING_CONNECTION_SUPERSEDED", async () => {
    const { supabase } = createSupabaseMock({
      connections: () =>
        makeRow({
          id: STALE_CONNECTED,
          status: "superseded",
          superseded_by_connection_id: null,
        }),
    });
    await expect(
      selectAccountingConnectionForActiveContext({
        supabase,
        userId: USER,
        connectionId: STALE_CONNECTED,
        sourceSystem: "xero",
      }),
    ).rejects.toMatchObject({
      code: "ACCOUNTING_CONNECTION_SUPERSEDED",
      httpStatus: 409,
    });
  });

  it("valid successor → successorConnectionId exposed", async () => {
    const predecessor = makeRow({
      id: STALE_CONNECTED,
      status: "superseded",
      tenant_or_realm_id: TENANT_A,
      superseded_by_connection_id: LIVE_CONNECTED,
    });
    const successor = makeRow({
      id: LIVE_CONNECTED,
      status: "connected",
      tenant_or_realm_id: TENANT_A,
    });
    const { supabase } = createSupabaseMock({
      connections: (call) => {
        if (call.filters.id === STALE_CONNECTED && call.filters.user_id) return predecessor;
        if (call.filters.id === LIVE_CONNECTED && !call.filters.user_id) return successor;
        return null;
      },
    });
    try {
      await selectAccountingConnectionForActiveContext({
        supabase,
        userId: USER,
        connectionId: STALE_CONNECTED,
        sourceSystem: "xero",
      });
      throw new Error("expected throw");
    } catch (error) {
      const err = error as AccountingConnectionSelectionError;
      expect(err.code).toBe("ACCOUNTING_CONNECTION_SUPERSEDED");
      expect(err.successorConnectionId).toBe(LIVE_CONNECTED);
      expect(accountingConnectionSelectionErrorBody(err).successorConnectionId).toBe(LIVE_CONNECTED);
    }
  });

  it("successor wrong tenant → do NOT expose", () => {
    const predecessor = makeRow({
      id: STALE_CONNECTED,
      status: "superseded",
      tenant_or_realm_id: TENANT_A,
    });
    const successor = makeRow({
      id: LIVE_CONNECTED,
      status: "connected",
      tenant_or_realm_id: TENANT_B,
    });
    expect(isExposableSupersessionSuccessor({ predecessor, successor })).toBe(false);
  });

  it("no-ID still filters connected only (excludes superseded)", async () => {
    const { supabase, calls } = createSupabaseMock({
      connections: (call) => {
        expect(call.filters.status).toBe("connected");
        return [makeRow()];
      },
    });
    await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      sourceSystem: "xero",
    });
    expect(calls[0].filters.status).toBe("connected");
  });

  it("migration is expand-only (no UPDATE/backfill/unique connected)", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20260813220000_accounting_connection_supersession.sql"),
      "utf8",
    );
    expect(sql).toContain("superseded_by_connection_id");
    expect(sql.toLowerCase()).not.toMatch(/\bupdate\s+public\.accounting_connections\b/);
  });
});
