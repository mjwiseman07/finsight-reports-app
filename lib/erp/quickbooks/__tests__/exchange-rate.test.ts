import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock qboApiFetch before importing SUT
vi.mock("../../../qbo/api-fetch.js", () => ({
  qboApiFetch: vi.fn(),
}));

import { resolveExchangeRate } from "../exchange-rate";
import { qboApiFetch } from "../../../qbo/api-fetch.js";

const mockFetch = qboApiFetch as unknown as ReturnType<typeof vi.fn>;

describe("resolveExchangeRate", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("short-circuits to 1.0 when source === home (no network call)", async () => {
    const r = await resolveExchangeRate("realm-1", "tok", "USD", "USD", "2026-07-18");
    expect(r).toEqual({ ok: true, rate: 1, as_of_date: "2026-07-18" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("short-circuits with case-insensitive match", async () => {
    const r = await resolveExchangeRate("realm-1", "tok", "usd", "USD", "2026-07-18");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.rate).toBe(1);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetches rate for foreign currency", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: { ExchangeRate: { Rate: 1.3245, AsOfDate: "2026-07-18" } },
    });
    const r = await resolveExchangeRate("realm-1", "tok", "CAD", "USD", "2026-07-18");
    expect(r).toEqual({ ok: true, rate: 1.3245, as_of_date: "2026-07-18" });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("rejects when 200 response has missing rate", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: { ExchangeRate: {} },
    });
    const r = await resolveExchangeRate("realm-1", "tok", "CAD", "USD", "2026-07-18");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("exchange_rate_unavailable");
  });

  it("rejects when 200 response has zero rate", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: { ExchangeRate: { Rate: 0 } },
    });
    const r = await resolveExchangeRate("realm-1", "tok", "CAD", "USD", "2026-07-18");
    expect(r.ok).toBe(false);
  });

  it("retries 3x on 500 then rejects", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, json: {} });
    const r = await resolveExchangeRate("realm-1", "tok", "CAD", "USD", "2026-07-18");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("exchange_rate_unavailable");
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("does not retry on 400", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 400, json: {} });
    const r = await resolveExchangeRate("realm-1", "tok", "CAD", "USD", "2026-07-18");
    expect(r.ok).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("retries once on 429 then succeeds", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 429, json: {} })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: { ExchangeRate: { Rate: 0.85, AsOfDate: "2026-07-18" } },
      });
    const r = await resolveExchangeRate("realm-1", "tok", "EUR", "USD", "2026-07-18");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.rate).toBe(0.85);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
