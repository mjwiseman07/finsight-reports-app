/**
 * Accounting connection selection safety.
 * Explicit connectionId fails closed; no-ID is company/tenant-scoped or
 * exactly-one unambiguous connected candidate — never newest-updated_at wins.
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
      company_id: COMPANY_A,
      active_normalized_sync_id: "95da07be-8e2c-4b84-9dcc-8a98fa841273",
    },
    updated_at: "2026-08-13T03:28:57.315Z",
    created_at: "2026-08-12T21:30:33.617Z",
    ...overrides,
  };
}

type QueryCall = {
  filters: Record<string, string>;
  orderedBy?: string;
  ascending?: boolean;
  limit?: number;
};

function createSupabaseMock(
  resolver: (call: QueryCall) => AccountingConnectionRecord | AccountingConnectionRecord[] | null,
) {
  const calls: QueryCall[] = [];
  const from = vi.fn(() => {
    const call: QueryCall = { filters: {} };
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
        const resolved = resolver(call);
        const rows = Array.isArray(resolved) ? resolved : resolved ? [resolved] : [];
        return { data: typeof n === "number" ? rows.slice(0, n) : rows, error: null };
      },
    };
    return api;
  });
  return { supabase: { from }, calls };
}

describe("assertExplicitConnectionAuthoritative", () => {
  it("1. explicit connected ID returns exact row", () => {
    const row = makeRow();
    expect(assertExplicitConnectionAuthoritative(row)?.id).toBe(LIVE_CONNECTED);
  });

  it("5. explicit expired ID → ACCOUNTING_CONNECTION_EXPIRED", () => {
    const row = makeRow({ status: "expired" });
    try {
      assertExplicitConnectionAuthoritative(row);
      throw new Error("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(AccountingConnectionSelectionError);
      expect((error as AccountingConnectionSelectionError).code).toBe("ACCOUNTING_CONNECTION_EXPIRED");
      expect((error as AccountingConnectionSelectionError).httpStatus).toBe(409);
    }
  });

  it("6. explicit disconnected ID → rejected", () => {
    expect(() => assertExplicitConnectionAuthoritative(makeRow({ status: "disconnected" }))).toThrow(
      AccountingConnectionSelectionError,
    );
    try {
      assertExplicitConnectionAuthoritative(makeRow({ status: "disconnected" }));
    } catch (error) {
      expect((error as AccountingConnectionSelectionError).code).toBe("ACCOUNTING_CONNECTION_DISCONNECTED");
    }
  });

  it("7. explicit failed ID → rejected", () => {
    try {
      assertExplicitConnectionAuthoritative(makeRow({ status: "failed" }));
    } catch (error) {
      expect((error as AccountingConnectionSelectionError).code).toBe("ACCOUNTING_CONNECTION_FAILED");
    }
  });

  it("8. explicit pending ID → not ready", () => {
    try {
      assertExplicitConnectionAuthoritative(makeRow({ status: "pending" }));
    } catch (error) {
      expect((error as AccountingConnectionSelectionError).code).toBe("ACCOUNTING_CONNECTION_NOT_READY");
      expect((error as AccountingConnectionSelectionError).httpStatus).toBe(422);
    }
  });

  it("9. explicit needs_entity_selection → entity selection required", () => {
    try {
      assertExplicitConnectionAuthoritative(makeRow({ status: "needs_entity_selection" }));
    } catch (error) {
      expect((error as AccountingConnectionSelectionError).code).toBe(
        "ACCOUNTING_CONNECTION_ENTITY_SELECTION_REQUIRED",
      );
    }
  });

  it("2. unknown exact id → null (not latest)", () => {
    expect(assertExplicitConnectionAuthoritative(null)).toBeNull();
  });
});

describe("selectAccountingConnectionForActiveContext", () => {
  it("1. explicit connected ID returns exact row", async () => {
    const live = makeRow();
    const { supabase, calls } = createSupabaseMock((call) => {
      if (call.filters.id === LIVE_CONNECTED && call.filters.user_id === USER) return live;
      return null;
    });
    const result = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      connectionId: LIVE_CONNECTED,
      sourceSystem: "xero",
    });
    expect(result?.id).toBe(LIVE_CONNECTED);
    expect(calls).toHaveLength(1);
    expect(calls[0].filters).toEqual({
      id: LIVE_CONNECTED,
      user_id: USER,
      provider: "xero",
    });
    expect(calls[0].filters.status).toBeUndefined();
  });

  it("2. explicit unknown ID → null and does NOT query latest fallback", async () => {
    const { supabase, calls } = createSupabaseMock(() => null);
    const result = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      connectionId: "00000000-0000-4000-8000-000000000000",
      sourceSystem: "xero",
    });
    expect(result).toBeNull();
    expect(calls).toHaveLength(1);
    expect(calls[0].filters.id).toBe("00000000-0000-4000-8000-000000000000");
    expect(Object.keys(calls[0].filters)).not.toContain("status");
  });

  it("3. explicit wrong-user ID → null (non-disclosing); no latest fallback", async () => {
    const { supabase, calls } = createSupabaseMock((call) => {
      if (call.filters.user_id === OTHER_USER && call.filters.id === LIVE_CONNECTED) return null;
      return makeRow();
    });
    const miss = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: OTHER_USER,
      connectionId: LIVE_CONNECTED,
      sourceSystem: "xero",
    });
    expect(miss).toBeNull();
    expect(calls).toHaveLength(1);
    expect(calls[0].filters).toEqual({
      id: LIVE_CONNECTED,
      user_id: OTHER_USER,
      provider: "xero",
    });
  });

  it("4. explicit ID + wrong provider → null; no provider-less fallback", async () => {
    const { supabase, calls } = createSupabaseMock((call) => {
      if (call.filters.provider === "quickbooks") return null;
      return makeRow();
    });
    const result = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      connectionId: LIVE_CONNECTED,
      sourceSystem: "quickbooks",
    });
    expect(result).toBeNull();
    expect(calls).toHaveLength(1);
    expect(calls[0].filters.provider).toBe("quickbooks");
    expect(calls[0].filters.id).toBe(LIVE_CONNECTED);
  });

  it("5-9. explicit non-connected statuses throw typed errors (no fallback call)", async () => {
    for (const [status, code] of [
      ["expired", "ACCOUNTING_CONNECTION_EXPIRED"],
      ["disconnected", "ACCOUNTING_CONNECTION_DISCONNECTED"],
      ["failed", "ACCOUNTING_CONNECTION_FAILED"],
      ["pending", "ACCOUNTING_CONNECTION_NOT_READY"],
      ["needs_entity_selection", "ACCOUNTING_CONNECTION_ENTITY_SELECTION_REQUIRED"],
    ] as const) {
      const { supabase, calls } = createSupabaseMock(() => makeRow({ status, id: STALE_CONNECTED }));
      await expect(
        selectAccountingConnectionForActiveContext({
          supabase,
          userId: USER,
          connectionId: STALE_CONNECTED,
          sourceSystem: "xero",
        }),
      ).rejects.toMatchObject({ code });
      expect(calls).toHaveLength(1);
    }
  });

  it("10. no explicit ID + single connected → unambiguous candidate", async () => {
    const live = makeRow();
    const { supabase, calls } = createSupabaseMock((call) => {
      if (call.filters.status === "connected") return [live];
      return null;
    });
    const result = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      sourceSystem: "xero",
    });
    expect(result?.id).toBe(LIVE_CONNECTED);
    expect(calls[0].filters.status).toBe("connected");
    expect(calls[0].limit).toBe(25);
  });

  it("11. no explicit ID: newer expired ignored vs older connected", async () => {
    const olderConnected = makeRow({
      id: LIVE_CONNECTED,
      status: "connected",
      updated_at: "2026-08-12T03:00:00.000Z",
    });
    const { supabase, calls } = createSupabaseMock((call) => {
      expect(call.filters.status).toBe("connected");
      return [olderConnected];
    });
    const result = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      sourceSystem: "xero",
    });
    expect(result?.id).toBe(LIVE_CONNECTED);
    expect(calls).toHaveLength(1);
  });

  it("12. no explicit ID: newer disconnected ignored (status filter)", async () => {
    const { supabase, calls } = createSupabaseMock((call) => {
      expect(call.filters.status).toBe("connected");
      return [makeRow()];
    });
    await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      sourceSystem: "xero",
    });
    expect(calls[0].filters.status).toBe("connected");
  });

  it("13. provider supplied: only that provider", async () => {
    const { supabase, calls } = createSupabaseMock(() => [
      makeRow({ provider: "quickbooks", id: "qbo-1" }),
    ]);
    const result = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      sourceSystem: "quickbooks",
    });
    expect(result?.provider).toBe("quickbooks");
    expect(calls[0].filters.provider).toBe("quickbooks");
    expect(calls[0].filters.status).toBe("connected");
  });

  it("14. no connected row → null", async () => {
    const { supabase } = createSupabaseMock(() => null);
    const result = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      sourceSystem: "xero",
    });
    expect(result).toBeNull();
  });

  it("15. Demo live connected remains selectable (no-ID single candidate)", async () => {
    const live = makeRow();
    const { supabase } = createSupabaseMock(() => [live]);
    const result = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      sourceSystem: "xero",
    });
    expect(result?.id).toBe(LIVE_CONNECTED);
    expect(result?.metadata_json.active_normalized_sync_id).toBe("95da07be-8e2c-4b84-9dcc-8a98fa841273");
  });

  it("Demo safety: explicit ce526f9b still connected → returned exactly today", async () => {
    const staleStillConnected = makeRow({
      id: STALE_CONNECTED,
      updated_at: "2026-08-12T03:52:17.164Z",
      metadata_json: {
        company_id: COMPANY_A,
        active_normalized_sync_id: "dd59d698-200b-42cd-9810-4a4c455c9816",
      },
    });
    const { supabase, calls } = createSupabaseMock((call) => {
      if (call.filters.id === STALE_CONNECTED) return staleStillConnected;
      return makeRow();
    });
    const result = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      connectionId: STALE_CONNECTED,
      sourceSystem: "xero",
    });
    expect(result?.id).toBe(STALE_CONNECTED);
    expect(calls).toHaveLength(1);
  });

  it("Demo safety: if ce526f9b later disconnected, explicit miss does NOT jump to b718823a", async () => {
    const { supabase, calls } = createSupabaseMock((call) => {
      if (call.filters.id === STALE_CONNECTED) {
        return makeRow({ id: STALE_CONNECTED, status: "disconnected" });
      }
      return makeRow();
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
    expect(calls[0].filters.id).toBe(STALE_CONNECTED);
  });

  it("company-scoped: selects matching company even when another tenant is newer", async () => {
    const companyA = makeRow({
      id: LIVE_CONNECTED,
      tenant_or_realm_id: TENANT_A,
      updated_at: "2026-08-10T00:00:00.000Z",
      metadata_json: { company_id: COMPANY_A },
    });
    const companyBNewer = makeRow({
      id: XERO_B,
      tenant_or_realm_id: TENANT_B,
      external_entity_id: `xero:${TENANT_B}`,
      external_entity_name: "Other Org",
      updated_at: "2026-08-14T00:00:00.000Z",
      metadata_json: { company_id: COMPANY_B },
    });
    const { supabase } = createSupabaseMock(() => [companyBNewer, companyA]);
    const result = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      sourceSystem: "xero",
      companyId: COMPANY_A,
    });
    expect(result?.id).toBe(LIVE_CONNECTED);
    expect(result?.tenant_or_realm_id).toBe(TENANT_A);
  });

  it("tenant-scoped: two connected Xero tenants cannot cross-select", async () => {
    const tenantA = makeRow({
      id: LIVE_CONNECTED,
      tenant_or_realm_id: TENANT_A,
      updated_at: "2026-08-10T00:00:00.000Z",
      metadata_json: { company_id: COMPANY_A },
    });
    const tenantB = makeRow({
      id: XERO_B,
      tenant_or_realm_id: TENANT_B,
      external_entity_id: `xero:${TENANT_B}`,
      updated_at: "2026-08-14T00:00:00.000Z",
      metadata_json: { company_id: COMPANY_B },
    });
    const { supabase } = createSupabaseMock(() => [tenantB, tenantA]);
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

  it("updated_at cannot override company scope", async () => {
    const scopedOlder = makeRow({
      id: LIVE_CONNECTED,
      updated_at: "2026-01-01T00:00:00.000Z",
      metadata_json: { company_id: COMPANY_A },
    });
    const otherNewer = makeRow({
      id: XERO_B,
      tenant_or_realm_id: TENANT_B,
      updated_at: "2026-08-14T23:59:59.000Z",
      metadata_json: { company_id: COMPANY_B },
    });
    const { supabase } = createSupabaseMock(() => [otherNewer, scopedOlder]);
    const result = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      sourceSystem: "xero",
      companyId: COMPANY_A,
    });
    expect(result?.id).toBe(LIVE_CONNECTED);
  });

  it("unscoped multi-tenant → ACCOUNTING_CONNECTION_AMBIGUOUS (never latest wins)", async () => {
    const tenantA = makeRow({
      id: LIVE_CONNECTED,
      tenant_or_realm_id: TENANT_A,
      updated_at: "2026-08-10T00:00:00.000Z",
      metadata_json: { company_id: COMPANY_A },
    });
    const tenantB = makeRow({
      id: XERO_B,
      tenant_or_realm_id: TENANT_B,
      updated_at: "2026-08-14T00:00:00.000Z",
      metadata_json: { company_id: COMPANY_B },
    });
    const { supabase } = createSupabaseMock(() => [tenantB, tenantA]);
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

  it("company scope with zero matches → null", async () => {
    const { supabase } = createSupabaseMock(() => [
      makeRow({ metadata_json: { company_id: COMPANY_A } }),
    ]);
    const result = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      sourceSystem: "xero",
      companyId: COMPANY_B,
    });
    expect(result).toBeNull();
  });
});

describe("PR B supersession lifecycle (selection + types; no backfill)", () => {
  const TENANT = TENANT_A;

  it("1. status union accepts superseded", () => {
    const status: AccountingConnectionStatus = "superseded";
    const row = makeRow({
      id: STALE_CONNECTED,
      status,
      superseded_by_connection_id: LIVE_CONNECTED,
    });
    expect(row.status).toBe("superseded");
    expect(row.superseded_by_connection_id).toBe(LIVE_CONNECTED);
  });

  it("rejects self-successor at business layer", () => {
    expect(isSelfSupersession({ id: LIVE_CONNECTED, superseded_by_connection_id: LIVE_CONNECTED })).toBe(true);
    expect(isSelfSupersession({ id: STALE_CONNECTED, superseded_by_connection_id: LIVE_CONNECTED })).toBe(false);
  });

  it("2. explicit superseded row → ACCOUNTING_CONNECTION_SUPERSEDED", async () => {
    const superseded = makeRow({
      id: STALE_CONNECTED,
      status: "superseded",
      superseded_by_connection_id: null,
    });
    const { supabase } = createSupabaseMock(() => superseded);
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
      connectionId: STALE_CONNECTED,
    });
  });

  it("3. valid successor → successorConnectionId exposed", async () => {
    const predecessor = makeRow({
      id: STALE_CONNECTED,
      status: "superseded",
      tenant_or_realm_id: TENANT,
      superseded_by_connection_id: LIVE_CONNECTED,
    });
    const successor = makeRow({
      id: LIVE_CONNECTED,
      status: "connected",
      tenant_or_realm_id: TENANT,
    });
    const { supabase } = createSupabaseMock((call) => {
      if (call.filters.id === STALE_CONNECTED && call.filters.user_id) return predecessor;
      if (call.filters.id === LIVE_CONNECTED && !call.filters.user_id) return successor;
      return null;
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
      expect(error).toBeInstanceOf(AccountingConnectionSelectionError);
      const err = error as AccountingConnectionSelectionError;
      expect(err.code).toBe("ACCOUNTING_CONNECTION_SUPERSEDED");
      expect(err.successorConnectionId).toBe(LIVE_CONNECTED);
      expect(accountingConnectionSelectionErrorBody(err).successorConnectionId).toBe(LIVE_CONNECTED);
    }
  });

  it("4. successor wrong user → do NOT expose successorConnectionId", async () => {
    const predecessor = makeRow({
      id: STALE_CONNECTED,
      status: "superseded",
      superseded_by_connection_id: LIVE_CONNECTED,
    });
    const successor = makeRow({
      id: LIVE_CONNECTED,
      user_id: OTHER_USER,
      status: "connected",
    });
    expect(isExposableSupersessionSuccessor({ predecessor, successor })).toBe(false);
    const { supabase } = createSupabaseMock((call) => {
      if (call.filters.id === STALE_CONNECTED && call.filters.user_id) return predecessor;
      if (call.filters.id === LIVE_CONNECTED) return successor;
      return null;
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
      expect(error).toBeInstanceOf(AccountingConnectionSelectionError);
      const err = error as AccountingConnectionSelectionError;
      expect(err.code).toBe("ACCOUNTING_CONNECTION_SUPERSEDED");
      expect(err.successorConnectionId).toBeUndefined();
      expect(accountingConnectionSelectionErrorBody(err).successorConnectionId).toBeUndefined();
    }
  });

  it("5. successor wrong provider → do NOT expose", () => {
    const predecessor = makeRow({ id: STALE_CONNECTED, status: "superseded", provider: "xero" });
    const successor = makeRow({ id: LIVE_CONNECTED, status: "connected", provider: "quickbooks" });
    expect(isExposableSupersessionSuccessor({ predecessor, successor })).toBe(false);
  });

  it("6. successor wrong tenant → do NOT expose", () => {
    const predecessor = makeRow({
      id: STALE_CONNECTED,
      status: "superseded",
      tenant_or_realm_id: TENANT,
    });
    const successor = makeRow({
      id: LIVE_CONNECTED,
      status: "connected",
      tenant_or_realm_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    expect(isExposableSupersessionSuccessor({ predecessor, successor })).toBe(false);
  });

  it("7. successor non-connected → do NOT expose", () => {
    const predecessor = makeRow({ id: STALE_CONNECTED, status: "superseded" });
    const successor = makeRow({ id: LIVE_CONNECTED, status: "expired" });
    expect(isExposableSupersessionSuccessor({ predecessor, successor })).toBe(false);
  });

  it("8. superseded with null successor → 409 without successor id", async () => {
    const predecessor = makeRow({
      id: STALE_CONNECTED,
      status: "superseded",
      superseded_by_connection_id: null,
    });
    const { supabase } = createSupabaseMock(() => predecessor);
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
      expect(err.successorConnectionId).toBeUndefined();
      expect(accountingConnectionSelectionErrorBody(err)).not.toHaveProperty("successorConnectionId");
    }
  });

  it("9. connected behavior unchanged", async () => {
    const { supabase } = createSupabaseMock(() => makeRow());
    const result = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      connectionId: LIVE_CONNECTED,
      sourceSystem: "xero",
    });
    expect(result?.id).toBe(LIVE_CONNECTED);
  });

  it("10. expired/disconnected/failed behavior unchanged", async () => {
    for (const [status, code] of [
      ["expired", "ACCOUNTING_CONNECTION_EXPIRED"],
      ["disconnected", "ACCOUNTING_CONNECTION_DISCONNECTED"],
      ["failed", "ACCOUNTING_CONNECTION_FAILED"],
    ] as const) {
      const { supabase } = createSupabaseMock(() => makeRow({ id: STALE_CONNECTED, status }));
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

  it("11. no-ID still filters connected only (excludes superseded)", async () => {
    const { supabase, calls } = createSupabaseMock((call) => {
      expect(call.filters.status).toBe("connected");
      return [makeRow()];
    });
    await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      sourceSystem: "xero",
    });
    expect(calls[0].filters.status).toBe("connected");
  });

  it("12. production unchanged: still-connected ce526f9b remains selectable until PR C", async () => {
    const stillConnected = makeRow({ id: STALE_CONNECTED, status: "connected" });
    const { supabase } = createSupabaseMock(() => stillConnected);
    const result = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      connectionId: STALE_CONNECTED,
      sourceSystem: "xero",
    });
    expect(result?.id).toBe(STALE_CONNECTED);
  });

  it("historical superseded cannot win no-ID path even if newer updated_at", async () => {
    const live = makeRow({
      id: LIVE_CONNECTED,
      status: "connected",
      updated_at: "2026-08-10T00:00:00.000Z",
    });
    const { supabase, calls } = createSupabaseMock((call) => {
      expect(call.filters.status).toBe("connected");
      return [live];
    });
    const result = await selectAccountingConnectionForActiveContext({
      supabase,
      userId: USER,
      sourceSystem: "xero",
    });
    expect(result?.id).toBe(LIVE_CONNECTED);
    expect(calls[0].filters.status).toBe("connected");
  });

  it("migration is expand-only (no UPDATE/backfill/unique connected)", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase/migrations/20260813220000_accounting_connection_supersession.sql"),
      "utf8",
    );
    expect(sql).toContain("superseded_by_connection_id");
    expect(sql).toContain("ON DELETE SET NULL");
    expect(sql).toContain("accounting_connections_superseded_by_not_self");
    expect(sql.toLowerCase()).not.toMatch(/\bupdate\s+public\.accounting_connections\b/);
    expect(sql).not.toContain("UNIQUE");
    expect(sql).not.toMatch(/status\s*=\s*'superseded'/);
    expect(sql).not.toMatch(/CHECK\s*\(\s*status\s+in/i);
  });
});
