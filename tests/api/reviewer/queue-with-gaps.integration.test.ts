import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  makeReviewerMockDb,
  seedClient,
  seedEngagement,
  seedFirmUser,
} from "../../reviewer/_mock-service";

const mock = makeReviewerMockDb();
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => Object.assign(mock, { auth: mock.auth, storage: mock.storage }),
}));

import { GET } from "@/app/api/reviewer/queue/route";

function seedGap(
  id: string,
  engId: string,
  fcId: string,
  extra: Record<string, unknown> = {},
) {
  mock.__seed("close_gap_review_items", [
    {
      id,
      firm_client_id: fcId,
      engagement_id: engId,
      close_period_id: "cp1",
      account_category: "cash",
      assertion_id: "accuracy",
      gap_root_cause_code: "no_rule_defined",
      gap_recommendation: null,
      relevance_at_detection: "relevant",
      severity: "warning",
      resolution_status: "open",
      created_at: extra.created_at ?? "2026-07-06T12:00:00Z",
      ...extra,
    },
  ]);
}

beforeEach(() => mock.__reset());

describe("GET /api/reviewer/queue with gaps", () => {
  it("queue response includes gapItems for engagements the user reads", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1", "Eng One");
    seedClient(mock, "fc1", "f1", "Client A");
    seedGap("g1", "e1", "fc1");
    const res = await GET(
      new NextRequest("http://localhost/api/reviewer/queue", {
        headers: { authorization: "Bearer t" },
      }),
    );
    const body = await res.json();
    expect(body.gapItems).toHaveLength(1);
    expect(body.gapItems[0].origin).toBe("gap");
    expect(body.gapItems[0].id).toBe("g1");
  });

  it("status=pending filter maps to gap resolution_status=open", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    seedClient(mock, "fc1", "f1");
    seedGap("g-open", "e1", "fc1", { resolution_status: "open" });
    seedGap("g-done", "e1", "fc1", {
      resolution_status: "resolved_remediated",
      resolution_type: "manual_test",
      resolved_at: "2026-01-01T00:00:00Z",
    });
    const res = await GET(
      new NextRequest("http://localhost/api/reviewer/queue?status=pending", {
        headers: { authorization: "Bearer t" },
      }),
    );
    const body = await res.json();
    expect(body.gapItems.map((g: { id: string }) => g.id)).toEqual(["g-open"]);
  });

  it("severity=warn maps to gap severity=warning", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    seedClient(mock, "fc1", "f1");
    seedGap("g-warn", "e1", "fc1", { severity: "warning" });
    seedGap("g-crit", "e1", "fc1", { severity: "critical" });
    const res = await GET(
      new NextRequest("http://localhost/api/reviewer/queue?severity=warn", {
        headers: { authorization: "Bearer t" },
      }),
    );
    const body = await res.json();
    expect(body.gapItems.map((g: { id: string }) => g.id)).toEqual(["g-warn"]);
  });

  it("ruleId filter excludes all gap items", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    seedClient(mock, "fc1", "f1");
    seedGap("g1", "e1", "fc1");
    const res = await GET(
      new NextRequest("http://localhost/api/reviewer/queue?ruleId=gen.rule", {
        headers: { authorization: "Bearer t" },
      }),
    );
    const body = await res.json();
    expect(body.gapItems).toEqual([]);
  });

  it("gapItems is empty array when no open gaps exist", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    seedClient(mock, "fc1", "f1");
    const res = await GET(
      new NextRequest("http://localhost/api/reviewer/queue", {
        headers: { authorization: "Bearer t" },
      }),
    );
    const body = await res.json();
    expect(body.gapItems).toEqual([]);
  });
});
