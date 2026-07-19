import { beforeEach, describe, expect, it, vi } from "vitest";

const executeMock = vi.hoisted(() => vi.fn());
const fromMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/gap2/purge-executor", () => ({
  executePurge: executeMock,
}));
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({ from: fromMock }),
}));

import { GET, POST } from "../route";

describe("subscription-purge-executor cron", () => {
  beforeEach(() => {
    executeMock.mockReset();
    fromMock.mockReset();
    process.env.CRON_SECRET = "test-secret";
  });

  it("401 without CRON_SECRET", async () => {
    const res = await POST(new Request("http://localhost/api/cron/subscription-purge-executor"));
    expect(res.status).toBe(401);
  });

  it("skips future grace schedules", async () => {
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          lte: () => ({
            limit: async () => ({ data: [], error: null }),
          }),
        }),
      }),
    });
    const res = await GET(
      new Request("http://localhost/api/cron/subscription-purge-executor", {
        headers: { authorization: "Bearer test-secret" },
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ processed: 0 });
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("processes overdue schedules", async () => {
    fromMock.mockReturnValue({
      select: () => ({
        eq: () => ({
          lte: () => ({
            limit: async () => ({
              data: [{ id: "sched-1", firm_id: "firm-1", grace_until: "2020-01-01T00:00:00Z" }],
              error: null,
            }),
          }),
        }),
      }),
    });
    executeMock.mockResolvedValue({
      schedule_id: "sched-1",
      firm_id: "firm-1",
      tables_purged: [],
      status: "completed",
    });
    const res = await POST(
      new Request("http://localhost/api/cron/subscription-purge-executor", {
        method: "POST",
        headers: { "x-cron-secret": "test-secret" },
      }),
    );
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.processed).toBe(1);
    expect(executeMock).toHaveBeenCalledWith("sched-1");
  });
});
