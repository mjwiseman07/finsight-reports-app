import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const getActor = vi.fn();
const emitEvent = vi.fn();

vi.mock("@/lib/audit-ready/server-auth", () => ({
  requireAuditReadyUser: () => requireUser(),
  getEngagementActor: (...args: unknown[]) => getActor(...args),
}));

vi.mock("@/lib/audit-ready/memory/events", () => ({
  emitMemoryEvent: (...args: unknown[]) => emitEvent(...args),
}));

import { POST } from "../route";

function request(body: unknown) {
  return new Request("http://localhost/api/audit-ready/memory/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  requireUser.mockReset();
  getActor.mockReset();
  emitEvent.mockReset();
  requireUser.mockResolvedValue({ user: { id: "user-1" } });
  getActor.mockResolvedValue({
    userId: "user-1",
    canRead: true,
    canWrite: true,
    scope: "company",
  });
  emitEvent.mockResolvedValue(undefined);
});

describe("POST /api/audit-ready/memory/events", () => {
  it("returns 401 when unauthenticated", async () => {
    requireUser.mockResolvedValue({
      error: Response.json({ error: "unauthenticated" }, { status: 401 }),
    });
    expect((await POST(request({}))).status).toBe(401);
  });

  it("returns 400 for invalid body", async () => {
    const response = await POST(
      new Request("http://localhost/api/audit-ready/memory/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not-json",
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid body" });
  });

  it("rejects non-allowlisted event_type (server-only)", async () => {
    const response = await POST(
      request({
        event_type: "resolution_saved",
        engagement_id: "eng-1",
      }),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "event_type not client-emittable",
    });
  });

  it("returns 400 when engagement_id is missing", async () => {
    const response = await POST(request({ event_type: "copy_clicked" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "engagement_id required",
    });
  });

  it("returns 403 for a non-member", async () => {
    getActor.mockResolvedValue(null);
    const response = await POST(
      request({
        event_type: "copy_clicked",
        engagement_id: "eng-1",
      }),
    );
    expect(response.status).toBe(403);
  });

  it("returns 200 for copy_clicked happy path", async () => {
    const response = await POST(
      request({
        event_type: "copy_clicked",
        engagement_id: "eng-1",
        payload: {
          copied_investigation_id: "inv-1",
          copied_resolution_code: "timing",
        },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(emitEvent).toHaveBeenCalledWith({
      eventType: "copy_clicked",
      engagementId: "eng-1",
      actorUserId: "user-1",
      payload: {
        copied_investigation_id: "inv-1",
        copied_resolution_code: "timing",
      },
    });
  });
});
