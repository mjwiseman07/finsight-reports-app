import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  makeReviewerMockDb,
  seedClient,
  seedEngagement,
  seedFirmUser,
} from "../../reviewer/_mock-service";

const mock = makeReviewerMockDb();
const workerMock = vi.hoisted(() => vi.fn());
const publishMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => Object.assign(mock, { auth: mock.auth, storage: mock.storage }),
}));
vi.mock("@/lib/assertions/projection-worker", () => ({
  runProjectionWorker: workerMock,
}));
vi.mock("@/lib/events/publisher", () => ({
  publishEvent: publishMock,
}));

import { POST } from "@/app/api/reviewer/gap-items/[id]/resolve/route";

function seedGap(id: string, engId: string, fcId: string, extra: Record<string, unknown> = {}) {
  mock.__seed("close_gap_review_items", [
    {
      id,
      firm_client_id: fcId,
      engagement_id: engId,
      close_period_id: "cp1",
      account_category: "cash",
      assertion_id: "accuracy",
      gap_root_cause_code: "no_rule_defined",
      relevance_at_detection: "relevant",
      severity: "critical",
      resolution_status: "open",
      ...extra,
    },
  ]);
}

beforeEach(() => {
  mock.__reset();
  workerMock.mockReset();
  workerMock.mockResolvedValue({ gapItemsOpened: 0 });
  publishMock.mockReset();
  publishMock.mockResolvedValue({ eventId: "evt-1" });
});

describe("POST /api/reviewer/gap-items/[id]/resolve", () => {
  it("401 without bearer", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/reviewer/gap-items/g1/resolve", { method: "POST" }),
      { params: Promise.resolve({ id: "g1" }) },
    );
    expect(res.status).toBe(401);
  });

  it("POST with valid manual_test payload → 200, item resolved, worker re-invoked", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    seedClient(mock, "fc1", "f1");
    seedGap("g1", "e1", "fc1");
    const res = await POST(
      new NextRequest("http://localhost/api/reviewer/gap-items/g1/resolve", {
        method: "POST",
        headers: { authorization: "Bearer t", "content-type": "application/json" },
        body: JSON.stringify({
          resolutionType: "manual_test",
          resolutionMetadata: { manual_test_ref: "MT-1", rationale: "walkthrough" },
        }),
      }),
      { params: Promise.resolve({ id: "g1" }) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.item.resolutionStatus).toBe("resolved_remediated");
    expect(workerMock).toHaveBeenCalledWith("fc1", "cp1");
  });

  it("POST with rule_activation missing activated_rule_id → 400", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    seedClient(mock, "fc1", "f1");
    seedGap("g1", "e1", "fc1");
    const res = await POST(
      new NextRequest("http://localhost/api/reviewer/gap-items/g1/resolve", {
        method: "POST",
        headers: { authorization: "Bearer t", "content-type": "application/json" },
        body: JSON.stringify({ resolutionType: "rule_activation", resolutionMetadata: {} }),
      }),
      { params: Promise.resolve({ id: "g1" }) },
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("invalid_resolution_metadata");
  });

  it("POST as reader (not writer) → 403 writer_required", async () => {
    seedFirmUser(mock, "u1", "f1", "readonly");
    seedEngagement(mock, "e1", "f1");
    seedClient(mock, "fc1", "f1");
    seedGap("g1", "e1", "fc1");
    const res = await POST(
      new NextRequest("http://localhost/api/reviewer/gap-items/g1/resolve", {
        method: "POST",
        headers: { authorization: "Bearer t", "content-type": "application/json" },
        body: JSON.stringify({
          resolutionType: "manual_test",
          resolutionMetadata: { manual_test_ref: "x", rationale: "y" },
        }),
      }),
      { params: Promise.resolve({ id: "g1" }) },
    );
    expect(res.status).toBe(403);
  });

  it("POST unknown gap_item_id → 404 not_found", async () => {
    seedFirmUser(mock, "u1", "f1");
    const res = await POST(
      new NextRequest("http://localhost/api/reviewer/gap-items/missing/resolve", {
        method: "POST",
        headers: { authorization: "Bearer t", "content-type": "application/json" },
        body: JSON.stringify({
          resolutionType: "manual_test",
          resolutionMetadata: { manual_test_ref: "x", rationale: "y" },
        }),
      }),
      { params: Promise.resolve({ id: "missing" }) },
    );
    expect(res.status).toBe(404);
  });

  it("POST on already-resolved item → 400 already_resolved", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    seedClient(mock, "fc1", "f1");
    seedGap("g1", "e1", "fc1", {
      resolution_status: "resolved_remediated",
      resolution_type: "manual_test",
      resolved_at: "2026-01-01T00:00:00Z",
    });
    const res = await POST(
      new NextRequest("http://localhost/api/reviewer/gap-items/g1/resolve", {
        method: "POST",
        headers: { authorization: "Bearer t", "content-type": "application/json" },
        body: JSON.stringify({
          resolutionType: "manual_test",
          resolutionMetadata: { manual_test_ref: "x", rationale: "y" },
        }),
      }),
      { params: Promise.resolve({ id: "g1" }) },
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("already_resolved");
  });

  it("POST triggers runProjectionWorker for the close period", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e1", "f1");
    seedClient(mock, "fc1", "f1");
    seedGap("g1", "e1", "fc1");
    await POST(
      new NextRequest("http://localhost/api/reviewer/gap-items/g1/resolve", {
        method: "POST",
        headers: { authorization: "Bearer t", "content-type": "application/json" },
        body: JSON.stringify({
          resolutionType: "deferred_to_next_period",
          resolutionMetadata: { defer_reason: "next month" },
        }),
      }),
      { params: Promise.resolve({ id: "g1" }) },
    );
    expect(workerMock).toHaveBeenCalledTimes(1);
  });

  it("POST with wrong firm scope → 403", async () => {
    seedFirmUser(mock, "u1", "f1");
    seedEngagement(mock, "e2", "f2");
    seedClient(mock, "fc2", "f2");
    seedGap("g1", "e2", "fc2");
    const res = await POST(
      new NextRequest("http://localhost/api/reviewer/gap-items/g1/resolve", {
        method: "POST",
        headers: { authorization: "Bearer t", "content-type": "application/json" },
        body: JSON.stringify({
          resolutionType: "manual_test",
          resolutionMetadata: { manual_test_ref: "x", rationale: "y" },
        }),
      }),
      { params: Promise.resolve({ id: "g1" }) },
    );
    expect(res.status).toBe(403);
  });
});
