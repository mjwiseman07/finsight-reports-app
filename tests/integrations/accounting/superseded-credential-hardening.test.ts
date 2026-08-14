/**
 * PR F — live provider access vs historical evidence lookup.
 * Contracts stay distinct from active-context selection.
 * Never assert token plaintext beyond controlled fixtures.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { encryptAccountingToken } from "@/lib/integrations/accounting/token-encryption";
import type { AccountingConnectionRecord } from "@/lib/integrations/accounting/types";

const USER = "a4ebf834-a698-4f79-a945-8498f2e6c45d";
const STALE = "ce526f9b-5d2c-46fc-b6f3-46617ab375bf";
const LIVE = "b718823a-0eb8-437d-beba-05c41f6482f9";
const TENANT = "ceaea696-081f-491e-9daa-a9263a023ca9";

const selectLimit = vi.fn();
const ensureFreshTokens = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table !== "accounting_connections") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              limit: selectLimit,
            }),
            limit: selectLimit,
          }),
        }),
      };
    },
  },
}));

vi.mock("@/lib/integrations/accounting/ensure-fresh-tokens", () => ({
  ensureFreshTokens: (...args: unknown[]) => ensureFreshTokens(...args),
}));

import {
  getAccountingConnectionRecordForUser,
  getConnectionForUser,
  getLiveProviderConnectionForUser,
  isLiveProviderConnectionStatus,
} from "@/lib/integrations/accounting/live-provider-connection";
import { selectAccountingConnectionForActiveContext } from "@/lib/integrations/accounting/connection-selection";

process.env.ACCOUNTING_TOKEN_ENCRYPTION_KEY = "test-accounting-token-encryption-key";

function makeRow(overrides: Partial<AccountingConnectionRecord> = {}): AccountingConnectionRecord {
  return {
    id: LIVE,
    user_id: USER,
    provider: "xero",
    provider_family: "xero",
    provider_product: "xero",
    external_entity_id: "tenant-1",
    external_entity_name: "Demo",
    access_token: encryptAccountingToken("access-live"),
    refresh_token: encryptAccountingToken("refresh-live"),
    token_expires_at: new Date(Date.now() + 3600_000).toISOString(),
    tenant_or_realm_id: TENANT,
    scopes: [],
    status: "connected",
    metadata_json: {},
    ...overrides,
  };
}

describe("PR F live provider connection gateway", () => {
  beforeEach(() => {
    selectLimit.mockReset();
    ensureFreshTokens.mockReset();
  });

  it("isLiveProviderConnectionStatus allows only connected + needs_entity_selection", () => {
    expect(isLiveProviderConnectionStatus("connected")).toBe(true);
    expect(isLiveProviderConnectionStatus("needs_entity_selection")).toBe(true);
    expect(isLiveProviderConnectionStatus("superseded")).toBe(false);
    expect(isLiveProviderConnectionStatus("disconnected")).toBe(false);
  });

  it("4. needs_entity_selection live lookup reaches ensureFreshTokens (entity workflow)", async () => {
    const pendingEntity = makeRow({ status: "needs_entity_selection" });
    selectLimit.mockResolvedValue({ data: [pendingEntity], error: null });
    ensureFreshTokens.mockResolvedValue({ ...pendingEntity, access_token: "decrypted-for-provider" });

    const result = await getLiveProviderConnectionForUser(LIVE, USER);

    expect(ensureFreshTokens).toHaveBeenCalledTimes(1);
    expect(ensureFreshTokens).toHaveBeenCalledWith(
      expect.objectContaining({ id: LIVE, status: "needs_entity_selection" }),
    );
    expect(result.access_token).toBe("decrypted-for-provider");
    expect(result.status).toBe("needs_entity_selection");
  });

  it("5. active-context on needs_entity_selection still 422 ENTITY_SELECTION_REQUIRED", async () => {
    const pendingEntity = makeRow({ status: "needs_entity_selection" });
    selectLimit.mockResolvedValue({ data: [pendingEntity], error: null });

    await expect(
      selectAccountingConnectionForActiveContext({
        supabase: (await import("@/lib/supabase")).supabaseAdmin!,
        userId: USER,
        connectionId: LIVE,
      }),
    ).rejects.toMatchObject({
      code: "ACCOUNTING_CONNECTION_ENTITY_SELECTION_REQUIRED",
      httpStatus: 422,
      status: "needs_entity_selection",
    });
    expect(ensureFreshTokens).not.toHaveBeenCalled();
  });

  it("6+7. superseded live-provider lookup → 409 + validated successor; no ensureFreshTokens", async () => {
    const superseded = makeRow({
      id: STALE,
      status: "superseded",
      superseded_by_connection_id: LIVE,
    });
    const successor = makeRow({ id: LIVE, status: "connected" });
    selectLimit
      .mockResolvedValueOnce({ data: [superseded], error: null })
      .mockResolvedValueOnce({ data: [successor], error: null });

    await expect(getLiveProviderConnectionForUser(STALE, USER)).rejects.toMatchObject({
      code: "ACCOUNTING_CONNECTION_SUPERSEDED",
      successorConnectionId: LIVE,
      httpStatus: 409,
    });
    expect(ensureFreshTokens).not.toHaveBeenCalled();
  });

  it("8. disconnected live-provider lookup rejected; no ensureFreshTokens", async () => {
    const disconnected = makeRow({ status: "disconnected" });
    selectLimit.mockResolvedValue({ data: [disconnected], error: null });

    await expect(getLiveProviderConnectionForUser(LIVE, USER)).rejects.toMatchObject({
      code: "ACCOUNTING_CONNECTION_DISCONNECTED",
      httpStatus: 409,
      status: "disconnected",
    });
    expect(ensureFreshTokens).not.toHaveBeenCalled();
  });

  it("10. historical record lookup on superseded succeeds without token use", async () => {
    const superseded = makeRow({
      id: STALE,
      status: "superseded",
      superseded_by_connection_id: LIVE,
      access_token: null,
      refresh_token: null,
    });
    selectLimit.mockResolvedValue({ data: [superseded], error: null });

    const row = await getAccountingConnectionRecordForUser(STALE, USER);

    expect(row.id).toBe(STALE);
    expect(row.status).toBe("superseded");
    expect(ensureFreshTokens).not.toHaveBeenCalled();
  });

  it("live gateway: connected receives ensureFreshTokens", async () => {
    const connected = makeRow();
    selectLimit.mockResolvedValue({ data: [connected], error: null });
    ensureFreshTokens.mockResolvedValue({ ...connected, access_token: "decrypted" });

    const result = await getConnectionForUser(LIVE, USER);

    expect(ensureFreshTokens).toHaveBeenCalledTimes(1);
    expect(result.access_token).toBe("decrypted");
  });

  it("live gateway does not call selectAccountingConnectionForActiveContext (static)", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(join(process.cwd(), "lib/integrations/accounting/live-provider-connection.ts"), "utf8");
    expect(src).not.toMatch(/import\s*\{[^}]*selectAccountingConnectionForActiveContext/);
    expect(src).not.toMatch(/await\s+selectAccountingConnectionForActiveContext\s*\(/);
    expect(src).toContain("throwSupersededSelectionError");
    expect(src).toContain("isLiveProviderConnectionStatus");
  });

  it("fetch-reports uses active-context; listEntities/selectEntity use live gateway (static)", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const service = readFileSync(join(process.cwd(), "lib/integrations/accounting/service.ts"), "utf8");
    function sliceFn(name: string, approxChars = 1200) {
      const start = service.indexOf(`export async function ${name}`);
      expect(start).toBeGreaterThanOrEqual(0);
      return service.slice(start, start + approxChars);
    }
    const listEntities = sliceFn("listEntities", 400);
    const selectEntity = sliceFn("selectEntity", 900);
    const fetchReports = sliceFn("fetchCanonicalReports", 1600);
    expect(listEntities).toContain("getLiveProviderConnectionForUser");
    expect(selectEntity).toContain("getLiveProviderConnectionForUser");
    expect(fetchReports).toContain("selectAccountingConnectionForActiveContext");
    expect(fetchReports).toMatch(/ensureFreshTokens\(\s*selected\s*\)/);
    expect(fetchReports).not.toMatch(/getLiveProviderConnectionForUser\s*\(/);
  });

  it("15. disconnect decrypts without refresh (static)", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const service = readFileSync(join(process.cwd(), "lib/integrations/accounting/service.ts"), "utf8");
    const disconnectBlock =
      service.match(/export async function disconnectConnection[\s\S]*?return \{ ok: true \};\r?\n}/)?.[0] || "";
    expect(disconnectBlock.length).toBeGreaterThan(0);
    expect(disconnectBlock).toContain("getAccountingConnectionRecordForUser");
    expect(disconnectBlock).toContain("decryptConnectionTokens");
    expect(disconnectBlock).not.toContain("ensureFreshTokens");
    expect(disconnectBlock).not.toContain("getLiveProviderConnectionForUser");
  });

  it("fetch-reports route maps selection errors (static)", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const route = readFileSync(join(process.cwd(), "app/api/accounting/fetch-reports/route.js"), "utf8");
    expect(route).toContain("AccountingConnectionSelectionError");
    expect(route).toContain("accountingConnectionSelectionErrorBody");
    expect(route).toContain("fetchCanonicalReports");
  });
});
