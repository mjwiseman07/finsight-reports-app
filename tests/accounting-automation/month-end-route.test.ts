import { beforeEach, describe, expect, it, vi } from "vitest";
const run = vi.fn();
vi.mock("@/lib/accounting-automation/month-end-orchestrator", () => ({ runRaProMonthEndReview: (...args: unknown[]) => run(...args) }));
import { GET } from "@/app/api/cron/accounting-month-end-review/route";
const request = (secret = "cron") => new Request("https://example.test/api/cron/accounting-month-end-review", { headers: { authorization: `Bearer ${secret}` } });

describe("month-end cron route", () => {
  beforeEach(() => { vi.clearAllMocks(); process.env.CRON_SECRET = "cron"; delete process.env.ENABLE_RA_PRO_ACCOUNTING_AUTOMATION; });
  it("rejects invalid authorization", async () => { expect((await GET(request("bad"))).status).toBe(401); });
  it("is closed by default", async () => { expect(await (await GET(request())).json()).toMatchObject({ status: "disabled" }); expect(run).not.toHaveBeenCalled(); });
  it("runs only when explicitly enabled", async () => { process.env.ENABLE_RA_PRO_ACCOUNTING_AUTOMATION = "true"; run.mockResolvedValue({ status: "ok" }); expect((await GET(request())).status).toBe(200); });
});
