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

import { triggerRunnerForRecurringFire } from "@/lib/rules/hooks/trigger-runner";

function fire(status: string) {
  return {
    data: { fire_id: "f-1", firm_client_id: "client-1", fire_date: "2026-06-15", status },
    error: null,
  };
}

const SUMMARY = {
  runId: "r1",
  firmClientId: "client-1",
  trigger: "recurring_fire_created",
  rulesEvaluated: 4,
  fires: { fired: 0, suppressed: 4, error: 0, not_implemented: 0 },
  durationMs: 5,
  killSwitchShortCircuit: false,
};

describe("triggerRunnerForRecurringFire", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveClosePeriodForDate.mockResolvedValue({
      close_period_id: "cp-1",
      period_start: new Date("2026-06-01"),
      period_end: new Date("2026-06-30"),
    });
    executeRules.mockResolvedValue(SUMMARY);
  });

  it("invokes the runner for a 'posted' fire", async () => {
    maybeSingle.mockResolvedValue(fire("posted"));
    await triggerRunnerForRecurringFire("f-1");
    expect(executeRules).toHaveBeenCalledTimes(1);
    expect(executeRules.mock.calls[0][1]).toMatchObject({
      firmClientId: "client-1",
      closePeriodId: "cp-1",
      trigger: "recurring_fire_created",
      recurringFireId: "f-1",
    });
  });

  it("does NOT invoke the runner for a non-posted fire (e.g. failed)", async () => {
    maybeSingle.mockResolvedValue(fire("failed"));
    await triggerRunnerForRecurringFire("f-1");
    expect(executeRules).not.toHaveBeenCalled();
  });

  it("silently early-returns (no throw, no run) when close period is unresolvable", async () => {
    maybeSingle.mockResolvedValue(fire("posted"));
    resolveClosePeriodForDate.mockResolvedValue(null);
    await expect(triggerRunnerForRecurringFire("f-1")).resolves.toBeUndefined();
    expect(executeRules).not.toHaveBeenCalled();
  });
});
