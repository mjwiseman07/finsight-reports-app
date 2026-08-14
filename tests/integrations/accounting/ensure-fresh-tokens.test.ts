/**
 * Xero OAuth ensureFreshTokens lifecycle — focused unit tests.
 * Never assert or log token plaintext values.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encryptAccountingToken } from "@/lib/integrations/accounting/token-encryption";
import type { AccountingConnectionRecord } from "@/lib/integrations/accounting/types";

const CONNECTION_ID = "conn-xero-refresh-test";

const refreshAccessToken = vi.fn();
const selectLimit = vi.fn();
const updateEq = vi.fn();

vi.mock("@/lib/integrations/accounting/registry", () => ({
  getAccountingProvider: () => ({
    refreshAccessToken,
  }),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table !== "accounting_connections") {
        throw new Error(`unexpected table ${table}`);
      }
      return {
        select: () => ({
          eq: () => ({
            limit: selectLimit,
          }),
        }),
        update: (payload: Record<string, unknown>) => ({
          eq: () => ({
            in: () => updateEq(payload),
          }),
        }),
      };
    },
  },
}));

import {
  __resetXeroRefreshFlightsForTests,
  ensureFreshTokens,
  tokenNeedsRefresh,
} from "@/lib/integrations/accounting/ensure-fresh-tokens";

process.env.ACCOUNTING_TOKEN_ENCRYPTION_KEY = "test-accounting-token-encryption-key";

function makeRow(overrides: Partial<AccountingConnectionRecord> = {}): AccountingConnectionRecord {
  const accessPlain = "access-token-plain-v1";
  const refreshPlain = "refresh-token-plain-v1";
  return {
    id: CONNECTION_ID,
    user_id: "user-1",
    provider: "xero",
    provider_family: "xero",
    provider_product: "xero",
    external_entity_id: "tenant-1",
    external_entity_name: "Demo Co",
    access_token: encryptAccountingToken(accessPlain),
    refresh_token: encryptAccountingToken(refreshPlain),
    token_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    tenant_or_realm_id: "tenant-1",
    scopes: ["accounting.transactions.read"],
    status: "connected",
    metadata_json: {},
    ...overrides,
  };
}

function assertNoSecretLeak(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("access-token-plain");
  expect(serialized).not.toContain("refresh-token-plain");
  expect(serialized).not.toContain("access-token-new");
  expect(serialized).not.toContain("refresh-token-new");
}

describe("ensureFreshTokens (Xero OAuth lifecycle)", () => {
  beforeEach(() => {
    __resetXeroRefreshFlightsForTests();
    refreshAccessToken.mockReset();
    selectLimit.mockReset();
    updateEq.mockReset();
    updateEq.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    __resetXeroRefreshFlightsForTests();
  });

  it("A: unexpired token — no refresh; existing decrypted token returned", async () => {
    const row = makeRow();
    selectLimit.mockResolvedValue({ data: [row], error: null });

    const result = await ensureFreshTokens(row);

    expect(refreshAccessToken).not.toHaveBeenCalled();
    expect(result.access_token).toBe("access-token-plain-v1");
    expect(result.refresh_token).toBe("refresh-token-plain-v1");
    expect(updateEq).not.toHaveBeenCalled();
  });

  it("B: expires within 5-minute skew — refresh once; persist both tokens + expiry", async () => {
    const row = makeRow({
      token_expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
    });
    selectLimit.mockResolvedValue({ data: [row], error: null });
    refreshAccessToken.mockResolvedValue({
      access_token: "access-token-new",
      refresh_token: "refresh-token-new",
      expires_in: 1800,
    });

    const result = await ensureFreshTokens(row);

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(refreshAccessToken.mock.calls[0][0]).toEqual({ refreshToken: "refresh-token-plain-v1" });
    expect(result.access_token).toBe("access-token-new");
    expect(result.refresh_token).toBe("refresh-token-new");
    expect(result.token_expires_at).toBeTruthy();
    expect(updateEq).toHaveBeenCalledTimes(1);
    const persisted = updateEq.mock.calls[0][0] as Record<string, unknown>;
    expect(typeof persisted.access_token).toBe("string");
    expect(typeof persisted.refresh_token).toBe("string");
    expect(String(persisted.access_token)).toMatch(/^enc:v1:/);
    expect(String(persisted.refresh_token)).toMatch(/^enc:v1:/);
    expect(persisted.token_expires_at).toBe(result.token_expires_at);
    expect(persisted.status).toBe("connected");
    assertNoSecretLeak(persisted);
  });

  it("C: already refreshed by another invocation — re-read skips duplicate refresh", async () => {
    const staleInput = makeRow({
      token_expires_at: new Date(Date.now() - 60_000).toISOString(),
    });
    const freshDbRow = makeRow({
      access_token: encryptAccountingToken("access-token-plain-v2"),
      refresh_token: encryptAccountingToken("refresh-token-plain-v2"),
      token_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    selectLimit.mockResolvedValue({ data: [freshDbRow], error: null });

    const result = await ensureFreshTokens(staleInput);

    expect(refreshAccessToken).not.toHaveBeenCalled();
    expect(result.access_token).toBe("access-token-plain-v2");
    expect(result.refresh_token).toBe("refresh-token-plain-v2");
    expect(updateEq).not.toHaveBeenCalled();
  });

  it("D: refresh returns no access_token — typed failure; no persist", async () => {
    const row = makeRow({
      token_expires_at: new Date(Date.now() - 60_000).toISOString(),
    });
    selectLimit.mockResolvedValue({ data: [row], error: null });
    refreshAccessToken.mockResolvedValue({ refresh_token: "refresh-token-new", expires_in: 1800 });

    await expect(ensureFreshTokens(row)).rejects.toMatchObject({
      code: "OAUTH_REFRESH_NO_TOKEN",
      connectionId: CONNECTION_ID,
    });
    expect(updateEq).not.toHaveBeenCalled();
  });

  it("E: refresh API fails / invalid_grant — status expired + OAUTH_REFRESH_FAILED", async () => {
    const row = makeRow({
      token_expires_at: new Date(Date.now() - 60_000).toISOString(),
    });
    selectLimit.mockResolvedValue({ data: [row], error: null });
    refreshAccessToken.mockRejectedValue(new Error("invalid_grant"));

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(ensureFreshTokens(row)).rejects.toMatchObject({
      code: "OAUTH_REFRESH_FAILED",
      connectionId: CONNECTION_ID,
    });

    expect(updateEq).toHaveBeenCalled();
    const statusPayload = updateEq.mock.calls.find((call) => (call[0] as { status?: string }).status === "expired")?.[0] as
      | { status?: string }
      | undefined;
    expect(statusPayload?.status).toBe("expired");

    for (const call of warnSpy.mock.calls) {
      assertNoSecretLeak(call);
    }
    warnSpy.mockRestore();
  });

  it("F: refresh succeeds but DB persistence fails — OAUTH_REFRESH_PERSIST_FAILED", async () => {
    const row = makeRow({
      token_expires_at: new Date(Date.now() - 60_000).toISOString(),
    });
    selectLimit.mockResolvedValue({ data: [row], error: null });
    refreshAccessToken.mockResolvedValue({
      access_token: "access-token-new",
      refresh_token: "refresh-token-new",
      expires_in: 1800,
    });
    updateEq.mockResolvedValue({ error: { message: "write failed" } });

    await expect(ensureFreshTokens(row)).rejects.toMatchObject({
      code: "OAUTH_REFRESH_PERSIST_FAILED",
      connectionId: CONNECTION_ID,
    });
  });

  it("G: same-process simultaneous callers — one refresh; both receive fresh connection", async () => {
    const row = makeRow({
      token_expires_at: new Date(Date.now() - 60_000).toISOString(),
    });
    selectLimit.mockResolvedValue({ data: [row], error: null });

    let resolveRefresh!: (value: Record<string, unknown>) => void;
    const refreshStarted = new Promise<void>((resolveStarted) => {
      refreshAccessToken.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveStarted();
            resolveRefresh = resolve;
          }),
      );
    });

    const p1 = ensureFreshTokens(row);
    const p2 = ensureFreshTokens(row);

    await refreshStarted;
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);

    resolveRefresh({
      access_token: "access-token-new",
      refresh_token: "refresh-token-new",
      expires_in: 1800,
    });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.access_token).toBe("access-token-new");
    expect(r2.access_token).toBe("access-token-new");
    expect(r1.refresh_token).toBe("refresh-token-new");
    expect(r2.refresh_token).toBe("refresh-token-new");
    expect(updateEq).toHaveBeenCalledTimes(1);
  });

  it("tokenNeedsRefresh respects 5-minute skew", () => {
    const now = Date.now();
    expect(tokenNeedsRefresh(new Date(now + 10 * 60 * 1000).toISOString(), now)).toBe(false);
    expect(tokenNeedsRefresh(new Date(now + 2 * 60 * 1000).toISOString(), now)).toBe(true);
    expect(tokenNeedsRefresh(null, now)).toBe(true);
  });

  it("superseded: throws OAUTH_REFRESH_STATUS_FORBIDDEN; never provider-refresh", async () => {
    const row = makeRow({
      status: "superseded",
      token_expires_at: new Date(Date.now() - 60_000).toISOString(),
    });

    await expect(ensureFreshTokens(row)).rejects.toMatchObject({
      code: "OAUTH_REFRESH_STATUS_FORBIDDEN",
      connectionId: CONNECTION_ID,
      status: "superseded",
    });
    expect(refreshAccessToken).not.toHaveBeenCalled();
    expect(selectLimit).not.toHaveBeenCalled();
    expect(updateEq).not.toHaveBeenCalled();
  });

  it("disconnected: decrypt-only; never refresh or resurrect to connected", async () => {
    const row = makeRow({
      status: "disconnected",
      token_expires_at: new Date(Date.now() - 60_000).toISOString(),
    });

    const result = await ensureFreshTokens(row);

    expect(refreshAccessToken).not.toHaveBeenCalled();
    expect(selectLimit).not.toHaveBeenCalled();
    expect(updateEq).not.toHaveBeenCalled();
    expect(result.status).toBe("disconnected");
    expect(result.access_token).toBe("access-token-plain-v1");
  });
});
