import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/pilot-lifecycle/anchor-batcher", () => ({
  runAnchorBatch: vi.fn(async () => ({
    anchored: 0,
    batchId: null,
    tsasOk: [],
    tsasFailed: [],
    merkleRootHex: null,
  })),
}));

vi.mock("@/lib/pilot-lifecycle/issue-recorder", () => ({
  recordIssue: vi.fn(async () => ({ id: null, deduped: false, sentryEventId: null })),
}));

import { GET } from "../route";

describe("GET /api/cron/pilot-lifecycle-anchor", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-cron-secret";
    vi.clearAllMocks();
  });

  it("returns 401 without auth", async () => {
    const res = await GET(new Request("http://localhost/api/cron/pilot-lifecycle-anchor") as never);
    expect(res.status).toBe(401);
  });

  it("returns 200 with bearer cron secret", async () => {
    const res = await GET(
      new Request("http://localhost/api/cron/pilot-lifecycle-anchor", {
        headers: { authorization: "Bearer test-cron-secret" },
      }) as never,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.anchored).toBe(0);
  });
});
