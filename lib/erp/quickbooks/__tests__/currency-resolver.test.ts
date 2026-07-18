import { describe, it, expect } from "vitest";
import { resolveCurrencyForFirmClient } from "../currency-resolver";

/**
 * Minimal Supabase client stub. Each call returns the next queued result.
 */
function makeSupabase(results: Array<{ data: any; error?: any }>) {
  let i = 0;
  const chain: any = {
    from: () => chain,
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => results[i++] ?? { data: null },
  };
  return chain;
}

describe("resolveCurrencyForFirmClient", () => {
  it("rejects when firm_client_id has no owner", async () => {
    const sb = makeSupabase([{ data: null }]);
    const r = await resolveCurrencyForFirmClient(sb, "fc-1", undefined);
    expect(r).toEqual({ ok: false, reason: "home_currency_missing" });
  });

  it("rejects when owner has no accounting_connections row", async () => {
    const sb = makeSupabase([{ data: { owner_user_id: "u1" } }, { data: null }]);
    const r = await resolveCurrencyForFirmClient(sb, "fc-1", undefined);
    expect(r).toEqual({ ok: false, reason: "home_currency_missing" });
  });

  it("rejects when accounting_connections.home_currency is null", async () => {
    const sb = makeSupabase([
      { data: { owner_user_id: "u1" } },
      { data: { home_currency: null } },
    ]);
    const r = await resolveCurrencyForFirmClient(sb, "fc-1", undefined);
    expect(r).toEqual({ ok: false, reason: "home_currency_missing" });
  });

  it("rejects invalid home_currency format", async () => {
    const sb = makeSupabase([
      { data: { owner_user_id: "u1" } },
      { data: { home_currency: "US" } },
    ]);
    const r = await resolveCurrencyForFirmClient(sb, "fc-1", undefined);
    expect(r).toEqual({ ok: false, reason: "home_currency_missing" });
  });

  it("defaults to home_currency when no explicit currency", async () => {
    const sb = makeSupabase([
      { data: { owner_user_id: "u1" } },
      { data: { home_currency: "cad" } },
    ]);
    const r = await resolveCurrencyForFirmClient(sb, "fc-1", undefined);
    expect(r).toEqual({
      ok: true,
      currency: "CAD",
      home_currency: "CAD",
      source: "home_currency_default",
    });
  });

  it("uses explicit currency, uppercases, keeps home_currency separate", async () => {
    const sb = makeSupabase([
      { data: { owner_user_id: "u1" } },
      { data: { home_currency: "CAD" } },
    ]);
    const r = await resolveCurrencyForFirmClient(sb, "fc-1", "usd");
    expect(r).toEqual({
      ok: true,
      currency: "USD",
      home_currency: "CAD",
      source: "explicit",
    });
  });

  it("rejects invalid explicit currency format", async () => {
    const sb = makeSupabase([
      { data: { owner_user_id: "u1" } },
      { data: { home_currency: "USD" } },
    ]);
    const r = await resolveCurrencyForFirmClient(sb, "fc-1", "US");
    expect(r).toEqual({ ok: false, reason: "invalid_currency_format" });
  });

  it("rejects 4-letter explicit currency", async () => {
    const sb = makeSupabase([
      { data: { owner_user_id: "u1" } },
      { data: { home_currency: "USD" } },
    ]);
    const r = await resolveCurrencyForFirmClient(sb, "fc-1", "USDX");
    expect(r).toEqual({ ok: false, reason: "invalid_currency_format" });
  });
});
