import { beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const listVisible = vi.fn();
const insert = vi.fn();
const selectSingle = vi.fn();
const emitEvent = vi.fn();

vi.mock("@/lib/audit-ready/server-auth", () => ({
  requireAuditReadyUser: () => requireUser(),
}));

vi.mock("@/lib/audit-ready/kickouts/list-visible-engagements", () => ({
  listVisibleEngagementIds: (...args: unknown[]) => listVisible(...args),
}));

vi.mock("@/lib/audit-ready/memory/events", () => ({
  emitMemoryEvent: (...args: unknown[]) => emitEvent(...args),
}));

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      insert: (payload: unknown) => {
        insert(payload);
        return {
          select: () => ({
            single: async () => ({
              data: { id: "investigation-1", ...(payload as object) },
              error: null,
            }),
          }),
        };
      },
      select: () => ({
        eq: () => ({
          single: () => selectSingle(),
        }),
      }),
    }),
  }),
}));

import { POST } from "../route";

const engagementId = "724546e9-6deb-4f7f-b8ad-88e5ee65353d";
const sourceId = "2b1456e9-6deb-4f7f-b8ad-88e5ee65353d";
const copiedId = "3c1456e9-6deb-4f7f-b8ad-88e5ee65353d";

function request(overrides: Record<string, unknown> = {}) {
  return new Request(
    "http://localhost/api/audit-ready/kickouts/investigations",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        engagement_id: engagementId,
        kickout_source_type: "pbc_run",
        kickout_source_id: sourceId,
        note: "Resolved from prior-period evidence",
        resolution_status: "resolved",
        resolution_code: "immaterial",
        ...overrides,
      }),
    },
  );
}

beforeEach(() => {
  requireUser.mockReset();
  listVisible.mockReset();
  insert.mockReset();
  selectSingle.mockReset();
  emitEvent.mockReset();
  requireUser.mockResolvedValue({ user: { id: "user-1" } });
  listVisible.mockResolvedValue([engagementId]);
  emitEvent.mockResolvedValue(undefined);
  selectSingle.mockResolvedValue({
    data: { resolution_code: "immaterial" },
    error: null,
  });
});

describe("POST /api/audit-ready/kickouts/investigations", () => {
  it("returns 401 when unauthenticated", async () => {
    requireUser.mockResolvedValue({
      error: Response.json({ error: "unauthenticated" }, { status: 401 }),
    });
    expect((await POST(request())).status).toBe(401);
  });

  it("returns 400 for resolved without resolution_code", async () => {
    const response = await POST(request({ resolution_code: undefined }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "resolution_code required for resolved or escalated status",
    });
  });

  it("returns 400 for an invalid resolution_code", async () => {
    const response = await POST(request({ resolution_code: "write_off" }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "invalid resolution_code",
    });
  });

  it("returns 201 with a valid code persisted", async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        resolution_status: "resolved",
        resolution_code: "immaterial",
      }),
    );
  });

  it("emits resolution_saved with was_copied=false when no copy provenance", async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(emitEvent).toHaveBeenCalledWith({
      eventType: "resolution_saved",
      engagementId,
      actorUserId: "user-1",
      payload: expect.objectContaining({
        investigation_id: "investigation-1",
        was_copied: false,
        matched_copied_code: false,
        copied_from_investigation_id: null,
        resolution_code: "immaterial",
      }),
    });
    expect(selectSingle).not.toHaveBeenCalled();
  });

  it("emits was_copied=true and matched_copied_code=true when codes match", async () => {
    const response = await POST(
      request({ copied_from_investigation_id: copiedId }),
    );
    expect(response.status).toBe(201);
    expect(selectSingle).toHaveBeenCalled();
    expect(emitEvent).toHaveBeenCalledWith({
      eventType: "resolution_saved",
      engagementId,
      actorUserId: "user-1",
      payload: expect.objectContaining({
        was_copied: true,
        matched_copied_code: true,
        copied_from_investigation_id: copiedId,
      }),
    });
  });

  it("emits was_copied=true and matched_copied_code=false when code overridden", async () => {
    selectSingle.mockResolvedValue({
      data: { resolution_code: "timing" },
      error: null,
    });
    const response = await POST(
      request({
        resolution_code: "immaterial",
        copied_from_investigation_id: copiedId,
      }),
    );
    expect(response.status).toBe(201);
    expect(emitEvent).toHaveBeenCalledWith({
      eventType: "resolution_saved",
      engagementId,
      actorUserId: "user-1",
      payload: expect.objectContaining({
        was_copied: true,
        matched_copied_code: false,
        copied_from_investigation_id: copiedId,
      }),
    });
  });
});
