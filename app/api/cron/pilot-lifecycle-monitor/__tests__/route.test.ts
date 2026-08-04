import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/pilot-lifecycle/drift-detector", () => ({
  runDriftDetector: async () => ({
    slots_checked: 0,
    drifted: 0,
    errors: 0,
    dedup_hits: 0,
  }),
}));
vi.mock("@/lib/pilot-lifecycle/chain-monitor", () => ({
  runChainIntegrityMonitor: async () => ({
    partitions_checked: 0,
    broken_chains: 0,
    errors: 0,
    dedup_hits: 0,
  }),
}));

import { GET } from "../route";

describe("GET /api/cron/pilot-lifecycle-monitor auth surface", () => {
  it("rejects without Bearer", async () => {
    process.env.CRON_SECRET = "test-secret";
    const res = await GET(new Request("http://x", { headers: {} }));
    expect(res.status).toBe(401);
  });

  it("accepts with correct Bearer and returns summary", async () => {
    process.env.CRON_SECRET = "test-secret";
    const res = await GET(
      new Request("http://x", {
        headers: { authorization: "Bearer test-secret" },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.drift).toBeDefined();
    expect(body.chain).toBeDefined();
  });
});
