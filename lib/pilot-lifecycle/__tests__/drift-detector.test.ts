import { describe, it, expect, vi, beforeEach } from "vitest";

const slotsData: Array<Record<string, unknown>> = [];
const stripeSubs: Record<string, { status: string }> = {};
const issuesRecorded: Array<Record<string, unknown>> = [];

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        not: () => Promise.resolve({ data: slotsData, error: null }),
      }),
    }),
  }),
}));

vi.mock("stripe", () => ({
  default: class {
    subscriptions = {
      retrieve: async (id: string) => {
        if (!stripeSubs[id]) throw new Error("not found");
        return stripeSubs[id];
      },
    };
  },
}));

vi.mock("../issue-recorder", () => ({
  recordIssue: async (input: Record<string, unknown>) => {
    issuesRecorded.push(input);
    return { id: "i1", deduped: false, sentryEventId: null };
  },
}));

process.env.STRIPE_LIVE_SECRET_KEY = "sk_live_test";

import { runDriftDetector } from "../drift-detector";

describe("runDriftDetector", () => {
  beforeEach(() => {
    slotsData.length = 0;
    for (const k of Object.keys(stripeSubs)) delete stripeSubs[k];
    issuesRecorded.length = 0;
  });

  it("happy path — matching status, no drift", async () => {
    slotsData.push({
      id: "s1",
      company_id: "c1",
      firm_id: null,
      pilot_status: "active",
      stripe_subscription_id: "sub_1",
    });
    stripeSubs["sub_1"] = { status: "active" };
    const r = await runDriftDetector();
    expect(r.slots_checked).toBe(1);
    expect(r.drifted).toBe(0);
    expect(issuesRecorded.length).toBe(0);
  });

  it("detects drift — pilot_status=active but Stripe says canceled", async () => {
    slotsData.push({
      id: "s2",
      company_id: "c2",
      firm_id: null,
      pilot_status: "active",
      stripe_subscription_id: "sub_2",
    });
    stripeSubs["sub_2"] = { status: "canceled" };
    const r = await runDriftDetector();
    expect(r.drifted).toBe(1);
    expect(issuesRecorded[0].issueKind).toBe("pilot.lifecycle.drift.detected");
    expect(
      (issuesRecorded[0].tags as Record<string, string>).pilot_status_actual,
    ).toBe("active");
    expect(
      (issuesRecorded[0].tags as Record<string, string>)
        .pilot_status_expected,
    ).toBe("cancelled");
  });

  it("records monitor.error when Stripe retrieve fails", async () => {
    slotsData.push({
      id: "s3",
      company_id: "c3",
      firm_id: null,
      pilot_status: "active",
      stripe_subscription_id: "sub_missing",
    });
    const r = await runDriftDetector();
    expect(r.errors).toBe(1);
    expect(issuesRecorded[0].issueKind).toBe("pilot.lifecycle.monitor.error");
  });
});
