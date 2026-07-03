import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

const {
  resolveSuperAdminAccess,
  triggerRunnerForClosePeriod,
  resolveClosePeriodForDate,
  resolveMostRecentClosePeriod,
} = vi.hoisted(() => ({
  resolveSuperAdminAccess: vi.fn(),
  triggerRunnerForClosePeriod: vi.fn(),
  resolveClosePeriodForDate: vi.fn(),
  resolveMostRecentClosePeriod: vi.fn(),
}));

vi.mock("@/lib/super-admin-security.js", () => ({ resolveSuperAdminAccess }));
vi.mock("@/lib/rules/hooks/trigger-runner", () => ({ triggerRunnerForClosePeriod }));
vi.mock("@/lib/close-periods/resolve-for-date", () => ({
  resolveClosePeriodForDate,
  resolveMostRecentClosePeriod,
}));

import { POST } from "@/app/api/rules/run/route";

const SUMMARY = {
  runId: "run-1",
  firmClientId: "client-1",
  trigger: "on_demand",
  rulesEvaluated: 10,
  fires: { fired: 2, suppressed: 7, error: 0, not_implemented: 1 },
  durationMs: 42,
  killSwitchShortCircuit: false,
};

function post(body: unknown) {
  return new Request("http://localhost/api/rules/run", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer x" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/rules/run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveSuperAdminAccess.mockResolvedValue({ userId: "admin-1", role: "super_admin" });
    triggerRunnerForClosePeriod.mockResolvedValue(SUMMARY);
  });

  it("runs synchronously with an explicit close_period_id and returns the summary", async () => {
    const res = await POST(post({ firm_client_id: "client-1", close_period_id: "cp-1" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      run_id: "run-1",
      rules_evaluated: 10,
      fires_recorded: 10,
      duration_ms: 42,
    });
    expect(triggerRunnerForClosePeriod).toHaveBeenCalledWith("client-1", "cp-1", "manual");
    expect(resolveMostRecentClosePeriod).not.toHaveBeenCalled();
  });

  it("resolves the most recent close period when none supplied", async () => {
    resolveMostRecentClosePeriod.mockResolvedValue({
      close_period_id: "cp-current",
      period_start: new Date("2026-06-01"),
      period_end: new Date("2026-06-30"),
    });
    const res = await POST(post({ firm_client_id: "client-1" }));
    expect(res.status).toBe(200);
    expect(resolveMostRecentClosePeriod).toHaveBeenCalledWith("client-1");
    expect(triggerRunnerForClosePeriod).toHaveBeenCalledWith("client-1", "cp-current", "manual");
  });

  it("returns the 403 from the super-admin gate for an unauthorized user", async () => {
    resolveSuperAdminAccess.mockResolvedValue({
      response: NextResponse.json({ error: "Super admin role is required." }, { status: 403 }),
    });
    const res = await POST(post({ firm_client_id: "client-1", close_period_id: "cp-1" }));
    expect(res.status).toBe(403);
    expect(triggerRunnerForClosePeriod).not.toHaveBeenCalled();
  });
});
