import { beforeEach, describe, expect, it, vi } from "vitest";

const runRefresh = vi.fn();
vi.mock("@/lib/accounting-automation/hourly-refresh", () => ({
  runRaProHourlyAccountingRefresh: (...args: unknown[]) => runRefresh(...args),
}));

import { GET } from "@/app/api/cron/accounting-hourly-refresh/route";

function request(secret = "cron-secret") {
  return new Request("https://example.test/api/cron/accounting-hourly-refresh", {
    headers: { authorization: `Bearer ${secret}` },
  });
}

describe("RA Pro hourly accounting refresh route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron-secret";
    delete process.env.ENABLE_RA_PRO_ACCOUNTING_AUTOMATION;
  });

  it("rejects requests without the cron secret", async () => {
    const response = await GET(request("wrong"));
    expect(response.status).toBe(401);
    expect(runRefresh).not.toHaveBeenCalled();
  });

  it("fails closed while the automation feature flag is absent", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "disabled",
      reason: "ENABLE_RA_PRO_ACCOUNTING_AUTOMATION_not_true",
    });
    expect(runRefresh).not.toHaveBeenCalled();
  });

  it("runs only after explicit enablement", async () => {
    process.env.ENABLE_RA_PRO_ACCOUNTING_AUTOMATION = "true";
    runRefresh.mockResolvedValue({ status: "ok", attempted: 2, succeeded: 2 });

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(runRefresh).toHaveBeenCalledTimes(1);
    expect(await response.json()).toMatchObject({ status: "ok", succeeded: 2 });
  });
});

