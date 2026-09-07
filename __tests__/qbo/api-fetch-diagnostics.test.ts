import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mockDispatcher = { kind: "proxy-agent-stub" };

vi.mock("@/lib/network/quotaguard-proxy", () => ({
  getQuotaGuardUndiciDispatcher: vi.fn(() => mockDispatcher),
}));

vi.mock("@/lib/support/auto-file", () => ({
  autoFileTicket: vi.fn(async () => undefined),
}));

vi.mock("@/lib/qbo/recent-intuit-tid", () => ({
  persistRecentIntuitTid: vi.fn(async () => undefined),
}));

import { qboApiFetch, QboApiError } from "@/lib/qbo/api-fetch.js";

describe("qboApiFetch — diagnostic logging + fail-closed", () => {
  const fetchMock = vi.fn();
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  beforeEach(() => {
    fetchMock.mockReset();
    errorSpy.mockClear();
    logSpy.mockClear();
    warnSpy.mockClear();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("logs Error.cause chain on network failure and still fails closed", async () => {
    const root = Object.assign(new Error("connect ETIMEDOUT"), {
      code: "ETIMEDOUT",
      errno: -4039,
      syscall: "connect",
      hostname: "us-east-shield-02.quotaguard.com",
      port: 9294,
    });
    const top = new TypeError("fetch failed");
    (top as Error & { cause: unknown }).cause = root;
    fetchMock.mockRejectedValue(top);

    await expect(
      qboApiFetch(
        "https://quickbooks.api.intuit.com/v3/company/9341457151063823/reports/TrialBalance?date=2026-06-30",
        { accessToken: "secret-token-value-should-not-log", method: "GET" },
      ),
    ).rejects.toBe(top);

    expect(errorSpy).toHaveBeenCalled();
    const payload = errorSpy.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload.err).toBe("fetch failed");
    expect(payload.err_cause).toMatchObject({
      message: "connect ETIMEDOUT",
      code: "ETIMEDOUT",
      hostname: "us-east-shield-02.quotaguard.com",
      port: 9294,
    });
    expect(payload.url_path).toBe(
      "/v3/company/9341457151063823/reports/TrialBalance",
    );
    // Must not log bearer token, query string, or full URL.
    const serialized = JSON.stringify(errorSpy.mock.calls);
    expect(serialized).not.toContain("secret-token-value-should-not-log");
    expect(serialized).not.toContain("date=2026-06-30");
    expect(serialized).not.toContain("Bearer");
  });

  it("success behavior unchanged (shaped result + ok log)", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (k: string) =>
          k.toLowerCase() === "intuit_tid" ? "tid-123" : null,
      },
      text: async () => JSON.stringify({ QueryResponse: {} }),
    });

    const result = await qboApiFetch(
      "https://quickbooks.api.intuit.com/v3/company/1/query",
      { accessToken: "tok", method: "GET" },
    );

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.intuit_tid).toBe("tid-123");
    expect(result.json).toEqual({ QueryResponse: {} });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "GET",
        dispatcher: mockDispatcher,
      }),
    );
    expect(logSpy).toHaveBeenCalledWith(
      "[qbo-api] ok",
      expect.objectContaining({ status: 200, intuit_tid: "tid-123" }),
    );
  });

  it("non-2xx behavior unchanged (returns shaped result, warns)", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      headers: { get: () => null },
      text: async () =>
        JSON.stringify({
          Fault: { Error: [{ Message: "Unauthorized", code: "3100" }] },
        }),
    });

    const result = await qboApiFetch(
      "https://quickbooks.api.intuit.com/v3/company/1/query",
      { accessToken: "tok", method: "GET" },
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
    expect(warnSpy).toHaveBeenCalledWith(
      "[qbo-api] non-2xx",
      expect.objectContaining({
        status: 401,
        qbo_fault: "Unauthorized",
      }),
    );
  });

  it("throwOnError still wraps network failures as QboApiError", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    await expect(
      qboApiFetch("https://quickbooks.api.intuit.com/v3/company/1/query", {
        accessToken: "tok",
        throwOnError: true,
      }),
    ).rejects.toBeInstanceOf(QboApiError);
  });
});
