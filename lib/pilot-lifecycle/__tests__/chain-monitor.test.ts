import { describe, it, expect, vi, beforeEach } from "vitest";

const recentEvents: Array<Record<string, unknown>> = [];
const chainBreaks: Record<string, Array<Record<string, unknown>>> = {};
const issuesRecorded: Array<Record<string, unknown>> = [];

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        gt: () => ({
          limit: () => Promise.resolve({ data: recentEvents, error: null }),
        }),
      }),
    }),
    rpc: (name: string, args: Record<string, unknown>) => {
      if (name === "pilot_lifecycle_events_verify_chain") {
        const key = `${args.p_company_id ?? ""}|${args.p_firm_id ?? ""}`;
        return Promise.resolve({ data: chainBreaks[key] ?? [], error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
  }),
}));

vi.mock("../issue-recorder", () => ({
  recordIssue: async (input: Record<string, unknown>) => {
    issuesRecorded.push(input);
    return { id: "ci", deduped: false, sentryEventId: null };
  },
}));

import { runChainIntegrityMonitor } from "../chain-monitor";

describe("runChainIntegrityMonitor", () => {
  beforeEach(() => {
    recentEvents.length = 0;
    for (const k of Object.keys(chainBreaks)) delete chainBreaks[k];
    issuesRecorded.length = 0;
  });

  it("happy path — one partition, verify_chain returns empty", async () => {
    recentEvents.push({
      company_id: "c1",
      firm_id: null,
      event_at: "2026-08-04T20:00:00Z",
    });
    const r = await runChainIntegrityMonitor();
    expect(r.partitions_checked).toBe(1);
    expect(r.broken_chains).toBe(0);
    expect(issuesRecorded.length).toBe(0);
  });

  it("emits chain.integrity.broken (fatal) when verify_chain finds a break", async () => {
    recentEvents.push({
      company_id: null,
      firm_id: "f1",
      event_at: "2026-08-04T20:00:00Z",
    });
    chainBreaks["|f1"] = [
      {
        first_broken_event_id: "evt-abc",
        first_broken_event_at: "2026-08-04T20:00:00Z",
        expected_prev_hash: "sha256:aaaa",
        actual_prev_hash: "sha256:bbbb",
        expected_row_hash: "sha256:cccc",
        actual_row_hash: "sha256:dddd",
      },
    ];
    const r = await runChainIntegrityMonitor();
    expect(r.broken_chains).toBe(1);
    expect(issuesRecorded[0].level).toBe("fatal");
    expect(issuesRecorded[0].issueKind).toBe(
      "pilot.lifecycle.chain.integrity.broken",
    );
  });
});
