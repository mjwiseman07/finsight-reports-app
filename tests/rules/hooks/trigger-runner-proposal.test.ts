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

function proposal(status: string) {
  return {
    data: {
      proposal_id: "p-1",
      firm_client_id: "client-1",
      txn_date: "2026-06-15",
      status,
    },
    error: null,
  };
}

const SUMMARY = {
  runId: "r1",
  firmClientId: "client-1",
  trigger: "proposal_created",
  rulesEvaluated: 4,
  fires: { fired: 0, suppressed: 4, error: 0, not_implemented: 0 },
  durationMs: 5,
  killSwitchShortCircuit: false,
};

describe("triggerRunnerForProposal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveClosePeriodForDate.mockResolvedValue({
      close_period_id: "cp-1",
      period_start: new Date("2026-06-01"),
      period_end: new Date("2026-06-30"),
    });
    executeRules.mockResolvedValue(SUMMARY);
  });

  it("invokes the runner for an 'accepted' proposal with resolved close period", async () => {
    maybeSingle.mockResolvedValue(proposal("accepted"));
    await triggerRunnerForProposal("p-1");
    expect(executeRules).toHaveBeenCalledTimes(1);
    const opts = executeRules.mock.calls[0][1];
    expect(opts).toMatchObject({
      firmClientId: "client-1",
      closePeriodId: "cp-1",
      trigger: "proposal_created",
      proposalId: "p-1",
    });
  });

  it("invokes the runner for a 'modified' proposal", async () => {
    maybeSingle.mockResolvedValue(proposal("modified"));
    await triggerRunnerForProposal("p-1");
    expect(executeRules).toHaveBeenCalledTimes(1);
  });

  it("does NOT invoke the runner for a 'pending' proposal", async () => {
    maybeSingle.mockResolvedValue(proposal("pending"));
    await triggerRunnerForProposal("p-1");
    expect(executeRules).not.toHaveBeenCalled();
  });

  it("does NOT invoke the runner for a 'rejected' proposal", async () => {
    maybeSingle.mockResolvedValue(proposal("rejected"));
    await triggerRunnerForProposal("p-1");
    expect(executeRules).not.toHaveBeenCalled();
  });
});
