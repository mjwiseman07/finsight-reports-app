/**
 * PR F — live provider access vs historical evidence lookup.
 * Never assert token plaintext beyond controlled fixtures.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { encryptAccountingToken } from "@/lib/integrations/accounting/token-encryption";
import type { AccountingConnectionRecord } from "@/lib/integrations/accounting/types";

const USER = "a4ebf834-a698-4f79-a945-8498f2e6c45d";
const STALE = "ce526f9b-5d2c-46fc-b6f3-46617ab375bf";
const LIVE = "b718823a-0eb8-437d-beba-05c41f6482f9";

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

vi.mock("@/lib/integrations/accounting/connection-selection", async () => {
  const actual = await vi.importActual<typeof import("@/lib/integrations/accounting/connection-selection")>(
    "@/lib/integrations/accounting/connection-selection",
  );
  return {
    ...actual,
    selectAccountingConnectionForActiveContext: vi.fn(),
  };
});

import { selectAccountingConnectionForActiveContext } from "@/lib/integrations/accounting/connection-selection";
import {
  getAccountingConnectionRecordForUser,
  getConnectionForUser,
  getLiveProviderConnectionForUser,
  isLiveProviderConnectionStatus,
} from "@/lib/integrations/accounting/live-provider-connection";

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
    tenant_or_realm_id: "ceaea696-081f-491e-9daa-a9263a023ca9",
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
    vi.mocked(selectAccountingConnectionForActiveContext).mockReset();
  });

  it("isLiveProviderConnectionStatus allows only connected + needs_entity_selection", () => {
    expect(isLiveProviderConnectionStatus("connected")).toBe(true);
    expect(isLiveProviderConnectionStatus("needs_entity_selection")).toBe(true);
    expect(isLiveProviderConnectionStatus("superseded")).toBe(false);
    expect(isLiveProviderConnectionStatus("disconnected")).toBe(false);
  });

  it("evidence lookup returns superseded row without ensureFreshTokens", async () => {
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

  it("live gateway: superseded fails closed via selection (no ensureFreshTokens)", async () => {
    const { AccountingConnectionSelectionError } = await import(
      "@/lib/integrations/accounting/connection-selection"
    );
    vi.mocked(selectAccountingConnectionForActiveContext).mockRejectedValue(
      new AccountingConnectionSelectionError({
        code: "ACCOUNTING_CONNECTION_SUPERSEDED",
        message: "Accounting connection has been superseded; use the successor connection.",
        connectionId: STALE,
        status: "superseded",
        httpStatus: 409,
        successorConnectionId: LIVE,
      }),
    );

    await expect(getLiveProviderConnectionForUser(STALE, USER)).rejects.toMatchObject({
      code: "ACCOUNTING_CONNECTION_SUPERSEDED",
      successorConnectionId: LIVE,
      httpStatus: 409,
    });
    expect(ensureFreshTokens).not.toHaveBeenCalled();
  });

  it("live gateway: connected receives ensureFreshTokens", async () => {
    const connected = makeRow();
    vi.mocked(selectAccountingConnectionForActiveContext).mockResolvedValue(connected);
    ensureFreshTokens.mockResolvedValue({ ...connected, access_token: "decrypted" });

    const result = await getConnectionForUser(LIVE, USER);

    expect(selectAccountingConnectionForActiveContext).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER, connectionId: LIVE }),
    );
    expect(ensureFreshTokens).toHaveBeenCalledTimes(1);
    expect(result.access_token).toBe("decrypted");
  });

  it("fetch-reports route maps selection errors (static)", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const route = readFileSync(join(process.cwd(), "app/api/accounting/fetch-reports/route.js"), "utf8");
    expect(route).toContain("AccountingConnectionSelectionError");
    expect(route).toContain("accountingConnectionSelectionErrorBody");
    expect(route).toContain("fetchCanonicalReports");
  });

  it("service live paths use getLiveProviderConnectionForUser (static)", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const service = readFileSync(join(process.cwd(), "lib/integrations/accounting/service.ts"), "utf8");
    expect(service).toContain("getLiveProviderConnectionForUser");
    expect(service).toContain("getAccountingConnectionRecordForUser");
    expect(service).toMatch(/fetchCanonicalReports[\s\S]*getLiveProviderConnectionForUser/);
    expect(service).toMatch(/disconnectConnection[\s\S]*getAccountingConnectionRecordForUser/);
  });
});
