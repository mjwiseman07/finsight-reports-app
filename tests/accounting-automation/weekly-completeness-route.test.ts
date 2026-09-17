import { beforeEach, describe, expect, it, vi } from "vitest";

const runWeekly = vi.fn();
vi.mock("@/lib/accounting-automation/weekly-completeness", () => ({
  runRaProWeeklyCompleteness: (...args: unknown[]) => runWeekly(...args),
}));

import { GET } from "@/app/api/cron/accounting-weekly-completeness/route";

function request(secret = "cron-secret") {
  return new Request("https://example.test/api/cron/accounting-weekly-completeness", {
    headers: { authorization: `Bearer ${secret}` },
  });
}

describe("RA Pro weekly completeness route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron-secret";
    delete process.env.ENABLE_RA_PRO_ACCOUNTING_AUTOMATION;
  });

  it("rejects an invalid cron secret", async () => {
    const response = await GET(request("wrong"));
    expect(response.status).toBe(401);
    expect(runWeekly).not.toHaveBeenCalled();
  });

  it("stays disabled until explicitly enabled", async () => {
    const response = await GET(request());
    expect(await response.json()).toMatchObject({ status: "disabled" });
    expect(runWeekly).not.toHaveBeenCalled();
  });

  it("runs under the shared accounting automation feature flag", async () => {
    process.env.ENABLE_RA_PRO_ACCOUNTING_AUTOMATION = "true";
    runWeekly.mockResolvedValue({ status: "ok", completed: 2 });
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(runWeekly).toHaveBeenCalledOnce();
  });
});
