import { describe, it, expect, vi, beforeEach } from "vitest";

const { maybeSingle, executeRules, resolveClosePeriodForDate } = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  executeRules: vi.fn(),
  resolveClosePeriodForDate: vi.fn(),
}));

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  }),
}));
vi.mock("@/lib/rules/runner/execute-rules", () => ({ executeRules }));
vi.mock("@/lib/close-periods/resolve-for-date", () => ({ resolveClosePeriodForDate }));

import { triggerRunnerForProposal } from "@/lib/rules/hooks/trigger-runner";

describe("trigger-runner error isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveClosePeriodForDate.mockResolvedValue({
      close_period_id: "cp-1",
      period_start: new Date("2026-06-01"),
      period_end: new Date("2026-06-30"),
    });
  });

  it("catches a runner throw and does not rethrow to the caller", async () => {
    maybeSingle.mockResolvedValue({
      data: { proposal_id: "p-1", firm_client_id: "client-1", txn_date: "2026-06-15", status: "accepted" },
      error: null,
    });
    executeRules.mockRejectedValue(new Error("runner exploded"));
    await expect(triggerRunnerForProposal("p-1")).resolves.toBeUndefined();
  });

  it("returns void after a successful run", async () => {
    maybeSingle.mockResolvedValue({
      data: { proposal_id: "p-1", firm_client_id: "client-1", txn_date: "2026-06-15", status: "accepted" },
      error: null,
    });
    executeRules.mockResolvedValue({
      runId: "r1",
      firmClientId: "client-1",
      trigger: "proposal_created",
      rulesEvaluated: 4,
      fires: { fired: 0, suppressed: 4, error: 0, not_implemented: 0 },
      durationMs: 5,
      killSwitchShortCircuit: false,
    });
    const out = await triggerRunnerForProposal("p-1");
    expect(out).toBeUndefined();
  });

  it("silently early-returns for an unknown proposal id (no throw)", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(triggerRunnerForProposal("does-not-exist")).resolves.toBeUndefined();
    expect(executeRules).not.toHaveBeenCalled();
  });
});
