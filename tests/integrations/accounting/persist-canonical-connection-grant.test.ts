/**
 * PR D — reconnect-in-place / canonical OAuth grant persistence.
 * OAuth reconnect refreshes authorization; it does not re-elect accounting truth.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isAccountingConnectionsUniqueViolation,
  mergeConnectionGrantMetadata,
  persistCanonicalAccountingConnectionGrant,
  PRESERVED_CONNECTION_METADATA_KEYS,
} from "@/lib/integrations/accounting/persist-canonical-connection-grant";
import type { AccountingConnectionRecord } from "@/lib/integrations/accounting/types";

const USER = "a4ebf834-a698-4f79-a945-8498f2e6c45d";
const TENANT = "ceaea696-081f-491e-9daa-a9263a023ca9";
const CANONICAL = "b718823a-0eb8-437d-beba-05c41f6482f9";
const CANONICAL_COMPANY = "02edb6c6-a4f1-4bae-825d-2680136dad24";
const CANONICAL_SYNC = "95da07be-8e2c-4b84-9dcc-8a98fa841273";
const DISCONNECTED = "11111111-1111-4111-8111-111111111111";
const SUPERSEDED = "ce526f9b-5d2c-46fc-b6f3-46617ab375bf";

type StoreRow = AccountingConnectionRecord & { updated_at: string };

function makeRow(overrides: Partial<StoreRow> = {}): StoreRow {
  return {
    id: CANONICAL,
    user_id: USER,
    provider: "xero",
    provider_family: "xero",
    provider_product: "xero_accounting",
    external_entity_id: `xero:${TENANT}`,
    external_entity_name: "Demo Company (US)",
    tenant_or_realm_id: TENANT,
    scopes: ["openid"],
    status: "connected",
    metadata_json: {
      company_id: CANONICAL_COMPANY,
      active_normalized_sync_id: CANONICAL_SYNC,
      last_sync_id: CANONICAL_SYNC,
      connected_at: "2026-08-12T21:30:33.617Z",
      last_synced_at: "2026-08-13T03:28:57.315Z",
    },
    access_token: "old-access",
    refresh_token: "old-refresh",
    token_expires_at: "2026-08-13T01:00:00.000Z",
    created_at: "2026-08-12T21:30:33.617Z",
    updated_at: "2026-08-13T03:28:57.315Z",
    ...overrides,
  };
}

function createStoreAdmin(
  initial: StoreRow[],
  opts?: { failInsertOnce?: boolean; onInsertRace?: (rows: StoreRow[]) => void },
) {
  const rows = initial.map((r) => ({ ...r, metadata_json: { ...r.metadata_json } }));
  let failInsertOnce = Boolean(opts?.failInsertOnce);
  const writes: Array<{ op: string; id?: string; payload?: Record<string, unknown> }> = [];

  function matches(row: StoreRow, filters: Record<string, unknown>) {
    for (const [key, value] of Object.entries(filters)) {
      if (key === "__in_status") {
        if (!(value as string[]).includes(row.status)) return false;
        continue;
      }
      if (key === "__is_null") {
        if (row.tenant_or_realm_id != null) return false;
        continue;
      }
      if (key === "__neq_status") {
        if (row.status === value) return false;
        continue;
      }
      if ((row as unknown as Record<string, unknown>)[key] !== value) return false;
    }
    return true;
  }

  function from(table: string) {
    if (table !== "accounting_connections") throw new Error(`unexpected ${table}`);
    const filters: Record<string, unknown> = {};
    let updatePayload: Record<string, unknown> | null = null;
    let insertPayload: Record<string, unknown> | null = null;
    let orderedBy: string | undefined;
    let ascending = true;

    const api: any = {
      select: () => api,
      eq: (key: string, value: unknown) => {
        filters[key] = value;
        return api;
      },
      in: (key: string, values: string[]) => {
        if (key === "status") filters.__in_status = values;
        return api;
      },
      is: (key: string, value: null) => {
        if (key === "tenant_or_realm_id" && value === null) filters.__is_null = true;
        return api;
      },
      neq: (key: string, value: unknown) => {
        if (key === "status") filters.__neq_status = value;
        return api;
      },
      order: (key: string, opts?: { ascending?: boolean }) => {
        orderedBy = key;
        ascending = opts?.ascending !== false;
        return api;
      },
      update: (payload: Record<string, unknown>) => {
        updatePayload = payload;
        return api;
      },
      insert: (payload: Record<string, unknown>) => {
        insertPayload = payload;
        return api;
      },
      limit: async (n: number) => {
        if (updatePayload) {
          const id = String(filters.id);
          const idx = rows.findIndex((r) => r.id === id);
          if (idx < 0) return { data: [], error: { message: "not found" } };
          const nextStatus = String(updatePayload.status || rows[idx].status);
          const nextTenant = (updatePayload.tenant_or_realm_id as string | null) ?? rows[idx].tenant_or_realm_id;
          if (
            nextStatus === "connected" &&
            nextTenant &&
            rows.some(
              (r) =>
                r.id !== id &&
                r.user_id === rows[idx].user_id &&
                r.provider === rows[idx].provider &&
                r.tenant_or_realm_id === nextTenant &&
                r.status === "connected",
            )
          ) {
            return {
              data: null,
              error: {
                code: "23505",
                message:
                  'duplicate key value violates unique constraint "accounting_connections_one_connected_grant_uidx"',
              },
            };
          }
          rows[idx] = {
            ...rows[idx],
            ...updatePayload,
            metadata_json: {
              ...((updatePayload.metadata_json as Record<string, unknown>) || {}),
            },
            updated_at: String(updatePayload.updated_at || new Date().toISOString()),
          } as StoreRow;
          writes.push({ op: "update", id, payload: updatePayload });
          return { data: [{ id }], error: null };
        }

        if (insertPayload) {
          if (failInsertOnce) {
            failInsertOnce = false;
            writes.push({ op: "insert_race" });
            opts?.onInsertRace?.(rows);
            return {
              data: null,
              error: {
                code: "23505",
                message:
                  'duplicate key value violates unique constraint "accounting_connections_one_connected_grant_uidx"',
              },
            };
          }
          const tenant = insertPayload.tenant_or_realm_id as string | null;
          if (
            insertPayload.status === "connected" &&
            tenant &&
            rows.some(
              (r) =>
                r.user_id === insertPayload!.user_id &&
                r.provider === insertPayload!.provider &&
                r.tenant_or_realm_id === tenant &&
                r.status === "connected",
            )
          ) {
            return {
              data: null,
              error: {
                code: "23505",
                message:
                  'duplicate key value violates unique constraint "accounting_connections_one_connected_grant_uidx"',
              },
            };
          }
          const id = `new-${rows.length + 1}`;
          rows.push({
            ...(insertPayload as unknown as StoreRow),
            id,
            metadata_json: {
              ...((insertPayload.metadata_json as Record<string, unknown>) || {}),
            },
          });
          writes.push({ op: "insert", id, payload: insertPayload });
          return { data: [{ id }], error: null };
        }

        let matched = rows.filter((r) => matches(r, filters));
        if (orderedBy) {
          matched = matched.sort((a, b) => {
            const av = String((a as Record<string, unknown>)[orderedBy!] || "");
            const bv = String((b as Record<string, unknown>)[orderedBy!] || "");
            return ascending ? av.localeCompare(bv) : bv.localeCompare(av);
          });
        }
        return { data: matched.slice(0, n), error: null };
      },
    };
    return api;
  }

  return {
    admin: { from } as any,
    rows,
    writes,
  };
}

function baseArgs(admin: any, overrides: Record<string, unknown> = {}) {
  return {
    admin,
    userId: USER,
    provider: "xero" as const,
    providerFamily: "xero",
    providerProduct: "xero_accounting",
    tenantOrRealmId: TENANT,
    externalEntityId: `xero:${TENANT}`,
    externalEntityName: "Demo Company (US)",
    accessToken: "new-access",
    refreshToken: "new-refresh",
    tokenExpiresAt: "2026-08-14T01:00:00.000Z",
    scopes: ["openid", "accounting.transactions"],
    status: "connected" as const,
    companyId: CANONICAL_COMPANY,
    nowIso: "2026-08-14T12:00:00.000Z",
    metadataPatch: {
      source_system: "xero",
      active_provider: "xero",
      tenant_id: TENANT,
      tenant_name: "Demo Company (US)",
      connected_at: "2026-08-14T12:00:00.000Z",
      tokens_encrypted: true,
    },
    ...overrides,
  };
}

describe("mergeConnectionGrantMetadata", () => {
  it("preserves sync lineage and rejects user_id-shaped company_id", () => {
    const merged = mergeConnectionGrantMetadata({
      existing: {
        company_id: USER,
        active_normalized_sync_id: CANONICAL_SYNC,
        last_sync_id: CANONICAL_SYNC,
        connected_at: "2026-08-12T21:30:33.617Z",
        last_synced_at: "2026-08-13T03:28:57.315Z",
        tenant_name: "old",
      },
      incoming: {
        tenant_name: "Demo Company (US)",
        connected_at: "2026-08-14T12:00:00.000Z",
        last_synced_at: "2026-08-14T12:00:00.000Z",
        last_reconnected_at: "2026-08-14T12:00:00.000Z",
      },
      userId: USER,
      companyId: CANONICAL_COMPANY,
    });

    expect(merged.company_id).toBe(CANONICAL_COMPANY);
    expect(merged.active_normalized_sync_id).toBe(CANONICAL_SYNC);
    expect(merged.last_sync_id).toBe(CANONICAL_SYNC);
    expect(merged.connected_at).toBe("2026-08-12T21:30:33.617Z");
    expect(merged.last_synced_at).toBe("2026-08-13T03:28:57.315Z");
    expect(merged.tenant_name).toBe("Demo Company (US)");
    expect(merged.last_reconnected_at).toBe("2026-08-14T12:00:00.000Z");
    for (const key of PRESERVED_CONNECTION_METADATA_KEYS) {
      expect(key in merged || key === "latest_sync_by_source").toBeTruthy();
    }
  });
});

describe("persistCanonicalAccountingConnectionGrant", () => {
  it("updates canonical connected row in place (Demo reconnect regression)", async () => {
    const { admin, rows, writes } = createStoreAdmin([makeRow()]);
    const result = await persistCanonicalAccountingConnectionGrant(baseArgs(admin));

    expect(result.connectionId).toBe(CANONICAL);
    expect(result.outcome).toBe("updated_connected");
    expect(writes.some((w) => w.op === "insert")).toBe(false);
    expect(rows).toHaveLength(1);
    expect(rows[0].access_token).toBe("new-access");
    expect(rows[0].metadata_json.active_normalized_sync_id).toBe(CANONICAL_SYNC);
    expect(rows[0].metadata_json.company_id).toBe(CANONICAL_COMPANY);
    expect(rows.filter((r) => r.status === "connected")).toHaveLength(1);
  });

  it("revives disconnected row when no connected grant exists", async () => {
    const { admin, rows } = createStoreAdmin([
      makeRow({
        id: DISCONNECTED,
        status: "disconnected",
        metadata_json: {
          company_id: CANONICAL_COMPANY,
          active_normalized_sync_id: CANONICAL_SYNC,
          connected_at: "2026-08-01T00:00:00.000Z",
        },
        updated_at: "2026-08-10T00:00:00.000Z",
      }),
      makeRow({
        id: SUPERSEDED,
        status: "superseded",
        superseded_by_connection_id: CANONICAL,
        updated_at: "2026-08-11T00:00:00.000Z",
      }),
    ]);

    const result = await persistCanonicalAccountingConnectionGrant(baseArgs(admin));
    expect(result.connectionId).toBe(DISCONNECTED);
    expect(result.outcome).toBe("revived");
    expect(rows.find((r) => r.id === DISCONNECTED)?.status).toBe("connected");
    expect(rows.find((r) => r.id === SUPERSEDED)?.status).toBe("superseded");
    expect(rows.filter((r) => r.status === "connected")).toHaveLength(1);
  });

  it("does not revive superseded when a connected canonical exists", async () => {
    const { admin, rows } = createStoreAdmin([
      makeRow(),
      makeRow({
        id: SUPERSEDED,
        status: "superseded",
        superseded_by_connection_id: CANONICAL,
        updated_at: "2026-08-14T11:00:00.000Z",
      }),
    ]);

    const result = await persistCanonicalAccountingConnectionGrant(baseArgs(admin));
    expect(result.connectionId).toBe(CANONICAL);
    expect(result.outcome).toBe("updated_connected");
    expect(rows.find((r) => r.id === SUPERSEDED)?.status).toBe("superseded");
    expect(rows.filter((r) => r.status === "connected")).toHaveLength(1);
  });

  it("inserts when no reusable row exists", async () => {
    const { admin, rows } = createStoreAdmin([]);
    const result = await persistCanonicalAccountingConnectionGrant(baseArgs(admin));
    expect(result.outcome).toBe("inserted");
    expect(result.connectionId).toMatch(/^new-/);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("connected");
  });

  it("recovers from unique-violation insert race onto connected grant", async () => {
    const { admin, rows, writes } = createStoreAdmin([], {
      failInsertOnce: true,
      onInsertRace: (store) => {
        store.push(makeRow());
      },
    });

    const result = await persistCanonicalAccountingConnectionGrant(baseArgs(admin));
    expect(result.connectionId).toBe(CANONICAL);
    expect(result.outcome).toBe("updated_connected");
    expect(writes.some((w) => w.op === "insert_race")).toBe(true);
    expect(writes.some((w) => w.op === "update" && w.id === CANONICAL)).toBe(true);
    expect(rows.filter((r) => r.status === "connected")).toHaveLength(1);
    expect(rows[0].access_token).toBe("new-access");
    expect(rows[0].metadata_json.active_normalized_sync_id).toBe(CANONICAL_SYNC);
  });

  it("detects Postgres 23505 unique violations", () => {
    expect(
      isAccountingConnectionsUniqueViolation({
        code: "23505",
        message: 'duplicate key value violates unique constraint "accounting_connections_one_connected_grant_uidx"',
      }),
    ).toBe(true);
    expect(isAccountingConnectionsUniqueViolation({ code: "42501", message: "permission" })).toBe(false);
  });

  it("tenant-less path does not overwrite a tenant-scoped connected grant", async () => {
    const { admin, rows } = createStoreAdmin([makeRow()]);
    const result = await persistCanonicalAccountingConnectionGrant(
      baseArgs(admin, {
        tenantOrRealmId: null,
        externalEntityId: null,
        status: "needs_entity_selection",
        companyId: null,
      }),
    );
    expect(result.outcome).toBe("inserted");
    expect(rows.find((r) => r.id === CANONICAL)?.status).toBe("connected");
    expect(rows.filter((r) => r.status === "needs_entity_selection")).toHaveLength(1);
  });
});

describe("PR D source wiring (static)", () => {
  it("authenticated handleCallback no longer blind-inserts company_id=user.id", () => {
    const service = readFileSync(join(process.cwd(), "lib/integrations/accounting/service.ts"), "utf8");
    const handleStart = service.indexOf("export async function handleCallback");
    const handleEnd = service.indexOf("export async function getConnectionForUser");
    const body = service.slice(handleStart, handleEnd);
    expect(body).toContain("persistCanonicalAccountingConnectionGrant");
    expect(body).toContain("resolveOrCreateCompanyForProvider");
    expect(body).not.toMatch(/company_id:\s*authData\.user\.id/);
    expect(body).not.toMatch(/\.from\("accounting_connections"\)\s*\n\s*\.insert\(/);
  });

  it("Xero lead callback is tenant-aware via shared helper", () => {
    const route = readFileSync(join(process.cwd(), "app/api/integrations/xero/callback/route.js"), "utf8");
    expect(route).toContain("persistCanonicalAccountingConnectionGrant");
    expect(route).not.toMatch(/\.eq\("provider", "xero"\)\s*\n\s*\.order\("updated_at"/);
    expect(route).not.toMatch(/company_id:\s*leadId/);
  });
});
