import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const getActor = vi.fn();
const getSimilar = vi.fn();
const emitEvent = vi.fn();

vi.mock("@/lib/audit-ready/server-auth", () => ({
  requireAuditReadyUser: () => requireUser(),
  getEngagementActor: (...args: unknown[]) => getActor(...args),
}));

vi.mock("@/lib/audit-ready/memory/similar-resolutions", () => ({
  getSimilarKickoutResolutions: (...args: unknown[]) => getSimilar(...args),
}));

vi.mock("@/lib/audit-ready/memory/events", () => ({
  emitMemoryEvent: (...args: unknown[]) => emitEvent(...args),
}));

import { POST } from "../route";

function request(body: Record<string, unknown>) {
  return new Request(
    "http://localhost/api/audit-ready/kickouts/similar-resolutions",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

beforeEach(() => {
  requireUser.mockReset();
  getActor.mockReset();
  getSimilar.mockReset();
  emitEvent.mockReset();
  requireUser.mockResolvedValue({ user: { id: "user-1" } });
  getActor.mockResolvedValue({
    userId: "user-1",
    canRead: true,
    canWrite: true,
    scope: "company",
  });
  getSimilar.mockResolvedValue([]);
  emitEvent.mockResolvedValue(undefined);
});

describe("POST /api/audit-ready/kickouts/similar-resolutions", () => {
  it("returns 401 when unauthenticated", async () => {
    requireUser.mockResolvedValue({
      error: Response.json({ error: "unauthenticated" }, { status: 401 }),
    });
    const response = await POST(request({}));
    expect(response.status).toBe(401);
  });

  it.each([
    [{ source_type: "pbc_run", tie_out_kind: "ap_aging" }, "engagement_id required"],
    [{ engagement_id: "eng-1", source_type: "unknown" }, "invalid source_type"],
    [
      { engagement_id: "eng-1", source_type: "bs_summary_line" },
      "qbo_account_id required",
    ],
    [
      { engagement_id: "eng-1", source_type: "pbc_run" },
      "tie_out_kind required",
    ],
  ])("returns 400 for invalid input", async (body, error) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error });
  });

  it("returns 403 for a non-member", async () => {
    getActor.mockResolvedValue(null);
    const response = await POST(
      request({
        engagement_id: "eng-1",
        source_type: "pbc_run",
        tie_out_kind: "ap_aging",
      }),
    );
    expect(response.status).toBe(403);
  });

  it("emits suggestions_none when results are empty", async () => {
    const response = await POST(
      request({
        engagement_id: "eng-1",
        source_type: "pbc_run",
        tie_out_kind: "ap_aging",
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ results: [] });
    expect(emitEvent).toHaveBeenCalledWith({
      eventType: "suggestions_none",
      engagementId: "eng-1",
      actorUserId: "user-1",
      payload: {
        source_type: "pbc_run",
        kickout_source_key: { tie_out_kind: "ap_aging" },
        suggestion_count: 0,
        top_resolution_code: null,
      },
    });
  });

  it("emits suggestions_shown with top_resolution_code when results are non-empty", async () => {
    const results = [
      {
        investigationId: "inv-0",
        resolutionCode: "timing",
      },
      {
        investigationId: "inv-1",
        resolutionCode: "immaterial",
      },
    ];
    getSimilar.mockResolvedValue(results);
    const response = await POST(
      request({
        engagement_id: "eng-1",
        source_type: "bs_summary_line",
        qbo_account_id: "35",
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ results });
    expect(getSimilar).toHaveBeenCalledWith("eng-1", {
      source_type: "bs_summary_line",
      qbo_account_id: "35",
    });
    expect(emitEvent).toHaveBeenCalledWith({
      eventType: "suggestions_shown",
      engagementId: "eng-1",
      actorUserId: "user-1",
      payload: {
        source_type: "bs_summary_line",
        kickout_source_key: { qbo_account_id: "35" },
        suggestion_count: 2,
        top_resolution_code: "timing",
      },
    });
  });
});
